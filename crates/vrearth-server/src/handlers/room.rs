use crate::{invite::InviteService, state::AppState};
use axum::{
    extract::{Query, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use vrearth_core::RoomId;

#[derive(Deserialize)]
pub struct CreateRoomRequest {
    pub name: String,
}

#[derive(Serialize)]
pub struct CreateRoomResponse {
    pub room_id: String,
    pub host_token: String,
}

pub async fn create_room(
    State(state): State<AppState>,
    Json(req): Json<CreateRoomRequest>,
) -> impl IntoResponse {
    let room_id = RoomId::new();
    state.rooms.create_room(room_id.clone());

    let token = match InviteService::issue_host(room_id.clone(), &state.jwt_secret) {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("failed to issue host token: {e}");
            return (StatusCode::INTERNAL_SERVER_ERROR, "token error").into_response();
        }
    };

    tracing::info!("created room {} ({})", req.name, room_id);

    (
        StatusCode::CREATED,
        Json(CreateRoomResponse {
            room_id: room_id.to_string(),
            host_token: token,
        }),
    )
        .into_response()
}

#[derive(Serialize)]
pub struct CreateInviteResponse {
    pub token: String,
}

/// Extract Bearer token from Authorization header
fn extract_bearer(headers: &HeaderMap) -> Option<&str> {
    let val = headers.get("authorization")?.to_str().ok()?;
    val.strip_prefix("Bearer ")
        .or_else(|| val.strip_prefix("bearer "))
}

#[derive(Deserialize)]
pub struct InviteQuery {
    /// Optional TTL override: "1h", "24h", or "7d". Defaults to 24h.
    pub ttl: Option<String>,
}

/// POST /api/rooms/:room_id/invite — host-only endpoint to issue a guest invite token
pub async fn create_invite(
    State(state): State<AppState>,
    axum::extract::Path(room_id_str): axum::extract::Path<String>,
    headers: HeaderMap,
    Query(query): Query<InviteQuery>,
) -> impl IntoResponse {
    let token_str = match extract_bearer(&headers) {
        Some(t) => t,
        None => return (StatusCode::UNAUTHORIZED, "missing token").into_response(),
    };

    // Verify the caller's token
    let claims = match InviteService::verify(token_str, &state.jwt_secret) {
        Ok(c) => c,
        Err(_) => return (StatusCode::UNAUTHORIZED, "invalid token").into_response(),
    };

    // Ensure caller is host
    if !claims.is_host {
        return (StatusCode::FORBIDDEN, "host only").into_response();
    }

    // Ensure room_id in path matches token
    if claims.room_id.to_string() != room_id_str {
        return (StatusCode::FORBIDDEN, "room mismatch").into_response();
    }

    let ttl_secs: i64 = match query.ttl.as_deref() {
        Some("1h") => 3600,
        Some("7d") => 7 * 24 * 3600,
        _ => 24 * 3600, // default: 24h
    };

    let token = match InviteService::issue_guest_with_ttl(claims.room_id, &state.jwt_secret, ttl_secs) {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("failed to issue guest token: {e}");
            return (StatusCode::INTERNAL_SERVER_ERROR, "token error").into_response();
        }
    };

    Json(CreateInviteResponse { token }).into_response()
}
