package services

import (
	"database/sql"
	"fmt"
	"time"

	"gerege-sso/models"
)

// EIDService handles e-ID card verification and card registry
type EIDService struct {
	eidDB *sql.DB // gerege_eid — card registry
	ssoDB *sql.DB // gerege_sso — citizens/users table
}

// NewEIDService creates a new EIDService with dual-DB connections
func NewEIDService(eidDB, ssoDB *sql.DB) *EIDService {
	return &EIDService{eidDB: eidDB, ssoDB: ssoDB}
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

	// Get citizen_id for this user (ssoDB)
	var citizenID sql.NullInt64
	err = s.ssoDB.QueryRow(`SELECT citizen_id FROM users WHERE id = $1`, userID).Scan(&citizenID)
	if err != nil {
		return fmt.Errorf("failed to find user: %w", err)
	}
	if !citizenID.Valid {
		return fmt.Errorf("user has no linked citizen record — verify identity via DAN first")
	}
	if citizenID.Int64 != req.CitizenID {
		return fmt.Errorf("citizen ID mismatch")
	}

	// Update citizen e-ID fields (ssoDB)
	_, err = s.ssoDB.Exec(`
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
	_, err = s.ssoDB.Exec(`
		UPDATE users SET verification_level = 4, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND verification_level < 4
	`, userID)
	if err != nil {
		return fmt.Errorf("failed to update verification level: %w", err)
	}

	// If citizen has a national_id_metadata record, also set verified=true
	var regNo string
	err = s.ssoDB.QueryRow(`SELECT reg_no FROM citizens WHERE id = $1`, req.CitizenID).Scan(&regNo)
	if err == nil && regNo != "" {
		meta, metaErr := s.GetNationalIDMetadata(req.CitizenID)
		if metaErr == nil && meta != nil {
			_, _ = s.ssoDB.Exec(
				`UPDATE users SET verified = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
				userID,
			)
		}
	}

	return nil
}

