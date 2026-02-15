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

---

## MFA/2FA (Gerege Authenticator) System

### Overview

Gerege SSO нь дараах MFA аргуудыг дэмждэг:
- **TOTP** — Google Authenticator, Microsoft Authenticator гэх мэт TOTP апп
- **Passkey/WebAuthn** — Fingerprint, Face ID, FIDO2 Security Key
- **Push Notification** — Gerege Authenticator mobile app руу push илгээх (FCM/APNs — TODO)
- **QR Login** — Login page дээр QR код скан хийж нэвтрэх (WebSocket real-time). QR код нь `/qr/scan?session=xxx` frontend page руу заадаг. Утас скан → `/qr/scan` page нээгдэж approve хийнэ.
- **Recovery Codes** — 10 нөөц код (XXXX-XXXX формат, нэг удаагийн)

### Auth Flow (MFA-aware)

```
OAuth/Email Login → Check user.mfa_enabled?
  ├─ NO  → Full JWT → Exchange Code → Dashboard
  └─ YES → TempJWT (5min, mfa_pending:true) → Exchange Code + mfa_required=true
           → Frontend /mfa page → User completes TOTP/Passkey/Push/Recovery
           → Backend issues full JWT → Dashboard
```

- `generateMFAAwareToken()` in `backend/handlers/auth.go` handles both paths
- All OAuth callbacks (Google, Apple, Facebook, Twitter) and `VerifyEmailOTP` use this function
- `ExchangeToken()` checks `mfa_pending` claim and returns `mfa_required: boolean`
- Frontend callback page (`frontend/src/app/callback/page.tsx`) redirects to `/mfa` when `mfa_required=true`

### Database Migration

**File:** `postgres/migrations/006-authenticator-mfa.sql`

| Table | Purpose |
|-------|---------|
| `user_mfa_settings` | Per-user MFA config (totp_enabled, passkey_enabled, push_enabled, preferred_method) |
| `user_totp` | TOTP secret (AES-256-GCM encrypted), nonce, verified status |
| `mfa_recovery_codes` | Recovery codes (SHA-256 hashed + salt, single-use) |
| `webauthn_credentials` | Passkey public keys, credential_id, sign_count, backup_eligible/state |
| `user_devices` | Push notification device tokens (FCM/APNs) |
| `qr_login_sessions` | QR login sessions (session_uuid, status, expiry) |
| `mfa_audit_log` | MFA-specific audit trail |

Users table columns added: `mfa_enabled BOOLEAN DEFAULT FALSE`, `mfa_level INTEGER DEFAULT 0`

### Backend Architecture

#### Config (`backend/config/config.go`)

```
MFA_ENCRYPTION_KEY   — AES-256 key (64 hex chars = 32 bytes) for TOTP secret encryption
WEBAUTHN_RP_ID       — Relying Party ID (default: sso.gerege.mn)
WEBAUTHN_RP_ORIGIN   — Relying Party Origin (default: https://sso.gerege.mn)
WEBAUTHN_RP_NAME     — Display name (default: Gerege SSO)
```

#### Models (`backend/models/mfa.go`)

- `MFASettings` — user_mfa_settings table mapping
- `UserTOTP` — user_totp table (secret encrypted, nonce for AES-GCM)
- `WebAuthnCredential` — webauthn_credentials table
- `UserDevice` — user_devices table
- `QRLoginSession` — qr_login_sessions table
- `RecoveryCode` — mfa_recovery_codes table
- `MFAAuditLog` — mfa_audit_log table
- `MFAChallengeResponse` — API response when MFA is required after login
- `TOTPSetupResponse`, `RecoveryCodesResponse`, `PushChallengeResponse`, `QRGenerateResponse` — API responses
- `WebAuthnUser` — implements webauthn.User interface

#### Services

