use crate::{Player, PlayerId, Position};
use serde::{Deserialize, Serialize};

/// Messages sent from the browser client to the server
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ClientMessage {
    /// Sent on WebSocket connect with invite token and display name
    Join { token: String, name: String },
    /// Avatar movement delta (pixels per tick)
    Move { dx: f32, dy: f32 },
    /// Global text chat
    Chat { text: String },
    /// Host-only: kick a player from the room
    Kick { player_id: PlayerId },
}

/// Messages sent from the server to a browser client
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ServerMessage {
    /// Sent to the joining client with their ID and current room state
    Welcome {
        your_id: PlayerId,
        players: Vec<Player>,
    },
    /// Broadcast when any avatar position changes
    PlayerMoved {
        player_id: PlayerId,
        position: Position,
    },
    /// Broadcast when a new player joins
    PlayerJoined { player: Player },
    /// Broadcast when a player leaves or is kicked
    PlayerLeft { player_id: PlayerId },
    /// Broadcast text chat message
    Chat { from_id: PlayerId, text: String },
    /// Sent to a player just before the server closes their connection
    Kicked,
    /// Error response
    Error { code: u16, message: String },
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::RoomId;

    #[test]
    fn client_move_serializes_with_snake_case_type() {
        let msg = ClientMessage::Move { dx: 1.0, dy: -1.0 };
        let json = serde_json::to_string(&msg).unwrap();
        assert!(json.contains("\"type\":\"move\""), "got: {json}");
        assert!(json.contains("\"dx\":1.0"));
    }

    #[test]
    fn client_join_serializes_correctly() {
        let msg = ClientMessage::Join {
            token: "abc".to_string(),
            name: "Alice".to_string(),
        };
        let json = serde_json::to_string(&msg).unwrap();
        assert!(json.contains("\"type\":\"join\""));
    }

    #[test]
    fn client_kick_roundtrips_json() {
        let id = PlayerId::new();
        let msg = ClientMessage::Kick {
            player_id: id.clone(),
        };
        let json = serde_json::to_string(&msg).unwrap();
        let back: ClientMessage = serde_json::from_str(&json).unwrap();
        match back {
            ClientMessage::Kick { player_id } => assert_eq!(player_id, id),
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn server_welcome_roundtrips_json() {
        let id = PlayerId::new();
        let msg = ServerMessage::Welcome {
            your_id: id.clone(),
            players: vec![],
        };
        let json = serde_json::to_string(&msg).unwrap();
        let back: ServerMessage = serde_json::from_str(&json).unwrap();
        match back {
            ServerMessage::Welcome { your_id, players } => {
                assert_eq!(your_id, id);
                assert!(players.is_empty());
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn server_player_moved_serializes_type() {
        let msg = ServerMessage::PlayerMoved {
            player_id: PlayerId::new(),
            position: Position::new(10.0, 20.0),
        };
        let json = serde_json::to_string(&msg).unwrap();
        assert!(json.contains("\"type\":\"player_moved\""), "got: {json}");
    }

    #[test]
    fn server_kicked_serializes_with_type_field() {
        let msg = ServerMessage::Kicked;
        let json = serde_json::to_string(&msg).unwrap();
        assert!(json.contains("\"type\":\"kicked\""), "got: {json}");
    }

    #[test]
    fn server_error_roundtrips_json() {
        let msg = ServerMessage::Error {
            code: 403,
            message: "forbidden".to_string(),
        };
        let json = serde_json::to_string(&msg).unwrap();
        let back: ServerMessage = serde_json::from_str(&json).unwrap();
        match back {
            ServerMessage::Error { code, message } => {
                assert_eq!(code, 403);
                assert_eq!(message, "forbidden");
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn server_player_joined_roundtrips_json() {
        use crate::Player;
        let player = Player::new_host(PlayerId::new(), RoomId::new(), "Alice");
        let msg = ServerMessage::PlayerJoined { player };
        let json = serde_json::to_string(&msg).unwrap();
        let back: ServerMessage = serde_json::from_str(&json).unwrap();
        assert!(matches!(back, ServerMessage::PlayerJoined { .. }));
    }
}
