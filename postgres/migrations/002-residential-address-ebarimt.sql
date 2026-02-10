-- Migration: Add residential address and ebarimt_tin columns to citizens table
-- Date: 2026-02-10

-- Оршин суугаа хаяг (residential address)
ALTER TABLE citizens ADD COLUMN IF NOT EXISTS residential_parent_address_id BIGINT;
ALTER TABLE citizens ADD COLUMN IF NOT EXISTS residential_parent_address_name VARCHAR(20);
ALTER TABLE citizens ADD COLUMN IF NOT EXISTS residential_aimag_id BIGINT;
ALTER TABLE citizens ADD COLUMN IF NOT EXISTS residential_aimag_code VARCHAR(3);
ALTER TABLE citizens ADD COLUMN IF NOT EXISTS residential_aimag_name VARCHAR(255);
ALTER TABLE citizens ADD COLUMN IF NOT EXISTS residential_sum_id BIGINT;
ALTER TABLE citizens ADD COLUMN IF NOT EXISTS residential_sum_code VARCHAR(3);
ALTER TABLE citizens ADD COLUMN IF NOT EXISTS residential_sum_name VARCHAR(255);
ALTER TABLE citizens ADD COLUMN IF NOT EXISTS residential_bag_id BIGINT;
ALTER TABLE citizens ADD COLUMN IF NOT EXISTS residential_bag_code VARCHAR(3);
ALTER TABLE citizens ADD COLUMN IF NOT EXISTS residential_bag_name VARCHAR(255);
ALTER TABLE citizens ADD COLUMN IF NOT EXISTS residential_address_detail VARCHAR(255);

-- Е-баримт ТИН
ALTER TABLE citizens ADD COLUMN IF NOT EXISTS ebarimt_tin VARCHAR(20);
