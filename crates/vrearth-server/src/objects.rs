use crate::db::Db;
use anyhow::Result;
use vrearth_core::RoomObject;

pub async fn list(db: &Db, room_id: &str) -> Result<Vec<RoomObject>> {
    let rows = sqlx::query_as::<_, (String, String, String, f64, f64, f64, i64)>(
        "SELECT id, room_id, kind, x, y, rotation, z_order FROM room_objects WHERE room_id = ? ORDER BY z_order, created_at"
    )
    .bind(room_id)
    .fetch_all(db)
    .await?;

    Ok(rows
        .into_iter()
        .map(|(id, room_id, kind, x, y, rotation, z_order)| RoomObject {
            id,
            room_id,
            kind,
            x: x as f32,
            y: y as f32,
            rotation: rotation as f32,
            z_order,
        })
        .collect())
}

pub async fn insert(db: &Db, obj: &RoomObject) -> Result<()> {
    let now = now_secs();
    sqlx::query(
        "INSERT INTO room_objects (id, room_id, kind, x, y, rotation, z_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&obj.id)
    .bind(&obj.room_id)
    .bind(&obj.kind)
    .bind(obj.x as f64)
    .bind(obj.y as f64)
    .bind(obj.rotation as f64)
    .bind(obj.z_order)
    .bind(now)
    .execute(db)
    .await?;
    Ok(())
}

pub async fn update_position(db: &Db, object_id: &str, room_id: &str, x: f32, y: f32) -> Result<bool> {
    let result = sqlx::query(
        "UPDATE room_objects SET x = ?, y = ? WHERE id = ? AND room_id = ?"
    )
    .bind(x as f64)
    .bind(y as f64)
    .bind(object_id)
    .bind(room_id)
    .execute(db)
    .await?;
    Ok(result.rows_affected() > 0)
}

pub async fn delete(db: &Db, object_id: &str, room_id: &str) -> Result<bool> {
    let result = sqlx::query(
        "DELETE FROM room_objects WHERE id = ? AND room_id = ?"
    )
    .bind(object_id)
    .bind(room_id)
    .execute(db)
    .await?;
    Ok(result.rows_affected() > 0)
}

fn now_secs() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}
