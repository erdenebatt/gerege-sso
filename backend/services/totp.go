package services

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"fmt"
	"time"

	"gerege-sso/models"

	"github.com/pquerna/otp"
	"github.com/pquerna/otp/totp"
)

// TOTPService handles TOTP-based two-factor authentication
type TOTPService struct {
	db            *sql.DB
	encryptionKey []byte // 32 bytes for AES-256-GCM
}

// NewTOTPService creates a new TOTPService with the given database connection
// and hex-encoded encryption key (must be 64 hex chars = 32 bytes for AES-256)
func NewTOTPService(db *sql.DB, encryptionKey string) *TOTPService {
	key, err := hex.DecodeString(encryptionKey)
	if err != nil {
		panic(fmt.Sprintf("invalid TOTP encryption key (hex decode failed): %v", err))
	}
	if len(key) != 32 {
		panic(fmt.Sprintf("TOTP encryption key must be 32 bytes (64 hex chars), got %d bytes", len(key)))
	}
	return &TOTPService{
		db:            db,
		encryptionKey: key,
	}
}

// encrypt encrypts plaintext using AES-256-GCM and returns ciphertext and nonce
func (s *TOTPService) encrypt(plaintext []byte) (ciphertext, nonce []byte, err error) {
	block, err := aes.NewCipher(s.encryptionKey)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create AES cipher: %w", err)
	}

	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create GCM: %w", err)
	}

	nonce = make([]byte, aesGCM.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return nil, nil, fmt.Errorf("failed to generate nonce: %w", err)
	}

	ciphertext = aesGCM.Seal(nil, nonce, plaintext, nil)
	return ciphertext, nonce, nil
}

// decrypt decrypts ciphertext using AES-256-GCM with the given nonce
func (s *TOTPService) decrypt(ciphertext, nonce []byte) ([]byte, error) {
	block, err := aes.NewCipher(s.encryptionKey)
	if err != nil {
		return nil, fmt.Errorf("failed to create AES cipher: %w", err)
	}

	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("failed to create GCM: %w", err)
	}

	plaintext, err := aesGCM.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt: %w", err)
	}

	return plaintext, nil
}

// SetupTOTP generates a new TOTP secret for the user, encrypts it, and stores it
// in the user_totp table. Returns the setup response with secret and QR URI.
func (s *TOTPService) SetupTOTP(userID int64, email string) (*models.TOTPSetupResponse, error) {
	// Generate TOTP key
	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      "Gerege SSO",
		AccountName: email,
		Period:      30,
		Digits:      otp.DigitsSix,
		Algorithm:   otp.AlgorithmSHA1,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to generate TOTP key: %w", err)
	}

	// Encrypt the secret
	secret := key.Secret()
	ciphertext, nonce, err := s.encrypt([]byte(secret))
	if err != nil {
		return nil, fmt.Errorf("failed to encrypt TOTP secret: %w", err)
	}

	// Store in database (INSERT or UPDATE on conflict)
	_, err = s.db.Exec(`
		INSERT INTO user_totp (user_id, totp_secret_encrypted, totp_nonce, is_enabled)
		VALUES ($1, $2, $3, false)
		ON CONFLICT (user_id) DO UPDATE SET
			totp_secret_encrypted = $2,
			totp_nonce = $3,
			is_enabled = false,
			verified_at = NULL,
			updated_at = NOW()
	`, userID, ciphertext, nonce)
	if err != nil {
		return nil, fmt.Errorf("failed to store TOTP secret: %w", err)
	}

	return &models.TOTPSetupResponse{
		Secret:    secret,
		QRCodeURI: key.URL(),
		Issuer:    "Gerege SSO",
		Account:   email,
	}, nil
}

