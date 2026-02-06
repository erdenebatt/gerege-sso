package services

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"

	"gerege-sso/models"
)

// TwitterOAuthService handles Twitter OAuth 2.0
type TwitterOAuthService struct {
	clientID     string
	clientSecret string
	redirectURL  string
}

// TwitterTokenResponse represents the token response from Twitter
type TwitterTokenResponse struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
	Scope        string `json:"scope"`
	RefreshToken string `json:"refresh_token,omitempty"`
}

// NewTwitterOAuthService creates a new Twitter OAuth service
func NewTwitterOAuthService(clientID, clientSecret, redirectURL string) *TwitterOAuthService {
	return &TwitterOAuthService{
		clientID:     clientID,
		clientSecret: clientSecret,
		redirectURL:  redirectURL,
	}
}

// GetAuthURL returns the Twitter OAuth authorization URL
// Uses S256 PKCE method for enhanced security
func (s *TwitterOAuthService) GetAuthURL(state, codeChallenge string) string {
	// Compute S256 code_challenge from the provided verifier
	h := sha256.Sum256([]byte(codeChallenge))
	s256Challenge := base64.RawURLEncoding.EncodeToString(h[:])

	params := url.Values{
		"response_type":         {"code"},
		"client_id":             {s.clientID},
		"redirect_uri":          {s.redirectURL},
		"scope":                 {"users.read tweet.read offline.access"},
		"state":                 {state},
		"code_challenge":        {s256Challenge},
		"code_challenge_method": {"S256"},
	}
	return "https://twitter.com/i/oauth2/authorize?" + params.Encode()
}

// Exchange exchanges the authorization code for tokens
func (s *TwitterOAuthService) Exchange(ctx context.Context, code, codeVerifier string) (*TwitterTokenResponse, error) {
	data := url.Values{
		"grant_type":    {"authorization_code"},
		"code":          {code},
		"redirect_uri":  {s.redirectURL},
		"client_id":     {s.clientID},
		"code_verifier": {codeVerifier},
	}

	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.twitter.com/2/oauth2/token", strings.NewReader(data.Encode()))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.SetBasicAuth(s.clientID, s.clientSecret)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("token exchange failed: %s", string(body))
	}

	var tokenResp TwitterTokenResponse
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return nil, err
	}

	return &tokenResp, nil
}

// GetUserInfo gets user info from Twitter
func (s *TwitterOAuthService) GetUserInfo(ctx context.Context, accessToken string) (*models.TwitterUserInfo, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", "https://api.twitter.com/2/users/me?user.fields=id,name,username,profile_image_url", nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+accessToken)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to get user info: %s", string(body))
	}

	var result struct {
		Data models.TwitterUserInfo `json:"data"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	return &result.Data, nil
}
