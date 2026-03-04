package services

import (
	"database/sql"
	"encoding/json"
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