// VerifyTOTPSetup verifies the TOTP code during initial setup and enables TOTP for the user.
// This validates the code, sets is_enabled=true and verified_at on user_totp,
// updates user_mfa_settings (totp_enabled=true), and sets users.mfa_enabled=true.
func (s *TOTPService) VerifyTOTPSetup(userID int64, code string) error {
	// Read encrypted secret from DB
	var ciphertext, nonce []byte
	err := s.db.QueryRow(`
		SELECT totp_secret_encrypted, totp_nonce
		FROM user_totp
		WHERE user_id = $1
	`, userID).Scan(&ciphertext, &nonce)
	if err == sql.ErrNoRows {
		return fmt.Errorf("TOTP not set up for user %d", userID)
	}
	if err != nil {
		return fmt.Errorf("failed to read TOTP secret: %w", err)
	}

	// Decrypt the secret
	plaintext, err := s.decrypt(ciphertext, nonce)
	if err != nil {
		return fmt.Errorf("failed to decrypt TOTP secret: %w", err)
	}
	secret := string(plaintext)

	// Validate the code
	valid, err := totp.ValidateCustom(code, secret, time.Now().UTC(), totp.ValidateOpts{
		Period: 30,
		Skew:   1,
		Digits: otp.DigitsSix,
		Algorithm: otp.AlgorithmSHA1,
	})
	if err != nil {
		return fmt.Errorf("failed to validate TOTP code: %w", err)
	}
	if !valid {
		return fmt.Errorf("invalid TOTP code")
	}

	// Enable TOTP on user_totp
	now := time.Now().UTC()
	_, err = s.db.Exec(`
		UPDATE user_totp
		SET is_enabled = true, verified_at = $1, updated_at = $1
		WHERE user_id = $2
	`, now, userID)
	if err != nil {
		return fmt.Errorf("failed to enable TOTP: %w", err)
	}

	// Upsert user_mfa_settings with totp_enabled=true
	_, err = s.db.Exec(`
		INSERT INTO user_mfa_settings (user_id, totp_enabled)
		VALUES ($1, true)
		ON CONFLICT (user_id) DO UPDATE SET
			totp_enabled = true,
			updated_at = NOW()
	`, userID)
	if err != nil {
		return fmt.Errorf("failed to update MFA settings: %w", err)
	}

	// Set users.mfa_enabled = true
	_, err = s.db.Exec(`
		UPDATE users SET mfa_enabled = true WHERE id = $1
	`, userID)
	if err != nil {
		return fmt.Errorf("failed to update user MFA status: %w", err)
	}

	return nil
}

// ValidateTOTP validates a TOTP code for an authenticated user.
// Returns false if TOTP is not enabled or the code is invalid.
func (s *TOTPService) ValidateTOTP(userID int64, code string) (bool, error) {
	// Read encrypted secret and enabled status from DB
	var ciphertext, nonce []byte
	var isEnabled bool
	err := s.db.QueryRow(`
		SELECT totp_secret_encrypted, totp_nonce, is_enabled
		FROM user_totp
		WHERE user_id = $1
	`, userID).Scan(&ciphertext, &nonce, &isEnabled)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("failed to read TOTP secret: %w", err)
	}

	if !isEnabled {
		return false, nil
	}

	// Decrypt the secret
	plaintext, err := s.decrypt(ciphertext, nonce)
	if err != nil {
		return false, fmt.Errorf("failed to decrypt TOTP secret: %w", err)
	}
	secret := string(plaintext)

	// Validate the code
	valid, err := totp.ValidateCustom(code, secret, time.Now().UTC(), totp.ValidateOpts{
		Period:    30,
		Skew:     1,
		Digits:   otp.DigitsSix,
		Algorithm: otp.AlgorithmSHA1,
	})
	if err != nil {
		return false, fmt.Errorf("failed to validate TOTP code: %w", err)
	}

	return valid, nil
}

// DisableTOTP disables TOTP for the user. It sets is_enabled=false on user_totp,
// updates user_mfa_settings (totp_enabled=false), and checks if any other MFA method
// is still enabled to determine the users.mfa_enabled flag.
func (s *TOTPService) DisableTOTP(userID int64) error {
	// Disable TOTP in user_totp
	_, err := s.db.Exec(`
		UPDATE user_totp
		SET is_enabled = false, updated_at = NOW()
		WHERE user_id = $1
	`, userID)
	if err != nil {
		return fmt.Errorf("failed to disable TOTP: %w", err)
	}

	// Update user_mfa_settings
	_, err = s.db.Exec(`
		INSERT INTO user_mfa_settings (user_id, totp_enabled)
		VALUES ($1, false)
		ON CONFLICT (user_id) DO UPDATE SET
			totp_enabled = false,
			updated_at = NOW()
	`, userID)
	if err != nil {
		return fmt.Errorf("failed to update MFA settings: %w", err)
	}

	// Check if any MFA method is still enabled
	var anyEnabled bool
	err = s.db.QueryRow(`
		SELECT (totp_enabled OR passkey_enabled OR push_enabled)
		FROM user_mfa_settings
		WHERE user_id = $1
	`, userID).Scan(&anyEnabled)
	if err != nil && err != sql.ErrNoRows {
		return fmt.Errorf("failed to check MFA settings: %w", err)
	}

	// Update users.mfa_enabled accordingly
	_, err = s.db.Exec(`
		UPDATE users SET mfa_enabled = $1 WHERE id = $2
	`, anyEnabled, userID)
	if err != nil {
		return fmt.Errorf("failed to update user MFA status: %w", err)
	}

	return nil
}
