use crate::{invite::InviteService, state::AppState};
use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Query, State,
    },
    http::StatusCode,
    response::IntoResponse,
};
use futures_util::{SinkExt, StreamExt};
use serde::Deserialize;
use tokio::sync::broadcast;
use vrearth_core::{ClientMessage, Player, PlayerId, ServerMessage};

#[derive(Deserialize)]
pub struct ConnectParams {
    pub token: String,
    pub name: Option<String>,
}

pub async fn ws_handler(
    ws: WebSocketUpgrade,
    Query(params): Query<ConnectParams>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let claims = match InviteService::verify(&params.token, &state.jwt_secret) {
        Ok(c) => c,
        Err(_) => return StatusCode::UNAUTHORIZED.into_response(),
    };

    let player_name = params
        .name
        .as_deref()
        .map(|n| n.trim())
        .filter(|n| !n.is_empty())
        .unwrap_or("Anonymous")
        .chars()
        .take(32)
        .collect::<String>();

    ws.on_upgrade(move |socket| handle_socket(socket, claims, state, player_name))
}

async fn handle_socket(
    socket: WebSocket,
    claims: vrearth_core::InviteClaims,
    state: AppState,
    player_name: String,
) {
    let player_id = PlayerId::new();
    let room_id = claims.room_id.clone();

    // Ensure room exists
    state.rooms.create_room(room_id.clone());

    // Get broadcast channel
    let tx = match state.rooms.sender(&room_id) {
        Some(tx) => tx,
        None => {
            tracing::error!("room not found after create");
            return;
        }
    };
    let mut rx = tx.subscribe();

    // Register a direct (point-to-point) channel for this player
    let mut direct_rx = match state.rooms.register_direct(&room_id, &player_id) {
        Some(rx) => rx,
        None => {
            tracing::error!("failed to register direct channel");
            return;
        }
    };

    let player = Player::new(
        player_id.clone(),
        room_id.clone(),
        &player_name,
        claims.is_host,
    );

    // Join room and get current players
    let all_players = match state.rooms.join(&room_id, player.clone()) {
        Some(p) => p,
        None => {
            tracing::error!("failed to join room");
            return;
        }
    };

    let (mut ws_tx, mut ws_rx) = socket.split();

    // Send Welcome to new player
    let welcome = ServerMessage::Welcome {
        your_id: player_id.clone(),
        players: all_players,
    };
    if let Ok(json) = serde_json::to_string(&welcome) {
        let _ = ws_tx.send(Message::Text(json.into())).await;
    }

    // Broadcast PlayerJoined to others
    let _ = tx.send(ServerMessage::PlayerJoined { player });

    // Spawn write task: forward broadcast + direct messages to this WebSocket
    let write_task = tokio::spawn(async move {
        loop {
            tokio::select! {
                broadcast_msg = rx.recv() => {
                    match broadcast_msg {
                        Ok(msg) => {
                            if let Ok(json) = serde_json::to_string(&msg) {
                                if ws_tx.send(Message::Text(json.into())).await.is_err() {
                                    break;
                                }
                            }
                        }
                        Err(broadcast::error::RecvError::Lagged(_)) => {
                            tracing::warn!("broadcast receiver lagged, closing connection");
                            break;
                        }
                        Err(broadcast::error::RecvError::Closed) => break,
                    }
                }
                direct_msg = direct_rx.recv() => {
                    match direct_msg {
                        Some(msg) => {
                            if let Ok(json) = serde_json::to_string(&msg) {
                                if ws_tx.send(Message::Text(json.into())).await.is_err() {
                                    break;
                                }
                            }
                        }
                        None => break,
                    }
                }
            }
        }
    });

    // Read loop: handle incoming client messages
    while let Some(Ok(msg)) = ws_rx.next().await {
        let text = match msg {
            Message::Text(t) => t,
            Message::Close(_) => break,
            _ => continue,
        };

        let client_msg: ClientMessage = match serde_json::from_str(&text) {
            Ok(m) => m,
            Err(e) => {
                tracing::warn!("invalid message: {e}");
                continue;
            }
        };

        match client_msg {
            ClientMessage::Join { .. } => {
                // Already joined via token — ignore duplicate Join
            }
            ClientMessage::Move { dx, dy } => {
                if let Some(new_pos) = state.rooms.move_player(&room_id, &player_id, dx, dy) {
                    let _ = tx.send(ServerMessage::PlayerMoved {
                        player_id: player_id.clone(),
                        position: new_pos,
                    });
                }
            }
            ClientMessage::Chat { text } => {
                if !text.is_empty() && text.len() <= 200 {
                    let _ = tx.send(ServerMessage::Chat {
                        from_id: player_id.clone(),
                        text,
                    });
                }
            }
            ClientMessage::Kick {
                player_id: target_id,
            } => {
                if state.rooms.is_host(&room_id, &player_id) {
                    // Send Kicked directly to the target player, then broadcast PlayerLeft
                    state
                        .rooms
                        .send_direct(&room_id, &target_id, ServerMessage::Kicked);
                    state.rooms.leave(&room_id, &target_id);
                    let _ = tx.send(ServerMessage::PlayerLeft {
                        player_id: target_id,
                    });
                }
            }
            // WebRTC signaling: relay point-to-point to the target player
            ClientMessage::RtcOffer { to_id, sdp } => {
                state.rooms.send_direct(
                    &room_id,
                    &to_id,
                    ServerMessage::RtcOffer {
                        from_id: player_id.clone(),
                        sdp,
                    },
                );
            }
            ClientMessage::RtcAnswer { to_id, sdp } => {
                state.rooms.send_direct(
                    &room_id,
                    &to_id,
                    ServerMessage::RtcAnswer {
                        from_id: player_id.clone(),
                        sdp,
                    },
                );
            }
            ClientMessage::RtcIce { to_id, candidate } => {
                state.rooms.send_direct(
                    &room_id,
                    &to_id,
                    ServerMessage::RtcIce {
                        from_id: player_id.clone(),
                        candidate,
                    },
                );
            }
            ClientMessage::Emote { emoji } => {
                // Only allow single grapheme cluster to prevent abuse
                let grapheme = emoji.chars().next().map(|c| c.to_string()).unwrap_or_default();
                if !grapheme.is_empty() {
                    let _ = tx.send(ServerMessage::Emote {
                        from_id: player_id.clone(),
                        emoji: grapheme,
                    });
                }
            }
        }
    }

    // Cleanup on disconnect
    write_task.abort();
    state.rooms.leave(&room_id, &player_id);
    let _ = tx.send(ServerMessage::PlayerLeft {
        player_id: player_id.clone(),
    });
    tracing::info!("player {} disconnected from room {}", player_id, room_id);
}
