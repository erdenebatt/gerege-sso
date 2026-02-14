package services

import (
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"fmt"
	"strings"
	"time"

	"gerege-sso/models"
)

// RecoveryService handles MFA recovery code operations
type RecoveryService struct {
	db *sql.DB
}

// NewRecoveryService creates a new RecoveryService
func NewRecoveryService(db *sql.DB) *RecoveryService {
	return &RecoveryService{db: db}
}

// generateRandomCode generates an 8-character alphanumeric code in XXXX-XXXX format
func generateRandomCode() (string, error) {
	const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // no ambiguous chars (0,O,1,I)
	b := make([]byte, 8)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	for i := range b {
		b[i] = charset[int(b[i])%len(charset)]
	}
	return string(b[:4]) + "-" + string(b[4:]), nil
}

// hashCode hashes a recovery code with SHA-256 and a random salt
func hashCode(code, salt string) string {
	h := sha256.New()
	h.Write([]byte(salt + ":" + strings.ToUpper(strings.ReplaceAll(code, "-", ""))))
	return hex.EncodeToString(h.Sum(nil))
}

// generateSalt generates a random 16-byte hex salt
func generateSalt() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// GenerateCodes generates 10 recovery codes for a user, replacing any existing codes
func (s *RecoveryService) GenerateCodes(userID int64) (*models.RecoveryCodesResponse, error) {
	tx, err := s.db.Begin()
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Delete existing codes
	if _, err := tx.Exec("DELETE FROM mfa_recovery_codes WHERE user_id = $1", userID); err != nil {
		return nil, fmt.Errorf("failed to delete existing codes: %w", err)
	}

	codes := make([]string, 10)
	for i := 0; i < 10; i++ {
		code, err := generateRandomCode()
		if err != nil {
			return nil, fmt.Errorf("failed to generate code: %w", err)
		}
		codes[i] = code

		salt, err := generateSalt()
		if err != nil {
			return nil, fmt.Errorf("failed to generate salt: %w", err)
		}

		codeHash := hashCode(code, salt)

		// Generate UUID for id
		idBytes := make([]byte, 16)
		if _, err := rand.Read(idBytes); err != nil {
			return nil, fmt.Errorf("failed to generate id: %w", err)
		}
		id := hex.EncodeToString(idBytes)

		_, err = tx.Exec(`
			INSERT INTO mfa_recovery_codes (id, user_id, code_hash, salt, is_used)
			VALUES ($1, $2, $3, $4, false)
		`, id, userID, codeHash, salt)
		if err != nil {
			return nil, fmt.Errorf("failed to insert recovery code: %w", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return &models.RecoveryCodesResponse{Codes: codes}, nil
}

// ValidateCode validates a recovery code (single-use)
func (s *RecoveryService) ValidateCode(userID int64, code string) (bool, error) {
	// Get all unused codes for this user
	rows, err := s.db.Query(`
		SELECT id, code_hash, salt FROM mfa_recovery_codes
		WHERE user_id = $1 AND is_used = false
	`, userID)
	if err != nil {
		return false, fmt.Errorf("failed to query recovery codes: %w", err)
	}
	defer rows.Close()

	normalizedCode := strings.ToUpper(strings.ReplaceAll(code, "-", ""))

	for rows.Next() {
		var id, storedHash, salt string
		if err := rows.Scan(&id, &storedHash, &salt); err != nil {
			continue
		}

		computedHash := hashCode(normalizedCode, salt)
		if computedHash == storedHash {
			// Mark as used
			now := time.Now()
			_, err := s.db.Exec(`
				UPDATE mfa_recovery_codes SET is_used = true, used_at = $1 WHERE id = $2
			`, now, id)
			if err != nil {
				return false, fmt.Errorf("failed to mark code as used: %w", err)
			}
			return true, nil
		}
	}

	return false, nil
}

// GetRemainingCount returns the number of unused recovery codes
func (s *RecoveryService) GetRemainingCount(userID int64) (int, error) {
	var count int
	err := s.db.QueryRow(`
		SELECT COUNT(*) FROM mfa_recovery_codes WHERE user_id = $1 AND is_used = false
	`, userID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count recovery codes: %w", err)
	}
	return count, nil
}

// GetCodes returns masked recovery codes (shows used status)
func (s *RecoveryService) GetCodes(userID int64) ([]models.RecoveryCode, error) {
	rows, err := s.db.Query(`
		SELECT id, user_id, is_used, used_at, created_at
		FROM mfa_recovery_codes WHERE user_id = $1
		ORDER BY created_at
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query recovery codes: %w", err)
	}
	defer rows.Close()

	var codes []models.RecoveryCode
	for rows.Next() {
		var c models.RecoveryCode
		if err := rows.Scan(&c.ID, &c.UserID, &c.IsUsed, &c.UsedAt, &c.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan recovery code: %w", err)
		}
		codes = append(codes, c)
	}
	return codes, nil
}

