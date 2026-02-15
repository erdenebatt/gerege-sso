package models

import "time"

// EIDVerifyRequest is the request body for e-ID verification (moved from sign.go)
type EIDVerifyRequest struct {
	CitizenID         int64  `json:"citizen_id" binding:"required"`
	CardNumber        string `json:"card_number" binding:"required"`
	CertificateSerial string `json:"certificate_serial" binding:"required"`
	ExpiryDate        string `json:"expiry_date" binding:"required"`
	IssuingAuthority  string `json:"issuing_authority" binding:"required"`
}

// EIDStatusResponse is returned for e-ID status check (moved from sign.go)
type EIDStatusResponse struct {
	EIDVerified         bool       `json:"eid_verified"`
	EIDVerificationDate *time.Time `json:"eid_verification_date,omitempty"`
	EIDCardNumber       string     `json:"eid_card_number,omitempty"`
	EIDExpiryDate       string     `json:"eid_expiry_date,omitempty"`
	EIDIssuingAuthority string     `json:"eid_issuing_authority,omitempty"`
}

// EIDCard represents the eid_cards table in gerege_eid
type EIDCard struct {
	ID                string     `json:"id"`
	CitizenID         int64      `json:"citizen_id"`
	CardNumber        string     `json:"card_number"`
	CertificateSerial string     `json:"certificate_serial"`
	Status            string     `json:"status"` // active, revoked, expired, suspended
	IssuedAt          time.Time  `json:"issued_at"`
	ExpiryDate        time.Time  `json:"expiry_date"`
	IssuingAuthority  string     `json:"issuing_authority"`
	RevokedAt         *time.Time `json:"revoked_at,omitempty"`
	RevocationReason  string     `json:"revocation_reason,omitempty"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

// EIDAuditLog represents the eid_audit_log table in gerege_eid
type EIDAuditLog struct {
	ID        string    `json:"id"`
	CardID    string    `json:"card_id"`
	Action    string    `json:"action"` // issued, verified, revoked, suspended, renewed
	ActorID   *int64    `json:"actor_id,omitempty"`
	Details   string    `json:"details,omitempty"`
	ClientIP  string    `json:"client_ip,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

// EIDVerifyCardRequest is the public request to verify a card by number+serial
type EIDVerifyCardRequest struct {
	CardNumber        string `json:"card_number" binding:"required"`
	CertificateSerial string `json:"certificate_serial" binding:"required"`
}

// EIDVerifyCardResponse is the public response for card verification
type EIDVerifyCardResponse struct {
	Valid            bool      `json:"valid"`
	Status           string    `json:"status"`
	CitizenName      string    `json:"citizen_name,omitempty"`
	IssuingAuthority string    `json:"issuing_authority,omitempty"`
	IssuedAt         time.Time `json:"issued_at,omitempty"`
	ExpiryDate       time.Time `json:"expiry_date,omitempty"`
}

// RegisterCardRequest is the request body for registering a new e-ID card
type RegisterCardRequest struct {
	CitizenID         int64  `json:"citizen_id" binding:"required"`
	CardNumber        string `json:"card_number" binding:"required"`
	CertificateSerial string `json:"certificate_serial" binding:"required"`
	ExpiryDate        string `json:"expiry_date" binding:"required"`
	IssuingAuthority  string `json:"issuing_authority" binding:"required"`
}

// RevokeCardRequest is the request body for revoking a card
type RevokeCardRequest struct {
	CardNumber string `json:"card_number" binding:"required"`
	Reason     string `json:"reason" binding:"required"`
}
