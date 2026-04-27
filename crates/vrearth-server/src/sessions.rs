use crate::db::Db;
use serde::Serialize;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize)]
pub struct SessionEntry {
    pub id: String,
    pub room_id: String,
    pub player_name: String,
    pub joined_at: i64,
    pub left_at: Option<i64>,
}

pub async fn record_join(
    db: &Db,
    session_id: &str,
    room_id: &str,
    player_name: &str,
) -> anyhow::Result<()> {
    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs() as i64;
    sqlx::query(
        "INSERT INTO room_sessions (id, room_id, player_name, joined_at) VALUES (?, ?, ?, ?)",
    )
    .bind(session_id)
    .bind(room_id)
    .bind(player_name)
    .bind(now)
    .execute(db)
    .await?;
    Ok(())
}

pub async fn record_leave(db: &Db, session_id: &str) -> anyhow::Result<()> {
    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs() as i64;
    sqlx::query("UPDATE room_sessions SET left_at = ? WHERE id = ?")
        .bind(now)
        .bind(session_id)
        .execute(db)
        .await?;
    Ok(())
}

pub async fn list_sessions(db: &Db, room_id: &str, limit: i64) -> anyhow::Result<Vec<SessionEntry>> {
    let rows = sqlx::query_as::<_, (String, String, String, i64, Option<i64>)>(
        "SELECT id, room_id, player_name, joined_at, left_at
         FROM room_sessions WHERE room_id = ?
         ORDER BY joined_at DESC LIMIT ?",
    )
    .bind(room_id)
    .bind(limit)
    .fetch_all(db)
    .await?;

    Ok(rows
        .into_iter()
        .map(|(id, room_id, player_name, joined_at, left_at)| SessionEntry {
            id,
            room_id,
            player_name,
            joined_at,
            left_at,
        })
        .collect())
}
