package services

import (
	"database/sql"
	"fmt"

	"gerege-sso/models"
)

// MFASettingsService handles MFA settings operations
type MFASettingsService struct {
	db *sql.DB
}

// NewMFASettingsService creates a new MFASettingsService
func NewMFASettingsService(db *sql.DB) *MFASettingsService {
	return &MFASettingsService{db: db}
}

// GetSettings returns MFA settings for a user, creating defaults if none exist
func (s *MFASettingsService) GetSettings(userID int64) (*models.MFASettings, error) {
	settings := &models.MFASettings{}
	err := s.db.QueryRow(`
		SELECT id, user_id, totp_enabled, passkey_enabled, push_enabled, preferred_method, created_at, updated_at
		FROM user_mfa_settings WHERE user_id = $1
	`, userID).Scan(
		&settings.ID, &settings.UserID, &settings.TOTPEnabled, &settings.PasskeyEnabled,
		&settings.PushEnabled, &settings.PreferredMethod, &settings.CreatedAt, &settings.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		// Return default settings (nothing enabled)
		return &models.MFASettings{UserID: userID}, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get MFA settings: %w", err)
	}
	return settings, nil
}

// EnsureSettings creates MFA settings row if it doesn't exist
func (s *MFASettingsService) EnsureSettings(userID int64) error {
	_, err := s.db.Exec(`
		INSERT INTO user_mfa_settings (user_id) VALUES ($1)
		ON CONFLICT (user_id) DO NOTHING
	`, userID)
	return err
}

// UpdatePreferredMethod updates the preferred MFA method
func (s *MFASettingsService) UpdatePreferredMethod(userID int64, method string) error {
	// Validate method
	validMethods := map[string]bool{"totp": true, "passkey": true, "push": true}
	if !validMethods[method] {
		return fmt.Errorf("invalid MFA method: %s", method)
	}

	// Ensure settings row exists
	if err := s.EnsureSettings(userID); err != nil {
		return err
	}

	_, err := s.db.Exec(`
		UPDATE user_mfa_settings SET preferred_method = $1, updated_at = CURRENT_TIMESTAMP
		WHERE user_id = $2
	`, method, userID)
	if err != nil {
		return fmt.Errorf("failed to update preferred method: %w", err)
	}
	return nil
}

// IsMFAEnabled checks if the user has any MFA method enabled
func (s *MFASettingsService) IsMFAEnabled(userID int64) (bool, error) {
	var enabled bool
	err := s.db.QueryRow(`SELECT mfa_enabled FROM users WHERE id = $1`, userID).Scan(&enabled)
	if err != nil {
		return false, fmt.Errorf("failed to check MFA status: %w", err)
	}
	return enabled, nil
}

