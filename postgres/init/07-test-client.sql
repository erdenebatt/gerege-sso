-- 07-test-client.sql
-- Pre-register a test OAuth2 client for local development
-- This client is used by the test-app running at localhost:3001

INSERT INTO oauth_clients (client_id, client_secret_hash, name, redirect_uris, allowed_scopes)
VALUES (
    'test_app_local_dev_client_id_001',
    '$2b$10$TiyUPfx//tXnO4xA7fL5UuAvGDeNp9aGTIHxWG.x5YZ6E0tLUwB56',
    'Тест Апп (Local Dev)',
    ARRAY['http://localhost:3001/callback'],
    ARRAY['openid', 'profile']
)
ON CONFLICT (client_id) DO NOTHING;
