use wasm_bindgen::prelude::*;

/// Returns a gain value in [0.0, 1.0] based on Euclidean distance between two avatar positions.
///
/// - distance <= min_dist → 1.0 (full volume)
/// - distance >= max_dist → 0.0 (silent)
/// - in between           → linear falloff
#[wasm_bindgen]
pub fn compute_gain(ax: f32, ay: f32, bx: f32, by: f32, min_dist: f32, max_dist: f32) -> f32 {
    let dist = ((ax - bx).powi(2) + (ay - by).powi(2)).sqrt();
    if dist <= min_dist {
        return 1.0;
    }
    if dist >= max_dist {
        return 0.0;
    }
    1.0 - (dist - min_dist) / (max_dist - min_dist)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn gain_is_one_at_zero_distance() {
        let g = compute_gain(0.0, 0.0, 0.0, 0.0, 50.0, 200.0);
        assert!((g - 1.0).abs() < 1e-6);
    }

    #[test]
    fn gain_is_one_within_min_dist() {
        let g = compute_gain(0.0, 0.0, 30.0, 0.0, 50.0, 200.0);
        assert!((g - 1.0).abs() < 1e-6);
    }

    #[test]
    fn gain_is_zero_at_max_dist() {
        let g = compute_gain(0.0, 0.0, 200.0, 0.0, 50.0, 200.0);
        assert!((g - 0.0).abs() < 1e-6);
    }

    #[test]
    fn gain_is_zero_beyond_max_dist() {
        let g = compute_gain(0.0, 0.0, 300.0, 0.0, 50.0, 200.0);
        assert!((g - 0.0).abs() < 1e-6);
    }

    #[test]
    fn gain_is_half_at_midpoint() {
        // dist = 125.0; midpoint of [50, 200] is 125.0
        // gain = 1.0 - (125.0 - 50.0) / (200.0 - 50.0) = 1.0 - 75/150 = 0.5
        let g = compute_gain(0.0, 0.0, 125.0, 0.0, 50.0, 200.0);
        assert!((g - 0.5).abs() < 1e-5);
    }

    #[test]
    fn gain_uses_euclidean_distance() {
        // 3-4-5 triangle: dist = 5.0, which is <= min_dist=50 → gain=1.0
        let g = compute_gain(0.0, 0.0, 3.0, 4.0, 50.0, 200.0);
        assert!((g - 1.0).abs() < 1e-6);
    }
}
