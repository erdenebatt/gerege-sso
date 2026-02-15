package services

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"fmt"
	"math/big"
	"time"

	"gerege-sso/models"

	"github.com/redis/go-redis/v9"
	"golang.org/x/net/context"
)

// PushAuthService handles push notification MFA challenges
type PushAuthService struct {
	db    *sql.DB
	redis *redis.Client
}

// NewPushAuthService creates a new PushAuthService
func NewPushAuthService(db *sql.DB, rdb *redis.Client) *PushAuthService {
	return &PushAuthService{db: db, redis: rdb}
}

// RegisterDevice registers a device for push notifications
func (s *PushAuthService) RegisterDevice(userID int64, token, name, deviceType string) (*models.UserDevice, error) {
	if deviceType != "android" && deviceType != "ios" {
		return nil, fmt.Errorf("invalid device type: %s", deviceType)
	}

	// Generate UUID for id
	idBytes := make([]byte, 16)
	if _, err := rand.Read(idBytes); err != nil {
		return nil, fmt.Errorf("failed to generate id: %w", err)
	}
	id := hex.EncodeToString(idBytes)

	device := &models.UserDevice{}
	err := s.db.QueryRow(`
		INSERT INTO user_devices (id, user_id, device_token, device_name, device_type, is_verified)
		VALUES ($1, $2, $3, $4, $5, true)
		RETURNING id, user_id, device_name, device_type, is_verified, created_at, updated_at
	`, id, userID, token, name, deviceType).Scan(
		&device.ID, &device.UserID, &device.DeviceName, &device.DeviceType,
		&device.IsVerified, &device.CreatedAt, &device.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to register device: %w", err)
	}

	// Update MFA settings
	s.db.Exec(`
		INSERT INTO user_mfa_settings (user_id, push_enabled) VALUES ($1, true)
		ON CONFLICT (user_id) DO UPDATE SET push_enabled = true, updated_at = CURRENT_TIMESTAMP
	`, userID)
	s.db.Exec(`UPDATE users SET mfa_enabled = true WHERE id = $1`, userID)

	return device, nil
}

// SendChallenge creates a push notification challenge with a number match code
func (s *PushAuthService) SendChallenge(userID int64) (*models.PushChallengeResponse, error) {
	// Generate challenge ID
	idBytes := make([]byte, 16)
	if _, err := rand.Read(idBytes); err != nil {
		return nil, fmt.Errorf("failed to generate challenge id: %w", err)
	}
	challengeID := hex.EncodeToString(idBytes)

	// Generate 2-digit number match code
	n, err := rand.Int(rand.Reader, big.NewInt(100))
	if err != nil {
		return nil, fmt.Errorf("failed to generate number match: %w", err)
	}
	numberMatch := int(n.Int64())

	// Store challenge in Redis (5 minute TTL)
	ctx := context.Background()
	challengeKey := "push_challenge:" + challengeID
	s.redis.HSet(ctx, challengeKey, map[string]interface{}{
		"user_id":      userID,
		"number_match": numberMatch,
		"status":       "pending",
	})
	s.redis.Expire(ctx, challengeKey, 5*time.Minute)

	// TODO: Send FCM/APNs push notification to user's devices
	// For now, the challenge can be approved via the API

	return &models.PushChallengeResponse{
		ChallengeID: challengeID,
		NumberMatch: numberMatch,
		ExpiresIn:   300,
	}, nil
}

// ApproveChallenge approves a push notification challenge
func (s *PushAuthService) ApproveChallenge(challengeID string, numberMatch int) (int64, error) {
	ctx := context.Background()
	challengeKey := "push_challenge:" + challengeID

	// Get challenge data
	data, err := s.redis.HGetAll(ctx, challengeKey).Result()
	if err != nil || len(data) == 0 {
		return 0, fmt.Errorf("challenge not found or expired")
	}

	if data["status"] != "pending" {
		return 0, fmt.Errorf("challenge already %s", data["status"])
	}

	// Verify number match
	storedMatch := 0
	fmt.Sscanf(data["number_match"], "%d", &storedMatch)
	if storedMatch != numberMatch {
		return 0, fmt.Errorf("number match incorrect")
	}

	// Mark as approved
	s.redis.HSet(ctx, challengeKey, "status", "approved")

	var userID int64
	fmt.Sscanf(data["user_id"], "%d", &userID)
	return userID, nil
}

