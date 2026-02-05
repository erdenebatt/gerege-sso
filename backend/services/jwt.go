package services

import (
	"fmt"
	"time"

	"gerege-sso/models"

	"github.com/golang-jwt/jwt/v5"
)

// JWTService handles JWT token operations
type JWTService struct {
	secret []byte
	expiry time.Duration
}

// Claims represents the JWT claims structure
type Claims struct {
	jwt.RegisteredClaims
	Email  string            `json:"email"`
	Gerege models.GeregeInfo `json:"gerege"`
}

// NewJWTService creates a new JWTService
func NewJWTService(secret string, expiry time.Duration) *JWTService {
	return &JWTService{
		secret: []byte(secret),
		expiry: expiry,
	}
}

// GenerateToken creates a new JWT token for a user
func (s *JWTService) GenerateToken(user *models.User) (string, error) {
	now := time.Now()
	expiresAt := now.Add(s.expiry)

	// Build gerege claim
	gerege := models.GeregeInfo{
		Verified: user.Verified,
	}

	// If user has associated citizen data
	if user.Citizen != nil {
		gerege.RegNo = user.Citizen.RegNo
		name := user.Citizen.FirstName
		if user.Citizen.LastName.Valid {
			name = user.Citizen.LastName.String + " " + user.Citizen.FirstName
		}
		gerege.Name = name
	}

	claims := &Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   user.GenID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			Issuer:    "gerege-sso",
		},
		Email:  user.Email,
		Gerege: gerege,
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

// GetExpiry returns the token expiry duration
func (s *JWTService) GetExpiry() time.Duration {
	return s.expiry
}
