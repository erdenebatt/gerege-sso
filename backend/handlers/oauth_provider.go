package handlers

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"strings"

	"gerege-sso/config"
	"gerege-sso/middleware"
	"gerege-sso/services"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

// OAuthProviderHandler handles OAuth2 Authorization Server endpoints
type OAuthProviderHandler struct {
	clientService *services.ClientService
	jwtService    *services.JWTService
	userService   *services.UserService
	auditService  *services.AuditService
	redis         *redis.Client
	config        *config.Config
}

// NewOAuthProviderHandler creates a new OAuthProviderHandler
func NewOAuthProviderHandler(
	clientService *services.ClientService,
	jwtService *services.JWTService,
	userService *services.UserService,
	auditService *services.AuditService,
	redis *redis.Client,
	cfg *config.Config,
) *OAuthProviderHandler {
	return &OAuthProviderHandler{
		clientService: clientService,
		jwtService:    jwtService,
		userService:   userService,
		auditService:  auditService,
		redis:         redis,
		config:        cfg,
	}
}

// Authorize handles GET /api/oauth/authorize
// Step 1: Validates params and redirects to consent page.
// Step 2 (POST with approve=true): Generates auth code and redirects back to client.
func (h *OAuthProviderHandler) Authorize(c *gin.Context) {
	clientID := c.Query("client_id")
	redirectURI := c.Query("redirect_uri")
	responseType := c.Query("response_type")
	scope := c.DefaultQuery("scope", "openid profile")
	state := c.Query("state")
	approve := c.Query("approve")

	// Validate response_type
	if responseType != "code" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "unsupported response_type, must be 'code'"})
		return
	}

	// Validate client
	client, err := h.clientService.FindByClientID(clientID)
	if err != nil || client == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid client_id"})
		return
	}
	if !client.IsActive {
		c.JSON(http.StatusBadRequest, gin.H{"error": "client is deactivated"})
		return
	}

	// Validate redirect_uri matches registered URI
	if redirectURI != client.RedirectURI {
		c.JSON(http.StatusBadRequest, gin.H{"error": "redirect_uri mismatch"})
		return
	}

	// Get authenticated user's gen_id from JWT claims
	userGenID, _ := c.Get("user_id")
	genID := userGenID.(string)

	// If user has NOT yet approved, redirect to consent page
	if approve != "true" {
		consentURL := fmt.Sprintf(
			"%s/consent.html?client_id=%s&redirect_uri=%s&scope=%s&state=%s&app_name=%s",
			h.config.Public.URL,
			url.QueryEscape(clientID),
			url.QueryEscape(redirectURI),
			url.QueryEscape(scope),
			url.QueryEscape(state),
			url.QueryEscape(client.Name),
		)
		c.Redirect(http.StatusSeeOther, consentURL)
		return
	}

	// User approved — generate auth code
	codeBytes := make([]byte, 32)
	if _, err := rand.Read(codeBytes); err != nil {
		log.Printf("Failed to generate auth code: %v", err)
		middleware.RecordOAuthAuthorize(false)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate authorization code"})
		return
	}
	code := base64.URLEncoding.EncodeToString(codeBytes)

	// Store auth code in Redis (5-min TTL, single-use)
	if err := h.clientService.StoreAuthCode(code, clientID, genID, redirectURI, scope); err != nil {
		log.Printf("Failed to store auth code: %v", err)
		middleware.RecordOAuthAuthorize(false)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to store authorization code"})
		return
	}

	middleware.RecordOAuthAuthorize(true)

	// Audit: record consent event
	user, _ := h.userService.FindByGenID(genID)
	if user != nil {
		h.auditService.AddLog(user.ID, "oauth_consent_granted", map[string]interface{}{
			"client_id": clientID,
			"app_name":  client.Name,
			"scope":     scope,
		}, c.ClientIP(), c.Request.UserAgent())
	}

	// Redirect back to client with code and state
	sep := "?"
	if strings.Contains(redirectURI, "?") {
		sep = "&"
	}
	callbackURL := fmt.Sprintf("%s%scode=%s", redirectURI, sep, url.QueryEscape(code))
	if state != "" {
		callbackURL += "&state=" + url.QueryEscape(state)
	}
	c.Redirect(http.StatusSeeOther, callbackURL)
}

// Token handles POST /api/oauth/token — exchanges auth code for an enriched JWT.
func (h *OAuthProviderHandler) Token(c *gin.Context) {
	grantType := c.PostForm("grant_type")
	code := c.PostForm("code")
	redirectURI := c.PostForm("redirect_uri")
	clientID := c.PostForm("client_id")
	clientSecret := c.PostForm("client_secret")

	if grantType != "authorization_code" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "unsupported grant_type"})
		return
	}

	// Validate client credentials
	client, err := h.clientService.ValidateClient(clientID, clientSecret)
	if err != nil {
		log.Printf("Client validation failed: %v", err)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid client credentials"})
		return
	}

	// Consume the single-use auth code
	storedClientID, genID, storedRedirectURI, scope, err := h.clientService.ConsumeAuthCode(code)
	if err != nil {
		log.Printf("Auth code consumption failed: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid or expired authorization code"})
		return
	}

	// Verify client_id from code matches the requesting client
	if storedClientID != clientID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "client_id mismatch"})
		return
	}

	// Verify redirect_uri matches
	if storedRedirectURI != redirectURI {
		c.JSON(http.StatusBadRequest, gin.H{"error": "redirect_uri mismatch"})
		return
	}

	// Fetch user with citizen data
	user, err := h.userService.FindByGenID(genID)
	if err != nil || user == nil {
		log.Printf("User not found for gen_id %s: %v", genID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "user not found"})
		return
	}

	// Generate enriched third-party token
	token, err := h.jwtService.GenerateThirdPartyToken(user, client.ClientID, scope)
	if err != nil {
		log.Printf("Failed to generate third-party token: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"access_token": token,
		"token_type":   "bearer",
		"expires_in":   3600,
	})
}

// CreateClient handles POST /api/admin/clients — registers a new OAuth2 client.
func (h *OAuthProviderHandler) CreateClient(c *gin.Context) {
	var req struct {
		Name        string   `json:"name" binding:"required"`
		RedirectURI string   `json:"redirect_uri" binding:"required"`
		Scopes      []string `json:"scopes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name and redirect_uri are required"})
		return
	}

	client, plainSecret, err := h.clientService.CreateClient(req.Name, req.RedirectURI, req.Scopes)
	if err != nil {
		log.Printf("Failed to create client: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create client"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"client":        client,
		"client_secret": plainSecret,
		"warning":       "Store the client_secret securely. It will not be shown again.",
	})
}

// ListClients handles GET /api/admin/clients
func (h *OAuthProviderHandler) ListClients(c *gin.Context) {
	clients, err := h.clientService.ListClients()
	if err != nil {
		log.Printf("Failed to list clients: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list clients"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"clients": clients})
}

// DeleteClient handles DELETE /api/admin/clients/:id — deactivates a client.
func (h *OAuthProviderHandler) DeleteClient(c *gin.Context) {
	id := c.Param("id")
	if err := h.clientService.DeleteClient(id); err != nil {
		log.Printf("Failed to delete client: %v", err)
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "client deactivated"})
}
