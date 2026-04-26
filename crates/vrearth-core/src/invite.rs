use crate::RoomId;
use serde::{Deserialize, Serialize};

/// JWT claims for invite tokens
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InviteClaims {
    /// Room this token grants access to
    pub room_id: RoomId,
    /// Whether the token holder is the host
    pub is_host: bool,
    /// Expiry (Unix timestamp seconds)
    pub exp: i64,
    /// Issued-at (Unix timestamp seconds)
    pub iat: i64,
}

impl InviteClaims {
    pub fn is_expired(&self, now_secs: i64) -> bool {
        self.exp <= now_secs
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_claims(exp_offset: i64) -> InviteClaims {
        let now = 1_000_000_i64;
        InviteClaims {
            room_id: RoomId::new(),
            is_host: false,
            exp: now + exp_offset,
            iat: now,
        }
    }

    #[test]
    fn valid_token_is_not_expired() {
        let claims = make_claims(3600);
        assert!(!claims.is_expired(1_000_000));
    }

    #[test]
    fn expired_token_is_detected() {
        let claims = make_claims(-1);
        assert!(claims.is_expired(1_000_000));
    }

    #[test]
    fn expiry_at_exact_boundary() {
        let claims = make_claims(0);
        // exp == now → expired (strict less-than)
        assert!(claims.is_expired(1_000_000));
    }

    #[test]
    fn claims_roundtrips_json() {
        let claims = make_claims(86400);
        let json = serde_json::to_string(&claims).unwrap();
        let back: InviteClaims = serde_json::from_str(&json).unwrap();
        assert_eq!(claims.room_id, back.room_id);
        assert_eq!(claims.exp, back.exp);
    }
}
