-- Migration: Add Twitter/X OAuth column
-- =======================================

-- Add twitter_id column if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'users' AND column_name = 'twitter_id') THEN
        ALTER TABLE users ADD COLUMN twitter_id VARCHAR(255) UNIQUE;
        CREATE INDEX IF NOT EXISTS idx_users_twitter_id ON users(twitter_id);
    END IF;
END $$;
