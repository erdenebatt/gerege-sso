package services

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"fmt"
	"time"

	"gerege-sso/models"

	"github.com/go-webauthn/webauthn/protocol"
	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/lib/pq"
)

// PasskeyService handles WebAuthn/Passkey operations
type PasskeyService struct {
	db       *sql.DB
	webauthn *webauthn.WebAuthn
}

// NewPasskeyService creates a new PasskeyService
func NewPasskeyService(db *sql.DB, rpID, rpOrigin, rpName string) (*PasskeyService, error) {
	wconfig := &webauthn.Config{
		RPDisplayName: rpName,
		RPID:          rpID,
		RPOrigins:     []string{rpOrigin},
	}

	w, err := webauthn.New(wconfig)
	if err != nil {
		return nil, fmt.Errorf("failed to create webauthn: %w", err)
	}

	return &PasskeyService{db: db, webauthn: w}, nil
}

// webAuthnUser wraps user data for the webauthn library
type webAuthnUser struct {
	id          []byte
	name        string
	displayName string
	credentials []webauthn.Credential
}

func (u *webAuthnUser) WebAuthnID() []byte                         { return u.id }
func (u *webAuthnUser) WebAuthnName() string                       { return u.name }
func (u *webAuthnUser) WebAuthnDisplayName() string                { return u.displayName }
func (u *webAuthnUser) WebAuthnCredentials() []webauthn.Credential { return u.credentials }

// loadWebAuthnUser loads a user with their WebAuthn credentials
func (s *PasskeyService) loadWebAuthnUser(userID int64, genID, email string) (*webAuthnUser, error) {
	creds, err := s.loadCredentials(userID)
	if err != nil {
		return nil, err
	}

	return &webAuthnUser{
		id:          []byte(genID),
		name:        email,
		displayName: email,
		credentials: creds,
	}, nil
}

