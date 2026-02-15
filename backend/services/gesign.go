package services

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"time"

	"gerege-sso/models"

	"github.com/redis/go-redis/v9"
	"golang.org/x/net/context"
)

// GesignService handles digital signing operations
type GesignService struct {
	signDB *sql.DB       // gerege_sign database
	ssoDB  *sql.DB       // gerege_sso database (user lookups)
	redis  *redis.Client
	wsHub  *WSHub
}

// NewGesignService creates a new GesignService
func NewGesignService(signDB, ssoDB *sql.DB, rdb *redis.Client, wsHub *WSHub) *GesignService {
	return &GesignService{
		signDB: signDB,
		ssoDB:  ssoDB,
		redis:  rdb,
		wsHub:  wsHub,
	}
}

// CreateSignRequest creates a new signing session
func (s *GesignService) CreateSignRequest(userID int64, documentHash, hashAlgorithm, documentName, clientIP, userAgent string) (*models.SignRequestResponse, error) {
	if hashAlgorithm == "" {
		hashAlgorithm = "SHA-256"
	}

	// Generate session ID
	idBytes := make([]byte, 32)
	if _, err := rand.Read(idBytes); err != nil {
		return nil, fmt.Errorf("failed to generate session id: %w", err)
	}
	sessionID := hex.EncodeToString(idBytes)

	expiresAt := time.Now().Add(10 * time.Minute)

	// Store in DB
	_, err := s.signDB.Exec(`
		INSERT INTO signing_sessions (session_id, user_id, document_hash, hash_algorithm, document_name, status, client_ip, user_agent, expires_at)
		VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, $8)
	`, sessionID, userID, documentHash, hashAlgorithm, documentName, clientIP, userAgent, expiresAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create signing session: %w", err)
	}

	// Cache in Redis with 10min TTL
	ctx := context.Background()
	redisKey := "sign_session:" + sessionID
	s.redis.HSet(ctx, redisKey, map[string]interface{}{
		"user_id":       userID,
		"document_hash": documentHash,
		"document_name": documentName,
		"status":        "pending",
	})
	s.redis.Expire(ctx, redisKey, 10*time.Minute)

	return &models.SignRequestResponse{
		SessionID:    sessionID,
		Status:       "pending",
		ExpiresIn:    600,
		DocumentHash: documentHash,
		DocumentName: documentName,
	}, nil
}

// GetSigningStatus returns the current status of a signing session
func (s *GesignService) GetSigningStatus(sessionID string) (string, error) {
	// Check Redis first
	ctx := context.Background()
	redisKey := "sign_session:" + sessionID
	status, err := s.redis.HGet(ctx, redisKey, "status").Result()
	if err == nil && status != "" {
		return status, nil
	}

	// Fallback to DB
	var dbStatus string
	err = s.signDB.QueryRow(`
		SELECT status FROM signing_sessions WHERE session_id = $1
	`, sessionID).Scan(&dbStatus)
	if err != nil {
		return "", fmt.Errorf("session not found")
	}
	return dbStatus, nil
}

// ApproveSignRequest marks a signing session as approved
func (s *GesignService) ApproveSignRequest(sessionID string, userID int64) error {
	// Verify ownership
	var ownerID int64
	err := s.signDB.QueryRow(`
		SELECT user_id FROM signing_sessions WHERE session_id = $1 AND status = 'pending' AND expires_at > CURRENT_TIMESTAMP
	`, sessionID).Scan(&ownerID)
	if err != nil {
		return fmt.Errorf("session not found or expired")
	}
	if ownerID != userID {
		return fmt.Errorf("unauthorized: session belongs to another user")
	}

	// Update DB
	_, err = s.signDB.Exec(`
		UPDATE signing_sessions SET status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE session_id = $1
	`, sessionID)
	if err != nil {
		return fmt.Errorf("failed to approve session: %w", err)
	}

	// Update Redis
	ctx := context.Background()
	redisKey := "sign_session:" + sessionID
	s.redis.HSet(ctx, redisKey, "status", "approved")

	// Broadcast via WebSocket
	msg, _ := json.Marshal(map[string]string{"status": "approved", "session_id": sessionID})
	s.wsHub.Broadcast("sign:"+sessionID, msg)

	return nil
}

