package services

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"time"

	"gerege-sso/models"

	"github.com/lib/pq"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
)

// ClientService handles OAuth2 client CRUD and authorization code management
type ClientService struct {
	db    *sql.DB
	redis *redis.Client
}

// NewClientService creates a new ClientService
func NewClientService(db *sql.DB, redis *redis.Client) *ClientService {
	return &ClientService{db: db, redis: redis}
}

// CreateClient registers a new OAuth2 client. Returns the client and the
// plain-text secret (shown only once).
func (s *ClientService) CreateClient(name, redirectURI string, scopes []string) (*models.OAuthClient, string, error) {
	// Generate random client_id (32 bytes → 64 hex chars)
	cidBytes := make([]byte, 32)
	if _, err := rand.Read(cidBytes); err != nil {
		return nil, "", fmt.Errorf("failed to generate client_id: %w", err)
	}
	clientID := hex.EncodeToString(cidBytes)

	// Generate random secret (32 bytes → 64 hex chars)
	secBytes := make([]byte, 32)
	if _, err := rand.Read(secBytes); err != nil {
		return nil, "", fmt.Errorf("failed to generate secret: %w", err)
	}
	plainSecret := hex.EncodeToString(secBytes)

	// bcrypt hash the secret
	hash, err := bcrypt.GenerateFromPassword([]byte(plainSecret), bcrypt.DefaultCost)
	if err != nil {
		return nil, "", fmt.Errorf("failed to hash secret: %w", err)
	}

	if len(scopes) == 0 {
		scopes = []string{"openid", "profile"}
	}

	client := &models.OAuthClient{}
	err = s.db.QueryRow(`
		INSERT INTO oauth_clients (client_id, client_secret_hash, name, redirect_uri, allowed_scopes)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, client_id, name, redirect_uri, allowed_scopes, is_active, created_at, updated_at
	`, clientID, string(hash), name, redirectURI, pq.Array(scopes)).Scan(
		&client.ID, &client.ClientID, &client.Name, &client.RedirectURI,
		pq.Array(&client.AllowedScopes), &client.IsActive, &client.CreatedAt, &client.UpdatedAt,
	)
	if err != nil {
		return nil, "", fmt.Errorf("failed to insert client: %w", err)
	}

	return client, plainSecret, nil
}

// ValidateClient verifies client credentials (client_id + plain secret).
func (s *ClientService) ValidateClient(clientID, clientSecret string) (*models.OAuthClient, error) {
	client, err := s.FindByClientID(clientID)
	if err != nil {
		return nil, err
	}
	if client == nil {
		return nil, fmt.Errorf("client not found")
	}
	if !client.IsActive {
		return nil, fmt.Errorf("client is deactivated")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(client.ClientSecretHash), []byte(clientSecret)); err != nil {
		return nil, fmt.Errorf("invalid client secret")
	}

	return client, nil
}

// FindByClientID looks up a client by its public client_id.
func (s *ClientService) FindByClientID(clientID string) (*models.OAuthClient, error) {
	client := &models.OAuthClient{}
	err := s.db.QueryRow(`
		SELECT id, client_id, client_secret_hash, name, redirect_uri, allowed_scopes, is_active, created_at, updated_at
		FROM oauth_clients WHERE client_id = $1
	`, clientID).Scan(
		&client.ID, &client.ClientID, &client.ClientSecretHash, &client.Name, &client.RedirectURI,
		pq.Array(&client.AllowedScopes), &client.IsActive, &client.CreatedAt, &client.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find client: %w", err)
	}
	return client, nil
}

