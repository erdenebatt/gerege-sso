-- Gerege SSO Database Schema
-- ===========================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Timestamp helper functions (used by citizens triggers)
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

-- Citizens table (master data) - Production schema
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

    -- Оршин суугаа хаяг (residential address)
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

    -- Е-баримт ТИН
    ebarimt_tin                     VARCHAR(20),

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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_citizens_civil_id     ON citizens(civil_id);
CREATE INDEX IF NOT EXISTS idx_citizens_gender        ON citizens(gender);
CREATE INDEX IF NOT EXISTS idx_citizens_birth_date    ON citizens(birth_date);
CREATE INDEX IF NOT EXISTS idx_citizens_phone         ON citizens(phone_no);
CREATE INDEX IF NOT EXISTS idx_citizens_email         ON citizens(email);
CREATE INDEX IF NOT EXISTS idx_citizens_aimag         ON citizens(aimag_id);
CREATE INDEX IF NOT EXISTS idx_citizens_sum           ON citizens(sum_id);
CREATE INDEX IF NOT EXISTS idx_citizens_bag           ON citizens(bag_id);
CREATE INDEX IF NOT EXISTS idx_citizens_deleted_date  ON citizens(deleted_date);

-- Partial UNIQUE indexes (only active records)
CREATE UNIQUE INDEX IF NOT EXISTS uq_citizens_reg_no_active
    ON citizens(reg_no) WHERE deleted_date IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_citizens_hash_active
    ON citizens(hash) WHERE deleted_date IS NULL;

-- Timestamp triggers for citizens
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

-- Users table (SSO users)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    gen_id VARCHAR(11) UNIQUE NOT NULL,
    google_sub VARCHAR(255) UNIQUE,
    apple_sub VARCHAR(255) UNIQUE,
    facebook_id VARCHAR(255) UNIQUE,
    twitter_id VARCHAR(255) UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    picture VARCHAR(500),
    citizen_id INTEGER REFERENCES citizens(id),
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for users
CREATE INDEX IF NOT EXISTS idx_users_gen_id ON users(gen_id);
CREATE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub);
CREATE INDEX IF NOT EXISTS idx_users_apple_sub ON users(apple_sub);
CREATE INDEX IF NOT EXISTS idx_users_facebook_id ON users(facebook_id);
CREATE INDEX IF NOT EXISTS idx_users_twitter_id ON users(twitter_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on sessions
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    details JSONB,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Function to update updated_at timestamp (for users, sessions, etc.)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for users updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO grgdev;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO grgdev;
