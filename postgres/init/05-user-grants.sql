-- User Grants: Track which OAuth clients users have authorized
-- ============================================================

CREATE TABLE IF NOT EXISTS user_grants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id VARCHAR(64) NOT NULL,
    scopes TEXT[] NOT NULL DEFAULT ARRAY['openid', 'profile'],
    granted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    UNIQUE(user_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_user_grants_user_id ON user_grants(user_id);
CREATE INDEX IF NOT EXISTS idx_user_grants_client_id ON user_grants(client_id);

-- Grant permissions
GRANT ALL PRIVILEGES ON user_grants TO grgdev;
