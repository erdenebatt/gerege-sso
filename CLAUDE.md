# Gerege SSO - Project Rules

## Registration Verification (reg_no) — Mandatory

- All new users MUST complete reg_no (registration number) verification before accessing the system
- Users with `verified=false` are blocked from `/dashboard/**` and `/consent` pages
- Dashboard layout (`frontend/src/app/dashboard/layout.tsx`) MUST check `user.verified` and redirect unverified users to `/register`
- The `/register` page handles standalone reg_no verification for unverified users
- Email OTP login redirects unverified users to `/register` instead of `/dashboard`
- Login page auto-redirect checks `verified` status
- Consent page blocks unverified users and stores `oauth_redirect` before redirecting to `/register`

## Backend

- `POST /api/auth/verify` endpoint handles reg_no verification — no backend changes needed
- `LinkCitizen()` and `verified` field are already implemented in the backend
