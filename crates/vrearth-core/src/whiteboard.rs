use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WhiteboardStroke {
    pub color: String,
    pub size: f32,
    pub points: Vec<[f32; 2]>,
}
