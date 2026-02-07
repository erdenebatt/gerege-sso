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
	grantService  *services.GrantService
	redis         *redis.Client
	config        *config.Config
}

// NewOAuthProviderHandler creates a new OAuthProviderHandler
func NewOAuthProviderHandler(
	clientService *services.ClientService,
	jwtService *services.JWTService,
	userService *services.UserService,
	auditService *services.AuditService,
	grantService *services.GrantService,
	redis *redis.Client,
	cfg *config.Config,
) *OAuthProviderHandler {
	return &OAuthProviderHandler{
		clientService: clientService,
		jwtService:    jwtService,
		userService:   userService,
		auditService:  auditService,
		grantService:  grantService,
		redis:         redis,
		config:        cfg,
	}
}

// Authorize handles GET /api/oauth/authorize
// Step 1: Validates params and redirects to consent page.
// Step 2 (POST with approve=true): Generates auth code and redirects back to client.
// Supports PKCE with code_challenge and code_challenge_method parameters.
// @Summary OAuth2 authorize
// @Description Initiates OAuth2 authorization code flow with optional PKCE support
// @Tags oauth
// @Produce json
// @Security BearerAuth
// @Param client_id query string true "Client ID"
// @Param redirect_uri query string true "Redirect URI"
// @Param response_type query string true "Response type (must be 'code')"
// @Param scope query string false "Requested scopes" default(openid profile)
// @Param state query string false "State parameter"
// @Param code_challenge query string false "PKCE code challenge"
// @Param code_challenge_method query string false "PKCE method (S256 or plain)"
// @Param approve query string false "Set to 'true' to approve"
// @Success 303 {string} string "Redirect to consent page or client"
// @Failure 400 {object} map[string]interface{}
// @Router /api/oauth/authorize [get]
func (h *OAuthProviderHandler) Authorize(c *gin.Context) {
	clientID := c.Query("client_id")
	redirectURI := c.Query("redirect_uri")
	responseType := c.Query("response_type")
	scope := c.DefaultQuery("scope", "openid profile")
	state := c.Query("state")
	approve := c.Query("approve")

	// PKCE parameters
	codeChallenge := c.Query("code_challenge")
	codeChallengeMethod := c.DefaultQuery("code_challenge_method", "plain")

	// Validate code_challenge_method if code_challenge is provided
	if codeChallenge != "" && codeChallengeMethod != "S256" && codeChallengeMethod != "plain" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid code_challenge_method, must be 'S256' or 'plain'"})
		return
	}

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

	// Inline JWT authentication — redirect to login if not authenticated
	genID := ""
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		if cookie, err := c.Cookie("gerege_token"); err == nil && cookie != "" {
			authHeader = "Bearer " + cookie
		}
	}
	if authHeader != "" {
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) == 2 && strings.ToLower(parts[0]) == "bearer" {
			if claims, err := h.jwtService.ValidateToken(parts[1]); err == nil && !h.jwtService.IsBlacklisted(claims.ID) {
				genID = claims.Subject
			}
		}
	}

	// If not authenticated, redirect to SSO login page with return URL
	if genID == "" {
		loginURL := fmt.Sprintf("%s/?redirect=%s",
			h.config.Public.URL,
			url.QueryEscape(c.Request.URL.String()),
		)
		c.Redirect(http.StatusFound, loginURL)
		return
	}

	// If user has NOT yet approved, redirect to consent page
	if approve != "true" {
		consentURL := fmt.Sprintf(
			"%s/consent?client_id=%s&redirect_uri=%s&scope=%s&state=%s&app_name=%s",
			h.config.Public.URL,
			url.QueryEscape(clientID),
			url.QueryEscape(redirectURI),
			url.QueryEscape(scope),
			url.QueryEscape(state),
			url.QueryEscape(client.Name),
		)
		// Forward PKCE parameters to consent page
		if codeChallenge != "" {
			consentURL += "&code_challenge=" + url.QueryEscape(codeChallenge)
			consentURL += "&code_challenge_method=" + url.QueryEscape(codeChallengeMethod)
		}
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

	// Store auth code in Redis (5-min TTL, single-use) with PKCE params
	if err := h.clientService.StoreAuthCode(code, clientID, genID, redirectURI, scope, codeChallenge, codeChallengeMethod); err != nil {
		log.Printf("Failed to store auth code: %v", err)
		middleware.RecordOAuthAuthorize(false)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to store authorization code"})
		return
	}

	middleware.RecordOAuthAuthorize(true)

	// Audit: record consent event and create/update grant
	user, _ := h.userService.FindByGenID(genID)
	if user != nil {
		h.auditService.AddLog(user.ID, "oauth_consent_granted", map[string]interface{}{
			"client_id": clientID,
			"app_name":  client.Name,
			"scope":     scope,
		}, c.ClientIP(), c.Request.UserAgent())

		// Record the grant (or update if already exists)
		scopes := strings.Split(scope, " ")
		if err := h.grantService.CreateOrUpdateGrant(user.ID, clientID, scopes); err != nil {
			log.Printf("Failed to record grant: %v", err)
		}
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
// Supports PKCE verification with code_verifier parameter.
// @Summary OAuth2 token exchange
// @Description Exchanges authorization code for an access token (supports PKCE)
// @Tags oauth
// @Accept application/x-www-form-urlencoded
// @Produce json
// @Param grant_type formData string true "Grant type (must be 'authorization_code')"
// @Param code formData string true "Authorization code"
// @Param redirect_uri formData string true "Redirect URI"
// @Param client_id formData string true "Client ID"
// @Param client_secret formData string true "Client secret"
// @Param code_verifier formData string false "PKCE code verifier"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Router /api/oauth/token [post]
func (h *OAuthProviderHandler) Token(c *gin.Context) {
	grantType := c.PostForm("grant_type")
	code := c.PostForm("code")
	redirectURI := c.PostForm("redirect_uri")
	clientID := c.PostForm("client_id")
	clientSecret := c.PostForm("client_secret")
	codeVerifier := c.PostForm("code_verifier")

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

	// Consume the single-use auth code (now includes PKCE params)
	storedClientID, genID, storedRedirectURI, scope, codeChallenge, codeChallengeMethod, err := h.clientService.ConsumeAuthCode(code)
	if err != nil {
		log.Printf("Auth code consumption failed: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid or expired authorization code"})
		return
	}

	// Verify PKCE if code_challenge was provided during authorization
	if !services.VerifyPKCE(codeVerifier, codeChallenge, codeChallengeMethod) {
		log.Printf("PKCE verification failed for client %s", clientID)
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid code_verifier"})
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
// @Summary Create OAuth2 client
// @Description Registers a new OAuth2 client application
// @Tags admin
// @Accept json
// @Produce json
// @Security AdminAPIKey
// @Param body body object true "Client creation request" example({"name":"My App","redirect_uri":"https://example.com/callback","scopes":["openid","profile"]})
// @Success 201 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/admin/clients [post]
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
// @Summary List OAuth2 clients
// @Description Returns all registered OAuth2 clients
// @Tags admin
// @Produce json
// @Security AdminAPIKey
// @Success 200 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/admin/clients [get]
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
// @Summary Delete OAuth2 client
// @Description Deactivates an OAuth2 client
// @Tags admin
// @Produce json
// @Security AdminAPIKey
// @Param id path string true "Client ID"
// @Success 200 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Router /api/admin/clients/{id} [delete]
func (h *OAuthProviderHandler) DeleteClient(c *gin.Context) {
	id := c.Param("id")
	if err := h.clientService.DeleteClient(id); err != nil {
		log.Printf("Failed to delete client: %v", err)
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "client deactivated"})
}

// ListMyGrants handles GET /api/auth/grants — lists the current user's authorized apps.
// @Summary List my grants
// @Description Lists all OAuth2 grants (authorized apps) for the current user
// @Tags auth
// @Produce json
// @Security BearerAuth
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/auth/grants [get]
func (h *OAuthProviderHandler) ListMyGrants(c *gin.Context) {
	userGenID, _ := c.Get("user_id")
	genID := userGenID.(string)

	user, err := h.userService.FindByGenID(genID)
	if err != nil || user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
		return
	}

	grants, err := h.grantService.ListUserGrants(user.ID)
	if err != nil {
		log.Printf("Failed to list grants: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list grants"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"grants": grants})
}

// RevokeGrant handles DELETE /api/auth/grants/:id — revokes a specific grant.
// @Summary Revoke grant
// @Description Revokes a specific OAuth2 grant (disconnects an authorized app)
// @Tags auth
// @Produce json
// @Security BearerAuth
// @Param id path string true "Grant ID"
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Router /api/auth/grants/{id} [delete]
func (h *OAuthProviderHandler) RevokeGrant(c *gin.Context) {
	grantID := c.Param("id")
	userGenID, _ := c.Get("user_id")
	genID := userGenID.(string)

	user, err := h.userService.FindByGenID(genID)
	if err != nil || user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
		return
	}

	if err := h.grantService.RevokeGrant(user.ID, grantID); err != nil {
		log.Printf("Failed to revoke grant: %v", err)
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	h.auditService.AddLog(user.ID, "oauth_grant_revoked", map[string]interface{}{
		"grant_id": grantID,
	}, c.ClientIP(), c.Request.UserAgent())

	c.JSON(http.StatusOK, gin.H{"message": "grant revoked"})
}

// GetStats handles GET /api/admin/stats — returns system statistics.
// @Summary Get system stats
// @Description Returns system statistics (clients, users, logins)
// @Tags admin
// @Produce json
// @Security AdminAPIKey
// @Success 200 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/admin/stats [get]
func (h *OAuthProviderHandler) GetStats(c *gin.Context) {
	stats, err := h.auditService.GetStats()
	if err != nil {
		log.Printf("Failed to get stats: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get stats"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"clients": gin.H{
			"total":  stats.TotalClients,
			"active": stats.ActiveClients,
		},
		"users": gin.H{
			"total":    stats.TotalUsers,
			"verified": stats.VerifiedUsers,
		},
		"logins_24h": stats.Logins24h,
	})
}

// GetAuditLogs handles GET /api/admin/audit-logs — returns recent audit logs.
// @Summary Get audit logs
// @Description Returns the 50 most recent audit log entries
// @Tags admin
// @Produce json
// @Security AdminAPIKey
// @Success 200 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/admin/audit-logs [get]
func (h *OAuthProviderHandler) GetAuditLogs(c *gin.Context) {
	logs, err := h.auditService.GetRecentLogs(50)
	if err != nil {
		log.Printf("Failed to fetch audit logs: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch audit logs"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"logs": logs})
}

// UpdateClient handles PUT /api/admin/clients/:id — updates a client.
// @Summary Update OAuth2 client
// @Description Updates an existing OAuth2 client
// @Tags admin
// @Accept json
// @Produce json
// @Security AdminAPIKey
// @Param id path string true "Client ID"
// @Param body body object true "Client update request"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Router /api/admin/clients/{id} [put]
func (h *OAuthProviderHandler) UpdateClient(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		Name        string   `json:"name"`
		RedirectURI string   `json:"redirect_uri"`
		Scopes      []string `json:"scopes"`
		IsActive    *bool    `json:"is_active"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	if err := h.clientService.UpdateClient(id, req.Name, req.RedirectURI, req.Scopes, req.IsActive); err != nil {
		log.Printf("Failed to update client: %v", err)
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "client updated"})
}