| Service | File | Key Functions |
|---------|------|---------------|
| TOTP | `backend/services/totp.go` | `SetupTOTP()`, `VerifyTOTPSetup()`, `ValidateTOTP()`, `DisableTOTP()` — AES-256-GCM encrypt/decrypt |
| Passkey | `backend/services/passkey.go` | `BeginRegistration()`, `FinishRegistration()`, `BeginAuthentication()`, `FinishAuthentication()`, `ListPasskeys()`, `DeletePasskey()` |
| Push Auth | `backend/services/push_auth.go` | `RegisterDevice()`, `SendChallenge()`, `ApproveChallenge()`, `DenyChallenge()`, `GetChallengeStatus()`, `ListDevices()`, `RemoveDevice()` — Redis-backed challenge state |
| QR Login | `backend/services/qr_login.go` | `GenerateSession()`, `ApproveSession()`, `GetSessionStatus()`, `MarkScanned()` — Redis + DB + WebSocket broadcast |
| WebSocket Hub | `backend/services/ws_hub.go` | `Register()`, `Unregister()`, `Broadcast()`, `CleanupSession()` — gorilla/websocket |
| Recovery | `backend/services/recovery.go` | `GenerateCodes()`, `ValidateCode()`, `GetRemainingCount()`, `GetCodes()` — SHA-256 hashed, single-use |
| MFA Settings | `backend/services/mfa_settings.go` | `GetSettings()`, `UpdatePreferredMethod()`, `IsMFAEnabled()`, `GetEnabledMethods()`, `SyncMFAEnabled()` |
| MFA Audit | `backend/services/mfa_audit.go` | `Log()`, `GetLogs()` |

#### JWT (`backend/services/jwt.go`)

- `Claims` struct has `MFAPending bool` and `MFAVerified bool` fields
- `GenerateToken()` — full JWT (24h)
- `GenerateTempToken()` — MFA pending JWT (5min, `mfa_pending: true`)
- `ValidateToken()` — parses and validates JWT
- `BlacklistToken()` / `IsBlacklisted()` — Redis-backed token revocation

#### Handlers (`backend/handlers/mfa.go`)

All MFA endpoints are in `MFAHandler`:

**TOTP:** `SetupTOTP`, `VerifyTOTPSetup`, `ValidateTOTP`, `DisableTOTP`
**Passkey:** `PasskeyRegisterBegin`, `PasskeyRegisterFinish`, `PasskeyAuthBegin`, `PasskeyAuthFinish`, `ListPasskeys`, `DeletePasskey`
**Push:** `RegisterDevice`, `SendPushChallenge`, `RespondPushChallenge`, `GetPushChallengeStatus`
**QR Login:** `GenerateQR`, `ApproveQR`, `GetQRStatus`, `QRMarkScanned`, `QRWebSocket`
**Recovery:** `GetRecoveryCodes`, `RegenerateCodes`, `ValidateRecovery`
**Settings:** `GetMFASettings`, `UpdateMFASettings`
**Devices:** `ListDevices`, `RemoveDevice`

#### Auth Handler MFA Integration (`backend/handlers/auth.go`)

- `AuthHandler` includes `mfaSettingsService` dependency
- `generateMFAAwareToken(user)` — checks `user.MFAEnabled`, returns temp token if MFA enabled
- All OAuth callbacks use `generateMFAAwareToken()` and append `&mfa_required=true` to callback URL
- `ExchangeToken()` returns `mfa_required: boolean` in response

### API Routes (`backend/main.go`)

#### MFA Endpoints (under `/api/auth/mfa`)

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| POST | `/totp/setup` | JWT | SetupTOTP |
| POST | `/totp/verify-setup` | JWT | VerifyTOTPSetup |
| POST | `/totp/validate` | JWT | ValidateTOTP |
| DELETE | `/totp` | JWT | DisableTOTP |
| POST | `/passkey/register/begin` | JWT | PasskeyRegisterBegin |
| POST | `/passkey/register/finish` | JWT | PasskeyRegisterFinish |
| POST | `/passkey/auth/begin` | JWT | PasskeyAuthBegin |
| POST | `/passkey/auth/finish` | JWT | PasskeyAuthFinish |
| GET | `/passkey/list` | JWT | ListPasskeys |
| DELETE | `/passkey/:id` | JWT | DeletePasskey |
| POST | `/push/register-device` | JWT | RegisterDevice |
| POST | `/push/challenge` | JWT | SendPushChallenge |
| POST | `/push/respond` | None | RespondPushChallenge |
| GET | `/push/status/:id` | JWT | GetPushChallengeStatus |
| GET | `/recovery/codes` | JWT | GetRecoveryCodes |
| POST | `/recovery/regenerate` | JWT | RegenerateCodes |
| POST | `/recovery/validate` | JWT | ValidateRecovery |
| GET | `/settings` | JWT | GetMFASettings |
| PUT | `/settings` | JWT | UpdateMFASettings |
| GET | `/devices` | JWT | ListDevices |
| DELETE | `/devices/:id` | JWT | RemoveDevice |

