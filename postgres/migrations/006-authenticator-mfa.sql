-- Migration: MFA/Authenticator tables for Gerege SSO
-- Adds multi-factor authentication support (TOTP, Passkey, Push, QR Login)

-- Add MFA columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_level INTEGER NOT NULL DEFAULT 0;

-- MFA settings per user
CREATE TABLE IF NOT EXISTS user_mfa_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    totp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    passkey_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    push_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    preferred_method VARCHAR(20) DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- TOTP secrets (AES-256-GCM encrypted)
CREATE TABLE IF NOT EXISTS user_totp (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    totp_secret_encrypted BYTEA NOT NULL,
    totp_nonce BYTEA NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Recovery codes (SHA-256 hashed)
CREATE TABLE IF NOT EXISTS mfa_recovery_codes (
    id VARCHAR(36) PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash VARCHAR(128) NOT NULL,
    salt VARCHAR(64) NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mfa_recovery_codes_user_id ON mfa_recovery_codes(user_id);

-- WebAuthn/Passkey credentials
CREATE TABLE IF NOT EXISTS webauthn_credentials (
    id VARCHAR(36) PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    credential_id BYTEA NOT NULL UNIQUE,
    public_key BYTEA NOT NULL,
    attestation_type VARCHAR(50) NOT NULL DEFAULT '',
    aaguid BYTEA,
    sign_count BIGINT NOT NULL DEFAULT 0,
    credential_name VARCHAR(255) NOT NULL DEFAULT 'My Passkey',
    transport TEXT[] DEFAULT '{}',
    backup_eligible BOOLEAN NOT NULL DEFAULT FALSE,
    backup_state BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_user_id ON webauthn_credentials(user_id);

-- Push notification device tokens
CREATE TABLE IF NOT EXISTS user_devices (
    id VARCHAR(36) PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_token TEXT NOT NULL,
    device_name VARCHAR(255) NOT NULL DEFAULT '',
    device_type VARCHAR(20) NOT NULL DEFAULT 'android',
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON user_devices(user_id);

-- QR login sessions
CREATE TABLE IF NOT EXISTS qr_login_sessions (
    id VARCHAR(36) PRIMARY KEY,
    session_uuid VARCHAR(64) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    user_id INTEGER REFERENCES users(id),
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_qr_login_sessions_uuid ON qr_login_sessions(session_uuid);
CREATE INDEX IF NOT EXISTS idx_qr_login_sessions_status ON qr_login_sessions(status);

-- MFA audit log
CREATE TABLE IF NOT EXISTS mfa_audit_log (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    method VARCHAR(20),
    success BOOLEAN NOT NULL DEFAULT FALSE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mfa_audit_log_user_id ON mfa_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_audit_log_created_at ON mfa_audit_log(created_at);
