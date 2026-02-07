package services

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"time"
)

// APILogEntry represents a single API log entry
type APILogEntry struct {
	ID              int64     `json:"id"`
	Method          string    `json:"method"`
	Path            string    `json:"path"`
	Query           string    `json:"query"`
	StatusCode      int       `json:"status_code"`
	LatencyMs       int       `json:"latency_ms"`
	ClientIP        string    `json:"client_ip"`
	UserAgent       string    `json:"user_agent"`
	RequestHeaders  string    `json:"request_headers"`
	RequestBody     string    `json:"request_body"`
	ResponseHeaders string    `json:"response_headers"`
	ResponseBody    string    `json:"response_body"`
	CreatedAt       time.Time `json:"created_at"`
}

// APILogInput is the struct passed through the buffered channel
type APILogInput struct {
	Method          string
	Path            string
	Query           string
	StatusCode      int
	LatencyMs       int
	ClientIP        string
	UserAgent       string
	RequestHeaders  map[string][]string
	RequestBody     string
	ResponseHeaders map[string][]string
	ResponseBody    string
}

// APILogService handles reading/writing API request/response logs
type APILogService struct {
	db    *sql.DB
	logCh chan *APILogInput
	count int
}

// NewAPILogService creates a new APILogService with a background writer
func NewAPILogService(db *sql.DB) *APILogService {
	s := &APILogService{
		db:    db,
		logCh: make(chan *APILogInput, 256),
	}
	go s.backgroundWriter()
	return s
}

// AddLog enqueues a log entry for async writing
func (s *APILogService) AddLog(entry *APILogInput) {
	select {
	case s.logCh <- entry:
	default:
		log.Println("API log channel full, dropping entry")
	}
}

func (s *APILogService) backgroundWriter() {
	for entry := range s.logCh {
		s.writeToDB(entry)
		s.count++
		if s.count%100 == 0 {
			s.cleanup()
		}
	}
}

func (s *APILogService) writeToDB(entry *APILogInput) {
	reqHeaders, _ := json.Marshal(entry.RequestHeaders)
	resHeaders, _ := json.Marshal(entry.ResponseHeaders)

	_, err := s.db.Exec(`
		INSERT INTO api_logs (method, path, query, status_code, latency_ms, client_ip,
		                      user_agent, request_headers, request_body, response_headers, response_body)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10::jsonb, $11)
	`, entry.Method, entry.Path, entry.Query, entry.StatusCode, entry.LatencyMs,
		entry.ClientIP, entry.UserAgent, string(reqHeaders), entry.RequestBody,
		string(resHeaders), entry.ResponseBody)
	if err != nil {
		log.Printf("Failed to insert API log: %v", err)
	}
}

func (s *APILogService) cleanup() {
	_, err := s.db.Exec(`
		DELETE FROM api_logs
		WHERE id NOT IN (
			SELECT id FROM api_logs ORDER BY created_at DESC LIMIT 500
		)
	`)
	if err != nil {
		log.Printf("Failed to cleanup API logs: %v", err)
	}
}

// GetRecentLogs returns the most recent API log entries
func (s *APILogService) GetRecentLogs(limit int) ([]APILogEntry, error) {
	rows, err := s.db.Query(`
		SELECT id, method, path, COALESCE(query, ''), status_code, latency_ms,
		       COALESCE(client_ip, ''), COALESCE(user_agent, ''),
		       COALESCE(request_headers::text, '{}'), COALESCE(request_body, ''),
		       COALESCE(response_headers::text, '{}'), COALESCE(response_body, ''),
		       created_at
		FROM api_logs
		ORDER BY created_at DESC
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch API logs: %w", err)
	}
	defer rows.Close()

	var logs []APILogEntry
	for rows.Next() {
		var entry APILogEntry
		if err := rows.Scan(
			&entry.ID, &entry.Method, &entry.Path, &entry.Query,
			&entry.StatusCode, &entry.LatencyMs, &entry.ClientIP, &entry.UserAgent,
			&entry.RequestHeaders, &entry.RequestBody,
			&entry.ResponseHeaders, &entry.ResponseBody, &entry.CreatedAt,
		); err != nil {
			continue
		}
		logs = append(logs, entry)
	}
	return logs, nil
}
