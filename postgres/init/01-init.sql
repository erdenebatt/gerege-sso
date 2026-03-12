-- Gerege SSO Database Schema
-- ===========================
-- Complete schema matching production (includes all migrations 001-007)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Helper Functions
-- ============================================================

CREATE OR REPLACE FUNCTION set_timestamps_on_insert()
RETURNS TRIGGER AS $$
BEGIN
    NEW.created_date = NOW();
    NEW.updated_date = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_updated_date_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_date = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================
-- Citizens table (master data)
-- ============================================================
CREATE TABLE IF NOT EXISTS citizens (
    id                   BIGSERIAL PRIMARY KEY,

    civil_id             BIGINT,
    reg_no               VARCHAR(10),
    family_name          VARCHAR(80),
    last_name            VARCHAR(150),
    first_name           VARCHAR(150),
    gender               BIGINT,
    birth_date           VARCHAR(10),

    phone_no             VARCHAR(8),
    email                VARCHAR(80),

    is_foreign           BIGINT,
    country_code         VARCHAR(3),
    hash                 VARCHAR(200),

    parent_address_id    BIGINT,
    parent_address_name  VARCHAR(20),

    aimag_id             BIGINT,
    aimag_code           VARCHAR(3),
    aimag_name           VARCHAR(255),

    sum_id               BIGINT,
    sum_code             VARCHAR(3),
    sum_name             VARCHAR(255),

    bag_id               BIGINT,
    bag_code             VARCHAR(3),
    bag_name             VARCHAR(255),

    address_detail       VARCHAR(255),
    address_type         VARCHAR(255),
    address_type_name    VARCHAR(255),

    nationality          VARCHAR(255),
    country_name         VARCHAR(255),
    country_name_en      VARCHAR(255),

    profile_img_url      VARCHAR(255),

    -- Residential address (migration 002)
    residential_parent_address_id   BIGINT,
    residential_parent_address_name VARCHAR(20),
    residential_aimag_id            BIGINT,
    residential_aimag_code          VARCHAR(3),
    residential_aimag_name          VARCHAR(255),
    residential_sum_id              BIGINT,
    residential_sum_code            VARCHAR(3),
    residential_sum_name            VARCHAR(255),
    residential_bag_id              BIGINT,
    residential_bag_code            VARCHAR(3),
    residential_bag_name            VARCHAR(255),
    residential_address_detail      VARCHAR(255),

    -- Ebarimt TIN (migration 002)
    ebarimt_tin                     VARCHAR(20),

    -- Gerege Core API ID (migration 003)
    gerege_id            BIGINT,

    created_date         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_user_id      BIGINT       NOT NULL DEFAULT 0,
    created_org_id       BIGINT       NOT NULL DEFAULT 0,

    updated_date         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_user_id      BIGINT       NOT NULL DEFAULT 0,
    updated_org_id       BIGINT       NOT NULL DEFAULT 0,

    deleted_user_id      BIGINT,
    deleted_org_id       BIGINT,
    deleted_date         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_citizens_civil_id     ON citizens(civil_id);
CREATE INDEX IF NOT EXISTS idx_citizens_gender        ON citizens(gender);
CREATE INDEX IF NOT EXISTS idx_citizens_birth_date    ON citizens(birth_date);
CREATE INDEX IF NOT EXISTS idx_citizens_phone         ON citizens(phone_no);
CREATE INDEX IF NOT EXISTS idx_citizens_email         ON citizens(email);
CREATE INDEX IF NOT EXISTS idx_citizens_aimag         ON citizens(aimag_id);
CREATE INDEX IF NOT EXISTS idx_citizens_sum           ON citizens(sum_id);
CREATE INDEX IF NOT EXISTS idx_citizens_bag           ON citizens(bag_id);
CREATE INDEX IF NOT EXISTS idx_citizens_deleted_date  ON citizens(deleted_date);
CREATE INDEX IF NOT EXISTS idx_citizens_gerege_id     ON citizens(gerege_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_citizens_reg_no_active
    ON citizens(reg_no) WHERE deleted_date IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_citizens_hash_active
    ON citizens(hash) WHERE deleted_date IS NULL;

DROP TRIGGER IF EXISTS trg_citizens_ins_set_timestamps ON citizens;
CREATE TRIGGER trg_citizens_ins_set_timestamps
    BEFORE INSERT ON citizens
    FOR EACH ROW
    EXECUTE FUNCTION set_timestamps_on_insert();

DROP TRIGGER IF EXISTS trg_citizens_upd_set_updated ON citizens;
CREATE TRIGGER trg_citizens_upd_set_updated
    BEFORE UPDATE ON citizens
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_date_timestamp();

-- ============================================================
-- Users table (SSO users)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    gen_id VARCHAR(11) NOT NULL,
    google_sub VARCHAR(255) UNIQUE,
    apple_sub VARCHAR(255) UNIQUE,
    facebook_id VARCHAR(255) UNIQUE,
    twitter_id VARCHAR(255) UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    picture VARCHAR(500),
    citizen_id INTEGER REFERENCES citizens(id),
    verified BOOLEAN DEFAULT FALSE,
    verification_level INTEGER NOT NULL DEFAULT 1,
    mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_level INTEGER NOT NULL DEFAULT 0,
    org_id VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_users_gen_id ON users(gen_id);
CREATE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub);
CREATE INDEX IF NOT EXISTS idx_users_apple_sub ON users(apple_sub);
CREATE INDEX IF NOT EXISTS idx_users_facebook_id ON users(facebook_id);
CREATE INDEX IF NOT EXISTS idx_users_twitter_id ON users(twitter_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Sessions table
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- ============================================================
-- Audit logs
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    details JSONB,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================================
-- API logs
-- ============================================================
CREATE TABLE IF NOT EXISTS api_logs (
    id BIGSERIAL PRIMARY KEY,
    method VARCHAR(10) NOT NULL,
    path TEXT NOT NULL,
    query TEXT,
    status_code INTEGER NOT NULL,
    latency_ms INTEGER NOT NULL,
    client_ip VARCHAR(45),
    user_agent TEXT,
    request_headers JSONB DEFAULT '{}'::jsonb,
    request_body TEXT,
    response_headers JSONB DEFAULT '{}'::jsonb,
    response_body TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON api_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_logs_path ON api_logs(path);

-- ============================================================
-- OAuth2 Provider (clients & grants)
-- ============================================================
CREATE TABLE IF NOT EXISTS oauth_clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id VARCHAR(64) UNIQUE NOT NULL,
    client_secret_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    redirect_uris TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    allowed_scopes TEXT[] DEFAULT ARRAY['openid', 'profile'],
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_oauth_clients_client_id ON oauth_clients(client_id);

CREATE TRIGGER update_oauth_clients_updated_at
    BEFORE UPDATE ON oauth_clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS user_grants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id VARCHAR(64) NOT NULL,
    scopes TEXT[] NOT NULL DEFAULT ARRAY['openid', 'profile'],
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_user_grants_user_id ON user_grants(user_id);
CREATE INDEX IF NOT EXISTS idx_user_grants_client_id ON user_grants(client_id);

-- ============================================================
-- DAN verification logs (migration 007)
-- ============================================================
CREATE TABLE IF NOT EXISTS dan_verification_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reg_no VARCHAR(20) NOT NULL,
    method VARCHAR(50) NOT NULL DEFAULT 'dan_sso',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dan_verification_logs_user_id ON dan_verification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_dan_verification_logs_created_at ON dan_verification_logs(created_at DESC);

-- ============================================================
-- Registry verification logs (migration 004)
-- ============================================================
CREATE TABLE IF NOT EXISTS registry_verify_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    reg_no VARCHAR(10) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_registry_verify_logs_user_id ON registry_verify_logs(user_id);

-- ============================================================
-- MFA tables (migration 006)
-- ============================================================

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
