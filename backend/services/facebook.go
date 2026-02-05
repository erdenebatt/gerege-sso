package services

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"gerege-sso/config"
	"gerege-sso/models"
)

// FacebookOAuthService handles Facebook OAuth operations
type FacebookOAuthService struct {
	clientID     string
	clientSecret string
	redirectURL  string
}

// FacebookTokenResponse represents Facebook's token endpoint response
type FacebookTokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int    `json:"expires_in"`
}

// FacebookUserResponse represents Facebook's user info response
type FacebookUserResponse struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Email   string `json:"email"`
	Picture struct {
		Data struct {
			URL string `json:"url"`
		} `json:"data"`
	} `json:"picture"`
}

// NewFacebookOAuthService creates a new FacebookOAuthService
func NewFacebookOAuthService(cfg *config.Config) (*FacebookOAuthService, error) {
	if cfg.Auth.FacebookClientID == "" || cfg.Auth.FacebookClientSecret == "" {
		return nil, fmt.Errorf("Facebook OAuth not configured")
	}

	return &FacebookOAuthService{
		clientID:     cfg.Auth.FacebookClientID,
		clientSecret: cfg.Auth.FacebookClientSecret,
		redirectURL:  cfg.Auth.FacebookRedirectURL,
	}, nil
}

// GetAuthURL returns the Facebook OAuth authorization URL
func (s *FacebookOAuthService) GetAuthURL(state string) string {
	params := url.Values{
		"client_id":     {s.clientID},
		"redirect_uri":  {s.redirectURL},
		"response_type": {"code"},
		"scope":         {"email,public_profile"},
		"state":         {state},
	}
	return "https://www.facebook.com/v18.0/dialog/oauth?" + params.Encode()
}

// Exchange exchanges the authorization code for an access token
func (s *FacebookOAuthService) Exchange(ctx context.Context, code string) (*FacebookTokenResponse, error) {
	params := url.Values{
		"client_id":     {s.clientID},
		"client_secret": {s.clientSecret},
		"code":          {code},
		"redirect_uri":  {s.redirectURL},
	}

	req, err := http.NewRequestWithContext(ctx, "GET", "https://graph.facebook.com/v18.0/oauth/access_token?"+params.Encode(), nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to exchange code: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Facebook token error: %s", string(body))
	}

	var tokenResp FacebookTokenResponse
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return nil, fmt.Errorf("failed to decode token response: %w", err)
	}

	return &tokenResp, nil
}

// GetUserInfo retrieves user info from Facebook using the access token
func (s *FacebookOAuthService) GetUserInfo(ctx context.Context, accessToken string) (*models.FacebookUserInfo, error) {
	params := url.Values{
		"access_token": {accessToken},
		"fields":       {"id,name,email,picture.type(large)"},
	}

	req, err := http.NewRequestWithContext(ctx, "GET", "https://graph.facebook.com/v18.0/me?"+params.Encode(), nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to get user info: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Facebook API error: %s", string(body))
	}

	var fbUser FacebookUserResponse
	if err := json.Unmarshal(body, &fbUser); err != nil {
		return nil, fmt.Errorf("failed to decode user info: %w", err)
	}

	return &models.FacebookUserInfo{
		ID:      fbUser.ID,
		Name:    fbUser.Name,
		Email:   fbUser.Email,
		Picture: fbUser.Picture.Data.URL,
	}, nil
}

// IsConfigured returns true if Facebook OAuth is properly configured
func (s *FacebookOAuthService) IsConfigured() bool {
	return s.clientID != "" && s.clientSecret != ""
}
