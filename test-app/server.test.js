const crypto = require('crypto');
const request = require('supertest');
const { app, base64url, generatePKCE, pendingAuth, userTokens } = require('./server');

// ============================================================
// A. Unit tests — PKCE helpers
// ============================================================
describe('PKCE helpers', () => {
  describe('base64url()', () => {
    test('replaces + with - and / with _', () => {
      // Create a buffer that produces + and / in standard base64
      // 0xFB, 0xEF, 0xBE = base64 "++++++" but let's use a known value
      const buf = Buffer.from([0x3e, 0x3f]); // standard base64: "Pj8=" -> base64url: "Pj8"
      const result = base64url(buf);
      expect(result).not.toMatch(/\+/);
      expect(result).not.toMatch(/\//);
      expect(result).not.toMatch(/=$/);
    });

    test('removes padding characters', () => {
      // A 1-byte buffer produces base64 with "==" padding
      const buf = Buffer.from([0x41]); // 'A' -> base64: "QQ=="
      const result = base64url(buf);
      expect(result).toBe('QQ');
      expect(result).not.toContain('=');
    });

    test('produces correct base64url for known input', () => {
      const buf = Buffer.from('Hello, World!');
      const result = base64url(buf);
      // Standard base64: "SGVsbG8sIFdvcmxkIQ=="
      // base64url: "SGVsbG8sIFdvcmxkIQ"
      expect(result).toBe('SGVsbG8sIFdvcmxkIQ');
    });

    test('handles buffer with characters that differ between base64 and base64url', () => {
      // 0xFB, 0xFF, 0xFE -> standard base64: "u//+" -> base64url: "u__-"
      const buf = Buffer.from([0xBB, 0xFF, 0xFE]);
      const result = base64url(buf);
      expect(result).toBe('u__-');
    });
  });

  describe('generatePKCE()', () => {
    test('returns an object with verifier and challenge', () => {
      const pkce = generatePKCE();
      expect(pkce).toHaveProperty('verifier');
      expect(pkce).toHaveProperty('challenge');
      expect(typeof pkce.verifier).toBe('string');
      expect(typeof pkce.challenge).toBe('string');
    });

    test('verifier and challenge are non-empty strings', () => {
      const pkce = generatePKCE();
      expect(pkce.verifier.length).toBeGreaterThan(0);
      expect(pkce.challenge.length).toBeGreaterThan(0);
    });

    test('challenge is SHA256 hash of verifier in base64url', () => {
      const pkce = generatePKCE();
      const expectedChallenge = base64url(
        crypto.createHash('sha256').update(pkce.verifier).digest()
      );
      expect(pkce.challenge).toBe(expectedChallenge);
    });

    test('generates unique verifier/challenge pairs', () => {
      const pkce1 = generatePKCE();
      const pkce2 = generatePKCE();
      expect(pkce1.verifier).not.toBe(pkce2.verifier);
      expect(pkce1.challenge).not.toBe(pkce2.challenge);
    });

    test('output compatible with Go base64.RawURLEncoding (no padding, URL-safe chars)', () => {
      // Go's base64.RawURLEncoding uses URL-safe alphabet without padding
      for (let i = 0; i < 10; i++) {
        const pkce = generatePKCE();
        // Must not contain +, /, or = (standard base64 chars)
        expect(pkce.verifier).not.toMatch(/[+/=]/);
        expect(pkce.challenge).not.toMatch(/[+/=]/);
        // Must only contain URL-safe base64 chars
        expect(pkce.verifier).toMatch(/^[A-Za-z0-9_-]+$/);
        expect(pkce.challenge).toMatch(/^[A-Za-z0-9_-]+$/);
      }
    });
  });
});

// ============================================================
// B. Integration tests — Routes (supertest)
// ============================================================
describe('Routes', () => {
  beforeEach(() => {
    pendingAuth.clear();
    userTokens.clear();
  });

  describe('GET /', () => {
    test('returns 200 with HTML', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/html/);
    });

    test('contains "Gerege SSO" text', async () => {
      const res = await request(app).get('/');
      expect(res.text).toContain('Gerege SSO');
    });
  });

  describe('GET /login', () => {
    test('returns 302 redirect', async () => {
      const res = await request(app).get('/login');
      expect(res.status).toBe(302);
    });

    test('redirects to /api/oauth/authorize with PKCE params', async () => {
      const res = await request(app).get('/login');
      const location = res.headers['location'];
      expect(location).toContain('/api/oauth/authorize');
      expect(location).toContain('code_challenge=');
      expect(location).toContain('code_challenge_method=S256');
      expect(location).toContain('state=');
      expect(location).toContain('client_id=');
      expect(location).toContain('redirect_uri=');
      expect(location).toContain('response_type=code');
    });

    test('stores state in pendingAuth Map', async () => {
      expect(pendingAuth.size).toBe(0);
      await request(app).get('/login');
      expect(pendingAuth.size).toBe(1);

      const [state, value] = [...pendingAuth.entries()][0];
      expect(typeof state).toBe('string');
      expect(value).toHaveProperty('verifier');
      expect(value).toHaveProperty('createdAt');
    });
  });

  describe('GET /callback', () => {
    test('returns error when code and state are missing', async () => {
      const res = await request(app).get('/callback');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Missing code or state parameter');
    });

    test('returns error for invalid state', async () => {
      const res = await request(app).get('/callback?code=testcode&state=invalidstate');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Invalid or expired state');
    });

    test('returns error when OAuth error param is present', async () => {
      const res = await request(app).get('/callback?error=access_denied');
      expect(res.status).toBe(200);
      expect(res.text).toContain('OAuth error: access_denied');
    });
  });

  describe('GET /profile', () => {
    test('redirects to / when no session query param', async () => {
      const res = await request(app).get('/profile');
      expect(res.status).toBe(302);
      expect(res.headers['location']).toBe('/');
    });

    test('redirects to / when session is invalid', async () => {
      const res = await request(app).get('/profile?session=nonexistent');
      expect(res.status).toBe(302);
      expect(res.headers['location']).toBe('/');
    });

    test('returns 200 with user info for valid session', async () => {
      const sessionId = 'test-session-123';
      userTokens.set(sessionId, {
        accessToken: 'fake.jwt.token',
        decoded: {
          sub: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
        },
        createdAt: Date.now(),
      });

      const res = await request(app).get(`/profile?session=${sessionId}`);
      expect(res.status).toBe(200);
      expect(res.text).toContain('Test User');
      expect(res.text).toContain('test@example.com');
    });
  });
});

