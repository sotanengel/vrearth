use serde::{Deserialize, Serialize};
use std::fmt;
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct PlayerId(Uuid);

impl PlayerId {
    pub fn new() -> Self {
        Self(Uuid::new_v4())
    }

    pub fn from_uuid(uuid: Uuid) -> Self {
        Self(uuid)
    }
}

impl Default for PlayerId {
    fn default() -> Self {
        Self::new()
    }
}

impl fmt::Display for PlayerId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct RoomId(Uuid);

impl RoomId {
    pub fn new() -> Self {
        Self(Uuid::new_v4())
    }

    pub fn from_uuid(uuid: Uuid) -> Self {
        Self(uuid)
    }
}

impl Default for RoomId {
    fn default() -> Self {
        Self::new()
    }
}

impl fmt::Display for RoomId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn player_id_is_unique() {
        let a = PlayerId::new();
        let b = PlayerId::new();
        assert_ne!(a, b);
    }

    #[test]
    fn player_id_roundtrips_json() {
        let id = PlayerId::new();
        let json = serde_json::to_string(&id).unwrap();
        let back: PlayerId = serde_json::from_str(&json).unwrap();
        assert_eq!(id, back);
    }

    #[test]
    fn room_id_display_is_non_empty() {
        let id = RoomId::new();
        assert!(!id.to_string().is_empty());
    }

    #[test]
    fn room_id_is_unique() {
        let a = RoomId::new();
        let b = RoomId::new();
        assert_ne!(a, b);
    }

    #[test]
    fn room_id_roundtrips_json() {
        let id = RoomId::new();
        let json = serde_json::to_string(&id).unwrap();
        let back: RoomId = serde_json::from_str(&json).unwrap();
        assert_eq!(id, back);
    }
}
