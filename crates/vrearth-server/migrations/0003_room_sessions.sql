CREATE TABLE IF NOT EXISTS room_sessions (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    player_name TEXT NOT NULL,
    joined_at INTEGER NOT NULL,
    left_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_room_sessions_room_id ON room_sessions(room_id);
