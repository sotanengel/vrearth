use anyhow::{anyhow, Result};
use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use vrearth_core::{InviteClaims, RoomId};

pub struct InviteService;

/// Token validity durations in seconds
pub const HOST_TOKEN_TTL_SECS: i64 = 7 * 24 * 3600; // 7 days
pub const GUEST_TOKEN_TTL_SECS: i64 = 24 * 3600; // 24 hours

impl InviteService {
    /// Issue a host invite token
    pub fn issue_host(room_id: RoomId, secret: &[u8]) -> Result<String> {
        let now = now_secs();
        Self::encode_claims(
            InviteClaims {
                room_id,
                is_host: true,
                iat: now,
                exp: now + HOST_TOKEN_TTL_SECS,
            },
            secret,
        )
    }

    /// Issue a single-use guest invite token (default 24h TTL)
    pub fn issue_guest(room_id: RoomId, secret: &[u8]) -> Result<String> {
        Self::issue_guest_with_ttl(room_id, secret, GUEST_TOKEN_TTL_SECS)
    }

    /// Issue a guest invite token with an explicit TTL in seconds
    pub fn issue_guest_with_ttl(room_id: RoomId, secret: &[u8], ttl_secs: i64) -> Result<String> {
        let now = now_secs();
        Self::encode_claims(
            InviteClaims {
                room_id,
                is_host: false,
                iat: now,
                exp: now + ttl_secs,
            },
            secret,
        )
    }

    /// Issue a token with explicit expiry (for testing)
    #[cfg(test)]
    pub fn issue_with_exp(
        room_id: RoomId,
        is_host: bool,
        exp: i64,
        secret: &[u8],
    ) -> Result<String> {
        let now = now_secs();
        Self::encode_claims(
            InviteClaims {
                room_id,
                is_host,
                iat: now,
                exp,
            },
            secret,
        )
    }

    pub fn verify(token: &str, secret: &[u8]) -> Result<InviteClaims> {
        let key = DecodingKey::from_secret(secret);
        let mut validation = Validation::new(Algorithm::HS256);
        validation.validate_exp = true;
        let data = decode::<InviteClaims>(token, &key, &validation)
            .map_err(|e| anyhow!("invalid token: {e}"))?;
        Ok(data.claims)
    }

    fn encode_claims(claims: InviteClaims, secret: &[u8]) -> Result<String> {
        let key = EncodingKey::from_secret(secret);
        encode(&Header::default(), &claims, &key).map_err(|e| anyhow!("encode error: {e}"))
    }
}

fn now_secs() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

#[cfg(test)]
mod tests {
    use super::*;

    const SECRET: &[u8] = b"test-secret-32-bytes-padded-here";

    #[test]
    fn host_token_verifies_successfully() {
        let room_id = RoomId::new();
        let token = InviteService::issue_host(room_id.clone(), SECRET).unwrap();
        let claims = InviteService::verify(&token, SECRET).unwrap();
        assert_eq!(claims.room_id, room_id);
        assert!(claims.is_host);
    }

    #[test]
    fn guest_token_verifies_successfully() {
        let room_id = RoomId::new();
        let token = InviteService::issue_guest(room_id.clone(), SECRET).unwrap();
        let claims = InviteService::verify(&token, SECRET).unwrap();
        assert_eq!(claims.room_id, room_id);
        assert!(!claims.is_host);
    }

    #[test]
    fn expired_token_is_rejected() {
        let room_id = RoomId::new();
        // exp = 1 (epoch + 1s — always in the past)
        let token = InviteService::issue_with_exp(room_id, false, 1, SECRET).unwrap();
        let result = InviteService::verify(&token, SECRET);
        assert!(result.is_err(), "expired token should be rejected");
    }

    #[test]
    fn tampered_token_is_rejected() {
        let room_id = RoomId::new();
        let mut token = InviteService::issue_host(room_id, SECRET).unwrap();
        token.push('x');
        let result = InviteService::verify(&token, SECRET);
        assert!(result.is_err(), "tampered token should be rejected");
    }

    #[test]
    fn wrong_secret_is_rejected() {
        let room_id = RoomId::new();
        let token = InviteService::issue_host(room_id, SECRET).unwrap();
        let result = InviteService::verify(&token, b"wrong-secret-32-bytes-padded!!!!!");
        assert!(result.is_err(), "wrong secret should be rejected");
    }
}
