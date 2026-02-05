-- Gerege SSO Database Schema
-- ===========================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Citizens table (master data) - Production schema
CREATE TABLE IF NOT EXISTS citizens (
    id SERIAL PRIMARY KEY,
    civil_id BIGINT UNIQUE,
    reg_no VARCHAR(12) UNIQUE NOT NULL,
    family_name VARCHAR(100),
    last_name VARCHAR(100),
    first_name VARCHAR(100) NOT NULL,
    gender INTEGER DEFAULT 1,
    birth_date DATE,
    phone_no VARCHAR(20),
    email VARCHAR(255),
    is_foreign INTEGER DEFAULT 0,
    country_code VARCHAR(10),
    hash VARCHAR(255),
    parent_address_id INTEGER DEFAULT 0,
    parent_address_name VARCHAR(100),
    aimag_id INTEGER DEFAULT 0,
    aimag_code VARCHAR(10),
    aimag_name VARCHAR(100),
    sum_id INTEGER DEFAULT 0,
    sum_code VARCHAR(10),
    sum_name VARCHAR(100),
    bag_id INTEGER DEFAULT 0,
    bag_code VARCHAR(10),
    bag_name VARCHAR(100),
    address_detail TEXT,
    address_type VARCHAR(10),
    address_type_name VARCHAR(100),
    nationality VARCHAR(100),
    country_name VARCHAR(100),
    country_name_en VARCHAR(100),
    profile_img_url TEXT,
    created_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_user_id INTEGER DEFAULT 0,
    created_org_id INTEGER DEFAULT 0,
    updated_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_user_id INTEGER DEFAULT 0,
    updated_org_id INTEGER DEFAULT 0,
    deleted_user_id INTEGER DEFAULT 0,
    deleted_org_id INTEGER DEFAULT 0,
    deleted_date TIMESTAMP WITH TIME ZONE
);

-- Create indexes on citizens for fast lookup
CREATE INDEX IF NOT EXISTS idx_citizens_reg_no ON citizens(reg_no);
CREATE INDEX IF NOT EXISTS idx_citizens_civil_id ON citizens(civil_id);
CREATE INDEX IF NOT EXISTS idx_citizens_email ON citizens(email);

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

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to update updated_date timestamp (for citizens)
CREATE OR REPLACE FUNCTION update_updated_date_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_date = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at / updated_date
CREATE TRIGGER update_citizens_updated_date
    BEFORE UPDATE ON citizens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_date_column();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO grgdev;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO grgdev;
