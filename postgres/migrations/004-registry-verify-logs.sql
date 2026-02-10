-- Migration: Create registry_verify_logs table
-- Separates reg_no verification from DAN verification
CREATE TABLE IF NOT EXISTS registry_verify_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    reg_no VARCHAR(10) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_registry_verify_logs_user_id ON registry_verify_logs(user_id);

-- Move reg_no method entries from dan_verification_logs to registry_verify_logs
INSERT INTO registry_verify_logs (user_id, reg_no, created_at)
SELECT user_id, reg_no, created_at FROM dan_verification_logs WHERE method = 'reg_no';

DELETE FROM dan_verification_logs WHERE method = 'reg_no';
