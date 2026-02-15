package services

import (
	"database/sql"
	"fmt"
	"time"

	"gerege-sso/models"
)

// EIDService handles e-ID card verification
type EIDService struct {
	db *sql.DB // gerege_sso database
}

// NewEIDService creates a new EIDService
func NewEIDService(db *sql.DB) *EIDService {
	return &EIDService{db: db}
}

// VerifyEID links an e-ID card to a citizen record and upgrades verification level
func (s *EIDService) VerifyEID(userID int64, req *models.EIDVerifyRequest) error {
	expiryDate, err := time.Parse("2006-01-02", req.ExpiryDate)
	if err != nil {
		return fmt.Errorf("invalid expiry date format (expected YYYY-MM-DD): %w", err)
	}

	if expiryDate.Before(time.Now()) {
		return fmt.Errorf("e-ID card has expired")
	}

	// Get citizen_id for this user
	var citizenID sql.NullInt64
	err = s.db.QueryRow(`SELECT citizen_id FROM users WHERE id = $1`, userID).Scan(&citizenID)
	if err != nil {
		return fmt.Errorf("failed to find user: %w", err)
	}
	if !citizenID.Valid {
		return fmt.Errorf("user has no linked citizen record — verify identity via DAN first")
	}
	if citizenID.Int64 != req.CitizenID {
		return fmt.Errorf("citizen ID mismatch")
	}

	// Update citizen e-ID fields
	_, err = s.db.Exec(`
		UPDATE citizens SET
			eid_verified = true,
			eid_verification_date = CURRENT_TIMESTAMP,
			eid_certificate_serial = $1,
			eid_card_number = $2,
			eid_expiry_date = $3,
			eid_issuing_authority = $4
		WHERE id = $5
	`, req.CertificateSerial, req.CardNumber, expiryDate, req.IssuingAuthority, req.CitizenID)
	if err != nil {
		return fmt.Errorf("failed to update citizen e-ID: %w", err)
	}

	// Upgrade user verification level to 4 (e-ID verified)
	_, err = s.db.Exec(`
		UPDATE users SET verification_level = 4, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND verification_level < 4
	`, userID)
	if err != nil {
		return fmt.Errorf("failed to update verification level: %w", err)
	}

	return nil
}

// GetEIDStatus returns the e-ID verification status for a user's citizen record
func (s *EIDService) GetEIDStatus(userID int64) (*models.EIDStatusResponse, error) {
	var citizenID sql.NullInt64
	err := s.db.QueryRow(`SELECT citizen_id FROM users WHERE id = $1`, userID).Scan(&citizenID)
	if err != nil {
		return nil, fmt.Errorf("failed to find user: %w", err)
	}
	if !citizenID.Valid {
		return &models.EIDStatusResponse{EIDVerified: false}, nil
	}

	resp := &models.EIDStatusResponse{}
	var eidExpiryDate sql.NullTime
	var eidCardNumber, eidIssuingAuthority sql.NullString

	err = s.db.QueryRow(`
		SELECT eid_verified, eid_verification_date, eid_card_number, eid_expiry_date, eid_issuing_authority
		FROM citizens WHERE id = $1
	`, citizenID.Int64).Scan(
		&resp.EIDVerified, &resp.EIDVerificationDate,
		&eidCardNumber, &eidExpiryDate, &eidIssuingAuthority,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to query e-ID status: %w", err)
	}

	if eidCardNumber.Valid {
		resp.EIDCardNumber = eidCardNumber.String
	}
	if eidExpiryDate.Valid {
		resp.EIDExpiryDate = eidExpiryDate.Time.Format("2006-01-02")
	}
	if eidIssuingAuthority.Valid {
		resp.EIDIssuingAuthority = eidIssuingAuthority.String
	}

	return resp, nil
}
