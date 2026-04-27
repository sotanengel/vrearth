use crate::{invite::InviteService, objects, sessions, state::AppState};

/// Radius (room units) within which LocalChat messages are delivered
const LOCAL_CHAT_RANGE: f32 = 400.0;

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
use uuid::Uuid;
use vrearth_core::{ClientMessage, Player, PlayerId, RoomObject, ServerMessage};

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

    // Load existing room objects from DB
    let room_objects = objects::list(&state.db, &room_id.to_string())
        .await
        .unwrap_or_default();

    let youtube_video_id = state.rooms.get_youtube_video_id(&room_id);

    // Send Welcome to new player
    let welcome = ServerMessage::Welcome {
        your_id: player_id.clone(),
        players: all_players,
        objects: room_objects,
        youtube_video_id,
    };
    if let Ok(json) = serde_json::to_string(&welcome) {
        let _ = ws_tx.send(Message::Text(json.into())).await;
    }

    // Record session join
    let _ = sessions::record_join(&state.db, &player_id.to_string(), &room_id.to_string(), &player_name).await;

    // Send whiteboard snapshot to new player
    let strokes = state.rooms.get_whiteboard_strokes(&room_id);
    if !strokes.is_empty() {
        let snapshot = ServerMessage::WhiteboardSnapshot { strokes };
        if let Ok(json) = serde_json::to_string(&snapshot) {
            let _ = ws_tx.send(Message::Text(json.into())).await;
        }
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
            ClientMessage::PlaceObject { kind, x, y } => {
                if state.rooms.is_host(&room_id, &player_id) {
                    let object = RoomObject {
                        id: Uuid::new_v4().to_string(),
                        room_id: room_id.to_string(),
                        kind,
                        x,
                        y,
                        rotation: 0.0,
                        z_order: 0,
                    };
                    if objects::insert(&state.db, &object).await.is_ok() {
                        let _ = tx.send(ServerMessage::ObjectPlaced { object });
                    }
                }
            }
            ClientMessage::MoveObject { object_id, x, y } => {
                if state.rooms.is_host(&room_id, &player_id) {
                    if objects::update_position(&state.db, &object_id, &room_id.to_string(), x, y)
                        .await
                        .unwrap_or(false)
                    {
                        let _ = tx.send(ServerMessage::ObjectMoved { object_id, x, y });
                    }
                }
            }
            ClientMessage::DeleteObject { object_id } => {
                if state.rooms.is_host(&room_id, &player_id) {
                    if objects::delete(&state.db, &object_id, &room_id.to_string())
                        .await
                        .unwrap_or(false)
                    {
                        let _ = tx.send(ServerMessage::ObjectDeleted { object_id });
                    }
                }
            }
            ClientMessage::YoutubeLoad { video_id } => {
                if state.rooms.is_host(&room_id, &player_id) {
                    state.rooms.set_youtube_video_id(&room_id, Some(video_id.clone()));
                    let _ = tx.send(ServerMessage::YoutubeLoad { video_id });
                }
            }
            ClientMessage::YoutubePlay { position_secs } => {
                if state.rooms.is_host(&room_id, &player_id) {
                    let _ = tx.send(ServerMessage::YoutubePlay { position_secs });
                }
            }
            ClientMessage::YoutubePause { position_secs } => {
                if state.rooms.is_host(&room_id, &player_id) {
                    let _ = tx.send(ServerMessage::YoutubePause { position_secs });
                }
            }
            ClientMessage::LocalChat { text } => {
                if !text.is_empty() && text.len() <= 200 {
                    if let Some(my_pos) = state.rooms.get_player_position(&room_id, &player_id) {
                        let nearby = state.rooms.players_within_range(&room_id, &my_pos, LOCAL_CHAT_RANGE);
                        for target_id in nearby {
                            state.rooms.send_direct(
                                &room_id,
                                &target_id,
                                ServerMessage::LocalChat {
                                    from_id: player_id.clone(),
                                    text: text.clone(),
                                },
                            );
                        }
                    }
                }
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
            ClientMessage::WhiteboardDraw { color, size, points } => {
                let stroke = vrearth_core::WhiteboardStroke { color: color.clone(), size, points: points.clone() };
                state.rooms.add_whiteboard_stroke(&room_id, stroke);
                let _ = tx.send(ServerMessage::WhiteboardDraw {
                    from_id: player_id.clone(),
                    color,
                    size,
                    points,
                });
            }
            ClientMessage::WhiteboardClear => {
                if state.rooms.is_host(&room_id, &player_id) {
                    state.rooms.clear_whiteboard(&room_id);
                    let _ = tx.send(ServerMessage::WhiteboardClear);
                }
            }
        }
    }

    // Cleanup on disconnect
    write_task.abort();
    let _ = sessions::record_leave(&state.db, &player_id.to_string()).await;
    state.rooms.leave(&room_id, &player_id);
    let _ = tx.send(ServerMessage::PlayerLeft {
        player_id: player_id.clone(),
    });
    tracing::info!("player {} disconnected from room {}", player_id, room_id);
}
