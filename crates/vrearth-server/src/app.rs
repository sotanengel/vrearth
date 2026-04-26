use crate::{
    handlers::{
        health::health,
        room::{create_invite, create_room},
    },
    state::AppState,
    ws::ws_handler,
};
use axum::{
    routing::{get, post},
    Router,
};
use tower_http::cors::{Any, CorsLayer};

pub fn build_router(state: AppState) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    Router::new()
        .route("/health", get(health))
        .route("/api/rooms", post(create_room))
        .route("/api/rooms/{room_id}/invite", post(create_invite))
        .route("/ws", get(ws_handler))
        .layer(cors)
        .with_state(state)
}