// DenySignRequest marks a signing session as denied
func (s *GesignService) DenySignRequest(sessionID string, userID int64) error {
	var ownerID int64
	err := s.signDB.QueryRow(`
		SELECT user_id FROM signing_sessions WHERE session_id = $1 AND status = 'pending' AND expires_at > CURRENT_TIMESTAMP
	`, sessionID).Scan(&ownerID)
	if err != nil {
		return fmt.Errorf("session not found or expired")
	}
	if ownerID != userID {
		return fmt.Errorf("unauthorized: session belongs to another user")
	}

	_, err = s.signDB.Exec(`
		UPDATE signing_sessions SET status = 'denied', updated_at = CURRENT_TIMESTAMP WHERE session_id = $1
	`, sessionID)
	if err != nil {
		return fmt.Errorf("failed to deny session: %w", err)
	}

	ctx := context.Background()
	redisKey := "sign_session:" + sessionID
	s.redis.HSet(ctx, redisKey, "status", "denied")

	msg, _ := json.Marshal(map[string]string{"status": "denied", "session_id": sessionID})
	s.wsHub.Broadcast("sign:"+sessionID, msg)

	return nil
}

// CompleteSign finalizes a signing session with the actual signature
func (s *GesignService) CompleteSign(sessionID, signature, certificateID, clientIP, userAgent string) error {
	// Get session
	var session models.SigningSession
	err := s.signDB.QueryRow(`
		SELECT id, session_id, user_id, document_hash, hash_algorithm, status
		FROM signing_sessions WHERE session_id = $1
	`, sessionID).Scan(&session.ID, &session.SessionID, &session.UserID, &session.DocumentHash, &session.HashAlgorithm, &session.Status)
	if err != nil {
		return fmt.Errorf("session not found")
	}

	if session.Status != "approved" {
		return fmt.Errorf("session must be approved before signing (current: %s)", session.Status)
	}

	// Verify certificate belongs to user and is active
	var certStatus string
	err = s.signDB.QueryRow(`
		SELECT status FROM certificates WHERE id = $1 AND user_id = $2
	`, certificateID, session.UserID).Scan(&certStatus)
	if err != nil {
		return fmt.Errorf("certificate not found for user")
	}
	if certStatus != "active" {
		return fmt.Errorf("certificate is not active (status: %s)", certStatus)
	}

	// Create signing log entry
	var signingLogID string
	err = s.signDB.QueryRow(`
		INSERT INTO signing_logs (certificate_id, user_id, document_hash, hash_algorithm, signature, client_ip, user_agent)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id
	`, certificateID, session.UserID, session.DocumentHash, session.HashAlgorithm, signature, clientIP, userAgent).Scan(&signingLogID)
	if err != nil {
		return fmt.Errorf("failed to create signing log: %w", err)
	}

	// Update session to completed
	_, err = s.signDB.Exec(`
		UPDATE signing_sessions SET status = 'completed', certificate_id = $1, signing_log_id = $2, updated_at = CURRENT_TIMESTAMP
		WHERE session_id = $3
	`, certificateID, signingLogID, sessionID)
	if err != nil {
		return fmt.Errorf("failed to complete session: %w", err)
	}

	// Update Redis + broadcast
	ctx := context.Background()
	redisKey := "sign_session:" + sessionID
	s.redis.HSet(ctx, redisKey, "status", "completed")

	msg, _ := json.Marshal(map[string]string{"status": "completed", "session_id": sessionID})
	s.wsHub.Broadcast("sign:"+sessionID, msg)

	return nil
}

