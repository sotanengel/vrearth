use crate::{
    handlers::{
        health::health,
        room::{create_invite, create_room, get_sessions},
    },
    state::AppState,
    ws::ws_handler,
};
use axum::{
    routing::{get, post},
    Router,
};
use tower_http::{
    cors::{Any, CorsLayer},
    services::{ServeDir, ServeFile},
};

pub fn build_router(state: AppState) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Serve frontend SPA from ./static/ (used in Docker; falls back to index.html for deep links)
    let static_dir = ServeDir::new("static").not_found_service(ServeFile::new("static/index.html"));

    Router::new()
        .route("/health", get(health))
        .route("/api/rooms", post(create_room))
        .route("/api/rooms/{room_id}/invite", post(create_invite))
        .route("/api/rooms/{room_id}/sessions", get(get_sessions))
        .route("/ws", get(ws_handler))
        .layer(cors)
        .with_state(state)
        .fallback_service(static_dir)
}
