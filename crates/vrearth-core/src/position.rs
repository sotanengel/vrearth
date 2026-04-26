use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Position {
    pub x: f32,
    pub y: f32,
}

#[derive(Debug, Clone, Copy)]
pub struct RoomBounds {
    pub width: f32,
    pub height: f32,
}

impl Default for RoomBounds {
    fn default() -> Self {
        Self {
            width: 1280.0,
            height: 720.0,
        }
    }
}

impl Position {
    pub fn new(x: f32, y: f32) -> Self {
        Self { x, y }
    }

    pub fn zero() -> Self {
        Self { x: 0.0, y: 0.0 }
    }

    pub fn apply_delta(self, dx: f32, dy: f32, bounds: &RoomBounds) -> Self {
        Self {
            x: (self.x + dx).clamp(0.0, bounds.width),
            y: (self.y + dy).clamp(0.0, bounds.height),
        }
    }

    /// Euclidean distance to another position
    pub fn distance_to(&self, other: &Position) -> f32 {
        let dx = self.x - other.x;
        let dy = self.y - other.y;
        (dx * dx + dy * dy).sqrt()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn position_apply_delta_within_bounds() {
        let p = Position::new(10.0, 10.0);
        let bounds = RoomBounds::default();
        let moved = p.apply_delta(1.5, -2.0, &bounds);
        assert!((moved.x - 11.5).abs() < f32::EPSILON);
        assert!((moved.y - 8.0).abs() < f32::EPSILON);
    }

    #[test]
    fn position_clamped_at_right_edge() {
        let bounds = RoomBounds {
            width: 100.0,
            height: 100.0,
        };
        let p = Position::new(99.0, 0.0);
        let moved = p.apply_delta(10.0, 0.0, &bounds);
        assert!(moved.x <= bounds.width);
        assert!((moved.x - 100.0).abs() < f32::EPSILON);
    }

    #[test]
    fn position_clamped_at_left_edge() {
        let bounds = RoomBounds {
            width: 100.0,
            height: 100.0,
        };
        let p = Position::new(1.0, 50.0);
        let moved = p.apply_delta(-10.0, 0.0, &bounds);
        assert!((moved.x - 0.0).abs() < f32::EPSILON);
    }

    #[test]
    fn position_clamped_at_bottom_edge() {
        let bounds = RoomBounds {
            width: 100.0,
            height: 100.0,
        };
        let p = Position::new(50.0, 99.0);
        let moved = p.apply_delta(0.0, 10.0, &bounds);
        assert!((moved.y - 100.0).abs() < f32::EPSILON);
    }

    #[test]
    fn distance_to_self_is_zero() {
        let p = Position::new(10.0, 20.0);
        assert!((p.distance_to(&p) - 0.0).abs() < f32::EPSILON);
    }

    #[test]
    fn distance_to_is_pythagorean() {
        let a = Position::zero();
        let b = Position::new(3.0, 4.0);
        assert!((a.distance_to(&b) - 5.0).abs() < 1e-5);
    }

    #[test]
    fn distance_to_is_symmetric() {
        let a = Position::new(1.0, 2.0);
        let b = Position::new(4.0, 6.0);
        assert!((a.distance_to(&b) - b.distance_to(&a)).abs() < f32::EPSILON);
    }

    #[test]
    fn position_roundtrips_json() {
        let p = Position::new(42.5, 17.3);
        let json = serde_json::to_string(&p).unwrap();
        let back: Position = serde_json::from_str(&json).unwrap();
        assert!((back.x - p.x).abs() < 1e-5);
        assert!((back.y - p.y).abs() < 1e-5);
    }
}