#### Passwordless Passkey Login (under `/api/auth`)

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| POST | `/passkey/login/begin` | None | PasskeyLoginBegin — discoverable credentials |
| POST | `/passkey/login/finish` | None | PasskeyLoginFinish — verifies + issues JWT |

#### QR Login Endpoints (under `/api/auth/qr`)

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| GET | `/generate` | None | GenerateQR |
| POST | `/approve` | JWT | ApproveQR |
| GET | `/status/:id` | None | GetQRStatus |
| POST | `/scan` | None | QRMarkScanned — marks session as scanned, broadcasts via WebSocket |

#### WebSocket

| Path | Handler |
|------|---------|
| `/ws/auth/qr/:id` | QRWebSocket — real-time QR session status |

### Go Dependencies (MFA-related)

```
github.com/pquerna/otp          — TOTP generation/validation (RFC 6238)
github.com/go-webauthn/webauthn — Passkey/FIDO2 WebAuthn
github.com/gorilla/websocket    — QR Login WebSocket
github.com/skip2/go-qrcode      — QR code image generation
```

### Frontend Architecture

#### Types (`frontend/src/types/user.ts`)

- `User` — includes `mfa_enabled: boolean`, `mfa_level: number`
- `MFASettings` — `totp_enabled`, `passkey_enabled`, `push_enabled`, `preferred_method`
- `TOTPSetupResponse`, `RecoveryCodesResponse`, `PushChallengeResponse`, `QRGenerateResponse`
- `MFAChallengeResponse`, `PasskeyInfo`, `DeviceInfo`

#### API Client (`frontend/src/lib/api.ts`)

- `api.mfa.*` — all MFA endpoint functions
- `api.mfa.markQRScanned(sessionId)` — marks QR session as scanned (`POST /api/auth/qr/scan`)
- `api.auth.exchangeToken()` returns `{ token, mfa_required }` for MFA-aware flow

#### Auth Store (`frontend/src/stores/authStore.ts`)

- `mfaPending: boolean` — MFA challenge pending
- `tempToken: string | null` — temp JWT for MFA challenge
- `setMFAPending(pending, tempToken?)` — stores temp token
- `clearMFA()` — clears MFA state after successful verification

#### Pages

| Page | File | Purpose |
|------|------|---------|
| MFA Challenge | `frontend/src/app/mfa/page.tsx` | Login-ий дараах MFA баталгаажуулалт (TOTP, Passkey, Push, Recovery tabs) |
| MFA Settings | `frontend/src/app/dashboard/security/mfa/page.tsx` | Dashboard дотор MFA тохиргоо (enable/disable methods, preferred method, recovery codes) |
| Login | `frontend/src/app/page.tsx` | QR Login tab + Passkey Login button нэмсэн, QR "scanned" status харуулна |
| QR Scan | `frontend/src/app/qr/scan/page.tsx` | Утас QR скан хийсний дараа approve хийх page (login шалгах, session mark scanned, approve) |
| Callback | `frontend/src/app/callback/page.tsx` | `mfa_required` flag шалгаад `/mfa` руу redirect |

#### MFA Components (`frontend/src/components/mfa/`)

| Component | File | Purpose |
|-----------|------|---------|
| TOTPSetup | `TOTPSetup.tsx` | 3-step flow: QR code → Verify code → Recovery codes |
| PasskeySetup | `PasskeySetup.tsx` | Register new passkey + list/delete existing |
| DeviceManagement | `DeviceManagement.tsx` | List/remove registered push devices |
| RecoveryCodes | `RecoveryCodes.tsx` | View remaining count, regenerate with confirmation |

