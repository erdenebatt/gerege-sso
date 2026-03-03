-- Create dan_verification_logs table (was referenced but never created)
CREATE TABLE IF NOT EXISTS dan_verification_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reg_no VARCHAR(20) NOT NULL,
    method VARCHAR(50) NOT NULL DEFAULT 'dan_sso',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dan_verification_logs_user_id ON dan_verification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_dan_verification_logs_created_at ON dan_verification_logs(created_at DESC);