// ============================================================
// C. Token exchange mock tests
// ============================================================
describe('Token exchange (fetch mock)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    pendingAuth.clear();
    userTokens.clear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('successful token exchange renders callback page', async () => {
    const state = 'test-state-abc';
    pendingAuth.set(state, { verifier: 'test-verifier', createdAt: Date.now() });

    const fakeToken = {
      access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsIm5hbWUiOiJUZXN0IFVzZXIiLCJpYXQiOjE3MDAwMDAwMDB9.placeholder',
      token_type: 'Bearer',
      expires_in: 3600,
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => fakeToken,
    });

    const res = await request(app).get(`/callback?code=authcode123&state=${state}`);
    expect(res.status).toBe(200);
    expect(res.text).toContain('Token exchange');
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Verify the state was consumed from pendingAuth
    expect(pendingAuth.has(state)).toBe(false);

    // Verify a session was stored in userTokens
    expect(userTokens.size).toBe(1);
  });

  test('failed token exchange renders error', async () => {
    const state = 'test-state-fail';
    pendingAuth.set(state, { verifier: 'test-verifier', createdAt: Date.now() });

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      statusText: 'Bad Request',
      json: async () => ({ error: 'invalid_grant' }),
    });

    const res = await request(app).get(`/callback?code=badcode&state=${state}`);
    expect(res.status).toBe(200);
    expect(res.text).toContain('Token exchange failed');
    expect(res.text).toContain('invalid_grant');
  });

  test('fetch network error renders error', async () => {
    const state = 'test-state-network';
    pendingAuth.set(state, { verifier: 'test-verifier', createdAt: Date.now() });

    global.fetch = jest.fn().mockRejectedValue(new Error('Network failure'));

    const res = await request(app).get(`/callback?code=anycode&state=${state}`);
    expect(res.status).toBe(200);
    expect(res.text).toContain('Token exchange error');
    expect(res.text).toContain('Network failure');
  });
});