#### Frontend npm packages (MFA-related)

```
@simplewebauthn/browser  — Passkey browser API (dynamic import)
qrcode.react             — QR code rendering (TOTP setup)
```

### Security Notes

- TOTP secrets: AES-256-GCM encrypted in DB, key from `MFA_ENCRYPTION_KEY` env var
- Recovery codes: SHA-256 hashed with random salt, single-use
- WebAuthn sessions: stored in Redis with 5min TTL
- Push challenges: Redis-backed with 5min TTL, number match verification
- QR login sessions: dual storage (Redis for fast lookup + DB for persistence), 5min TTL
- TempJWT: 5min TTL, `mfa_pending: true` claim — only valid for MFA endpoints
- All MFA actions are logged in `mfa_audit_log` table

---

## Gerege Authenticator Mobile App (`authenticator/`)

### Overview

Expo SDK 54 (React Native, TypeScript) дээр бичигдсэн тусдаа mobile authenticator апп. Үндсэн зорилго:
- **QR Login** — Компьютер дээрх QR код скан хийж нэг товчоор login approve хийх
- **TOTP Codes** — Google Authenticator шиг 6 оронтой код real-time харуулах (RFC 6238)

**Bundle ID:** `mn.gerege.authenticator`

### Project Structure

```
authenticator/
├── App.tsx                          # Entry point — NavigationContainer + auth check
├── app.json                         # Expo config (camera permission, bundle ID)
├── package.json
├── tsconfig.json
├── src/
│   ├── navigation/
│   │   └── AppNavigator.tsx         # Stack navigator (Login → Home → Scanner → AddAccount)
│   ├── screens/
│   │   ├── LoginScreen.tsx          # Email OTP нэвтрэлт
│   │   ├── HomeScreen.tsx           # TOTP accounts жагсаалт + scan/add товчууд
│   │   ├── ScannerScreen.tsx        # Dual-purpose QR scanner (QR login + TOTP)
│   │   └── AddAccountScreen.tsx     # TOTP account гараар нэмэх
│   ├── components/
│   │   ├── TOTPCode.tsx             # 6 оронтой код + 30с countdown progress bar
│   │   └── AccountCard.tsx          # Account list item (long-press to delete)
│   ├── lib/
│   │   ├── api.ts                   # Backend API client (sso.gerege.mn)
│   │   ├── totp.ts                  # TOTP код тооцоолох (otpauth library, RFC 6238)
│   │   └── storage.ts              # SecureStore wrapper (JWT token, TOTP secrets)
│   └── stores/
│       └── authStore.ts             # Zustand auth state (login, logout, checkAuth)
```

### Screens

| Screen | File | Purpose |
|--------|------|---------|
| Login | `LoginScreen.tsx` | Email OTP login: send-otp → verify-otp → exchange-token → save JWT |
| Home | `HomeScreen.tsx` | TOTP accounts list with live codes, "QR Скан" + "Гараар нэмэх" buttons |
| Scanner | `ScannerScreen.tsx` | expo-camera QR scanner — auto-detects QR type by URL/URI |
| AddAccount | `AddAccountScreen.tsx` | Manual TOTP entry (issuer, email, secret) or scan QR shortcut |

### QR Scanner Dual-Purpose Logic

`ScannerScreen` нэг камер scanner-ээр хоёр төрлийн QR код ялгаж уншина:

1. **QR Login** (`sso.gerege.mn/qr/scan?session=xxx`):
   - `POST /api/auth/qr/scan` → session-г "scanned" гэж тэмдэглэнэ
   - Хэрэглэгчид confirm dialog харуулна
   - "Зөвшөөрөх" → `POST /api/auth/qr/approve` → компьютер дээр auto-login

2. **TOTP URI** (`otpauth://totp/Issuer:account?secret=...`):
   - URI parse → issuer, account, secret задална
   - SecureStore-д хадгална → Home дээр шинэ account гарна

### Storage (`src/lib/storage.ts`)

`expo-secure-store` (iOS Keychain / Android Keystore) ашиглана:
- `saveToken()` / `getToken()` / `removeToken()` — JWT хадгалах
- `saveTOTPAccount()` / `getTOTPAccounts()` / `removeTOTPAccount()` — TOTP secret-үүд

