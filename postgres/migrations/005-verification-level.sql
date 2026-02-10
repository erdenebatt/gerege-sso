-- Баталгаажуулалтын түвшин нэмэх
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_level INTEGER NOT NULL DEFAULT 1;

-- Одоо байгаа хэрэглэгчдийн түвшинг зөв тогтоох
-- DAN-аар баталгаажсан → level 4
UPDATE users SET verification_level = 4
WHERE id IN (SELECT DISTINCT user_id FROM dan_verification_logs);

-- Registry-аар баталгаажсан (DAN-гүй) → level 2
UPDATE users SET verification_level = 2
WHERE verification_level < 2
  AND id IN (SELECT DISTINCT user_id FROM registry_verify_logs);
