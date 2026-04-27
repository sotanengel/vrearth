CREATE TABLE IF NOT EXISTS room_objects (
    id         TEXT PRIMARY KEY,
    room_id    TEXT NOT NULL,
    kind       TEXT NOT NULL,
    x          REAL NOT NULL,
    y          REAL NOT NULL,
    rotation   REAL NOT NULL DEFAULT 0,
    z_order    INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_room_objects_room_id ON room_objects(room_id);