// ListClients returns all registered clients (secrets excluded by JSON tag).
func (s *ClientService) ListClients() ([]*models.OAuthClient, error) {
	rows, err := s.db.Query(`
		SELECT id, client_id, name, redirect_uri, allowed_scopes, is_active, created_at, updated_at
		FROM oauth_clients ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to list clients: %w", err)
	}
	defer rows.Close()

	var clients []*models.OAuthClient
	for rows.Next() {
		c := &models.OAuthClient{}
		if err := rows.Scan(&c.ID, &c.ClientID, &c.Name, &c.RedirectURI,
			pq.Array(&c.AllowedScopes), &c.IsActive, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan client: %w", err)
		}
		clients = append(clients, c)
	}
	return clients, nil
}

// DeleteClient soft-deactivates a client by its UUID id.
func (s *ClientService) DeleteClient(id string) error {
	res, err := s.db.Exec(`UPDATE oauth_clients SET is_active = FALSE WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("failed to deactivate client: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("client not found")
	}
	return nil
}

// UpdateClient updates a client's details.
func (s *ClientService) UpdateClient(id, name, redirectURI string, scopes []string, isActive *bool) error {
	// Build dynamic update query
	query := "UPDATE oauth_clients SET updated_at = CURRENT_TIMESTAMP"
	args := []interface{}{}
	argNum := 1

	if name != "" {
		query += fmt.Sprintf(", name = $%d", argNum)
		args = append(args, name)
		argNum++
	}
	if redirectURI != "" {
		query += fmt.Sprintf(", redirect_uri = $%d", argNum)
		args = append(args, redirectURI)
		argNum++
	}
	if len(scopes) > 0 {
		query += fmt.Sprintf(", allowed_scopes = $%d", argNum)
		args = append(args, pq.Array(scopes))
		argNum++
	}
	if isActive != nil {
		query += fmt.Sprintf(", is_active = $%d", argNum)
		args = append(args, *isActive)
		argNum++
	}

	query += fmt.Sprintf(" WHERE id = $%d", argNum)
	args = append(args, id)

	res, err := s.db.Exec(query, args...)
	if err != nil {
		return fmt.Errorf("failed to update client: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("client not found")
	}
	return nil
}

// authCodePayload is the JSON structure stored in Redis for an auth code.
type authCodePayload struct {
	ClientID            string `json:"client_id"`
	GenID               string `json:"gen_id"`
	RedirectURI         string `json:"redirect_uri"`
	Scope               string `json:"scope"`
	CodeChallenge       string `json:"code_challenge,omitempty"`
	CodeChallengeMethod string `json:"code_challenge_method,omitempty"`
}

// VerifyPKCE verifies the code_verifier against the stored code_challenge.
// Supports "S256" (SHA-256 hash) and "plain" methods.
func VerifyPKCE(codeVerifier, codeChallenge, method string) bool {
	if codeChallenge == "" {
		// No PKCE was used during authorization
		return true
	}
	if codeVerifier == "" {
		// PKCE was required but no verifier provided
		return false
	}

	if method == "S256" {
		h := sha256.Sum256([]byte(codeVerifier))
		computed := base64.RawURLEncoding.EncodeToString(h[:])
		return computed == codeChallenge
	}
	// Plain method (not recommended, but supported for backwards compatibility)
	return codeVerifier == codeChallenge
}

// StoreAuthCode saves an authorization code in Redis with a 5-minute TTL.
// Includes PKCE code_challenge and method if provided.
func (s *ClientService) StoreAuthCode(code, clientID, userGenID, redirectURI, scope, codeChallenge, codeChallengeMethod string) error {
	payload := authCodePayload{
		ClientID:            clientID,
		GenID:               userGenID,
		RedirectURI:         redirectURI,
		Scope:               scope,
		CodeChallenge:       codeChallenge,
		CodeChallengeMethod: codeChallengeMethod,
	}
	data, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal auth code payload: %w", err)
	}

	ctx := context.Background()
	return s.redis.Set(ctx, "oauth_code:"+code, string(data), 5*time.Minute).Err()
}

// ConsumeAuthCode atomically retrieves and deletes an authorization code from Redis.
// Returns PKCE code_challenge and method along with other fields.
func (s *ClientService) ConsumeAuthCode(code string) (clientID, genID, redirectURI, scope, codeChallenge, codeChallengeMethod string, err error) {
	ctx := context.Background()
	key := "oauth_code:" + code

	val, err := s.redis.GetDel(ctx, key).Result()
	if err == redis.Nil {
		return "", "", "", "", "", "", fmt.Errorf("authorization code not found or expired")
	}
	if err != nil {
		return "", "", "", "", "", "", fmt.Errorf("failed to consume auth code: %w", err)
	}

	var payload authCodePayload
	if err := json.Unmarshal([]byte(val), &payload); err != nil {
		return "", "", "", "", "", "", fmt.Errorf("failed to unmarshal auth code payload: %w", err)
	}

	return payload.ClientID, payload.GenID, payload.RedirectURI, payload.Scope, payload.CodeChallenge, payload.CodeChallengeMethod, nil
}