// VerifyDocument checks if a document hash has been signed (PUBLIC endpoint)
func (s *GesignService) VerifyDocument(documentHash string) (*models.VerifyDocumentResponse, error) {
	rows, err := s.signDB.Query(`
		SELECT sl.hash_algorithm, sl.created_at,
		       c.subject_dn, c.issuer_dn, c.serial_number, c.valid_from, c.valid_to, c.status
		FROM signing_logs sl
		JOIN certificates c ON sl.certificate_id = c.id
		WHERE sl.document_hash = $1
		ORDER BY sl.created_at DESC
	`, documentHash)
	if err != nil {
		return nil, fmt.Errorf("failed to query signatures: %w", err)
	}
	defer rows.Close()

	resp := &models.VerifyDocumentResponse{Found: false}
	for rows.Next() {
		var sig models.SignatureInfo
		if err := rows.Scan(
			&sig.HashAlgorithm, &sig.SignedAt,
			&sig.SignerSubjectDN, &sig.IssuerDN, &sig.SerialNumber,
			&sig.CertValidFrom, &sig.CertValidTo, &sig.CertStatus,
		); err != nil {
			return nil, fmt.Errorf("failed to scan signature: %w", err)
		}
		resp.Signatures = append(resp.Signatures, sig)
		resp.Found = true
	}

	return resp, nil
}

// GetUserCertificates returns active certificates for a user
func (s *GesignService) GetUserCertificates(userID int64) ([]models.Certificate, error) {
	rows, err := s.signDB.Query(`
		SELECT id, user_id, serial_number, subject_dn, issuer_dn, status, valid_from, valid_to, created_at, updated_at
		FROM certificates
		WHERE user_id = $1 AND status = 'active'
		ORDER BY created_at DESC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query certificates: %w", err)
	}
	defer rows.Close()

	var certs []models.Certificate
	for rows.Next() {
		var c models.Certificate
		if err := rows.Scan(
			&c.ID, &c.UserID, &c.SerialNumber, &c.SubjectDN, &c.IssuerDN,
			&c.Status, &c.ValidFrom, &c.ValidTo, &c.CreatedAt, &c.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan certificate: %w", err)
		}
		certs = append(certs, c)
	}

	return certs, nil
}

// GetSigningHistory returns a user's signing history
func (s *GesignService) GetSigningHistory(userID int64, limit, offset int) ([]models.SigningLog, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	rows, err := s.signDB.Query(`
		SELECT sl.id, sl.certificate_id, sl.user_id, sl.document_hash, sl.hash_algorithm,
		       sl.signature, sl.client_ip, sl.user_agent, sl.created_at,
		       c.subject_dn, c.issuer_dn, c.serial_number, c.status
		FROM signing_logs sl
		JOIN certificates c ON sl.certificate_id = c.id
		WHERE sl.user_id = $1
		ORDER BY sl.created_at DESC
		LIMIT $2 OFFSET $3
	`, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to query signing history: %w", err)
	}
	defer rows.Close()

	var logs []models.SigningLog
	for rows.Next() {
		var l models.SigningLog
		var clientIP, userAgent sql.NullString
		cert := &models.Certificate{}
		if err := rows.Scan(
			&l.ID, &l.CertificateID, &l.UserID, &l.DocumentHash, &l.HashAlgorithm,
			&l.Signature, &clientIP, &userAgent, &l.CreatedAt,
			&cert.SubjectDN, &cert.IssuerDN, &cert.SerialNumber, &cert.Status,
		); err != nil {
			return nil, fmt.Errorf("failed to scan signing log: %w", err)
		}
		if clientIP.Valid {
			l.ClientIP = clientIP.String
		}
		if userAgent.Valid {
			l.UserAgent = userAgent.String
		}
		l.Certificate = cert
		logs = append(logs, l)
	}

	return logs, nil
}
