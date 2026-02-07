package handlers

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"gerege-sso/middleware"
	"gerege-sso/models"

	"github.com/gin-gonic/gin"
)

// ProviderUserInfo is a unified representation of user info from any OAuth provider
type ProviderUserInfo struct {
	ProviderID    string // unique ID from provider (google sub, apple sub, facebook id, etc.)
	Email         string
	EmailVerified bool
	Name          string
	Picture       string
	Provider      string // "google", "apple", "facebook", "twitter"
}

// generateState creates a cryptographic random state token and stores it in Redis
func (h *AuthHandler) generateState(provider string) (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("failed to generate state: %w", err)
	}
	state := base64.URLEncoding.EncodeToString(b)

	ctx := context.Background()
	if err := h.redis.Set(ctx, "oauth_state:"+state, provider, 10*time.Minute).Err(); err != nil {
		return "", fmt.Errorf("failed to store state: %w", err)
	}
	return state, nil
}

// validateState checks and consumes a state token from Redis, returning the expected provider value
func (h *AuthHandler) validateState(state, expectedProvider string) bool {
	if state == "" {
		return false
	}
	ctx := context.Background()
	val, err := h.redis.Get(ctx, "oauth_state:"+state).Result()
	if err != nil || val != expectedProvider {
		return false
	}
	h.redis.Del(ctx, "oauth_state:"+state)
	return true
}

// handleOAuthCallback is the unified post-authentication flow for all OAuth providers.
// It handles: find/create user, pending link for email conflicts, token generation, redirect.
func (h *AuthHandler) handleOAuthCallback(c *gin.Context, info *ProviderUserInfo) {
	ctx := context.Background()

	// Find user by provider-specific ID
	user, err := h.userService.FindByProviderID(info.Provider, info.ProviderID)
	if err != nil {
		log.Printf("Failed to find user by %s: %v", info.Provider, err)
		middleware.RecordLoginAttempt(false, info.Provider)
		h.redirectWithError(c, "Database error")
		return
	}

	if user == nil {
		// Check if user exists with same email (different provider)
		if info.Email != "" {
			existingUser, err := h.userService.FindByEmail(info.Email)
			if err == nil && existingUser != nil {
				// Store pending link request and redirect to identity verification
				pendingData := map[string]string{
					"provider":    info.Provider,
					"provider_id": info.ProviderID,
					"user_id":     fmt.Sprintf("%d", existingUser.ID),
					"email":       info.Email,
				}
				pendingJSON, _ := json.Marshal(pendingData)
				pendingKey := "pending_link:" + existingUser.GenID
				h.redis.Set(ctx, pendingKey, string(pendingJSON), 10*time.Minute)

				verifyURL := h.config.Public.URL + "/callback?pending_link=true&gen_id=" + existingUser.GenID
				c.Redirect(http.StatusSeeOther, verifyURL)
				return
			}
		}

		// Create new user
		user, err = h.userService.CreateFromProvider(info.Provider, &models.ProviderUserInfo{
			ProviderID:    info.ProviderID,
			Email:         info.Email,
			EmailVerified: info.EmailVerified,
			Name:          info.Name,
			Picture:       info.Picture,
		})
		if err != nil {
			log.Printf("Failed to create user from %s: %v", info.Provider, err)
			middleware.RecordLoginAttempt(false, info.Provider)
			h.redirectWithError(c, "Failed to create user")
			return
		}
		log.Printf("Created new user from %s: %s (gen_id: %s)", info.Provider, user.Email, user.GenID)
	}

	// Update last login and picture
	if err := h.userService.UpdateLastLogin(user.ID); err != nil {
		log.Printf("Failed to update last login: %v", err)
	}
	if info.Picture != "" && (!user.Picture.Valid || user.Picture.String != info.Picture) {
		if err := h.userService.UpdatePicture(user.ID, info.Picture); err != nil {
			log.Printf("Failed to update picture: %v", err)
		}
	}

	// Generate JWT
	jwtToken, err := h.jwtService.GenerateToken(user)
	if err != nil {
		log.Printf("Failed to generate JWT: %v", err)
		h.redirectWithError(c, "Failed to generate token")
		return
	}

	// Record login metric
	middleware.RecordLoginAttempt(true, info.Provider)

	// Log audit
	h.auditService.AddLog(user.ID, "login", map[string]interface{}{
		"method": info.Provider + "_oauth",
		"email":  user.Email,
	}, c.ClientIP(), c.Request.UserAgent())

	// Generate single-use exchange code instead of exposing token in URL
	code, err := h.generateTokenExchangeCode(jwtToken)
	if err != nil {
		log.Printf("Failed to generate exchange code: %v", err)
		h.redirectWithError(c, "Failed to generate login code")
		return
	}

	callbackURL := h.config.Public.URL + "/callback?code=" + code
	c.Redirect(http.StatusSeeOther, callbackURL)
}
