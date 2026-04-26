use crate::{PlayerId, Position, RoomId};
use serde::{Deserialize, Serialize};

pub const MAX_NAME_LEN: usize = 32;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Player {
    pub id: PlayerId,
    pub room_id: RoomId,
    pub name: String,
    pub position: Position,
    pub is_host: bool,
}

impl Player {
    pub fn new(id: PlayerId, room_id: RoomId, name: impl Into<String>, is_host: bool) -> Self {
        let raw = name.into();
        let name = truncate_to_chars(&raw, MAX_NAME_LEN);
        Self {
            id,
            room_id,
            name,
            position: Position::zero(),
            is_host,
        }
    }

    pub fn new_host(id: PlayerId, room_id: RoomId, name: impl Into<String>) -> Self {
        Self::new(id, room_id, name, true)
    }

    pub fn new_guest(id: PlayerId, room_id: RoomId, name: impl Into<String>) -> Self {
        Self::new(id, room_id, name, false)
    }
}

fn truncate_to_chars(s: &str, max_chars: usize) -> String {
    s.chars().take(max_chars).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn player_spawns_at_origin() {
        let p = Player::new_host(PlayerId::new(), RoomId::new(), "Alice");
        assert!((p.position.x - 0.0).abs() < f32::EPSILON);
        assert!((p.position.y - 0.0).abs() < f32::EPSILON);
    }

    #[test]
    fn player_name_truncated_to_32_chars() {
        let long_name = "a".repeat(100);
        let p = Player::new_host(PlayerId::new(), RoomId::new(), long_name);
        assert_eq!(p.name.chars().count(), MAX_NAME_LEN);
    }

    #[test]
    fn player_name_under_limit_is_unchanged() {
        let p = Player::new_guest(PlayerId::new(), RoomId::new(), "Bob");
        assert_eq!(p.name, "Bob");
    }

    #[test]
    fn player_name_truncates_multibyte_chars() {
        let name = "あ".repeat(50);
        let p = Player::new_host(PlayerId::new(), RoomId::new(), name);
        assert_eq!(p.name.chars().count(), MAX_NAME_LEN);
    }

    #[test]
    fn host_flag_is_set_correctly() {
        let host = Player::new_host(PlayerId::new(), RoomId::new(), "Host");
        let guest = Player::new_guest(PlayerId::new(), RoomId::new(), "Guest");
        assert!(host.is_host);
        assert!(!guest.is_host);
    }

    #[test]
    fn player_roundtrips_json() {
        let p = Player::new_host(PlayerId::new(), RoomId::new(), "Alice");
        let json = serde_json::to_string(&p).unwrap();
        let back: Player = serde_json::from_str(&json).unwrap();
        assert_eq!(back.name, "Alice");
        assert!(back.is_host);
    }
}
