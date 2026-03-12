package services

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"strconv"
	"time"

	"gerege-sso/models"

	"github.com/golang-jwt/jwt/v5"
	"github.com/redis/go-redis/v9"
)

// JWTService handles JWT token operations
type JWTService struct {
	secret []byte
	expiry time.Duration
	redis  *redis.Client
}

// Claims represents the JWT claims structure
type Claims struct {
	jwt.RegisteredClaims
	GenID       string            `json:"gen_id"`
	Email       string            `json:"email"`
	Gerege      models.GeregeInfo `json:"gerege"`
	MFAPending  bool              `json:"mfa_pending,omitempty"`
	MFAVerified bool              `json:"mfa_verified,omitempty"`
}

// NewJWTService creates a new JWTService
func NewJWTService(secret string, expiry time.Duration, rdb ...*redis.Client) *JWTService {
	svc := &JWTService{
		secret: []byte(secret),
		expiry: expiry,
	}
	if len(rdb) > 0 {
		svc.redis = rdb[0]
	}
	return svc
}

// GenerateToken creates a new JWT token for a user
func (s *JWTService) GenerateToken(user *models.User) (string, error) {
	now := time.Now()
	expiresAt := now.Add(s.expiry)

	// Build gerege claim
	gerege := models.GeregeInfo{
		Verified:          user.Verified,
		VerificationLevel: user.VerificationLevel,
		Role:              user.Role,
	}

	// If user has associated citizen data
	if user.Citizen != nil {
		gerege.RegNo = user.Citizen.RegNo
		gerege.FirstName = user.Citizen.FirstName
		if user.Citizen.FamilyName.Valid {
			gerege.FamilyName = user.Citizen.FamilyName.String
		}
		if user.Citizen.LastName.Valid {
			gerege.LastName = user.Citizen.LastName.String
		}
		if user.Citizen.BirthDate.Valid {
			gerege.BirthDate = user.Citizen.BirthDate.String
		}
		if user.Citizen.Gender.Valid {
			gerege.Gender = user.Citizen.Gender.String
		}

		name := user.Citizen.FirstName
		if user.Citizen.LastName.Valid {
			name = user.Citizen.LastName.String + " " + user.Citizen.FirstName
		}
		gerege.Name = name
	}

	// Generate unique token ID for blacklisting
	jtiBytes := make([]byte, 16)
	if _, err := rand.Read(jtiBytes); err != nil {
		return "", fmt.Errorf("failed to generate jti: %w", err)
	}
	jti := hex.EncodeToString(jtiBytes)

	claims := &Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        jti,
			Subject:   strconv.FormatInt(user.ID, 10),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			Issuer:    "gerege-sso",
		},
		GenID:  user.GenID,
		Email:  user.Email,
		Gerege: gerege,
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.secret)
}

// GenerateTempToken creates a limited JWT for MFA pending state (5 min TTL)
func (s *JWTService) GenerateTempToken(user *models.User) (string, error) {
	now := time.Now()
	expiresAt := now.Add(5 * time.Minute) // short-lived for MFA challenge

	gerege := models.GeregeInfo{
		Verified:          user.Verified,
		VerificationLevel: user.VerificationLevel,
	}

	jtiBytes := make([]byte, 16)
	if _, err := rand.Read(jtiBytes); err != nil {
		return "", fmt.Errorf("failed to generate jti: %w", err)
	}
	jti := hex.EncodeToString(jtiBytes)

	claims := &Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        jti,
			Subject:   strconv.FormatInt(user.ID, 10),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			Issuer:    "gerege-sso",
		},
		GenID:      user.GenID,
		Email:      user.Email,
		Gerege:     gerege,
		MFAPending: true,
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.secret)
}

// ValidateToken validates a JWT token and returns the claims
func (s *JWTService) ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return s.secret, nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	return claims, nil
}

// ValidateThirdPartyToken validates a third-party JWT token and returns its claims
func (s *JWTService) ValidateThirdPartyToken(tokenString string) (*ThirdPartyClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &ThirdPartyClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return s.secret, nil
	})
	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}
	claims, ok := token.Claims.(*ThirdPartyClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}
	return claims, nil
}

// ThirdPartyClaims represents the JWT claims for third-party tokens
type ThirdPartyClaims struct {
	jwt.RegisteredClaims
	Email         string                      `json:"email"`
	Picture       string                      `json:"picture,omitempty"`
	EmailVerified bool                        `json:"email_verified"`
	Gerege        models.ThirdPartyGeregeInfo `json:"gerege"`
}

// GenerateThirdPartyToken creates an enriched JWT for a third-party OAuth2 client.
// It includes social profile data and citizen identity (without civil_id or reg_no).
func (s *JWTService) GenerateThirdPartyToken(user *models.User, audience string, scope string) (string, error) {
	now := time.Now()
	expiresAt := now.Add(1 * time.Hour) // 1h for third-party (vs 24h first-party)

	gerege := models.ThirdPartyGeregeInfo{
		GenID:             user.GenID,
		VerificationLevel: user.VerificationLevel,
	}

	// Enrich with citizen data if available (regardless of verification status).
	// Clients use verification_level to decide how much to trust the data.
	if user.Citizen != nil {
		if user.Citizen.FamilyName.Valid {
			gerege.FamilyName = user.Citizen.FamilyName.String
		}
		if user.Citizen.LastName.Valid {
			gerege.LastName = user.Citizen.LastName.String
		}
		gerege.FirstName = user.Citizen.FirstName
		if user.Citizen.BirthDate.Valid {
			gerege.BirthDate = user.Citizen.BirthDate.String
		}
		if user.Citizen.Gender.Valid {
			gerege.Gender = user.Citizen.Gender.String
		}
	}

	var picture string
	if user.Picture.Valid {
		picture = user.Picture.String
	}

	claims := &ThirdPartyClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   user.GenID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			Issuer:    "https://sso.gerege.mn",
			Audience:  jwt.ClaimStrings{audience},
		},
		Email:         user.Email,
		Picture:       picture,
		EmailVerified: user.EmailVerified,
		Gerege:        gerege,
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.secret)
}

// BlacklistToken adds a token's jti to the Redis blacklist until it expires
func (s *JWTService) BlacklistToken(claims *Claims) error {
	if s.redis == nil || claims.ID == "" {
		return nil
	}
	ctx := context.Background()
	ttl := time.Until(claims.ExpiresAt.Time)
	if ttl <= 0 {
		return nil // already expired
	}
	return s.redis.Set(ctx, "jwt_blacklist:"+claims.ID, "1", ttl).Err()
}

// IsBlacklisted checks if a token's jti has been blacklisted
func (s *JWTService) IsBlacklisted(jti string) bool {
	if s.redis == nil || jti == "" {
		return false
	}
	ctx := context.Background()
	val, err := s.redis.Exists(ctx, "jwt_blacklist:"+jti).Result()
	return err == nil && val > 0
}

// GetExpiry returns the token expiry duration
func (s *JWTService) GetExpiry() time.Duration {
	return s.expiry
}
