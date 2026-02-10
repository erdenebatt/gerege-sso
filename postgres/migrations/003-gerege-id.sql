-- Migration: Add gerege_id column to citizens table
-- Stores the ID from Gerege Core API
ALTER TABLE citizens ADD COLUMN IF NOT EXISTS gerege_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_citizens_gerege_id ON citizens(gerege_id);
