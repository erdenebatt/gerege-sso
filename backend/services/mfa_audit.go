package services

import (
	"database/sql"
	"encoding/json"
	"fmt"

	"gerege-sso/models"
)

// MFAAuditService handles MFA audit logging
type MFAAuditService struct {
	db *sql.DB
}

// NewMFAAuditService creates a new MFAAuditService
func NewMFAAuditService(db *sql.DB) *MFAAuditService {
	return &MFAAuditService{db: db}
}

// Log records an MFA audit event
func (s *MFAAuditService) Log(userID int64, action, method string, success bool, ipAddress, userAgent string, details map[string]interface{}) {
	detailsJSON := "{}"
	if details != nil {
		if b, err := json.Marshal(details); err == nil {
			detailsJSON = string(b)
		}
	}

	s.db.Exec(`
		INSERT INTO mfa_audit_log (user_id, action, method, success, ip_address, user_agent, details)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, userID, action, method, success, ipAddress, userAgent, detailsJSON)
}

// GetLogs returns recent MFA audit logs for a user
func (s *MFAAuditService) GetLogs(userID int64, limit int) ([]models.MFAAuditLog, error) {
	if limit <= 0 {
		limit = 50
	}

	rows, err := s.db.Query(`
		SELECT id, user_id, action, method, success, ip_address, user_agent, details, created_at
		FROM mfa_audit_log WHERE user_id = $1
		ORDER BY created_at DESC LIMIT $2
	`, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to query MFA audit logs: %w", err)
	}
	defer rows.Close()

	var logs []models.MFAAuditLog
	for rows.Next() {
		var l models.MFAAuditLog
		if err := rows.Scan(&l.ID, &l.UserID, &l.Action, &l.Method, &l.Success, &l.IPAddress, &l.UserAgent, &l.Details, &l.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan MFA audit log: %w", err)
		}
		logs = append(logs, l)
	}
	return logs, nil
}