### API Client (`src/lib/api.ts`)

Base URL: `https://sso.gerege.mn`

| Function | Endpoint | Auth |
|----------|----------|------|
| `sendEmailOTP(email)` | `POST /api/auth/email/send-otp` | None |
| `verifyEmailOTP(email, otp)` | `POST /api/auth/email/verify-otp` | None |
| `exchangeToken(code)` | `POST /api/auth/exchange-token` | None |
| `getMe()` | `GET /api/auth/me` | JWT |
| `markQRScanned(sessionId)` | `POST /api/auth/qr/scan` | None |
| `approveQR(sessionId)` | `POST /api/auth/qr/approve` | JWT |
| `setupTOTP()` | `POST /api/auth/mfa/totp/setup` | JWT |
| `verifyTOTPSetup(code)` | `POST /api/auth/mfa/totp/verify-setup` | JWT |

### Auth Store (`src/stores/authStore.ts`)

Zustand store:
- `token` / `user` — JWT token, user info
- `loading` — initial auth check state
- `login(email, otp)` — verify OTP → exchange token → save → fetch user
- `logout()` — clear token + SecureStore
- `checkAuth()` — startup-д token шалгаж /me дуудна

### TOTP Code Generation (`src/lib/totp.ts`)

- `generateTOTPCode(secret)` — `otpauth` library ашиглан 6 digit код (SHA1, 30с period)
- `getRemainingSeconds()` — countdown seconds (30 - current epoch % 30)
- `parseTOTPUri(uri)` — `otpauth://totp/...` URI parse хийж issuer, account, secret буцаана

### npm Dependencies

```
expo-camera                      — QR код скан (barcode scanner)
expo-secure-store                — iOS Keychain / Android Keystore
@react-navigation/native         — Navigation container
@react-navigation/native-stack   — Stack navigator
react-native-screens             — Native screen optimization
react-native-safe-area-context   — Safe area insets
zustand                          — State management
otpauth                          — TOTP код тооцоолох (RFC 6238, no native deps)
```

### Key Design Decisions

- **Client-side TOTP:** Secret-г SecureStore-д хадгалж `otpauth` library-гаар код тооцоолно. Backend руу илгээхгүй (Google Authenticator pattern)
- **Dual-purpose scanner:** Нэг scanner-ээр QR Login + TOTP QR аль алийг уншина. URL/URI parse хийж ялгана
- **No push notification (v1):** MVP-д push байхгүй. QR scan + TOTP only
- **Auth-gated navigation:** Token байхгүй бол зөвхөн LoginScreen харуулна

### Running

```bash
cd authenticator
npx expo start
```

Expo Go апп дээр QR код скан хийж нээнэ.

---

## Gerege Authenticator Native iOS App (`GeregeAuthenticator/`)

### Overview

Swift/SwiftUI дээр бичигдсэн native iOS authenticator апп. `authenticator/` (Expo) аппын бүрэн native хувилбар. **Гуравдагч талын library ашиглаагүй** — бүх зүйлийг Apple framework-оор хийсэн.

- **QR Login** — Компьютер дээрх QR код скан хийж нэг товчоор login approve хийх
- **TOTP Codes** — Google Authenticator шиг 6 оронтой код real-time харуулах (RFC 6238)

**Bundle ID:** `mn.gerege.authenticator`
**Deployment Target:** iOS 16.0+, iPhone only, Portrait only

### Project Structure

