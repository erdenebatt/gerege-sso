const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Config from environment
const OAUTH_CLIENT_ID = process.env.OAUTH_CLIENT_ID || 'test_app_local_dev_client_id_001';
const OAUTH_CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET || 'test_app_local_dev_secret_001';
const SSO_BASE_URL = process.env.SSO_BASE_URL || 'http://localhost:3000';
const SSO_BACKEND_URL = process.env.SSO_BACKEND_URL || 'http://localhost:8080';
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:3001/callback';

// In-memory store for PKCE verifiers and tokens (keyed by state)
const pendingAuth = new Map();
const userTokens = new Map();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- Helper: base64url encode ---
function base64url(buffer) {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// --- Helper: generate PKCE pair ---
function generatePKCE() {
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

// --- Routes ---

// Home page
app.get('/', (req, res) => {
  res.render('index', {
    ssoBaseUrl: SSO_BASE_URL,
    clientId: OAUTH_CLIENT_ID,
  });
});

// Start OAuth2 flow
app.get('/login', (req, res) => {
  const state = base64url(crypto.randomBytes(16));
  const { verifier, challenge } = generatePKCE();

  // Store verifier keyed by state
  pendingAuth.set(state, { verifier, createdAt: Date.now() });

  // Clean up old entries (older than 10 minutes)
  for (const [key, val] of pendingAuth) {
    if (Date.now() - val.createdAt > 10 * 60 * 1000) {
      pendingAuth.delete(key);
    }
  }

  const params = new URLSearchParams({
    client_id: OAUTH_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'openid profile',
    state: state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });

  // Redirect to SSO authorize endpoint (via backend, through frontend proxy or directly)
  const authorizeUrl = `${SSO_BACKEND_URL}/api/oauth/authorize?${params.toString()}`;
  res.redirect(authorizeUrl);
});

// OAuth2 callback
app.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.render('callback', { error: `OAuth error: ${error}`, token: null, decoded: null });
  }

  if (!code || !state) {
    return res.render('callback', { error: 'Missing code or state parameter', token: null, decoded: null });
  }

  // Retrieve PKCE verifier
  const pending = pendingAuth.get(state);
  if (!pending) {
    return res.render('callback', { error: 'Invalid or expired state parameter. Please try logging in again.', token: null, decoded: null });
  }
  pendingAuth.delete(state);

  try {
    // Exchange authorization code for token
    const tokenUrl = `${SSO_BACKEND_URL}/api/oauth/token`;
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: REDIRECT_URI,
      client_id: OAUTH_CLIENT_ID,
      client_secret: OAUTH_CLIENT_SECRET,
      code_verifier: pending.verifier,
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.render('callback', {
        error: `Token exchange failed: ${data.error || response.statusText}`,
        token: null,
        decoded: null,
      });
    }

    // Decode JWT payload (without verification - just for display)
    const decoded = jwt.decode(data.access_token);

    // Store token for profile page
    const sessionId = base64url(crypto.randomBytes(16));
    userTokens.set(sessionId, {
      accessToken: data.access_token,
      decoded: decoded,
      createdAt: Date.now(),
    });

    // Clean up old tokens (older than 1 hour)
    for (const [key, val] of userTokens) {
      if (Date.now() - val.createdAt > 60 * 60 * 1000) {
        userTokens.delete(key);
      }
    }

    res.render('callback', {
      error: null,
      token: data,
      decoded: decoded,
      sessionId: sessionId,
    });
  } catch (err) {
    res.render('callback', {
      error: `Token exchange error: ${err.message}`,
      token: null,
      decoded: null,
    });
  }
});

// Profile page - shows decoded JWT info
app.get('/profile', (req, res) => {
  const sessionId = req.query.session;
  if (!sessionId) {
    return res.redirect('/');
  }

  const session = userTokens.get(sessionId);
  if (!session) {
    return res.redirect('/');
  }

  res.render('profile', {
    decoded: session.decoded,
    accessToken: session.accessToken,
  });
});

app.listen(PORT, () => {
  console.log(`Test App running at http://localhost:${PORT}`);
  console.log(`SSO Base URL: ${SSO_BASE_URL}`);
  console.log(`SSO Backend URL: ${SSO_BACKEND_URL}`);
  console.log(`Client ID: ${OAUTH_CLIENT_ID}`);
});
