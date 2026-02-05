-- Migration: Add Apple and Facebook OAuth columns
-- ================================================

-- Add apple_sub column if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'users' AND column_name = 'apple_sub') THEN
        ALTER TABLE users ADD COLUMN apple_sub VARCHAR(255) UNIQUE;
        CREATE INDEX IF NOT EXISTS idx_users_apple_sub ON users(apple_sub);
    END IF;
END $$;

-- Add facebook_id column if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'users' AND column_name = 'facebook_id') THEN
        ALTER TABLE users ADD COLUMN facebook_id VARCHAR(255) UNIQUE;
        CREATE INDEX IF NOT EXISTS idx_users_facebook_id ON users(facebook_id);
    END IF;
END $$;