```
GeregeAuthenticator/
├── project.yml                              # XcodeGen project spec
├── GeregeAuthenticator.xcodeproj/           # Generated Xcode project
├── GeregeAuthenticator/
│   ├── GeregeAuthenticatorApp.swift         # @main entry point
│   ├── ContentView.swift                     # Auth-gated root (Login vs Home)
│   ├── Models/
│   │   ├── User.swift                        # User Codable model (snake_case CodingKeys)
│   │   ├── TOTPAccount.swift                 # TOTP account (Codable + Identifiable)
│   │   └── APIModels.swift                   # Request/Response DTOs
│   ├── Services/
│   │   ├── APIClient.swift                   # URLSession async/await actor singleton
│   │   ├── KeychainService.swift             # Security.framework Keychain wrapper
│   │   └── TOTPService.swift                 # RFC 6238 TOTP (CryptoKit HMAC-SHA1)
│   ├── ViewModels/
│   │   ├── AuthViewModel.swift               # Login/logout/checkAuth (@MainActor)
│   │   ├── HomeViewModel.swift               # Accounts list + 1s timer + code refresh
│   │   ├── ScannerViewModel.swift            # Dual-purpose QR scan result processing
│   │   └── AddAccountViewModel.swift         # Manual entry validation + save
│   ├── Views/
│   │   ├── LoginView.swift                   # Email OTP two-step login (Mongolian UI)
│   │   ├── HomeView.swift                    # Account list + empty state + bottom buttons
│   │   ├── ScannerView.swift                 # Camera permission + QR overlay + alerts
│   │   ├── AddAccountView.swift              # QR shortcut + manual form
│   │   └── Components/
│   │       ├── AccountCardView.swift         # Card with contextMenu delete
│   │       ├── TOTPCodeView.swift            # "123 456" code + progress bar + countdown
│   │       └── QRScannerRepresentable.swift  # AVFoundation camera UIViewControllerRepresentable
│   └── Utilities/
│       ├── Constants.swift                   # API URL, colors, Keychain keys
│       └── Base32.swift                      # RFC 4648 Base32 decoder (pure Swift)
```

### Architecture

| Layer | Pattern | Details |
|-------|---------|---------|
| App Entry | `@main` SwiftUI App | `@StateObject` AuthViewModel, `.environmentObject()`, `.task { checkAuth() }` |
| Root View | Auth-gated | `isLoading` → ProgressView, `isAuthenticated` → NavigationStack(Home), else → Login |
| State | ObservableObject + @Published | `@MainActor` ViewModels, `@EnvironmentObject` for auth |
| Navigation | NavigationStack | iOS 16+ modern SwiftUI navigation |
| Networking | `actor` APIClient | URLSession async/await, auto JWT injection from Keychain |
| Storage | Keychain (Security.framework) | JWT token + TOTP accounts JSON, `kSecAttrAccessibleWhenUnlockedThisDeviceOnly` |
| TOTP | CryptoKit `Insecure.SHA1` | HMAC → dynamic truncation → 6-digit code, RFC 6238 compliant |
| QR Scanner | AVFoundation | `AVCaptureSession` + `AVCaptureMetadataOutput` (.qr type) |

### Services

#### APIClient (`Services/APIClient.swift`)

`actor` singleton, URLSession async/await. Base URL: `https://sso.gerege.mn`

| Function | Endpoint | Auth |
|----------|----------|------|
| `sendEmailOTP(email:)` | `POST /api/auth/email/send-otp` | None |
| `verifyEmailOTP(email:otp:)` | `POST /api/auth/email/verify-otp` | None |
| `exchangeToken(code:)` | `POST /api/auth/exchange-token` | None |
| `getMe()` | `GET /api/auth/me` | JWT |
| `markQRScanned(sessionId:)` | `POST /api/auth/qr/scan` | None |
| `approveQR(sessionId:)` | `POST /api/auth/qr/approve` | JWT |

#### KeychainService (`Services/KeychainService.swift`)

Static enum, Security.framework wrapper:
- `saveToken()` / `getToken()` / `removeToken()` — JWT token
- `getTOTPAccounts()` / `saveTOTPAccount()` / `removeTOTPAccount()` — TOTP accounts as JSON

#### TOTPService (`Services/TOTPService.swift`)

Static enum:
- `generateCode(secret:)` — Base32 decode → HMAC-SHA1 → dynamic truncation → 6-digit code
- `remainingSeconds()` — `30 - (epoch % 30)`
- `parseURI(_:)` — `otpauth://totp/Issuer:account?secret=...` parser

### Screens

