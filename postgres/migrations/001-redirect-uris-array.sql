-- Migration: Convert redirect_uri (single TEXT) to redirect_uris (TEXT array)
-- For existing databases that already have the redirect_uri column.

ALTER TABLE oauth_clients ADD COLUMN redirect_uris TEXT[] DEFAULT ARRAY[]::TEXT[];
UPDATE oauth_clients SET redirect_uris = ARRAY[redirect_uri] WHERE redirect_uri IS NOT NULL;
ALTER TABLE oauth_clients DROP COLUMN redirect_uri;
