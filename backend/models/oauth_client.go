package models

import "time"

// OAuthClient represents a registered third-party OAuth2 client
type OAuthClient struct {
	ID               string    `json:"id"`
	ClientID         string    `json:"client_id"`
	ClientSecretHash string    `json:"-"`
	Name             string    `json:"name"`
	RedirectURI      string    `json:"redirect_uri"`
	AllowedScopes    []string  `json:"allowed_scopes"`
	IsActive         bool      `json:"is_active"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

// ThirdPartyGeregeInfo is the enriched gerege claim for third-party tokens.
// It intentionally excludes civil_id and reg_no.
type ThirdPartyGeregeInfo struct {
	GenID      string `json:"gen_id"`
	FamilyName string `json:"family_name,omitempty"`
	LastName   string `json:"last_name,omitempty"`
	FirstName  string `json:"first_name,omitempty"`
	BirthDate  string `json:"birth_date,omitempty"`
	Gender     string `json:"gender,omitempty"`
}
