mod app;
mod db;
mod handlers;
mod invite;
mod objects;
mod room;
mod sessions;
mod state;
mod ws;

use state::AppState;
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .init();

    let jwt_secret = std::env::var("JWT_SECRET")
        .unwrap_or_else(|_| "change-me-in-production-min-32-chars".to_string())
        .into_bytes();

    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "vrearth.db".to_string());

    let db = db::connect(&database_url).await?;

    let state = AppState::new(jwt_secret, db);
    let router = app::build_router(state);

    let addr = "0.0.0.0:3000";
    let listener = tokio::net::TcpListener::bind(addr).await?;
    tracing::info!("vrearth-server listening on {addr}");

    axum::serve(listener, router).await?;
    Ok(())
}
