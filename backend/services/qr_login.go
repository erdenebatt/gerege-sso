package services

import (
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"gerege-sso/models"

	"github.com/redis/go-redis/v9"
	qrcode "github.com/skip2/go-qrcode"
	"golang.org/x/net/context"
)

// QRLoginService handles QR code login sessions
type QRLoginService struct {
	db        *sql.DB
	redis     *redis.Client
	wsHub     *WSHub
	publicURL string
}

// NewQRLoginService creates a new QRLoginService
func NewQRLoginService(db *sql.DB, rdb *redis.Client, wsHub *WSHub, publicURL string) *QRLoginService {
	return &QRLoginService{
		db:        db,
		redis:     rdb,
		wsHub:     wsHub,
		publicURL: publicURL,
	}
}

// GenerateSession creates a new QR login session with a QR code image
func (s *QRLoginService) GenerateSession(ipAddress, userAgent string) (*models.QRGenerateResponse, error) {
	// Generate session UUID
	uuidBytes := make([]byte, 16)
	if _, err := rand.Read(uuidBytes); err != nil {
		return nil, fmt.Errorf("failed to generate session uuid: %w", err)
	}
	sessionUUID := hex.EncodeToString(uuidBytes)

	// Generate DB row ID
	idBytes := make([]byte, 16)
	if _, err := rand.Read(idBytes); err != nil {
		return nil, fmt.Errorf("failed to generate id: %w", err)
	}
	id := hex.EncodeToString(idBytes)

	expiresAt := time.Now().Add(5 * time.Minute)

	// Store in DB
	_, err := s.db.Exec(`
		INSERT INTO qr_login_sessions (id, session_uuid, status, ip_address, user_agent, expires_at)
		VALUES ($1, $2, 'pending', $3, $4, $5)
	`, id, sessionUUID, ipAddress, userAgent, expiresAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create QR session: %w", err)
	}

	// Also store in Redis for fast lookup
	ctx := context.Background()
	s.redis.Set(ctx, "qr_session:"+sessionUUID, "pending", 5*time.Minute)

	// Generate QR code image with the session approval URL
	qrData := fmt.Sprintf("%s/qr/scan?session=%s", s.publicURL, sessionUUID)
	png, err := qrcode.Encode(qrData, qrcode.Medium, 256)
	if err != nil {
		return nil, fmt.Errorf("failed to generate QR code: %w", err)
	}

	qrBase64 := base64.StdEncoding.EncodeToString(png)

	return &models.QRGenerateResponse{
		SessionID: sessionUUID,
		QRCode:    "data:image/png;base64," + qrBase64,
		ExpiresIn: 300,
	}, nil
}

// ApproveSession approves a QR login session (called from mobile app)
func (s *QRLoginService) ApproveSession(sessionUUID string, userID int64) error {
	ctx := context.Background()

	// Check session exists and is pending
	status, err := s.redis.Get(ctx, "qr_session:"+sessionUUID).Result()
	if err != nil {
		return fmt.Errorf("session not found or expired")
	}
	if status != "pending" && status != "scanned" {
		return fmt.Errorf("session already %s", status)
	}

	// Update in Redis
	s.redis.Set(ctx, "qr_session:"+sessionUUID, fmt.Sprintf("approved:%d", userID), 2*time.Minute)

	// Update in DB (Redis is source of truth; log but don't fail on DB error)
	if _, err := s.db.Exec(`
		UPDATE qr_login_sessions SET status = 'approved', user_id = $1, updated_at = CURRENT_TIMESTAMP
		WHERE session_uuid = $2
	`, userID, sessionUUID); err != nil {
		log.Printf("WARNING: failed to update QR session %s in DB: %v", sessionUUID, err)
	}

	// Broadcast via WebSocket
	msg, _ := json.Marshal(map[string]interface{}{
		"status":  "approved",
		"user_id": userID,
	})
	s.wsHub.Broadcast(sessionUUID, msg)

	return nil
}

// GetSessionStatus returns the current status of a QR session
func (s *QRLoginService) GetSessionStatus(sessionUUID string) (string, int64, error) {
	ctx := context.Background()

	val, err := s.redis.Get(ctx, "qr_session:"+sessionUUID).Result()
	if err != nil {
		return "expired", 0, nil
	}

	// Parse "approved:{userID}" format
	if len(val) > 9 && val[:9] == "approved:" {
		var userID int64
		fmt.Sscanf(val[9:], "%d", &userID)
		return "approved", userID, nil
	}

	return val, 0, nil
}

// MarkScanned marks a session as scanned (mobile app opened the QR URL)
func (s *QRLoginService) MarkScanned(sessionUUID string) error {
	ctx := context.Background()

	status, err := s.redis.Get(ctx, "qr_session:"+sessionUUID).Result()
	if err != nil {
		return fmt.Errorf("session not found or expired")
	}
	if status != "pending" {
		return fmt.Errorf("session already %s", status)
	}

	ttl, _ := s.redis.TTL(ctx, "qr_session:"+sessionUUID).Result()
	if ttl > 0 {
		s.redis.Set(ctx, "qr_session:"+sessionUUID, "scanned", ttl)
	}

	// Update DB (Redis is source of truth; log but don't fail on DB error)
	if _, err := s.db.Exec(`
		UPDATE qr_login_sessions SET status = 'scanned', updated_at = CURRENT_TIMESTAMP
		WHERE session_uuid = $1
	`, sessionUUID); err != nil {
		log.Printf("WARNING: failed to update QR session %s in DB: %v", sessionUUID, err)
	}

	// Broadcast via WebSocket
	msg, _ := json.Marshal(map[string]string{"status": "scanned"})
	s.wsHub.Broadcast(sessionUUID, msg)

	return nil
}
