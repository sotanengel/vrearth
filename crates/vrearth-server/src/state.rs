use crate::room::RoomRegistry;
use std::sync::Arc;

#[derive(Clone)]
pub struct AppState {
    pub rooms: Arc<RoomRegistry>,
    pub jwt_secret: Arc<Vec<u8>>,
}

impl AppState {
    pub fn new(jwt_secret: Vec<u8>) -> Self {
        Self {
            rooms: Arc::new(RoomRegistry::new()),
            jwt_secret: Arc::new(jwt_secret),
        }
    }
}
