package models

import (
	"time"
)

// UserGrant represents an OAuth client that a user has authorized
type UserGrant struct {
	ID         string     `json:"id"`
	UserID     int64      `json:"user_id"`
	ClientID   string     `json:"client_id"`
	ClientName string     `json:"client_name,omitempty"`
	Scopes     []string   `json:"scopes"`
	GrantedAt  time.Time  `json:"granted_at"`
	RevokedAt  *time.Time `json:"revoked_at,omitempty"`
	LastUsedAt *time.Time `json:"last_used_at,omitempty"`
}
