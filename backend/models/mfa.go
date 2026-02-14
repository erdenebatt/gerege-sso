package models

import "time"

// MFASettings represents the user_mfa_settings table
type MFASettings struct {
	ID              int        `json:"id"`
	UserID          int64      `json:"user_id"`
	TOTPEnabled     bool       `json:"totp_enabled"`
	PasskeyEnabled  bool       `json:"passkey_enabled"`
	PushEnabled     bool       `json:"push_enabled"`
	PreferredMethod *string    `json:"preferred_method"` // "totp" | "passkey" | "push"
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

// UserTOTP represents the user_totp table
type UserTOTP struct {
	ID                  int        `json:"id"`
	UserID              int64      `json:"user_id"`
	TOTPSecretEncrypted []byte     `json:"-"`
	TOTPNonce           []byte     `json:"-"`
	IsEnabled           bool       `json:"is_enabled"`
	VerifiedAt          *time.Time `json:"verified_at"`
	CreatedAt           time.Time  `json:"created_at"`
	UpdatedAt           time.Time  `json:"updated_at"`
}

// WebAuthnCredential represents the webauthn_credentials table
type WebAuthnCredential struct {
	ID              string     `json:"id"`
	UserID          int64      `json:"user_id"`
	CredentialID    []byte     `json:"credential_id"`
	PublicKey       []byte     `json:"-"`
	AttestationType string     `json:"attestation_type"`
	AAGUID          []byte     `json:"-"`
	SignCount       uint32     `json:"sign_count"`
	CredentialName  string     `json:"credential_name"`
	Transport       []string   `json:"transport"`
	CreatedAt       time.Time  `json:"created_at"`
	LastUsedAt      *time.Time `json:"last_used_at"`
}

// UserDevice represents the user_devices table
type UserDevice struct {
	ID          string     `json:"id"`
	UserID      int64      `json:"user_id"`
	DeviceToken string     `json:"-"`
	DeviceName  string     `json:"device_name"`
	DeviceType  string     `json:"device_type"` // "android" | "ios"
	IsVerified  bool       `json:"is_verified"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	LastUsedAt  *time.Time `json:"last_used_at"`
}

// QRLoginSession represents the qr_login_sessions table
type QRLoginSession struct {
	ID          string     `json:"id"`
	SessionUUID string     `json:"session_uuid"`
	Status      string     `json:"status"` // "pending" | "scanned" | "approved" | "denied" | "expired"
	UserID      *int64     `json:"user_id,omitempty"`
	IPAddress   string     `json:"ip_address"`
	UserAgent   string     `json:"user_agent"`
	ExpiresAt   time.Time  `json:"expires_at"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// RecoveryCode represents the mfa_recovery_codes table
type RecoveryCode struct {
	ID        string     `json:"id"`
	UserID    int64      `json:"user_id"`
	CodeHash  string     `json:"-"`
	Salt      string     `json:"-"`
	IsUsed    bool       `json:"is_used"`
	UsedAt    *time.Time `json:"used_at"`
	CreatedAt time.Time  `json:"created_at"`
}

// MFAAuditLog represents the mfa_audit_log table
type MFAAuditLog struct {
	ID        int64     `json:"id"`
	UserID    *int64    `json:"user_id"`
	Action    string    `json:"action"`
	Method    string    `json:"method"`
	Success   bool      `json:"success"`
	IPAddress string    `json:"ip_address"`
	UserAgent string    `json:"user_agent"`
	Details   string    `json:"details"` // JSON string
	CreatedAt time.Time `json:"created_at"`
}

// MFAChallengeResponse is returned when MFA is required after login
type MFAChallengeResponse struct {
	ChallengeID string   `json:"challenge_id"`
	Methods     []string `json:"methods"`
	Preferred   string   `json:"preferred_method,omitempty"`
	ExpiresIn   int      `json:"expires_in"`
	TempToken   string   `json:"temp_token"`
}

// TOTPSetupResponse is returned when setting up TOTP
type TOTPSetupResponse struct {
	Secret  string `json:"secret"`
	QRCodeURI string `json:"qr_code_uri"`
	Issuer  string `json:"issuer"`
	Account string `json:"account"`
}

// RecoveryCodesResponse is returned when generating recovery codes
type RecoveryCodesResponse struct {
	Codes []string `json:"codes"`
}

// PushChallengeResponse is returned when sending a push challenge
type PushChallengeResponse struct {
	ChallengeID string `json:"challenge_id"`
	NumberMatch int    `json:"number_match"`
	ExpiresIn   int    `json:"expires_in"`
}

// QRGenerateResponse is returned when generating a QR login session
type QRGenerateResponse struct {
	SessionID string `json:"session_id"`
	QRCode    string `json:"qr_code"` // base64 encoded PNG
	ExpiresIn int    `json:"expires_in"`
}

// WebAuthnUser implements the webauthn.User interface
type WebAuthnUser struct {
	ID          int64
	GenID       string
	Email       string
	Credentials []WebAuthnCredential
}

func (u *WebAuthnUser) WebAuthnID() []byte {
	return []byte(u.GenID)
}

func (u *WebAuthnUser) WebAuthnName() string {
	return u.Email
}

func (u *WebAuthnUser) WebAuthnDisplayName() string {
	return u.Email
}

func (u *WebAuthnUser) WebAuthnCredentials() []byte {
	return nil // We handle credentials manually
}

func (u *WebAuthnUser) WebAuthnIcon() string {
	return ""
}