// GetEIDStatus returns the e-ID verification status for a user's citizen record
func (s *EIDService) GetEIDStatus(userID int64) (*models.EIDStatusResponse, error) {
	var citizenID sql.NullInt64
	err := s.ssoDB.QueryRow(`SELECT citizen_id FROM users WHERE id = $1`, userID).Scan(&citizenID)
	if err != nil {
		return nil, fmt.Errorf("failed to find user: %w", err)
	}
	if !citizenID.Valid {
		return &models.EIDStatusResponse{EIDVerified: false}, nil
	}

	resp := &models.EIDStatusResponse{}
	var eidExpiryDate sql.NullTime
	var eidCardNumber, eidIssuingAuthority sql.NullString

	err = s.ssoDB.QueryRow(`
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

// RegisterCard registers a new e-ID card in the card registry
func (s *EIDService) RegisterCard(citizenID int64, cardNumber, certificateSerial, expiryDate, issuingAuthority string, actorID int64, clientIP string) (*models.EIDCard, error) {
	expiry, err := time.Parse("2006-01-02", expiryDate)
	if err != nil {
		return nil, fmt.Errorf("invalid expiry date format (expected YYYY-MM-DD): %w", err)
	}

	if expiry.Before(time.Now()) {
		return nil, fmt.Errorf("expiry date is in the past")
	}

	// Verify citizen exists in ssoDB
	var exists bool
	err = s.ssoDB.QueryRow(`SELECT EXISTS(SELECT 1 FROM citizens WHERE id = $1)`, citizenID).Scan(&exists)
	if err != nil {
		return nil, fmt.Errorf("failed to verify citizen: %w", err)
	}
	if !exists {
		return nil, fmt.Errorf("citizen not found")
	}

	card := &models.EIDCard{}
	err = s.eidDB.QueryRow(`
		INSERT INTO eid_cards (citizen_id, card_number, certificate_serial, expiry_date, issuing_authority)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, citizen_id, card_number, certificate_serial, status, issued_at, expiry_date, issuing_authority, created_at, updated_at
	`, citizenID, cardNumber, certificateSerial, expiry, issuingAuthority).Scan(
		&card.ID, &card.CitizenID, &card.CardNumber, &card.CertificateSerial,
		&card.Status, &card.IssuedAt, &card.ExpiryDate, &card.IssuingAuthority,
		&card.CreatedAt, &card.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to register card: %w", err)
	}

	// Write audit log
	s.writeAuditLog(card.ID, "issued", &actorID, fmt.Sprintf("Card %s registered for citizen %d", cardNumber, citizenID), clientIP)

	return card, nil
}

// GetCard returns card details by card number
func (s *EIDService) GetCard(cardNumber string) (*models.EIDCard, error) {
	card := &models.EIDCard{}
	var revokedAt sql.NullTime
	var revocationReason sql.NullString

	err := s.eidDB.QueryRow(`
		SELECT id, citizen_id, card_number, certificate_serial, status, issued_at, expiry_date,
			issuing_authority, revoked_at, revocation_reason, created_at, updated_at
		FROM eid_cards WHERE card_number = $1
	`, cardNumber).Scan(
		&card.ID, &card.CitizenID, &card.CardNumber, &card.CertificateSerial,
		&card.Status, &card.IssuedAt, &card.ExpiryDate, &card.IssuingAuthority,
		&revokedAt, &revocationReason, &card.CreatedAt, &card.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("card not found")
		}
		return nil, fmt.Errorf("failed to get card: %w", err)
	}

	if revokedAt.Valid {
		card.RevokedAt = &revokedAt.Time
	}
	if revocationReason.Valid {
		card.RevocationReason = revocationReason.String
	}

	return card, nil
}

// RevokeCard revokes a card by card number
func (s *EIDService) RevokeCard(cardNumber, reason string, actorID int64, clientIP string) error {
	var cardID string
	err := s.eidDB.QueryRow(`
		UPDATE eid_cards SET status = 'revoked', revoked_at = CURRENT_TIMESTAMP, revocation_reason = $1, updated_at = CURRENT_TIMESTAMP
		WHERE card_number = $2 AND status = 'active'
		RETURNING id
	`, reason, cardNumber).Scan(&cardID)
	if err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("card not found or not active")
		}
		return fmt.Errorf("failed to revoke card: %w", err)
	}

	s.writeAuditLog(cardID, "revoked", &actorID, fmt.Sprintf("Reason: %s", reason), clientIP)

	return nil
}

// GetCardHistory returns the audit log for a card
func (s *EIDService) GetCardHistory(cardNumber string) ([]models.EIDAuditLog, error) {
	// First get card ID
	var cardID string
	err := s.eidDB.QueryRow(`SELECT id FROM eid_cards WHERE card_number = $1`, cardNumber).Scan(&cardID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("card not found")
		}
		return nil, fmt.Errorf("failed to find card: %w", err)
	}

	rows, err := s.eidDB.Query(`
		SELECT id, card_id, action, actor_id, details, client_ip::TEXT, created_at
		FROM eid_audit_log
		WHERE card_id = $1
		ORDER BY created_at DESC
	`, cardID)
	if err != nil {
		return nil, fmt.Errorf("failed to query audit log: %w", err)
	}
	defer rows.Close()

	var logs []models.EIDAuditLog
	for rows.Next() {
		var log models.EIDAuditLog
		var actorID sql.NullInt64
		var details, clientIP sql.NullString
		err := rows.Scan(&log.ID, &log.CardID, &log.Action, &actorID, &details, &clientIP, &log.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan audit log: %w", err)
		}
		if actorID.Valid {
			log.ActorID = &actorID.Int64
		}
		if details.Valid {
			log.Details = details.String
		}
		if clientIP.Valid {
			log.ClientIP = clientIP.String
		}
		logs = append(logs, log)
	}

	return logs, nil
}

// VerifyCard publicly verifies a card by number + certificate serial
func (s *EIDService) VerifyCard(cardNumber, certificateSerial string) (*models.EIDVerifyCardResponse, error) {
	resp := &models.EIDVerifyCardResponse{}

	var citizenID int64
	var revokedAt sql.NullTime
	err := s.eidDB.QueryRow(`
		SELECT citizen_id, status, issued_at, expiry_date, issuing_authority, revoked_at
		FROM eid_cards
		WHERE card_number = $1 AND certificate_serial = $2
	`, cardNumber, certificateSerial).Scan(
		&citizenID, &resp.Status, &resp.IssuedAt, &resp.ExpiryDate, &resp.IssuingAuthority, &revokedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return &models.EIDVerifyCardResponse{Valid: false, Status: "not_found"}, nil
		}
		return nil, fmt.Errorf("failed to verify card: %w", err)
	}

	resp.Valid = resp.Status == "active"

	// Check if expired
	if resp.ExpiryDate.Before(time.Now()) && resp.Status == "active" {
		resp.Status = "expired"
		resp.Valid = false
	}

	// Get citizen name from ssoDB
	var firstName, lastName sql.NullString
	err = s.ssoDB.QueryRow(`SELECT first_name, last_name FROM citizens WHERE id = $1`, citizenID).Scan(&firstName, &lastName)
	if err == nil {
		if lastName.Valid && firstName.Valid {
			resp.CitizenName = lastName.String + " " + firstName.String
		} else if firstName.Valid {
			resp.CitizenName = firstName.String
		}
	}

	// Write audit log for verification
	s.writeAuditLog("", "verified", nil, fmt.Sprintf("Public verification of card %s", cardNumber), "")

	return resp, nil
}

// GetUserCards returns all cards for the current user
func (s *EIDService) GetUserCards(userID int64) ([]models.EIDCard, error) {
	// Get citizen_id from ssoDB
	var citizenID sql.NullInt64
	err := s.ssoDB.QueryRow(`SELECT citizen_id FROM users WHERE id = $1`, userID).Scan(&citizenID)
	if err != nil {
		return nil, fmt.Errorf("failed to find user: %w", err)
	}
	if !citizenID.Valid {
		return []models.EIDCard{}, nil
	}

	rows, err := s.eidDB.Query(`
		SELECT id, citizen_id, card_number, certificate_serial, status, issued_at, expiry_date,
			issuing_authority, revoked_at, revocation_reason, created_at, updated_at
		FROM eid_cards
		WHERE citizen_id = $1
		ORDER BY created_at DESC
	`, citizenID.Int64)
	if err != nil {
		return nil, fmt.Errorf("failed to query cards: %w", err)
	}
	defer rows.Close()

	var cards []models.EIDCard
	for rows.Next() {
		var card models.EIDCard
		var revokedAt sql.NullTime
		var revocationReason sql.NullString
		err := rows.Scan(
			&card.ID, &card.CitizenID, &card.CardNumber, &card.CertificateSerial,
			&card.Status, &card.IssuedAt, &card.ExpiryDate, &card.IssuingAuthority,
			&revokedAt, &revocationReason, &card.CreatedAt, &card.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan card: %w", err)
		}
		if revokedAt.Valid {
			card.RevokedAt = &revokedAt.Time
		}
		if revocationReason.Valid {
			card.RevocationReason = revocationReason.String
		}
		cards = append(cards, card)
	}

	return cards, nil
}

// GetNationalIDMetadata returns the active national_id_metadata record for a citizen
func (s *EIDService) GetNationalIDMetadata(citizenID int64) (*models.NationalIDMetadata, error) {
	meta := &models.NationalIDMetadata{}
	var gender, photoHash, chipSerial sql.NullString
	err := s.eidDB.QueryRow(`
		SELECT id, citizen_id, reg_no, document_number, date_of_birth, gender,
			nationality, photo_hash, chip_serial, issuing_authority,
			issued_at, expiry_date, status, created_at, updated_at
		FROM national_id_metadata
		WHERE citizen_id = $1 AND status = 'active'
		ORDER BY created_at DESC
		LIMIT 1
	`, citizenID).Scan(
		&meta.ID, &meta.CitizenID, &meta.RegNo, &meta.DocumentNumber,
		&meta.DateOfBirth, &gender, &meta.Nationality, &photoHash,
		&chipSerial, &meta.IssuingAuthority, &meta.IssuedAt,
		&meta.ExpiryDate, &meta.Status, &meta.CreatedAt, &meta.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to query national_id_metadata: %w", err)
	}
	if gender.Valid {
		meta.Gender = gender.String
	}
	if photoHash.Valid {
		meta.PhotoHash = photoHash.String
	}
	if chipSerial.Valid {
		meta.ChipSerial = chipSerial.String
	}
	return meta, nil
}

// writeAuditLog writes an entry to the eid_audit_log table
func (s *EIDService) writeAuditLog(cardID, action string, actorID *int64, details, clientIP string) {
	var cardIDParam interface{}
	if cardID != "" {
		cardIDParam = cardID
	}

	var actorIDParam interface{}
	if actorID != nil {
		actorIDParam = *actorID
	}

	var clientIPParam interface{}
	if clientIP != "" {
		clientIPParam = clientIP
	}

	_, _ = s.eidDB.Exec(`
		INSERT INTO eid_audit_log (card_id, action, actor_id, details, client_ip)
		VALUES ($1, $2, $3, $4, $5::INET)
	`, cardIDParam, action, actorIDParam, details, clientIPParam)
}
