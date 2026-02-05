package services

import (
	"context"
	"crypto/ecdsa"
	"crypto/x509"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"gerege-sso/config"
	"gerege-sso/models"

	"github.com/golang-jwt/jwt/v5"
)

// AppleOAuthService handles Apple Sign-In operations
type AppleOAuthService struct {
	clientID    string
	teamID      string
	keyID       string
	privateKey  *ecdsa.PrivateKey
	redirectURL string
}

// AppleTokenResponse represents Apple's token endpoint response
type AppleTokenResponse struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
	RefreshToken string `json:"refresh_token"`
	IDToken      string `json:"id_token"`
}

// AppleIDTokenClaims represents the claims in Apple's ID token
type AppleIDTokenClaims struct {
	jwt.RegisteredClaims
	Email         string `json:"email"`
	EmailVerified any    `json:"email_verified"` // Can be bool or string
	IsPrivateEmail any   `json:"is_private_email"`
	RealUserStatus int   `json:"real_user_status"`
}

// NewAppleOAuthService creates a new AppleOAuthService
func NewAppleOAuthService(cfg *config.Config) (*AppleOAuthService, error) {
	if cfg.Auth.AppleClientID == "" {
		return nil, fmt.Errorf("Apple OAuth not configured")
	}

	// Parse the private key
	privateKeyStr := cfg.Auth.ApplePrivateKey
	// Handle escaped newlines from .env file
	privateKeyStr = strings.ReplaceAll(privateKeyStr, `\n`, "\n")

	block, _ := pem.Decode([]byte(privateKeyStr))
	if block == nil {
		return nil, fmt.Errorf("failed to parse Apple private key PEM")
	}

	key, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		return nil, fmt.Errorf("failed to parse Apple private key: %w", err)
	}

	ecdsaKey, ok := key.(*ecdsa.PrivateKey)
	if !ok {
		return nil, fmt.Errorf("Apple private key is not ECDSA")
	}

	return &AppleOAuthService{
		clientID:    cfg.Auth.AppleClientID,
		teamID:      cfg.Auth.AppleTeamID,
		keyID:       cfg.Auth.AppleKeyID,
		privateKey:  ecdsaKey,
		redirectURL: cfg.Auth.AppleRedirectURL,
	}, nil
}

// GetAuthURL returns the Apple Sign-In authorization URL
func (s *AppleOAuthService) GetAuthURL(state string) string {
	params := url.Values{
		"client_id":     {s.clientID},
		"redirect_uri":  {s.redirectURL},
		"response_type": {"code id_token"},
		"scope":         {"name email"},
		"response_mode": {"form_post"},
		"state":         {state},
	}
	return "https://appleid.apple.com/auth/authorize?" + params.Encode()
}

// generateClientSecret generates a JWT client secret for Apple
func (s *AppleOAuthService) generateClientSecret() (string, error) {
	now := time.Now()
	claims := jwt.RegisteredClaims{
		Issuer:    s.teamID,
		Subject:   s.clientID,
		Audience:  jwt.ClaimStrings{"https://appleid.apple.com"},
		IssuedAt:  jwt.NewNumericDate(now),
		ExpiresAt: jwt.NewNumericDate(now.Add(5 * time.Minute)),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodES256, claims)
	token.Header["kid"] = s.keyID

	return token.SignedString(s.privateKey)
}

// Exchange exchanges the authorization code for tokens
func (s *AppleOAuthService) Exchange(ctx context.Context, code string) (*AppleTokenResponse, error) {
	clientSecret, err := s.generateClientSecret()
	if err != nil {
		return nil, fmt.Errorf("failed to generate client secret: %w", err)
	}

	data := url.Values{
		"client_id":     {s.clientID},
		"client_secret": {clientSecret},
		"code":          {code},
		"grant_type":    {"authorization_code"},
		"redirect_uri":  {s.redirectURL},
	}

	req, err := http.NewRequestWithContext(ctx, "POST", "https://appleid.apple.com/auth/token", strings.NewReader(data.Encode()))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to exchange code: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Apple token error: %s", string(body))
	}

	var tokenResp AppleTokenResponse
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return nil, fmt.Errorf("failed to decode token response: %w", err)
	}

	return &tokenResp, nil
}

// ValidateIDToken validates and parses Apple's ID token
func (s *AppleOAuthService) ValidateIDToken(idToken string) (*models.AppleUserInfo, error) {
	// Parse without validation first to get claims
	// In production, you should validate the signature using Apple's public keys
	token, _, err := jwt.NewParser().ParseUnverified(idToken, &AppleIDTokenClaims{})
	if err != nil {
		return nil, fmt.Errorf("failed to parse ID token: %w", err)
	}

	claims, ok := token.Claims.(*AppleIDTokenClaims)
	if !ok {
		return nil, fmt.Errorf("invalid token claims")
	}

	// Check issuer
	if claims.Issuer != "https://appleid.apple.com" {
		return nil, fmt.Errorf("invalid token issuer")
	}

	// Check audience
	if len(claims.Audience) == 0 || claims.Audience[0] != s.clientID {
		return nil, fmt.Errorf("invalid token audience")
	}

	// Check expiration
	if claims.ExpiresAt != nil && claims.ExpiresAt.Before(time.Now()) {
		return nil, fmt.Errorf("token expired")
	}

	// Handle email_verified which can be bool or string "true"/"false"
	emailVerified := false
	switch v := claims.EmailVerified.(type) {
	case bool:
		emailVerified = v
	case string:
		emailVerified = v == "true"
	}

	return &models.AppleUserInfo{
		Sub:           claims.Subject,
		Email:         claims.Email,
		EmailVerified: emailVerified,
	}, nil
}

// IsConfigured returns true if Apple OAuth is properly configured
func (s *AppleOAuthService) IsConfigured() bool {
	return s.privateKey != nil && s.clientID != "" && s.teamID != "" && s.keyID != ""
}
