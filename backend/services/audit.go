package services

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"time"
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

// SystemStats holds aggregated system statistics
type SystemStats struct {
	TotalClients  int `json:"total_clients"`
	ActiveClients int `json:"active_clients"`
	TotalUsers    int `json:"total_users"`
	VerifiedUsers int `json:"verified_users"`
	Logins24h     int `json:"logins_24h"`
}

// GetStats returns aggregated system statistics
func (s *AuditService) GetStats() (*SystemStats, error) {
	stats := &SystemStats{}

	err := s.db.QueryRow(`SELECT COUNT(*), COUNT(*) FILTER (WHERE is_active) FROM oauth_clients`).
		Scan(&stats.TotalClients, &stats.ActiveClients)
	if err != nil {
		return nil, fmt.Errorf("failed to count clients: %w", err)
	}

	err = s.db.QueryRow(`SELECT COUNT(*), COUNT(*) FILTER (WHERE verified) FROM users`).
		Scan(&stats.TotalUsers, &stats.VerifiedUsers)
	if err != nil {
		return nil, fmt.Errorf("failed to count users: %w", err)
	}

	err = s.db.QueryRow(`
		SELECT COUNT(*) FROM audit_logs
		WHERE action IN ('login_success', 'oauth_consent_granted')
		AND created_at > NOW() - INTERVAL '24 hours'
	`).Scan(&stats.Logins24h)
	if err != nil {
		return nil, fmt.Errorf("failed to count logins: %w", err)
	}

	return stats, nil
}

// AuditLogEntry represents a single audit log entry for API responses
type AuditLogEntry struct {
	ID        int64     `json:"id"`
	UserID    int64     `json:"user_id"`
	UserEmail string    `json:"user_email"`
	Action    string    `json:"action"`
	Details   string    `json:"details"`
	IPAddress string    `json:"ip_address"`
	CreatedAt time.Time `json:"created_at"`
}

// LoginEntry represents a single login event for user-facing activity
type LoginEntry struct {
	ID        int64     `json:"id"`
	Action    string    `json:"action"`
	Details   string    `json:"details"`
	IPAddress string    `json:"ip_address"`
	CreatedAt time.Time `json:"created_at"`
}

// GetUserLoginActivity returns the user's login history (most recent 50)
func (s *AuditService) GetUserLoginActivity(userID int64) ([]LoginEntry, error) {
	rows, err := s.db.Query(`
		SELECT id, action, details, ip_address, created_at
		FROM audit_logs
		WHERE user_id = $1 AND action = 'login'
		ORDER BY created_at DESC
		LIMIT 50
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch login activity: %w", err)
	}
	defer rows.Close()

	var entries []LoginEntry
	for rows.Next() {
		var e LoginEntry
		if err := rows.Scan(&e.ID, &e.Action, &e.Details, &e.IPAddress, &e.CreatedAt); err != nil {
			continue
		}
		entries = append(entries, e)
	}
	return entries, nil
}

// GetRecentLogs returns the most recent audit log entries
func (s *AuditService) GetRecentLogs(limit int) ([]AuditLogEntry, error) {
	rows, err := s.db.Query(`
		SELECT a.id, a.user_id, COALESCE(u.email, 'unknown') as user_email,
		       a.action, a.details, a.ip_address, a.created_at
		FROM audit_logs a
		LEFT JOIN users u ON u.id = a.user_id
		ORDER BY a.created_at DESC
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch audit logs: %w", err)
	}
	defer rows.Close()

	var logs []AuditLogEntry
	for rows.Next() {
		var entry AuditLogEntry
		if err := rows.Scan(&entry.ID, &entry.UserID, &entry.UserEmail, &entry.Action, &entry.Details, &entry.IPAddress, &entry.CreatedAt); err != nil {
			continue
		}
		logs = append(logs, entry)
	}
	return logs, nil
}
