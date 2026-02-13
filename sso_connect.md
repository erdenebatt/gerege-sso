# Gerege SSO — 3rd Party App Integration Guide

## Overview

Gerege SSO is an OAuth 2.0 Authorization Server that allows third-party applications to authenticate users via their Gerege identity. This document provides a complete guide for integrating your application with Gerege SSO.

**Base URL:** `https://sso.gerege.mn`

---

## Table of Contents

1. [How It Works](#how-it-works)
2. [Prerequisites](#prerequisites)
3. [Step 1: Register Your Application](#step-1-register-your-application)
4. [Step 2: Redirect Users to Authorization](#step-2-redirect-users-to-authorization)
5. [Step 3: Handle the Callback](#step-3-handle-the-callback)
6. [Step 4: Exchange Code for Access Token](#step-4-exchange-code-for-access-token)
7. [Step 5: Use the Access Token](#step-5-use-the-access-token)
8. [PKCE Support (Mobile / SPA)](#pkce-support-mobile--spa)
9. [Token Structure](#token-structure)
10. [Scopes](#scopes)
11. [Verification Levels](#verification-levels)
12. [User Grant Management](#user-grant-management)
13. [Security Best Practices](#security-best-practices)
14. [Error Handling](#error-handling)
15. [Complete Examples](#complete-examples)

---

## How It Works

Gerege SSO implements the **OAuth 2.0 Authorization Code Flow**. Here is the high-level sequence:

```
┌──────────┐     ┌──────────────┐     ┌────────────┐
│ Your App │     │  Gerege SSO  │     │   User's   │
│ (Client) │     │   Server     │     │  Browser   │
└────┬─────┘     └──────┬───────┘     └─────┬──────┘
     │                  │                    │
     │  1. Redirect to /api/oauth/authorize  │
     │ ─────────────────────────────────────>│
     │                  │                    │
     │                  │  2. User logs in   │
     │                  │<───────────────────│
     │                  │                    │
     │                  │  3. Consent screen  │
     │                  │───────────────────>│
     │                  │                    │
     │                  │  4. User approves   │
     │                  │<───────────────────│
     │                  │                    │
     │  5. Redirect to your callback with    │
     │     authorization code                │
     │<──────────────────────────────────────│
     │                  │                    │
     │  6. POST /api/oauth/token             │
     │     (exchange code for token)         │
     │ ────────────────>│                    │
     │                  │                    │
     │  7. Access token returned             │
     │<─────────────────│                    │
     │                  │                    │
     │  8. Use token to identify user        │
     │                  │                    │
```

---

## Prerequisites

Before integrating, you need:

- A registered OAuth client (obtained from the Gerege SSO admin)
- A backend server capable of making HTTP requests (for token exchange)
- HTTPS-enabled redirect URI(s) for production

---

## Step 1: Register Your Application

Contact the Gerege SSO administrator to register your application. You will need to provide:

| Field | Description | Example |
|-------|-------------|---------|
| `name` | Your application name | `"My Awesome App"` |
| `redirect_uris` | Callback URL(s) where users are sent after authorization | `["https://myapp.mn/callback"]` |
| `scopes` | Requested data access scopes | `["openid", "profile"]` |

Upon registration, you will receive:

| Credential | Description |
|------------|-------------|
| `client_id` | 64-character public identifier for your app |
| `client_secret` | 64-character secret key (shown only once — store it securely!) |

> **Warning:** The `client_secret` is displayed only at creation time. If lost, a new client must be registered.

### Admin API (for SSO administrators only)

```bash
# Register a new client
curl -X POST https://sso.gerege.mn/api/admin/clients \
  -H "X-API-Key: <ADMIN_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Awesome App",
    "redirect_uris": ["https://myapp.mn/callback"],
    "scopes": ["openid", "profile"]
  }'

# Response
{
  "client_id": "a1b2c3d4e5f6...64chars",
  "client_secret": "x9y8z7w6v5u4...64chars"
}
```

---

## Step 2: Redirect Users to Authorization

When a user clicks "Login with Gerege" in your app, redirect them to:

```
GET https://sso.gerege.mn/api/oauth/authorize
```

### Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `client_id` | string | Your registered client ID |
| `redirect_uri` | string | Must exactly match one of your registered URIs |
| `response_type` | string | Must be `"code"` |
| `scope` | string | Space-separated scopes (e.g., `"openid profile"`) |
| `state` | string | Random string for CSRF protection (you generate this) |

### Optional Parameters (PKCE)

| Parameter | Type | Description |
|-----------|------|-------------|
| `code_challenge` | string | Base64url-encoded SHA256 hash of code_verifier |
| `code_challenge_method` | string | `"S256"` (recommended) or `"plain"` |

### Example URL

```
https://sso.gerege.mn/api/oauth/authorize?
  client_id=a1b2c3d4e5f6...&
  redirect_uri=https://myapp.mn/callback&
  response_type=code&
  scope=openid%20profile&
  state=random_csrf_token_abc123
```

### What Happens Next

1. If the user is **not logged in** → they are redirected to the Gerege SSO login page where they can sign in via Google, Apple, Facebook, or Twitter
2. If the user is **logged in but hasn't approved your app** → they see a consent screen showing what data your app is requesting
3. If the user **has already approved** → they are immediately redirected back to your app with an authorization code

---

## Step 3: Handle the Callback

After the user approves (or denies) your app, Gerege SSO redirects their browser to your `redirect_uri`:

### Successful Authorization

```
https://myapp.mn/callback?code=AUTH_CODE_HERE&state=random_csrf_token_abc123
```

| Parameter | Description |
|-----------|-------------|
| `code` | Authorization code (single-use, expires in 5 minutes) |
| `state` | The same state value you sent — **verify this matches!** |

### Denied or Error

```
https://myapp.mn/callback?error=access_denied&state=random_csrf_token_abc123
```

### Your Callback Handler Should:

1. **Verify** that the `state` parameter matches the one you stored in the user's session
2. **Extract** the `code` parameter
3. **Exchange** the code for an access token (next step)

---

## Step 4: Exchange Code for Access Token

Make a server-to-server POST request to exchange the authorization code for an access token:

```
POST https://sso.gerege.mn/api/oauth/token
Content-Type: application/x-www-form-urlencoded
```

### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `grant_type` | string | Yes | Must be `"authorization_code"` |
| `code` | string | Yes | The authorization code from the callback |
| `redirect_uri` | string | Yes | Must match the URI used in Step 2 |
| `client_id` | string | Yes | Your client ID |
| `client_secret` | string | Yes | Your client secret |
| `code_verifier` | string | If PKCE | The original code_verifier (if PKCE was used) |

### Example Request

```bash
curl -X POST https://sso.gerege.mn/api/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=AUTH_CODE_HERE" \
  -d "redirect_uri=https://myapp.mn/callback" \
  -d "client_id=a1b2c3d4e5f6..." \
  -d "client_secret=x9y8z7w6v5u4..."
```

### Successful Response

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

> **Important:** The authorization code is **single-use**. If the exchange fails, the user must re-authorize.

---

## Step 5: Use the Access Token

The `access_token` is a JWT that contains the user's identity information. You can decode it to extract user data.

### Decoding the Token

The token is signed with HS256. Decode the JWT payload to access user claims:

```javascript
// Example: Decode JWT payload (Node.js)
const token = "eyJhbGciOiJIUzI1NiIs...";
const payload = JSON.parse(
  Buffer.from(token.split('.')[1], 'base64').toString()
);

console.log(payload);
// {
//   "sub": "11234567890",
//   "email": "user@example.com",
//   "picture": "https://lh3.googleusercontent.com/...",
//   "email_verified": true,
//   "gerege": {
//     "gen_id": "11234567890",
//     "first_name": "Бат",
//     "last_name": "Дорж",
//     "family_name": "Борж",
//     "birth_date": "1995-03-15",
//     "gender": "1",
//     "verification_level": 3
//   },
//   "aud": "a1b2c3d4e5f6...",
//   "iss": "https://sso.gerege.mn",
//   "exp": 1700000000
// }
```

### Key User Fields

| Claim | Type | Description |
|-------|------|-------------|
| `sub` | string | Unique Gerege ID (11 digits) — use this as the user identifier |
| `email` | string | User's email address |
| `picture` | string | Profile picture URL |
| `email_verified` | boolean | Whether email is verified by the OAuth provider |
| `gerege.gen_id` | string | Same as `sub` — the Gerege ID |
| `gerege.first_name` | string | User's first name (Mongolian) |
| `gerege.last_name` | string | User's last name |
| `gerege.family_name` | string | User's family name |
| `gerege.birth_date` | string | Date of birth (`YYYY-MM-DD`) |
| `gerege.gender` | string | `"1"` = Male, `"2"` = Female |
| `gerege.verification_level` | integer | Identity verification level (1–4) |
| `aud` | string | Your `client_id` — verify this matches your app |
| `iss` | string | Issuer — should be `"https://sso.gerege.mn"` |
| `exp` | integer | Token expiration (Unix timestamp) |

> **Privacy:** The `reg_no` (registration number) and `civil_id` are **never** included in third-party tokens. These sensitive fields are only available within the Gerege SSO system itself.

---

## PKCE Support (Mobile / SPA)

For mobile apps and single-page applications (SPAs) where the `client_secret` cannot be stored securely, Gerege SSO supports **PKCE (Proof Key for Code Exchange)**.

### How PKCE Works

1. **Generate a `code_verifier`** — a random string (43–128 characters)
2. **Derive a `code_challenge`** — SHA256 hash of the verifier, base64url-encoded
3. **Send `code_challenge`** in the authorization request
4. **Send `code_verifier`** in the token exchange request
5. Server verifies that SHA256(verifier) matches the challenge

### Example Implementation

```javascript
// 1. Generate code_verifier
const crypto = require('crypto');
const codeVerifier = crypto.randomBytes(32).toString('base64url');

// 2. Derive code_challenge
const codeChallenge = crypto
  .createHash('sha256')
  .update(codeVerifier)
  .digest('base64url');

// 3. Authorization URL with PKCE
const authUrl = `https://sso.gerege.mn/api/oauth/authorize?` +
  `client_id=${CLIENT_ID}&` +
  `redirect_uri=${REDIRECT_URI}&` +
  `response_type=code&` +
  `scope=openid%20profile&` +
  `state=${state}&` +
  `code_challenge=${codeChallenge}&` +
  `code_challenge_method=S256`;

// 4. Token exchange with code_verifier
const tokenResponse = await fetch('https://sso.gerege.mn/api/oauth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code: authCode,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code_verifier: codeVerifier,
  }),
});
```

---

## Token Structure

### Third-Party Access Token (1-hour expiry)

```json
{
  "sub": "11234567890",
  "email": "user@example.com",
  "picture": "https://lh3.googleusercontent.com/a/photo.jpg",
  "email_verified": true,
  "gerege": {
    "gen_id": "11234567890",
    "first_name": "Бат",
    "last_name": "Дорж",
    "family_name": "Борж",
    "birth_date": "1995-03-15",
    "gender": "1",
    "verification_level": 3
  },
  "aud": "your_client_id",
  "iss": "https://sso.gerege.mn",
  "jti": "unique-token-id",
  "iat": 1700000000,
  "exp": 1700003600
}
```

### Important Token Details

| Property | Value |
|----------|-------|
| Algorithm | HS256 (HMAC-SHA256) |
| Expiry | 1 hour (3600 seconds) |
| Issuer | `https://sso.gerege.mn` |
| Audience | Your `client_id` |

### Token Validation Checklist

When your server receives a token, verify:

1. **Signature** — Validate the HS256 signature (requires shared JWT secret)
2. **Expiry** — Check that `exp` > current time
3. **Issuer** — Check that `iss` == `"https://sso.gerege.mn"`
4. **Audience** — Check that `aud` == your `client_id`

---

## Scopes

| Scope | Description | Data Included |
|-------|-------------|---------------|
| `openid` | Basic identity | `sub` (Gerege ID), `iss`, `aud` |
| `profile` | User profile | `first_name`, `last_name`, `family_name`, `birth_date`, `gender`, `picture` |
| `email` | Email address | `email`, `email_verified` |

Default scopes if not specified: `openid`, `profile`.

---

## Verification Levels

Each user has a `verification_level` indicating how thoroughly their identity has been verified:

| Level | Name | Description | Trust Level |
|-------|------|-------------|-------------|
| 1 | Email Verified | User authenticated via OAuth provider (Google, Apple, etc.) | Basic |
| 2 | Phone Verified | User verified their phone number via OTP | Medium |
| 3 | Registry Verified | User's registration number matched against civil registry | High |
| 4 | DAN Verified | User verified via Mongolia's Digital ID (DAN) system | Highest |

### Using Verification Levels

You can use the `verification_level` claim to enforce access control in your app:

```javascript
const payload = decodeJWT(accessToken);
const level = payload.gerege.verification_level;

if (level < 3) {
  // Require higher verification for sensitive operations
  return res.status(403).json({
    error: "Identity verification required",
    message: "Please verify your identity on sso.gerege.mn before using this feature",
    required_level: 3,
    current_level: level
  });
}
```

---

## User Grant Management

Users can view and revoke access granted to third-party apps from their Gerege SSO dashboard.

### What Happens When a User Revokes Access

- The grant entry in `user_grants` is marked as revoked
- Your app will need the user to re-authorize on the next login attempt
- Existing tokens remain valid until they expire (1 hour max)

### Re-Authorization Flow

If a user has revoked your app's access and tries to log in again:

1. User is redirected to the consent screen
2. User must approve your app again
3. A new grant is created
4. Normal flow continues

---

## Security Best Practices

### Must Do

- **Store `client_secret` securely** — never expose it in frontend code, mobile apps, or public repositories
- **Always validate the `state` parameter** — prevents CSRF attacks
- **Use HTTPS** for all redirect URIs in production
- **Verify token claims** — check `iss`, `aud`, and `exp` before trusting token data
- **Use PKCE** for mobile and single-page applications

### Should Do

- **Use `sub` (gen_id) as the user identifier** — it is stable and unique across the system
- **Handle token expiry gracefully** — redirect users to re-authorize when tokens expire
- **Log authorization events** — track when users authorize/deauthorize your app
- **Request minimal scopes** — only request the data your app actually needs

### Never Do

- **Never expose `client_secret`** in client-side code
- **Never store tokens in localStorage** — use httpOnly cookies or secure server-side storage
- **Never skip `state` validation** — this is your CSRF protection
- **Never assume `reg_no` or `civil_id` will be in the token** — these are never shared with third parties

---

## Error Handling

### Authorization Errors

| Error | Description | Action |
|-------|-------------|--------|
| `invalid_client` | Client ID not found or inactive | Verify your `client_id` |
| `invalid_redirect_uri` | Redirect URI doesn't match registered URIs | Check registered URIs |
| `invalid_response_type` | Only `"code"` is supported | Use `response_type=code` |
| `access_denied` | User denied the consent request | Show appropriate message to user |

### Token Exchange Errors

| Error | Description | Action |
|-------|-------------|--------|
| `invalid_grant` | Auth code expired, already used, or invalid | Restart authorization flow |
| `invalid_client` | Client authentication failed | Verify `client_id` and `client_secret` |
| `invalid_request` | Missing required parameters | Check all required fields |
| `invalid_pkce` | PKCE verification failed | Verify `code_verifier` matches `code_challenge` |

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 302 | Redirect (authorization flow) |
| 400 | Bad request (invalid parameters) |
| 401 | Unauthorized (invalid credentials) |
| 404 | Client not found |
| 500 | Server error |

---

## Complete Examples

### Node.js / Express

```javascript
const express = require('express');
const crypto = require('crypto');
const app = express();

const CLIENT_ID = process.env.GEREGE_CLIENT_ID;
const CLIENT_SECRET = process.env.GEREGE_CLIENT_SECRET;
const REDIRECT_URI = 'https://myapp.mn/callback';
const SSO_BASE = 'https://sso.gerege.mn';

// Store states in session (use Redis in production)
const states = new Map();

// Step 1: Redirect user to Gerege SSO
app.get('/login', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  states.set(state, true);

  const authUrl = `${SSO_BASE}/api/oauth/authorize?` +
    `client_id=${CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
    `response_type=code&` +
    `scope=openid%20profile%20email&` +
    `state=${state}`;

  res.redirect(authUrl);
});

// Step 2: Handle callback
app.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;

  // Verify state
  if (!states.has(state)) {
    return res.status(403).send('Invalid state — possible CSRF attack');
  }
  states.delete(state);

  // Check for errors
  if (error) {
    return res.status(400).send(`Authorization failed: ${error}`);
  }

  // Step 3: Exchange code for token
  const tokenRes = await fetch(`${SSO_BASE}/api/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.json();
    return res.status(400).json({ error: 'Token exchange failed', details: err });
  }

  const { access_token } = await tokenRes.json();

  // Step 4: Decode user info from token
  const payload = JSON.parse(
    Buffer.from(access_token.split('.')[1], 'base64').toString()
  );

  // Use payload.sub (gen_id) as the unique user identifier
  const user = {
    geregeId: payload.sub,
    email: payload.email,
    firstName: payload.gerege.first_name,
    lastName: payload.gerege.last_name,
    verificationLevel: payload.gerege.verification_level,
  };

  // Create session, store user, redirect to dashboard...
  req.session.user = user;
  res.redirect('/dashboard');
});

app.listen(3000);
```

### Python / Flask

```python
import os
import secrets
import requests
import base64
import json
from flask import Flask, redirect, request, session, jsonify

app = Flask(__name__)
app.secret_key = os.environ['FLASK_SECRET']

CLIENT_ID = os.environ['GEREGE_CLIENT_ID']
CLIENT_SECRET = os.environ['GEREGE_CLIENT_SECRET']
REDIRECT_URI = 'https://myapp.mn/callback'
SSO_BASE = 'https://sso.gerege.mn'


@app.route('/login')
def login():
    state = secrets.token_hex(16)
    session['oauth_state'] = state

    auth_url = (
        f"{SSO_BASE}/api/oauth/authorize?"
        f"client_id={CLIENT_ID}&"
        f"redirect_uri={REDIRECT_URI}&"
        f"response_type=code&"
        f"scope=openid%20profile%20email&"
        f"state={state}"
    )
    return redirect(auth_url)


@app.route('/callback')
def callback():
    # Verify state
    if request.args.get('state') != session.pop('oauth_state', None):
        return 'Invalid state', 403

    error = request.args.get('error')
    if error:
        return f'Authorization failed: {error}', 400

    code = request.args.get('code')

    # Exchange code for token
    token_res = requests.post(f'{SSO_BASE}/api/oauth/token', data={
        'grant_type': 'authorization_code',
        'code': code,
        'redirect_uri': REDIRECT_URI,
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET,
    })

    if not token_res.ok:
        return jsonify({'error': 'Token exchange failed'}), 400

    access_token = token_res.json()['access_token']

    # Decode JWT payload
    payload_b64 = access_token.split('.')[1]
    payload_b64 += '=' * (4 - len(payload_b64) % 4)  # Pad base64
    payload = json.loads(base64.b64decode(payload_b64))

    # Store user in session
    session['user'] = {
        'gerege_id': payload['sub'],
        'email': payload['email'],
        'first_name': payload['gerege']['first_name'],
        'last_name': payload['gerege']['last_name'],
        'verification_level': payload['gerege']['verification_level'],
    }

    return redirect('/dashboard')
```

### Go

```go
package main

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strings"
)

var (
	clientID     = os.Getenv("GEREGE_CLIENT_ID")
	clientSecret = os.Getenv("GEREGE_CLIENT_SECRET")
	redirectURI  = "https://myapp.mn/callback"
	ssoBase      = "https://sso.gerege.mn"
)

// In production, use Redis or database for state storage
var stateStore = map[string]bool{}

func loginHandler(w http.ResponseWriter, r *http.Request) {
	b := make([]byte, 16)
	rand.Read(b)
	state := base64.URLEncoding.EncodeToString(b)
	stateStore[state] = true

	authURL := fmt.Sprintf(
		"%s/api/oauth/authorize?client_id=%s&redirect_uri=%s&response_type=code&scope=openid%%20profile%%20email&state=%s",
		ssoBase, clientID, url.QueryEscape(redirectURI), state,
	)
	http.Redirect(w, r, authURL, http.StatusFound)
}

func callbackHandler(w http.ResponseWriter, r *http.Request) {
	state := r.URL.Query().Get("state")
	if !stateStore[state] {
		http.Error(w, "Invalid state", http.StatusForbidden)
		return
	}
	delete(stateStore, state)

	code := r.URL.Query().Get("code")

	// Exchange code for token
	resp, err := http.PostForm(ssoBase+"/api/oauth/token", url.Values{
		"grant_type":    {"authorization_code"},
		"code":          {code},
		"redirect_uri":  {redirectURI},
		"client_id":     {clientID},
		"client_secret": {clientSecret},
	})
	if err != nil {
		http.Error(w, "Token exchange failed", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	var tokenRes struct {
		AccessToken string `json:"access_token"`
		TokenType   string `json:"token_type"`
		ExpiresIn   int    `json:"expires_in"`
	}
	json.NewDecoder(resp.Body).Decode(&tokenRes)

	// Decode JWT payload
	parts := strings.Split(tokenRes.AccessToken, ".")
	payload, _ := base64.RawURLEncoding.DecodeString(parts[1])

	var claims map[string]interface{}
	json.Unmarshal(payload, &claims)

	// Use claims["sub"] as the unique Gerege ID
	fmt.Fprintf(w, "Welcome, Gerege ID: %s", claims["sub"])
}

func main() {
	http.HandleFunc("/login", loginHandler)
	http.HandleFunc("/callback", callbackHandler)
	http.ListenAndServe(":8080", nil)
}
```

---

## Quick Reference

### Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/oauth/authorize` | GET | Start authorization flow |
| `/api/oauth/token` | POST | Exchange code for access token |

### Authorization Parameters

```
GET /api/oauth/authorize?
  client_id=YOUR_CLIENT_ID&
  redirect_uri=YOUR_CALLBACK_URL&
  response_type=code&
  scope=openid profile email&
  state=RANDOM_STRING
```

### Token Exchange Parameters

```
POST /api/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code=AUTH_CODE&
redirect_uri=YOUR_CALLBACK_URL&
client_id=YOUR_CLIENT_ID&
client_secret=YOUR_CLIENT_SECRET
```

### Token Expiry

| Token Type | Expiry |
|------------|--------|
| Third-party access token | 1 hour |
| Authorization code | 5 minutes (single-use) |

---

## Support

For questions or to register your application, contact the Gerege SSO team.
