package services

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
)

// AuditService handles writing to the audit_logs table
type AuditService struct {
	db *sql.DB
}

// NewAuditService creates a new AuditService
func NewAuditService(db *sql.DB) *AuditService {
	return &AuditService{db: db}
}

// AddLog writes an audit event to the audit_logs table.
// user_agent is merged into the JSONB details column alongside caller-provided data.
func (s *AuditService) AddLog(userID int64, action string, details map[string]interface{}, ip string, userAgent string) error {
	if details == nil {
		details = make(map[string]interface{})
	}
	details["user_agent"] = userAgent

	detailsJSON, err := json.Marshal(details)
	if err != nil {
		return fmt.Errorf("failed to marshal audit details: %w", err)
	}

	_, err = s.db.Exec(`
		INSERT INTO audit_logs (user_id, action, details, ip_address)
		VALUES ($1, $2, $3::jsonb, $4)
	`, userID, action, string(detailsJSON), ip)
	if err != nil {
		return fmt.Errorf("failed to insert audit log: %w", err)
	}

	log.Printf("Audit: user_id=%d action=%s ip=%s", userID, action, ip)
	return nil
}
