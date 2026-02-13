# Gerege SSO — Quick Integration Reference

**Base URL:** `https://sso.gerege.mn`
**Flow:** OAuth 2.0 Authorization Code (with optional PKCE)

---

## Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/oauth/authorize` | GET | Start auth flow |
| `/api/oauth/token` | POST | Exchange code for token |
| `/api/admin/clients` | POST | Register app (admin only, requires `X-API-Key`) |

---

## Auth Flow (5 Steps)

### 1. Register App → Get `client_id` + `client_secret`

```bash
curl -X POST https://sso.gerege.mn/api/admin/clients \
  -H "X-API-Key: <ADMIN_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"name":"My App","redirect_uris":["https://myapp.mn/callback"],"scopes":["openid","profile"]}'
```

### 2. Redirect User to Authorize

```
GET /api/oauth/authorize?client_id=ID&redirect_uri=URL&response_type=code&scope=openid+profile+email&state=RANDOM
```

Optional PKCE: add `code_challenge=SHA256_HASH&code_challenge_method=S256`

### 3. Receive Callback

```
https://myapp.mn/callback?code=AUTH_CODE&state=RANDOM
```

Verify `state` matches. Auth code is single-use, expires in 5 minutes.

### 4. Exchange Code for Token

```bash
curl -X POST https://sso.gerege.mn/api/oauth/token \
  -d "grant_type=authorization_code&code=AUTH_CODE&redirect_uri=URL&client_id=ID&client_secret=SECRET"
```

Response: `{ "access_token": "eyJ...", "token_type": "bearer", "expires_in": 3600 }`

### 5. Decode JWT → Get User Info

Token is HS256-signed JWT. Payload:

```json
{
  "sub": "11234567890",
  "email": "user@example.com",
  "picture": "https://...",
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
  "exp": 1700003600
}
```

Use `sub` (gen_id) as the unique user identifier.

---

## Scopes

| Scope | Returns |
|-------|---------|
| `openid` | `sub`, `iss`, `aud` |
| `profile` | name, birth_date, gender, picture |
| `email` | email, email_verified |

---

## Verification Levels

| Level | Meaning |
|-------|---------|
| 1 | Email verified (OAuth login) |
| 2 | Phone verified (OTP) |
| 3 | Registry verified (reg_no) |
| 4 | DAN verified (digital ID) |

---

## Key Rules

- Token expires in **1 hour**, auth code in **5 minutes** (single-use)
- `reg_no` and `civil_id` are **never** in 3rd-party tokens
- Always validate: `iss`, `aud`, `exp`, and `state`
- Store `client_secret` server-side only
- Use PKCE for mobile/SPA apps