// DenyChallenge denies a push notification challenge
func (s *PushAuthService) DenyChallenge(challengeID string) error {
	ctx := context.Background()
	challengeKey := "push_challenge:" + challengeID

	exists, err := s.redis.Exists(ctx, challengeKey).Result()
	if err != nil || exists == 0 {
		return fmt.Errorf("challenge not found or expired")
	}

	s.redis.HSet(ctx, challengeKey, "status", "denied")
	return nil
}

// GetChallengeStatus returns the current status of a push challenge
func (s *PushAuthService) GetChallengeStatus(challengeID string) (string, int64, error) {
	ctx := context.Background()
	challengeKey := "push_challenge:" + challengeID

	data, err := s.redis.HGetAll(ctx, challengeKey).Result()
	if err != nil || len(data) == 0 {
		return "expired", 0, nil
	}

	var userID int64
	fmt.Sscanf(data["user_id"], "%d", &userID)

	return data["status"], userID, nil
}

// ListDevices returns all devices for a user
func (s *PushAuthService) ListDevices(userID int64) ([]models.UserDevice, error) {
	rows, err := s.db.Query(`
		SELECT id, user_id, device_name, device_type, is_verified, created_at, updated_at, last_used_at
		FROM user_devices WHERE user_id = $1 ORDER BY created_at
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query devices: %w", err)
	}
	defer rows.Close()

	var devices []models.UserDevice
	for rows.Next() {
		var d models.UserDevice
		if err := rows.Scan(&d.ID, &d.UserID, &d.DeviceName, &d.DeviceType, &d.IsVerified, &d.CreatedAt, &d.UpdatedAt, &d.LastUsedAt); err != nil {
			return nil, fmt.Errorf("failed to scan device: %w", err)
		}
		devices = append(devices, d)
	}
	return devices, nil
}

// SendSignChallenge creates a push notification challenge for a signing request
func (s *PushAuthService) SendSignChallenge(userID int64, sessionID, documentHash, documentName string) (*models.MobileSignRequest, error) {
	// Generate challenge ID
	idBytes := make([]byte, 16)
	if _, err := rand.Read(idBytes); err != nil {
		return nil, fmt.Errorf("failed to generate challenge id: %w", err)
	}
	challengeID := hex.EncodeToString(idBytes)

	// Store challenge in Redis (10 minute TTL for signing)
	ctx := context.Background()
	challengeKey := "sign_push:" + challengeID
	s.redis.HSet(ctx, challengeKey, map[string]interface{}{
		"user_id":       userID,
		"session_id":    sessionID,
		"document_hash": documentHash,
		"document_name": documentName,
		"status":        "pending",
	})
	s.redis.Expire(ctx, challengeKey, 10*time.Minute)

	// TODO: Send FCM/APNs push notification with signing details
	// For now, the challenge can be approved via the API

	return &models.MobileSignRequest{
		ChallengeID:  challengeID,
		SessionID:    sessionID,
		DocumentHash: documentHash,
		DocumentName: documentName,
		ExpiresIn:    600,
	}, nil
}

// RemoveDevice removes a device
func (s *PushAuthService) RemoveDevice(userID int64, deviceID string) error {
	result, err := s.db.Exec(`DELETE FROM user_devices WHERE id = $1 AND user_id = $2`, deviceID, userID)
	if err != nil {
		return fmt.Errorf("failed to remove device: %w", err)
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		return fmt.Errorf("device not found")
	}

	// Check if any devices remain
	var count int
	s.db.QueryRow(`SELECT COUNT(*) FROM user_devices WHERE user_id = $1`, userID).Scan(&count)
	if count == 0 {
		s.db.Exec(`
			INSERT INTO user_mfa_settings (user_id, push_enabled) VALUES ($1, false)
			ON CONFLICT (user_id) DO UPDATE SET push_enabled = false, updated_at = CURRENT_TIMESTAMP
		`, userID)
		s.db.Exec(`
			UPDATE users SET mfa_enabled = (
				SELECT COALESCE(totp_enabled OR passkey_enabled OR push_enabled, false)
				FROM user_mfa_settings WHERE user_id = $1
			) WHERE id = $1
		`, userID)
	}

	return nil
}
