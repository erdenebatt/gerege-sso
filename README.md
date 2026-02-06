# Gerege SSO

**Gerege SSO** нь OAuth 2.0 стандартын дагуу ажилладаг нэгдсэн нэвтрэлтийн систем юм. Монгол улсын иргэдийн цахим таних тэмдэг (ДАН) болон олон нийтийн сүлжээний бүртгэлтэй (Google, Apple, Facebook, Twitter) холбогдон ажиллана.

## Tech Stack

### Backend
- **Language:** Go 1.21+
- **Framework:** Gin
- **Database:** PostgreSQL 15
- **Cache:** Redis 7
- **Authentication:** JWT, OAuth 2.0

### Frontend
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **State Management:** Zustand
- **UI Components:** Custom components with dark mode support

### Infrastructure
- **Container:** Docker & Docker Compose
- **Reverse Proxy:** Nginx
- **SSL:** Let's Encrypt (Certbot)
- **Domain:** sso.gerege.mn

---

## Project Structure

```
gerege-sso/
├── backend/
│   ├── config/          # Configuration loading
│   ├── handlers/        # HTTP handlers
│   ├── middleware/      # JWT, CORS, metrics
│   ├── models/          # Data models
│   ├── services/        # Business logic
│   ├── main.go          # Entry point
│   ├── Dockerfile
│   └── go.mod
│
├── frontend/
│   ├── src/
│   │   ├── app/         # Next.js pages (App Router)
│   │   │   ├── page.tsx              # Login page
│   │   │   ├── callback/             # OAuth callback
│   │   │   ├── dashboard/            # User dashboard
│   │   │   │   ├── page.tsx          # Main dashboard
│   │   │   │   ├── dan/              # DAN verification
│   │   │   │   ├── security/         # Security settings
│   │   │   │   └── activity/         # Activity logs
│   │   │   ├── grants/               # Connected apps
│   │   │   ├── consent/              # OAuth consent
│   │   │   ├── docs/                 # API documentation
│   │   │   ├── admin/                # Admin pages
│   │   │   ├── privacy/              # Privacy policy
│   │   │   ├── terms/                # Terms of service
│   │   │   └── data-deletion/        # Data deletion info
│   │   │
│   │   ├── components/
│   │   │   ├── ui/                   # Reusable UI components
│   │   │   ├── auth/                 # Auth-related components
│   │   │   ├── dashboard/            # Dashboard components
│   │   │   ├── admin/                # Admin components
│   │   │   └── layout/               # Layout components
│   │   │
│   │   ├── lib/                      # Utilities
│   │   ├── stores/                   # Zustand stores
│   │   ├── types/                    # TypeScript types
│   │   └── styles/                   # Global styles
│   │
│   ├── public/                       # Static assets
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.ts
│   └── Dockerfile
│
├── docker-compose.yml
├── .env.development
├── .env.production
├── scripts/
│   └── env-switch.sh
├── HISTORY.md
└── README.md
```

---

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local development)
- Go 1.21+ (for local development)

### Development Setup

1. **Clone the repository**
```bash
git clone <repo-url>
cd gerege-sso
```

2. **Set up environment**
```bash
# For development
./scripts/env-switch.sh dev

# For production
./scripts/env-switch.sh prod
```

3. **Start services**
```bash
docker compose up -d
```

4. **Access the application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080
- Grafana: http://localhost:3001

### Service Ports
| Service | Port |
|---------|------|
| Frontend (Next.js) | 3000 |
| Backend (Go/Gin) | 8080 |
| PostgreSQL | 5432 |
| Redis | 6379 |
| Grafana | 3001 |

---

## API Documentation

### Authentication Endpoints

#### OAuth Login
```
GET /api/auth/google       # Google OAuth login
GET /api/auth/apple        # Apple Sign-In
GET /api/auth/facebook     # Facebook login
GET /api/auth/twitter      # Twitter/X login
```

#### User Info
```
GET /api/auth/me
Authorization: Bearer <token>

Response:
{
  "gen_id": "12345678901",
  "email": "user@example.com",
  "picture": "https://...",
  "verified": true,
  "gerege": {
    "reg_no": "АА12345678",
    "family_name": "...",
    "last_name": "...",
    "first_name": "...",
    "name": "...",
    "birth_date": "1990-01-01",
    "gender": "male",
    "verified": true
  }
}
```

#### Identity Verification
```
POST /api/auth/verify
Authorization: Bearer <token>
Content-Type: application/json

{
  "reg_no": "АА12345678"
}
```

#### Grants Management
```
GET /api/auth/grants           # List connected apps
DELETE /api/auth/grants/:id    # Revoke app access
```

### OAuth 2.0 Endpoints

#### Authorization
```
GET /api/oauth/authorize
  ?client_id=<client_id>
  &redirect_uri=<redirect_uri>
  &response_type=code
  &scope=openid profile email
  &state=<state>
```

