package services

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"gerege-sso/config"
	"gerege-sso/models"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

// OAuthService handles Google OAuth2 operations
type OAuthService struct {
	config *oauth2.Config
}

// NewOAuthService creates a new OAuthService
func NewOAuthService(cfg *config.Config) *OAuthService {
	return &OAuthService{
		config: &oauth2.Config{
			ClientID:     cfg.Auth.GoogleClientID,
			ClientSecret: cfg.Auth.GoogleClientSecret,
			RedirectURL:  cfg.Auth.GoogleRedirectURL,
			Scopes: []string{
				"https://www.googleapis.com/auth/userinfo.email",
				"https://www.googleapis.com/auth/userinfo.profile",
			},
			Endpoint: google.Endpoint,
		},
	}
}

// GetAuthURL returns the Google OAuth authorization URL
func (s *OAuthService) GetAuthURL(state string) string {
	return s.config.AuthCodeURL(state, oauth2.AccessTypeOffline)
}

// Exchange exchanges the authorization code for tokens
func (s *OAuthService) Exchange(ctx context.Context, code string) (*oauth2.Token, error) {
	return s.config.Exchange(ctx, code)
}

// GetUserInfo retrieves user info from Google using the access token
func (s *OAuthService) GetUserInfo(ctx context.Context, token *oauth2.Token) (*models.GoogleUserInfo, error) {
	client := s.config.Client(ctx, token)

	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		return nil, fmt.Errorf("failed to get user info: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("Google API error: %s", string(body))
	}

	var userInfo models.GoogleUserInfo
	if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
		return nil, fmt.Errorf("failed to decode user info: %w", err)
	}

	return &userInfo, nil
}