// loadCredentials loads WebAuthn credentials from the database
func (s *PasskeyService) loadCredentials(userID int64) ([]webauthn.Credential, error) {
	rows, err := s.db.Query(`
		SELECT credential_id, public_key, attestation_type, aaguid, sign_count, transport
		FROM webauthn_credentials WHERE user_id = $1
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query credentials: %w", err)
	}
	defer rows.Close()

	var creds []webauthn.Credential
	for rows.Next() {
		var (
			credID          []byte
			publicKey       []byte
			attestationType string
			aaguid          []byte
			signCount       uint32
			transports      []string
		)
		if err := rows.Scan(&credID, &publicKey, &attestationType, &aaguid, &signCount, pq.Array(&transports)); err != nil {
			return nil, fmt.Errorf("failed to scan credential: %w", err)
		}

		var authTransports []protocol.AuthenticatorTransport
		for _, t := range transports {
			authTransports = append(authTransports, protocol.AuthenticatorTransport(t))
		}

		cred := webauthn.Credential{
			ID:              credID,
			PublicKey:       publicKey,
			AttestationType: attestationType,
			Transport:       authTransports,
			Authenticator: webauthn.Authenticator{
				AAGUID:    aaguid,
				SignCount: signCount,
			},
		}
		creds = append(creds, cred)
	}
	return creds, nil
}

// BeginRegistration starts the WebAuthn registration ceremony
func (s *PasskeyService) BeginRegistration(userID int64, genID, email string) (*protocol.CredentialCreation, *webauthn.SessionData, error) {
	user, err := s.loadWebAuthnUser(userID, genID, email)
	if err != nil {
		return nil, nil, err
	}

	options, session, err := s.webauthn.BeginRegistration(user,
		webauthn.WithResidentKeyRequirement(protocol.ResidentKeyRequirementPreferred),
	)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to begin registration: %w", err)
	}

	return options, session, nil
}

// FinishRegistration completes the WebAuthn registration ceremony
func (s *PasskeyService) FinishRegistration(userID int64, genID, email string, session *webauthn.SessionData, response *protocol.ParsedCredentialCreationData) error {
	user, err := s.loadWebAuthnUser(userID, genID, email)
	if err != nil {
		return err
	}

	credential, err := s.webauthn.CreateCredential(user, *session, response)
	if err != nil {
		return fmt.Errorf("failed to create credential: %w", err)
	}

	// Generate UUID for id
	idBytes := make([]byte, 16)
	if _, err := rand.Read(idBytes); err != nil {
		return fmt.Errorf("failed to generate id: %w", err)
	}
	id := hex.EncodeToString(idBytes)

	var transports []string
	for _, t := range credential.Transport {
		transports = append(transports, string(t))
	}

	_, err = s.db.Exec(`
		INSERT INTO webauthn_credentials (id, user_id, credential_id, public_key, attestation_type, aaguid, sign_count, transport)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`, id, userID, credential.ID, credential.PublicKey, credential.AttestationType,
		credential.Authenticator.AAGUID, credential.Authenticator.SignCount, pq.Array(transports))
	if err != nil {
		return fmt.Errorf("failed to store credential: %w", err)
	}

	// Update MFA settings
	s.db.Exec(`
		INSERT INTO user_mfa_settings (user_id, passkey_enabled) VALUES ($1, true)
		ON CONFLICT (user_id) DO UPDATE SET passkey_enabled = true, updated_at = CURRENT_TIMESTAMP
	`, userID)
	s.db.Exec(`UPDATE users SET mfa_enabled = true WHERE id = $1`, userID)

	return nil
}

// BeginAuthentication starts the WebAuthn authentication ceremony
func (s *PasskeyService) BeginAuthentication(userID int64, genID, email string) (*protocol.CredentialAssertion, *webauthn.SessionData, error) {
	user, err := s.loadWebAuthnUser(userID, genID, email)
	if err != nil {
		return nil, nil, err
	}

	if len(user.credentials) == 0 {
		return nil, nil, fmt.Errorf("no passkeys registered")
	}

	options, session, err := s.webauthn.BeginLogin(user)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to begin authentication: %w", err)
	}

	return options, session, nil
}

// FinishAuthentication completes the WebAuthn authentication ceremony
func (s *PasskeyService) FinishAuthentication(userID int64, genID, email string, session *webauthn.SessionData, response *protocol.ParsedCredentialAssertionData) error {
	user, err := s.loadWebAuthnUser(userID, genID, email)
	if err != nil {
		return err
	}

	credential, err := s.webauthn.ValidateLogin(user, *session, response)
	if err != nil {
		return fmt.Errorf("failed to validate login: %w", err)
	}

	// Update sign count and last used
	now := time.Now()
	_, err = s.db.Exec(`
		UPDATE webauthn_credentials SET sign_count = $1, last_used_at = $2
		WHERE user_id = $3 AND credential_id = $4
	`, credential.Authenticator.SignCount, now, userID, credential.ID)
	if err != nil {
		return fmt.Errorf("failed to update sign count: %w", err)
	}

	return nil
}

// ListPasskeys returns all passkeys for a user
func (s *PasskeyService) ListPasskeys(userID int64) ([]models.WebAuthnCredential, error) {
	rows, err := s.db.Query(`
		SELECT id, user_id, credential_id, sign_count, credential_name, transport, created_at, last_used_at
		FROM webauthn_credentials WHERE user_id = $1 ORDER BY created_at
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query passkeys: %w", err)
	}
	defer rows.Close()

	var passkeys []models.WebAuthnCredential
	for rows.Next() {
		var p models.WebAuthnCredential
		if err := rows.Scan(&p.ID, &p.UserID, &p.CredentialID, &p.SignCount, &p.CredentialName, pq.Array(&p.Transport), &p.CreatedAt, &p.LastUsedAt); err != nil {
			return nil, fmt.Errorf("failed to scan passkey: %w", err)
		}
		passkeys = append(passkeys, p)
	}
	return passkeys, nil
}

// DeletePasskey deletes a passkey by ID
func (s *PasskeyService) DeletePasskey(userID int64, credentialID string) error {
	result, err := s.db.Exec(`DELETE FROM webauthn_credentials WHERE id = $1 AND user_id = $2`, credentialID, userID)
	if err != nil {
		return fmt.Errorf("failed to delete passkey: %w", err)
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		return fmt.Errorf("passkey not found")
	}

	// Check if any passkeys remain
	var count int
	s.db.QueryRow(`SELECT COUNT(*) FROM webauthn_credentials WHERE user_id = $1`, userID).Scan(&count)
	if count == 0 {
		s.db.Exec(`
			INSERT INTO user_mfa_settings (user_id, passkey_enabled) VALUES ($1, false)
			ON CONFLICT (user_id) DO UPDATE SET passkey_enabled = false, updated_at = CURRENT_TIMESTAMP
		`, userID)
		// Sync mfa_enabled
		s.db.Exec(`
			UPDATE users SET mfa_enabled = (
				SELECT COALESCE(totp_enabled OR passkey_enabled OR push_enabled, false)
				FROM user_mfa_settings WHERE user_id = $1
			) WHERE id = $1
		`, userID)
	}

	return nil
}

// RenamePasskey updates a passkey's name
func (s *PasskeyService) RenamePasskey(userID int64, credentialID, name string) error {
	_, err := s.db.Exec(`
		UPDATE webauthn_credentials SET credential_name = $1 WHERE id = $2 AND user_id = $3
	`, name, credentialID, userID)
	return err
}