#### Token Exchange
```
POST /api/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=<auth_code>
&redirect_uri=<redirect_uri>
&client_id=<client_id>
&client_secret=<client_secret>
```

---

## Frontend Pages

### Public Pages
| Route | Description |
|-------|-------------|
| `/` | Login page with OAuth buttons |
| `/callback` | OAuth callback handler |
| `/consent` | OAuth consent screen |
| `/privacy` | Privacy policy |
| `/terms` | Terms of service |
| `/data-deletion` | Data deletion information |
| `/docs` | API documentation |
| `/developers` | Developer guide |

### Protected Pages (Requires Login)
| Route | Description |
|-------|-------------|
| `/dashboard` | User dashboard with identity card |
| `/dashboard/dan` | DAN verification |
| `/dashboard/security` | Security settings |
| `/dashboard/activity` | Activity history |
| `/grants` | Connected applications |

### Admin Pages
| Route | Description |
|-------|-------------|
| `/admin` | Admin login |
| `/admin/dashboard` | Admin dashboard |

---

## Components

### Layout Components
- `Sidebar` - Dashboard navigation sidebar
- `UserDropdown` - User menu dropdown (profile, logout)
- `Header` - Public page header
- `Footer` - Page footer
- `Navbar` - Public page navigation

### Dashboard Components
- `IdentityCard` - User identity information display
- `SecurityCard` - Security status card
- `GrantCard` - Connected app card
- `VerificationProgress` - 4-step verification progress
- `FaceVerifyModal` - Face verification modal

### UI Components
- `Button` - Primary, secondary, danger variants
- `Card` - Glass effect card container
- `Modal` - Dialog with backdrop
- `Toast` - Notification popup
- `Input` - Form input with label
- `Badge` - Status/scope badge
- `Skeleton` - Loading placeholder

---

## Environment Variables

### Backend (.env)
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=grgdev
DB_PASSWORD=<password>
DB_NAME=gerege_sso

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=<secret>

# Google OAuth
GOOGLE_CLIENT_ID=<client_id>
GOOGLE_CLIENT_SECRET=<client_secret>
GOOGLE_REDIRECT_URL=<redirect_url>

# Apple Sign-In
APPLE_CLIENT_ID=<client_id>
APPLE_TEAM_ID=<team_id>
APPLE_KEY_ID=<key_id>
APPLE_PRIVATE_KEY=<private_key>

# Facebook
FACEBOOK_APP_ID=<app_id>
FACEBOOK_APP_SECRET=<app_secret>

# Twitter
TWITTER_CLIENT_ID=<client_id>
TWITTER_CLIENT_SECRET=<client_secret>

# Admin
ADMIN_API_KEY=<api_key>

# Public URL
PUBLIC_URL=https://sso.gerege.mn
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

---

## Database Schema

### Tables
- `citizens` - Master citizen data (reg_no, names, birth_date, etc.)
- `users` - SSO users (gen_id, email, OAuth IDs, citizen_id)
- `oauth_clients` - Registered OAuth clients
- `grants` - User-client grant relationships
- `sessions` - Active sessions
- `audit_logs` - Audit trail

### Key Fields
- `gen_id` - Unique 11-digit Gerege ID
- `citizen_id` - Link to citizens table (verified users)
- `google_sub`, `apple_sub`, `facebook_id`, `twitter_id` - OAuth provider IDs

---

## Docker Commands

```bash
# Build and start all services
docker compose up -d --build

# View logs
docker compose logs -f backend
docker compose logs -f frontend

# Restart a service
docker compose restart backend

# Stop all services
docker compose down

# Rebuild specific service
docker compose build frontend
docker compose up -d frontend
```

---

## Development

### Backend Development
```bash
cd backend
go mod download
go run main.go
```

### Frontend Development
```bash
cd frontend
npm install
npm run dev
```

### Environment Switching
```bash
# Switch to development
./scripts/env-switch.sh dev

# Switch to production
./scripts/env-switch.sh prod
```

---

## Security Features

- **JWT Authentication** - Stateless token-based auth
- **PKCE Support** - For public OAuth clients
- **Rate Limiting** - API rate limits
- **CORS** - Configured allowed origins
- **Input Validation** - Latin to Cyrillic conversion for reg_no
- **Audit Logging** - All sensitive actions logged

---

## Verification Levels

| Level | Status | Description |
|-------|--------|-------------|
| 1 | Email | Email verified via OAuth |
| 2 | Phone | Phone number verified |
| 3 | DAN | Identity verified (reg_no) |
| 4 | Face | Face verification completed |

---

## Contact

- **Email:** dev@gerege.mn
- **Website:** https://sso.gerege.mn

---

## License

Proprietary - All rights reserved.