| Screen | File | Purpose |
|--------|------|---------|
| Login | `Views/LoginView.swift` | Email → OTP → login. Mongolian text UI |
| Home | `Views/HomeView.swift` | User email bar, accounts ScrollView, empty state, "QR Скан" + "Гараар нэмэх" buttons |
| Scanner | `Views/ScannerView.swift` | Camera permission, QR overlay (corner brackets), dual-purpose scan |
| AddAccount | `Views/AddAccountView.swift` | QR shortcut NavigationLink, issuer/email/secret manual form |

### QR Scanner Dual-Purpose Logic

`ScannerViewModel` нэг AVFoundation scanner-ээр хоёр төрлийн QR код ялгаж уншина:

1. **QR Login** (`sso.gerege.mn/qr/scan?session=xxx`):
   - `markQRScanned(sessionId:)` — fire-and-forget
   - Confirm alert → `approveQR(sessionId:)` → success alert → dismiss

2. **TOTP URI** (`otpauth://totp/Issuer:account?secret=...`):
   - `TOTPService.parseURI()` → `KeychainService.saveTOTPAccount()` → success alert → dismiss

### Apple Frameworks Used (Zero Third-Party Dependencies)

| Framework | Purpose |
|-----------|---------|
| CryptoKit | `Insecure.SHA1` HMAC for TOTP code generation |
| Security | Keychain read/write (`SecItemAdd`, `SecItemCopyMatching`, `SecItemDelete`) |
| AVFoundation | `AVCaptureSession` + `AVCaptureMetadataOutput` for QR code scanning |
| Foundation/URLSession | Async/await HTTP networking |
| SwiftUI | All UI rendering |

### Building & Running

```bash
# Generate Xcode project (requires xcodegen)
cd GeregeAuthenticator
xcodegen generate

# Build via command line
xcodebuild -project GeregeAuthenticator.xcodeproj -scheme GeregeAuthenticator \
  -destination 'platform=iOS Simulator,name=iPhone 16' build

# Or open in Xcode
open GeregeAuthenticator.xcodeproj
```

### Key Design Decisions

- **Zero dependencies:** CryptoKit, Security.framework, AVFoundation, URLSession — гуравдагч талын library хэрэггүй
- **Client-side TOTP:** Secret-г Keychain-д хадгалж CryptoKit-ээр код тооцоолно. Backend руу илгээхгүй (Google Authenticator pattern)
- **Dual-purpose scanner:** Нэг AVFoundation scanner-ээр QR Login + TOTP QR аль алийг уншина
- **Actor-based networking:** `APIClient` нь Swift actor — thread-safe singleton
- **Auth-gated ContentView:** Token байхгүй бол зөвхөн LoginView харуулна

### Tested on Real Device (2025-02-15)

iPhone дээр бүх үндсэн функц амжилттай тест хийгдсэн:

| Test | Status | Notes |
|------|--------|-------|
| Email OTP Login | Passed | send-otp → verify-otp → exchange-token → getMe flow ажилласан |
| Home Screen | Passed | TOTP accounts list, countdown timer, user email bar |
| QR Scanner | Passed | AVFoundation камер, QR код амжилттай уншсан |
| TOTP Account (QR) | Passed | otpauth:// URI parse → Keychain хадгалах → код харуулах |
| TOTP Account (Manual) | Passed | Гараар issuer/email/secret оруулж нэмсэн |
| QR Login Approve | Passed | Компьютер дээрх QR скан → approve → auto-login |

**Known Fix:** `/api/auth/me` endpoint нь user object-г шууд буцаадаг (wrapper-гүй). Анхны `MeResponse { user: User }` бүтэц буруу байсныг засварласан.

---

### TODO / Future Work

- Push notification delivery via FCM/APNs (currently challenge-only, no actual push sent)
- JWT middleware enforcement: `mfa_pending` tokens should ONLY access MFA endpoints (not yet enforced)
- ~~Gerege Authenticator mobile app (React Native)~~ — implemented in `authenticator/` (Expo SDK 54)
- ~~Gerege Authenticator native iOS app~~ — implemented in `GeregeAuthenticator/` (Swift/SwiftUI, zero dependencies)
- ~~Passkey-only login~~ — implemented via `/api/auth/passkey/login/begin` + `/finish` (discoverable credentials)
