package models

import (
	"database/sql"
	"time"
)

// Citizen represents the citizens table (master data)
type Citizen struct {
	ID         int64          `json:"id"`
	CivilID    sql.NullString `json:"civil_id"`
	RegNo      string         `json:"reg_no"`
	FamilyName sql.NullString `json:"family_name"`
	LastName   sql.NullString `json:"last_name"`
	FirstName  string         `json:"first_name"`
	Gender     sql.NullString `json:"gender"`
	BirthDate  sql.NullString `json:"birth_date"`
	PhoneNo    sql.NullString `json:"phone_no"`
	Email      sql.NullString `json:"email"`
	AimagName  sql.NullString `json:"aimag_name"`
	SumName    sql.NullString `json:"sum_name"`

	// Оршин суугаа хаяг (residential address)
	ResidentialParentAddressID   sql.NullInt64  `json:"residential_parent_address_id"`
	ResidentialParentAddressName sql.NullString `json:"residential_parent_address_name"`
	ResidentialAimagID           sql.NullInt64  `json:"residential_aimag_id"`
	ResidentialAimagCode         sql.NullString `json:"residential_aimag_code"`
	ResidentialAimagName         sql.NullString `json:"residential_aimag_name"`
	ResidentialSumID             sql.NullInt64  `json:"residential_sum_id"`
	ResidentialSumCode           sql.NullString `json:"residential_sum_code"`
	ResidentialSumName           sql.NullString `json:"residential_sum_name"`
	ResidentialBagID             sql.NullInt64  `json:"residential_bag_id"`
	ResidentialBagCode           sql.NullString `json:"residential_bag_code"`
	ResidentialBagName           sql.NullString `json:"residential_bag_name"`
	ResidentialAddressDetail     sql.NullString `json:"residential_address_detail"`

	// Е-баримт ТИН
	EbarimtTIN sql.NullString `json:"ebarimt_tin"`
}

// User represents the users table (SSO users)
type User struct {
	ID            int64          `json:"id"`
	GenID         string         `json:"gen_id"`
	GoogleSub     sql.NullString `json:"google_sub"`
	AppleSub      sql.NullString `json:"apple_sub"`
	FacebookID    sql.NullString `json:"facebook_id"`
	TwitterID     sql.NullString `json:"twitter_id"`
	Email         string         `json:"email"`
	EmailVerified bool           `json:"email_verified"`
	Picture       sql.NullString `json:"picture"`
	CitizenID     sql.NullInt64  `json:"citizen_id"`
	Verified          bool           `json:"verified"`
	VerificationLevel int            `json:"verification_level"`
	CreatedAt         time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	LastLoginAt   sql.NullTime   `json:"last_login_at"`
	Citizen       *Citizen       `json:"citizen,omitempty"`
}

// Session represents the sessions table
type Session struct {
	ID        string    `json:"id"`
	UserID    int64     `json:"user_id"`
	TokenHash string    `json:"token_hash"`
	IPAddress string    `json:"ip_address"`
	UserAgent string    `json:"user_agent"`
	ExpiresAt time.Time `json:"expires_at"`
	CreatedAt time.Time `json:"created_at"`
}

// GeregeInfo represents the 'gerege' claim in JWT
type GeregeInfo struct {
	RegNo      string `json:"reg_no,omitempty"`
	FamilyName string `json:"family_name,omitempty"`
	LastName   string `json:"last_name,omitempty"`
	FirstName  string `json:"first_name,omitempty"`
	Name       string `json:"name,omitempty"`
	BirthDate  string `json:"birth_date,omitempty"`
	Gender     string `json:"gender,omitempty"`
	Verified          bool `json:"verified"`
	VerificationLevel int  `json:"verification_level"`
}

// JWTClaims represents the JWT payload
type JWTClaims struct {
	Sub    string     `json:"sub"` // gen_id (11-digit)
	Email  string     `json:"email"`
	Gerege GeregeInfo `json:"gerege"`
}

// ProviderUserInfo is a unified representation of user info from any OAuth provider
type ProviderUserInfo struct {
	ProviderID    string `json:"provider_id"`
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
}

// GoogleUserInfo represents Google OAuth user info
type GoogleUserInfo struct {
	ID            string `json:"id"`
	Email         string `json:"email"`
	VerifiedEmail bool   `json:"verified_email"`
	Name          string `json:"name"`
	GivenName     string `json:"given_name"`
	FamilyName    string `json:"family_name"`
	Picture       string `json:"picture"`
	Locale        string `json:"locale"`
}

// AppleUserInfo represents Apple Sign-In user info
type AppleUserInfo struct {
	Sub           string `json:"sub"`
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
	Name          string `json:"name,omitempty"`
}

// FacebookUserInfo represents Facebook OAuth user info
type FacebookUserInfo struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Email   string `json:"email"`
	Picture string `json:"picture"`
}

// TwitterUserInfo represents Twitter/X OAuth user info
type TwitterUserInfo struct {
	ID              string `json:"id"`
	Name            string `json:"name"`
	Username        string `json:"username"`
	ProfileImageURL string `json:"profile_image_url"`
}

// DanVerificationLog represents a record of DAN SSO verification
type DanVerificationLog struct {
	ID        int64     `json:"id"`
	UserID    int64     `json:"user_id"`
	RegNo     string    `json:"reg_no"`
	Method    string    `json:"method"`
	CreatedAt time.Time `json:"created_at"`
}

// RegistryVerifyLog represents a record of reg_no verification
type RegistryVerifyLog struct {
	ID        int64     `json:"id"`
	UserID    int64     `json:"user_id"`
	RegNo     string    `json:"reg_no"`
	CreatedAt time.Time `json:"created_at"`
}

// UserResponse represents the API response for user info
type UserResponse struct {
	GenID           string               `json:"gen_id"`
	Email           string               `json:"email"`
	Picture         string               `json:"picture,omitempty"`
	Verified          bool                 `json:"verified"`
	VerificationLevel int                  `json:"verification_level"`
	Providers         map[string]bool      `json:"providers"`
	CreatedAt       string               `json:"created_at"`
	UpdatedAt       string               `json:"updated_at"`
	LastLoginAt     string               `json:"last_login_at,omitempty"`
	DanVerifiedAt   string               `json:"dan_verified_at,omitempty"`
	DanHistory      []DanVerificationLog `json:"dan_history,omitempty"`
	RegistryHistory []RegistryVerifyLog  `json:"registry_history,omitempty"`
	Gerege          GeregeInfo           `json:"gerege"`
}
