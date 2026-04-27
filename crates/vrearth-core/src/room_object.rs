use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct RoomObject {
    pub id: String,
    pub room_id: String,
    pub kind: String,
    pub x: f32,
    pub y: f32,
    pub rotation: f32,
    pub z_order: i64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn room_object_roundtrips_json() {
        let obj = RoomObject {
            id: "obj-1".to_string(),
            room_id: "room-1".to_string(),
            kind: "sofa".to_string(),
            x: 100.0,
            y: 200.0,
            rotation: 0.0,
            z_order: 0,
        };
        let json = serde_json::to_string(&obj).unwrap();
        let back: RoomObject = serde_json::from_str(&json).unwrap();
        assert_eq!(obj, back);
    }
}
