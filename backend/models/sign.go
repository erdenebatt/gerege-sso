package models

import (
	"database/sql"
	"time"
)

// Certificate represents the certificates table in gerege_sign
type Certificate struct {
	ID               string         `json:"id"`
	UserID           int64          `json:"user_id"`
	CertificatePEM   string         `json:"-"`
	SerialNumber     string         `json:"serial_number"`
	SubjectDN        string         `json:"subject_dn"`
	IssuerDN         string         `json:"issuer_dn"`
	Status           string         `json:"status"`
	ValidFrom        time.Time      `json:"valid_from"`
	ValidTo          time.Time      `json:"valid_to"`
	RevokedAt        sql.NullTime   `json:"revoked_at,omitempty"`
	RevocationReason sql.NullString `json:"revocation_reason,omitempty"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
}

// SigningLog represents the signing_logs table in gerege_sign
type SigningLog struct {
	ID             string       `json:"id"`
	CertificateID  string       `json:"certificate_id"`
	UserID         int64        `json:"user_id"`
	DocumentHash   string       `json:"document_hash"`
	HashAlgorithm  string       `json:"hash_algorithm"`
	Signature      string       `json:"signature"`
	TimestampToken string       `json:"timestamp_token,omitempty"`
	ClientIP       string       `json:"client_ip,omitempty"`
	UserAgent      string       `json:"user_agent,omitempty"`
	CreatedAt      time.Time    `json:"created_at"`
	Certificate    *Certificate `json:"certificate,omitempty"`
}

// SigningSession represents the signing_sessions table in gerege_sign
type SigningSession struct {
	ID            string         `json:"id"`
	SessionID     string         `json:"session_id"`
	UserID        int64          `json:"user_id"`
	DocumentHash  string         `json:"document_hash"`
	HashAlgorithm string         `json:"hash_algorithm"`
	DocumentName  string         `json:"document_name"`
	Status        string         `json:"status"`
	CertificateID sql.NullString `json:"certificate_id,omitempty"`
	SigningLogID  sql.NullString `json:"signing_log_id,omitempty"`
	ClientIP      string         `json:"client_ip,omitempty"`
	UserAgent     string         `json:"user_agent,omitempty"`
	ExpiresAt     time.Time      `json:"expires_at"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
}

// CreateSignRequest is the request body for creating a signing session
type CreateSignRequest struct {
	DocumentHash  string `json:"document_hash" binding:"required"`
	HashAlgorithm string `json:"hash_algorithm"`
	DocumentName  string `json:"document_name" binding:"required"`
}

// SignRequestResponse is returned when a signing session is created
type SignRequestResponse struct {
	SessionID    string `json:"session_id"`
	Status       string `json:"status"`
	ExpiresIn    int    `json:"expires_in"`
	ChallengeID  string `json:"challenge_id,omitempty"`
	DocumentHash string `json:"document_hash"`
	DocumentName string `json:"document_name"`
}

// CompleteSignRequest is the request body for completing a signing session
type CompleteSignRequest struct {
	SessionID     string `json:"session_id" binding:"required"`
	Signature     string `json:"signature" binding:"required"`
	CertificateID string `json:"certificate_id" binding:"required"`
}

// VerifyDocumentRequest is the request body for verifying a document
type VerifyDocumentRequest struct {
	DocumentHash string `json:"document_hash" binding:"required"`
}

// VerifyDocumentResponse is returned when verifying a document
type VerifyDocumentResponse struct {
	Found     bool              `json:"found"`
	Signatures []SignatureInfo  `json:"signatures,omitempty"`
}

// SignatureInfo contains details about a signature on a document
type SignatureInfo struct {
	SignerSubjectDN string    `json:"signer_subject_dn"`
	IssuerDN        string    `json:"issuer_dn"`
	SerialNumber    string    `json:"serial_number"`
	SignedAt        time.Time `json:"signed_at"`
	HashAlgorithm   string    `json:"hash_algorithm"`
	CertValidFrom  time.Time `json:"cert_valid_from"`
	CertValidTo    time.Time `json:"cert_valid_to"`
	CertStatus     string    `json:"cert_status"`
}

// MobileSignRequest represents a push notification for signing
type MobileSignRequest struct {
	ChallengeID  string `json:"challenge_id"`
	SessionID    string `json:"session_id"`
	DocumentHash string `json:"document_hash"`
	DocumentName string `json:"document_name"`
	ExpiresIn    int    `json:"expires_in"`
}
