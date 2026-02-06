package services

import (
	"database/sql"
	"fmt"

	"gerege-sso/models"

	"github.com/lib/pq"
)

// GrantService handles user grant operations
type GrantService struct {
	db *sql.DB
}

// NewGrantService creates a new GrantService
func NewGrantService(db *sql.DB) *GrantService {
	return &GrantService{db: db}
}

// CreateOrUpdateGrant creates a new grant or updates an existing one.
// If the grant was previously revoked, it will be reactivated.
func (s *GrantService) CreateOrUpdateGrant(userID int64, clientID string, scopes []string) error {
	if len(scopes) == 0 {
		scopes = []string{"openid", "profile"}
	}

	_, err := s.db.Exec(`
		INSERT INTO user_grants (user_id, client_id, scopes, granted_at, revoked_at, last_used_at)
		VALUES ($1, $2, $3, CURRENT_TIMESTAMP, NULL, CURRENT_TIMESTAMP)
		ON CONFLICT (user_id, client_id) DO UPDATE SET
			scopes = $3,
			revoked_at = NULL,
			last_used_at = CURRENT_TIMESTAMP
	`, userID, clientID, pq.Array(scopes))
	if err != nil {
		return fmt.Errorf("failed to create/update grant: %w", err)
	}

	return nil
}

// ListUserGrants returns all active grants for a user (joined with client names).
func (s *GrantService) ListUserGrants(userID int64) ([]*models.UserGrant, error) {
	rows, err := s.db.Query(`
		SELECT
			g.id, g.user_id, g.client_id, COALESCE(c.name, 'Unknown App') as client_name,
			g.scopes, g.granted_at, g.revoked_at, g.last_used_at
		FROM user_grants g
		LEFT JOIN oauth_clients c ON c.client_id = g.client_id
		WHERE g.user_id = $1 AND g.revoked_at IS NULL
		ORDER BY g.granted_at DESC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to list grants: %w", err)
	}
	defer rows.Close()

	var grants []*models.UserGrant
	for rows.Next() {
		g := &models.UserGrant{}
		var revokedAt, lastUsedAt sql.NullTime
		if err := rows.Scan(
			&g.ID, &g.UserID, &g.ClientID, &g.ClientName,
			pq.Array(&g.Scopes), &g.GrantedAt, &revokedAt, &lastUsedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan grant: %w", err)
		}
		if revokedAt.Valid {
			g.RevokedAt = &revokedAt.Time
		}
		if lastUsedAt.Valid {
			g.LastUsedAt = &lastUsedAt.Time
		}
		grants = append(grants, g)
	}

	return grants, nil
}

// RevokeGrant soft-deletes a grant by setting revoked_at.
func (s *GrantService) RevokeGrant(userID int64, grantID string) error {
	res, err := s.db.Exec(`
		UPDATE user_grants
		SET revoked_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL
	`, grantID, userID)
	if err != nil {
		return fmt.Errorf("failed to revoke grant: %w", err)
	}

	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("grant not found or already revoked")
	}

	return nil
}

// UpdateLastUsed updates the last_used_at timestamp for a grant.
func (s *GrantService) UpdateLastUsed(userID int64, clientID string) error {
	_, err := s.db.Exec(`
		UPDATE user_grants
		SET last_used_at = CURRENT_TIMESTAMP
		WHERE user_id = $1 AND client_id = $2 AND revoked_at IS NULL
	`, userID, clientID)
	if err != nil {
		return fmt.Errorf("failed to update last used: %w", err)
	}
	return nil
}

// HasActiveGrant checks if a user has an active grant for a client.
func (s *GrantService) HasActiveGrant(userID int64, clientID string) (bool, error) {
	var exists bool
	err := s.db.QueryRow(`
		SELECT EXISTS(
			SELECT 1 FROM user_grants
			WHERE user_id = $1 AND client_id = $2 AND revoked_at IS NULL
		)
	`, userID, clientID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("failed to check grant: %w", err)
	}
	return exists, nil
}
