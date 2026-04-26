use std::collections::HashMap;
use std::sync::Mutex;
use tokio::sync::broadcast;
use vrearth_core::{Player, PlayerId, Position, RoomBounds, RoomId, ServerMessage};

pub const BROADCAST_CAPACITY: usize = 128;

pub struct ActiveRoom {
    pub players: HashMap<PlayerId, Player>,
    pub tx: broadcast::Sender<ServerMessage>,
    pub bounds: RoomBounds,
}

impl ActiveRoom {
    fn new() -> Self {
        let (tx, _) = broadcast::channel(BROADCAST_CAPACITY);
        Self {
            players: HashMap::new(),
            tx,
            bounds: RoomBounds::default(),
        }
    }
}

pub struct RoomRegistry {
    inner: Mutex<HashMap<RoomId, ActiveRoom>>,
}

impl RoomRegistry {
    pub fn new() -> Self {
        Self {
            inner: Mutex::new(HashMap::new()),
        }
    }

    /// Create a new room with the given ID and return a subscribe handle
    pub fn create_room(&self, room_id: RoomId) {
        let mut map = self.inner.lock().unwrap();
        map.entry(room_id).or_insert_with(ActiveRoom::new);
    }

    /// Join a player into a room. Returns current player list on success.
    pub fn join(&self, room_id: &RoomId, player: Player) -> Option<Vec<Player>> {
        let mut map = self.inner.lock().unwrap();
        let room = map.get_mut(room_id)?;
        room.players.insert(player.id.clone(), player);
        Some(room.players.values().cloned().collect())
    }

    /// Remove a player from a room
    pub fn leave(&self, room_id: &RoomId, player_id: &PlayerId) {
        let mut map = self.inner.lock().unwrap();
        if let Some(room) = map.get_mut(room_id) {
            room.players.remove(player_id);
        }
    }

    /// Move a player and return the new position
    pub fn move_player(
        &self,
        room_id: &RoomId,
        player_id: &PlayerId,
        dx: f32,
        dy: f32,
    ) -> Option<Position> {
        let mut map = self.inner.lock().unwrap();
        let room = map.get_mut(room_id)?;
        let player = room.players.get_mut(player_id)?;
        player.position = player.position.apply_delta(dx, dy, &room.bounds);
        Some(player.position)
    }

    /// Get all players in a room
    #[allow(dead_code)]
    pub fn get_players(&self, room_id: &RoomId) -> Option<Vec<Player>> {
        let map = self.inner.lock().unwrap();
        map.get(room_id)
            .map(|r| r.players.values().cloned().collect())
    }

    /// Check if a player is the host of a room
    pub fn is_host(&self, room_id: &RoomId, player_id: &PlayerId) -> bool {
        let map = self.inner.lock().unwrap();
        map.get(room_id)
            .and_then(|r| r.players.get(player_id))
            .map(|p| p.is_host)
            .unwrap_or(false)
    }

    /// Get a broadcast sender for a room
    pub fn sender(&self, room_id: &RoomId) -> Option<broadcast::Sender<ServerMessage>> {
        let map = self.inner.lock().unwrap();
        map.get(room_id).map(|r| r.tx.clone())
    }

    /// Get a broadcast receiver for a room
    #[allow(dead_code)]
    pub fn subscribe(&self, room_id: &RoomId) -> Option<broadcast::Receiver<ServerMessage>> {
        let map = self.inner.lock().unwrap();
        map.get(room_id).map(|r| r.tx.subscribe())
    }
}

impl Default for RoomRegistry {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_player(id: PlayerId, room_id: RoomId, is_host: bool) -> Player {
        Player::new(id, room_id, "Test", is_host)
    }

    #[test]
    fn room_starts_without_players() {
        let reg = RoomRegistry::new();
        let room_id = RoomId::new();
        assert!(reg.get_players(&room_id).is_none());
    }

    #[test]
    fn join_adds_player_to_room() {
        let reg = RoomRegistry::new();
        let room_id = RoomId::new();
        reg.create_room(room_id.clone());
        let player_id = PlayerId::new();
        let player = make_player(player_id.clone(), room_id.clone(), true);
        let players = reg.join(&room_id, player).unwrap();
        assert_eq!(players.len(), 1);
        assert_eq!(players[0].id, player_id);
    }

    #[test]
    fn leave_removes_player() {
        let reg = RoomRegistry::new();
        let room_id = RoomId::new();
        reg.create_room(room_id.clone());
        let player_id = PlayerId::new();
        reg.join(
            &room_id,
            make_player(player_id.clone(), room_id.clone(), true),
        );
        reg.leave(&room_id, &player_id);
        let players = reg.get_players(&room_id).unwrap();
        assert!(players.is_empty());
    }

    #[test]
    fn move_player_updates_position() {
        let reg = RoomRegistry::new();
        let room_id = RoomId::new();
        reg.create_room(room_id.clone());
        let player_id = PlayerId::new();
        reg.join(
            &room_id,
            make_player(player_id.clone(), room_id.clone(), false),
        );
        let new_pos = reg.move_player(&room_id, &player_id, 10.0, 20.0).unwrap();
        assert!((new_pos.x - 10.0).abs() < f32::EPSILON);
        assert!((new_pos.y - 20.0).abs() < f32::EPSILON);
    }

    #[test]
    fn move_player_respects_bounds() {
        let reg = RoomRegistry::new();
        let room_id = RoomId::new();
        reg.create_room(room_id.clone());
        let player_id = PlayerId::new();
        reg.join(
            &room_id,
            make_player(player_id.clone(), room_id.clone(), false),
        );
        let new_pos = reg
            .move_player(&room_id, &player_id, -100.0, -100.0)
            .unwrap();
        assert!((new_pos.x - 0.0).abs() < f32::EPSILON);
        assert!((new_pos.y - 0.0).abs() < f32::EPSILON);
    }

    #[test]
    fn is_host_returns_correct_value() {
        let reg = RoomRegistry::new();
        let room_id = RoomId::new();
        reg.create_room(room_id.clone());
        let host_id = PlayerId::new();
        let guest_id = PlayerId::new();
        reg.join(
            &room_id,
            make_player(host_id.clone(), room_id.clone(), true),
        );
        reg.join(
            &room_id,
            make_player(guest_id.clone(), room_id.clone(), false),
        );
        assert!(reg.is_host(&room_id, &host_id));
        assert!(!reg.is_host(&room_id, &guest_id));
    }

    #[test]
    fn broadcast_sender_available_after_create() {
        let reg = RoomRegistry::new();
        let room_id = RoomId::new();
        reg.create_room(room_id.clone());
        assert!(reg.sender(&room_id).is_some());
    }
}
