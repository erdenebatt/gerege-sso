package repository

import "gerege-sso/models"

// UserRepository defines the interface for user data access
type UserRepository interface {
	FindByProviderID(provider, providerID string) (*models.User, error)
	FindByEmail(email string) (*models.User, error)
	FindByGenID(genID string) (*models.User, error)
	CreateFromProvider(provider string, info *models.ProviderUserInfo, genID string) (*models.User, error)
	LinkProviderID(userID int64, provider, providerID string) error
	UpdateLastLogin(userID int64) error
	LinkCitizen(userID int64, regNo string) error
	FindCitizenByID(id int64) (*models.Citizen, error)
	FindCitizenByRegNo(regNo string) (*models.Citizen, error)
	LogDanVerification(userID int64, regNo string, method string) error
	GetDanVerificationLogs(userID int64) ([]models.DanVerificationLog, error)
}

// AuditRepository defines the interface for audit log data access
type AuditRepository interface {
	AddLog(userID int64, action string, details map[string]interface{}, ip string, userAgent string) error
	GetStats() (*SystemStats, error)
	GetRecentLogs(limit int) ([]AuditLogEntry, error)
}

// ClientRepository defines the interface for OAuth client data access
type ClientRepository interface {
	FindByClientID(clientID string) (*models.OAuthClient, error)
	ValidateClient(clientID, clientSecret string) (*models.OAuthClient, error)
	CreateClient(name, redirectURI string, scopes []string) (*models.OAuthClient, string, error)
	ListClients() ([]*models.OAuthClient, error)
	UpdateClient(id, name, redirectURI string, scopes []string, isActive *bool) error
	DeleteClient(id string) error
	StoreAuthCode(code, clientID, userGenID, redirectURI, scope, codeChallenge, codeChallengeMethod string) error
	ConsumeAuthCode(code string) (clientID, genID, redirectURI, scope, codeChallenge, codeChallengeMethod string, err error)
}

// GrantRepository defines the interface for user grant data access
type GrantRepository interface {
	CreateOrUpdateGrant(userID int64, clientID string, scopes []string) error
	ListUserGrants(userID int64) ([]*models.UserGrant, error)
	RevokeGrant(userID int64, grantID string) error
	HasActiveGrant(userID int64, clientID string) (bool, error)
	UpdateLastUsed(userID int64, clientID string) error
}

// SystemStats holds aggregated system statistics
type SystemStats struct {
	TotalClients  int `json:"total_clients"`
	ActiveClients int `json:"active_clients"`
	TotalUsers    int `json:"total_users"`
	VerifiedUsers int `json:"verified_users"`
	Logins24h     int `json:"logins_24h"`
}

// AuditLogEntry represents a single audit log entry for API responses
type AuditLogEntry struct {
	ID        int64  `json:"id"`
	UserID    int64  `json:"user_id"`
	UserEmail string `json:"user_email"`
	Action    string `json:"action"`
	Details   string `json:"details"`
	IPAddress string `json:"ip_address"`
	CreatedAt string `json:"created_at"`
}
