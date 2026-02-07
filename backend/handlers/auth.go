package handlers

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"gerege-sso/config"
	"gerege-sso/middleware"
	"gerege-sso/models"
	"gerege-sso/services"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

// AuthHandler handles authentication endpoints
type AuthHandler struct {
	oauthService         *services.OAuthService
	appleOAuthService    *services.AppleOAuthService
	facebookOAuthService *services.FacebookOAuthService
	twitterOAuthService  *services.TwitterOAuthService
	jwtService           *services.JWTService
	userService          *services.UserService
	auditService         *services.AuditService
	redis                *redis.Client
	config               *config.Config
}

// NewAuthHandler creates a new AuthHandler
func NewAuthHandler(
	oauthService *services.OAuthService,
	appleOAuthService *services.AppleOAuthService,
	facebookOAuthService *services.FacebookOAuthService,
	twitterOAuthService *services.TwitterOAuthService,
	jwtService *services.JWTService,
	userService *services.UserService,
	auditService *services.AuditService,
	redis *redis.Client,
	config *config.Config,
) *AuthHandler {
	return &AuthHandler{
		oauthService:         oauthService,
		appleOAuthService:    appleOAuthService,
		facebookOAuthService: facebookOAuthService,
		twitterOAuthService:  twitterOAuthService,
		jwtService:           jwtService,
		userService:          userService,
		auditService:         auditService,
		redis:                redis,
		config:               config,
	}
}

// GoogleLogin initiates Google OAuth flow
// @Summary Google login
// @Description Initiates Google OAuth2 authentication flow
// @Tags auth
// @Produce json
// @Success 303 {string} string "Redirect to Google"
// @Failure 500 {object} map[string]interface{}
// @Router /api/auth/google [get]
func (h *AuthHandler) GoogleLogin(c *gin.Context) {
	// Generate state token
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate state"})
		return
	}
	state := base64.URLEncoding.EncodeToString(b)

	// Store state in Redis with 10 minute expiry
	ctx := context.Background()
	if err := h.redis.Set(ctx, "oauth_state:"+state, "valid", 10*time.Minute).Err(); err != nil {
		log.Printf("Failed to store state: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initialize OAuth"})
		return
	}

	// Redirect to Google
	authURL := h.oauthService.GetAuthURL(state)
	c.Redirect(http.StatusSeeOther, authURL)
}

// GoogleCallback handles OAuth callback from Google
// @Summary Google OAuth callback
// @Description Handles the OAuth2 callback from Google after user authentication
// @Tags auth
// @Param state query string true "OAuth state parameter"
// @Param code query string true "Authorization code"
// @Success 303 {string} string "Redirect to frontend with exchange code"
// @Failure 303 {string} string "Redirect to frontend with error"
// @Router /api/auth/google/callback [get]
func (h *AuthHandler) GoogleCallback(c *gin.Context) {
	ctx := context.Background()

	// Verify state
	state := c.Query("state")
	if state == "" {
		h.redirectWithError(c, "Missing state parameter")
		return
	}

	// Check state in Redis
	val, err := h.redis.Get(ctx, "oauth_state:"+state).Result()
	if err != nil || val != "valid" {
		h.redirectWithError(c, "Invalid or expired state")
		return
	}

	// Delete used state
	h.redis.Del(ctx, "oauth_state:"+state)

	// Get authorization code
	code := c.Query("code")
	if code == "" {
		h.redirectWithError(c, "Missing authorization code")
		return
	}

	// Exchange code for token
	token, err := h.oauthService.Exchange(ctx, code)
	if err != nil {
		log.Printf("Token exchange failed: %v", err)
		middleware.RecordLoginAttempt(false, "google")
		h.redirectWithError(c, "Failed to exchange authorization code")
		return
	}

	// Get user info from Google
	googleUser, err := h.oauthService.GetUserInfo(ctx, token)
	if err != nil {
		log.Printf("Failed to get user info: %v", err)
		middleware.RecordLoginAttempt(false, "google")
		h.redirectWithError(c, "Failed to get user information")
		return
	}

	// Find or create user
	user, err := h.userService.FindByGoogleSub(googleUser.ID)
	if err != nil {
		log.Printf("Failed to find user: %v", err)
		middleware.RecordLoginAttempt(false, "google")
		h.redirectWithError(c, "Database error")
		return
	}

	if user == nil {
		// Check if user exists with same email (different provider)
		if googleUser.Email != "" {
			existingUser, err := h.userService.FindByEmail(googleUser.Email)
			if err == nil && existingUser != nil {
				// User exists with same email but different provider
				// Store pending link request and redirect to identity verification
				pendingData := map[string]string{
					"provider":    "google",
					"provider_id": googleUser.ID,
					"user_id":     fmt.Sprintf("%d", existingUser.ID),
					"email":       googleUser.Email,
				}
				pendingJSON, _ := json.Marshal(pendingData)
				pendingKey := "pending_link:" + existingUser.GenID
				h.redis.Set(ctx, pendingKey, string(pendingJSON), 10*time.Minute)

				// Redirect to identity verification page
				verifyURL := h.config.Public.URL + "/callback?pending_link=true&gen_id=" + existingUser.GenID
				c.Redirect(http.StatusSeeOther, verifyURL)
				return
			}
		}

		// Create new user
		user, err = h.userService.Create(googleUser)
		if err != nil {
			log.Printf("Failed to create user: %v", err)
			middleware.RecordLoginAttempt(false, "google")
			h.redirectWithError(c, "Failed to create user")
			return
		}
		log.Printf("Created new user: %s (gen_id: %s)", user.Email, user.GenID)
	}

	// Update last login and picture
	if err := h.userService.UpdateLastLogin(user.ID); err != nil {
		log.Printf("Failed to update last login: %v", err)
	}
	if googleUser.Picture != "" && (!user.Picture.Valid || user.Picture.String != googleUser.Picture) {
		if err := h.userService.UpdatePicture(user.ID, googleUser.Picture); err != nil {
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
	middleware.RecordLoginAttempt(true, "google")

	// Log audit
	h.auditService.AddLog(user.ID, "login", map[string]interface{}{
		"method": "google_oauth",
		"email":  user.Email,
	}, c.ClientIP(), c.Request.UserAgent())

	// Generate single-use exchange code instead of exposing token in URL
	exchangeCode, exchangeErr := h.generateTokenExchangeCode(jwtToken)
	if exchangeErr != nil {
		log.Printf("Failed to generate exchange code: %v", exchangeErr)
		h.redirectWithError(c, "Failed to generate login code")
		return
	}

	callbackURL := h.config.Public.URL + "/callback?code=" + exchangeCode
	c.Redirect(http.StatusSeeOther, callbackURL)
}

// generateTokenExchangeCode stores a JWT in Redis behind a single-use code (60s TTL)
func (h *AuthHandler) generateTokenExchangeCode(jwtToken string) (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("failed to generate exchange code: %w", err)
	}
	code := base64.URLEncoding.EncodeToString(b)

	ctx := context.Background()
	if err := h.redis.Set(ctx, "token_exchange:"+code, jwtToken, 60*time.Second).Err(); err != nil {
		return "", fmt.Errorf("failed to store exchange code: %w", err)
	}
	return code, nil
}

// ExchangeToken exchanges a single-use code for a JWT token
// @Summary Exchange token
// @Description Exchanges a single-use authorization code for a JWT token
// @Tags auth
// @Accept json
// @Produce json
// @Param body body object true "Exchange code request" example({"code":"abc123"})
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Router /api/auth/exchange-token [post]
func (h *AuthHandler) ExchangeToken(c *gin.Context) {
	var req struct {
		Code string `json:"code" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	ctx := context.Background()
	key := "token_exchange:" + req.Code

	// Atomically get and delete (single-use)
	jwtToken, err := h.redis.GetDel(ctx, key).Result()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid or expired code"})
		return
	}

	// Set httpOnly cookie
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie("gerege_token", jwtToken, int(h.jwtService.GetExpiry().Seconds()), "/", "", true, true)

	c.JSON(http.StatusOK, gin.H{
		"token": jwtToken,
	})
}

// redirectWithError redirects to the frontend with an error message
func (h *AuthHandler) redirectWithError(c *gin.Context, message string) {
	encoded := url.QueryEscape(message)
	c.Redirect(http.StatusSeeOther, h.config.Public.URL+"/?error="+encoded)
}

// AppleLogin initiates Apple Sign-In flow
// @Summary Apple login
// @Description Initiates Apple Sign-In OAuth flow
// @Tags auth
// @Success 303 {string} string "Redirect to Apple"
// @Failure 500 {object} map[string]interface{}
// @Failure 503 {object} map[string]interface{}
// @Router /api/auth/apple [get]
func (h *AuthHandler) AppleLogin(c *gin.Context) {
	if h.appleOAuthService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Apple Sign-In not configured"})
		return
	}

	// Generate state token
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate state"})
		return
	}
	state := base64.URLEncoding.EncodeToString(b)

	// Store state in Redis with 10 minute expiry
	ctx := context.Background()
	if err := h.redis.Set(ctx, "oauth_state:"+state, "apple", 10*time.Minute).Err(); err != nil {
		log.Printf("Failed to store state: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initialize OAuth"})
		return
	}

	// Redirect to Apple
	authURL := h.appleOAuthService.GetAuthURL(state)
	c.Redirect(http.StatusSeeOther, authURL)
}

// AppleCallback handles OAuth callback from Apple
// @Summary Apple OAuth callback
// @Description Handles the OAuth callback from Apple Sign-In (supports form_post and query)
// @Tags auth
// @Accept application/x-www-form-urlencoded
// @Param state formData string false "OAuth state parameter"
// @Param code formData string false "Authorization code"
// @Param id_token formData string false "Apple ID token"
// @Success 303 {string} string "Redirect to frontend with exchange code"
// @Failure 303 {string} string "Redirect to frontend with error"
// @Router /api/auth/apple/callback [post]
func (h *AuthHandler) AppleCallback(c *gin.Context) {
	if h.appleOAuthService == nil {
		h.redirectWithError(c, "Apple Sign-In not configured")
		return
	}

	ctx := context.Background()

	// Apple uses form_post response mode
	state := c.PostForm("state")
	if state == "" {
		state = c.Query("state")
	}
	if state == "" {
		h.redirectWithError(c, "Missing state parameter")
		return
	}

	// Check state in Redis
	val, err := h.redis.Get(ctx, "oauth_state:"+state).Result()
	if err != nil || val != "apple" {
		h.redirectWithError(c, "Invalid or expired state")
		return
	}

	// Delete used state
	h.redis.Del(ctx, "oauth_state:"+state)

	// Get authorization code
	code := c.PostForm("code")
	if code == "" {
		code = c.Query("code")
	}

	// Get ID token directly (Apple sends it in form_post)
	idToken := c.PostForm("id_token")

	var appleUser *models.AppleUserInfo

	if idToken != "" {
		// Parse ID token directly
		appleUser, err = h.appleOAuthService.ValidateIDToken(idToken)
		if err != nil {
			log.Printf("Failed to validate ID token: %v", err)
			middleware.RecordLoginAttempt(false, "apple")
			h.redirectWithError(c, "Failed to validate Apple token")
			return
		}
	} else if code != "" {
		// Exchange code for token
		tokenResp, err := h.appleOAuthService.Exchange(ctx, code)
		if err != nil {
			log.Printf("Token exchange failed: %v", err)
			middleware.RecordLoginAttempt(false, "apple")
			h.redirectWithError(c, "Failed to exchange authorization code")
			return
		}

		// Validate ID token
		appleUser, err = h.appleOAuthService.ValidateIDToken(tokenResp.IDToken)
		if err != nil {
			log.Printf("Failed to validate ID token: %v", err)
			middleware.RecordLoginAttempt(false, "apple")
			h.redirectWithError(c, "Failed to validate Apple token")
			return
		}
	} else {
		middleware.RecordLoginAttempt(false, "apple")
		h.redirectWithError(c, "Missing authorization code or token")
		return
	}

	// Apple may send user info only on first login (form_post)
	if userName := c.PostForm("user"); userName != "" {
		var userInfo struct {
			Name struct {
				FirstName string `json:"firstName"`
				LastName  string `json:"lastName"`
			} `json:"name"`
		}
		if err := json.Unmarshal([]byte(userName), &userInfo); err == nil {
			appleUser.Name = userInfo.Name.FirstName
			if userInfo.Name.LastName != "" {
				appleUser.Name = userInfo.Name.FirstName + " " + userInfo.Name.LastName
			}
		}
	}

	// Find or create user
	user, err := h.userService.FindByAppleSub(appleUser.Sub)
	if err != nil {
		log.Printf("Failed to find user: %v", err)
		middleware.RecordLoginAttempt(false, "apple")
		h.redirectWithError(c, "Database error")
		return
	}

	if user == nil {
		// Check if user exists with same email (different provider)
		if appleUser.Email != "" {
			existingUser, err := h.userService.FindByEmail(appleUser.Email)
			if err == nil && existingUser != nil {
				// Store pending link request and redirect to identity verification
				pendingData := map[string]string{
					"provider":    "apple",
					"provider_id": appleUser.Sub,
					"user_id":     fmt.Sprintf("%d", existingUser.ID),
					"email":       appleUser.Email,
				}
				pendingJSON, _ := json.Marshal(pendingData)
				pendingKey := "pending_link:" + existingUser.GenID
				h.redis.Set(ctx, pendingKey, string(pendingJSON), 10*time.Minute)

				verifyURL := h.config.Public.URL + "/callback?pending_link=true&gen_id=" + existingUser.GenID
				c.Redirect(http.StatusSeeOther, verifyURL)
				return
			}
		}

		// Create new user if not found
		user, err = h.userService.CreateFromApple(appleUser)
		if err != nil {
			log.Printf("Failed to create user: %v", err)
			middleware.RecordLoginAttempt(false, "apple")
			h.redirectWithError(c, "Failed to create user")
			return
		}
		log.Printf("Created new user from Apple: %s (gen_id: %s)", user.Email, user.GenID)
	}

	// Update last login
	if err := h.userService.UpdateLastLogin(user.ID); err != nil {
		log.Printf("Failed to update last login: %v", err)
	}

	// Generate JWT
	jwtToken, err := h.jwtService.GenerateToken(user)
	if err != nil {
		log.Printf("Failed to generate JWT: %v", err)
		h.redirectWithError(c, "Failed to generate token")
		return
	}

	// Record login metric
	middleware.RecordLoginAttempt(true, "apple")

	// Log audit
	h.auditService.AddLog(user.ID, "login", map[string]interface{}{
		"method": "apple_oauth",
		"email":  user.Email,
	}, c.ClientIP(), c.Request.UserAgent())

	// Generate single-use exchange code instead of exposing token in URL
	exchangeCode, exchangeErr := h.generateTokenExchangeCode(jwtToken)
	if exchangeErr != nil {
		log.Printf("Failed to generate exchange code: %v", exchangeErr)
		h.redirectWithError(c, "Failed to generate login code")
		return
	}

	callbackURL := h.config.Public.URL + "/callback?code=" + exchangeCode
	c.Redirect(http.StatusSeeOther, callbackURL)
}

// Logout handles user logout by blacklisting the JWT token
// @Summary Logout
// @Description Logs out the user by blacklisting their JWT token
// @Tags auth
// @Produce json
// @Security BearerAuth
// @Success 200 {object} map[string]interface{}
// @Router /api/auth/logout [post]
func (h *AuthHandler) Logout(c *gin.Context) {
	claimsVal, exists := c.Get("claims")
	if !exists {
		c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
		return
	}

	claims := claimsVal.(*services.Claims)
	if err := h.jwtService.BlacklistToken(claims); err != nil {
		log.Printf("Failed to blacklist token: %v", err)
	}

	// Clear httpOnly cookie if set
	c.SetCookie("gerege_token", "", -1, "/", "", true, true)

	c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}

// Me returns the current user's information
// @Summary Get current user
// @Description Returns the authenticated user's profile information
// @Tags auth
// @Produce json
// @Security BearerAuth
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Router /api/auth/me [get]
func (h *AuthHandler) Me(c *gin.Context) {
	// Get claims from context (set by JWT middleware)
	claimsVal, exists := c.Get("claims")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	claims := claimsVal.(*services.Claims)

	// Find user by gen_id
	user, err := h.userService.FindByGenID(claims.Subject)
	if err != nil {
		log.Printf("Failed to find user: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user"})
		return
	}

	if user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Fetch DAN verification history
	danHistory, _ := h.userService.GetDanVerificationLogs(user.ID)

	// Build response
	response := models.UserResponse{
		GenID:    user.GenID,
		Email:    user.Email,
		Verified: user.Verified,
		Providers: map[string]bool{
			"google":   user.GoogleSub.Valid,
			"apple":    user.AppleSub.Valid,
			"facebook": user.FacebookID.Valid,
			"twitter":  user.TwitterID.Valid,
		},
		CreatedAt:  user.CreatedAt.Format(time.RFC3339),
		UpdatedAt:  user.UpdatedAt.Format(time.RFC3339),
		DanHistory: danHistory,
		Gerege: models.GeregeInfo{
			Verified: user.Verified,
		},
	}

	if len(danHistory) > 0 {
		response.DanVerifiedAt = danHistory[0].CreatedAt.Format(time.RFC3339)
	}

	if user.LastLoginAt.Valid {
		response.LastLoginAt = user.LastLoginAt.Time.Format(time.RFC3339)
	}

	if user.Picture.Valid {
		response.Picture = user.Picture.String
	}

	if user.Citizen != nil {
		response.Gerege.RegNo = user.Citizen.RegNo
		response.Gerege.FirstName = user.Citizen.FirstName
		if user.Citizen.FamilyName.Valid {
			response.Gerege.FamilyName = user.Citizen.FamilyName.String
		}
		if user.Citizen.LastName.Valid {
			response.Gerege.LastName = user.Citizen.LastName.String
		}
		if user.Citizen.BirthDate.Valid {
			response.Gerege.BirthDate = user.Citizen.BirthDate.String
		}
		if user.Citizen.Gender.Valid {
			response.Gerege.Gender = user.Citizen.Gender.String
		}
		// Build display name
		name := user.Citizen.FirstName
		if user.Citizen.LastName.Valid {
			name = user.Citizen.LastName.String + " " + user.Citizen.FirstName
		}
		response.Gerege.Name = name
	}

	c.JSON(http.StatusOK, response)
}

// VerifyIdentity handles identity verification with reg_no
// @Summary Verify identity
// @Description Verifies user identity by linking to citizen registry via reg_no
// @Tags auth
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body object true "Verify identity request" example({"reg_no":"AB12345678"})
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Router /api/auth/verify [post]
func (h *AuthHandler) VerifyIdentity(c *gin.Context) {
	claimsVal, exists := c.Get("claims")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	claims := claimsVal.(*services.Claims)

	// Parse request
	var req struct {
		RegNo string `json:"reg_no" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// Find user
	user, err := h.userService.FindByGenID(claims.Subject)
	if err != nil || user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Link to citizen
	if err := h.userService.LinkCitizen(user.ID, req.RegNo); err != nil {
		log.Printf("Failed to link citizen: %v", err)
		middleware.RecordIdentityVerification(false)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	middleware.RecordIdentityVerification(true)

	// Log DAN verification
	if err := h.userService.LogDanVerification(user.ID, req.RegNo, "reg_no"); err != nil {
		log.Printf("Failed to log DAN verification: %v", err)
	}

	// Log audit
	h.auditService.AddLog(user.ID, "identity_verified", map[string]interface{}{
		"reg_no": req.RegNo,
	}, c.ClientIP(), c.Request.UserAgent())

	c.JSON(http.StatusOK, gin.H{"message": "Identity verified successfully"})
}

// FacebookLogin initiates Facebook OAuth flow
// @Summary Facebook login
// @Description Initiates Facebook OAuth authentication flow
// @Tags auth
// @Success 303 {string} string "Redirect to Facebook"
// @Failure 500 {object} map[string]interface{}
// @Failure 503 {object} map[string]interface{}
// @Router /api/auth/facebook [get]
func (h *AuthHandler) FacebookLogin(c *gin.Context) {
	if h.facebookOAuthService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Facebook login not configured"})
		return
	}

	// Generate state token
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate state"})
		return
	}
	state := base64.URLEncoding.EncodeToString(b)

	// Store state in Redis with 10 minute expiry
	ctx := context.Background()
	if err := h.redis.Set(ctx, "oauth_state:"+state, "facebook", 10*time.Minute).Err(); err != nil {
		log.Printf("Failed to store state: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initialize OAuth"})
		return
	}

	// Redirect to Facebook
	authURL := h.facebookOAuthService.GetAuthURL(state)
	c.Redirect(http.StatusSeeOther, authURL)
}

// FacebookCallback handles OAuth callback from Facebook
// @Summary Facebook OAuth callback
// @Description Handles the OAuth2 callback from Facebook after user authentication
// @Tags auth
// @Param state query string true "OAuth state parameter"
// @Param code query string true "Authorization code"
// @Success 303 {string} string "Redirect to frontend with exchange code"
// @Failure 303 {string} string "Redirect to frontend with error"
// @Router /api/auth/facebook/callback [get]
func (h *AuthHandler) FacebookCallback(c *gin.Context) {
	if h.facebookOAuthService == nil {
		h.redirectWithError(c, "Facebook login not configured")
		return
	}

	ctx := context.Background()

	// Verify state
	state := c.Query("state")
	if state == "" {
		h.redirectWithError(c, "Missing state parameter")
		return
	}

	// Check state in Redis
	val, err := h.redis.Get(ctx, "oauth_state:"+state).Result()
	if err != nil || val != "facebook" {
		h.redirectWithError(c, "Invalid or expired state")
		return
	}

	// Delete used state
	h.redis.Del(ctx, "oauth_state:"+state)

	// Check for error from Facebook
	if errMsg := c.Query("error"); errMsg != "" {
		h.redirectWithError(c, "Facebook login failed: "+errMsg)
		return
	}

	// Get authorization code
	code := c.Query("code")
	if code == "" {
		h.redirectWithError(c, "Missing authorization code")
		return
	}

	// Exchange code for token
	tokenResp, err := h.facebookOAuthService.Exchange(ctx, code)
	if err != nil {
		log.Printf("Token exchange failed: %v", err)
		middleware.RecordLoginAttempt(false, "facebook")
		h.redirectWithError(c, "Failed to exchange authorization code")
		return
	}

	// Get user info from Facebook
	fbUser, err := h.facebookOAuthService.GetUserInfo(ctx, tokenResp.AccessToken)
	if err != nil {
		log.Printf("Failed to get user info: %v", err)
		middleware.RecordLoginAttempt(false, "facebook")
		h.redirectWithError(c, "Failed to get user information")
		return
	}

	// Find or create user
	user, err := h.userService.FindByFacebookID(fbUser.ID)
	if err != nil {
		log.Printf("Failed to find user: %v", err)
		middleware.RecordLoginAttempt(false, "facebook")
		h.redirectWithError(c, "Database error")
		return
	}

	if user == nil {
		// Check if user exists with same email (different provider)
		if fbUser.Email != "" {
			existingUser, err := h.userService.FindByEmail(fbUser.Email)
			if err == nil && existingUser != nil {
				// Store pending link request and redirect to identity verification
				pendingData := map[string]string{
					"provider":    "facebook",
					"provider_id": fbUser.ID,
					"user_id":     fmt.Sprintf("%d", existingUser.ID),
					"email":       fbUser.Email,
				}
				pendingJSON, _ := json.Marshal(pendingData)
				pendingKey := "pending_link:" + existingUser.GenID
				h.redis.Set(ctx, pendingKey, string(pendingJSON), 10*time.Minute)

				verifyURL := h.config.Public.URL + "/callback?pending_link=true&gen_id=" + existingUser.GenID
				c.Redirect(http.StatusSeeOther, verifyURL)
				return
			}
		}

		// Create new user if not found
		user, err = h.userService.CreateFromFacebook(fbUser)
		if err != nil {
			log.Printf("Failed to create user: %v", err)
			middleware.RecordLoginAttempt(false, "facebook")
			h.redirectWithError(c, "Failed to create user")
			return
		}
		log.Printf("Created new user from Facebook: %s (gen_id: %s)", user.Email, user.GenID)
	}

	// Update last login and picture
	if err := h.userService.UpdateLastLogin(user.ID); err != nil {
		log.Printf("Failed to update last login: %v", err)
	}
	if fbUser.Picture != "" && (!user.Picture.Valid || user.Picture.String != fbUser.Picture) {
		if err := h.userService.UpdatePicture(user.ID, fbUser.Picture); err != nil {
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
	middleware.RecordLoginAttempt(true, "facebook")

	// Log audit
	h.auditService.AddLog(user.ID, "login", map[string]interface{}{
		"method": "facebook_oauth",
		"email":  user.Email,
	}, c.ClientIP(), c.Request.UserAgent())

	// Generate single-use exchange code instead of exposing token in URL
	exchangeCode, exchangeErr := h.generateTokenExchangeCode(jwtToken)
	if exchangeErr != nil {
		log.Printf("Failed to generate exchange code: %v", exchangeErr)
		h.redirectWithError(c, "Failed to generate login code")
		return
	}

	callbackURL := h.config.Public.URL + "/callback?code=" + exchangeCode
	c.Redirect(http.StatusSeeOther, callbackURL)
}

// TwitterLogin initiates Twitter/X OAuth flow
// @Summary Twitter/X login
// @Description Initiates Twitter/X OAuth2 authentication flow with PKCE
// @Tags auth
// @Success 303 {string} string "Redirect to Twitter"
// @Failure 500 {object} map[string]interface{}
// @Failure 503 {object} map[string]interface{}
// @Router /api/auth/twitter [get]
func (h *AuthHandler) TwitterLogin(c *gin.Context) {
	if h.twitterOAuthService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Twitter login not configured"})
		return
	}

	// Generate state and code verifier for PKCE
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate state"})
		return
	}
	state := base64.URLEncoding.EncodeToString(b)

	// Generate code verifier (also used as code challenge with plain method)
	cv := make([]byte, 32)
	if _, err := rand.Read(cv); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate code verifier"})
		return
	}
	codeVerifier := base64.URLEncoding.EncodeToString(cv)

	// Store state and code verifier in Redis
	ctx := context.Background()
	if err := h.redis.Set(ctx, "oauth_state:"+state, "twitter:"+codeVerifier, 10*time.Minute).Err(); err != nil {
		log.Printf("Failed to store state: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initialize OAuth"})
		return
	}

	// Redirect to Twitter
	authURL := h.twitterOAuthService.GetAuthURL(state, codeVerifier)
	c.Redirect(http.StatusSeeOther, authURL)
}

// TwitterCallback handles OAuth callback from Twitter/X
// @Summary Twitter/X OAuth callback
// @Description Handles the OAuth2 callback from Twitter/X after user authentication
// @Tags auth
// @Param state query string true "OAuth state parameter"
// @Param code query string true "Authorization code"
// @Success 303 {string} string "Redirect to frontend with exchange code"
// @Failure 303 {string} string "Redirect to frontend with error"
// @Router /api/auth/twitter/callback [get]
func (h *AuthHandler) TwitterCallback(c *gin.Context) {
	if h.twitterOAuthService == nil {
		h.redirectWithError(c, "Twitter login not configured")
		return
	}

	ctx := context.Background()

	// Verify state
	state := c.Query("state")
	if state == "" {
		h.redirectWithError(c, "Missing state parameter")
		return
	}

	// Check state in Redis and get code verifier
	val, err := h.redis.Get(ctx, "oauth_state:"+state).Result()
	if err != nil || !strings.HasPrefix(val, "twitter:") {
		h.redirectWithError(c, "Invalid or expired state")
		return
	}
	codeVerifier := strings.TrimPrefix(val, "twitter:")

	// Delete used state
	h.redis.Del(ctx, "oauth_state:"+state)

	// Check for error from Twitter
	if errMsg := c.Query("error"); errMsg != "" {
		h.redirectWithError(c, "Twitter login failed: "+errMsg)
		return
	}

	// Get authorization code
	code := c.Query("code")
	if code == "" {
		h.redirectWithError(c, "Missing authorization code")
		return
	}

	// Exchange code for token
	tokenResp, err := h.twitterOAuthService.Exchange(ctx, code, codeVerifier)
	if err != nil {
		log.Printf("Token exchange failed: %v", err)
		middleware.RecordLoginAttempt(false, "twitter")
		h.redirectWithError(c, "Failed to exchange authorization code")
		return
	}

	// Get user info from Twitter
	twitterUser, err := h.twitterOAuthService.GetUserInfo(ctx, tokenResp.AccessToken)
	if err != nil {
		log.Printf("Failed to get user info: %v", err)
		middleware.RecordLoginAttempt(false, "twitter")
		h.redirectWithError(c, "Failed to get user information")
		return
	}

	// Find or create user
	user, err := h.userService.FindByTwitterID(twitterUser.ID)
	if err != nil {
		log.Printf("Failed to find user: %v", err)
		middleware.RecordLoginAttempt(false, "twitter")
		h.redirectWithError(c, "Database error")
		return
	}

	if user == nil {
		// Create new user
		user, err = h.userService.CreateFromTwitter(twitterUser)
		if err != nil {
			log.Printf("Failed to create user: %v", err)
			middleware.RecordLoginAttempt(false, "twitter")
			h.redirectWithError(c, "Failed to create user")
			return
		}
		log.Printf("Created new user from Twitter: @%s (gen_id: %s)", twitterUser.Username, user.GenID)
	}

	// Update last login and picture
	if err := h.userService.UpdateLastLogin(user.ID); err != nil {
		log.Printf("Failed to update last login: %v", err)
	}
	if twitterUser.ProfileImageURL != "" && (!user.Picture.Valid || user.Picture.String != twitterUser.ProfileImageURL) {
		if err := h.userService.UpdatePicture(user.ID, twitterUser.ProfileImageURL); err != nil {
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
	middleware.RecordLoginAttempt(true, "twitter")

	// Log audit
	h.auditService.AddLog(user.ID, "login", map[string]interface{}{
		"method":   "twitter_oauth",
		"username": twitterUser.Username,
	}, c.ClientIP(), c.Request.UserAgent())

	// Generate single-use exchange code instead of exposing token in URL
	exchangeCode, exchangeErr := h.generateTokenExchangeCode(jwtToken)
	if exchangeErr != nil {
		log.Printf("Failed to generate exchange code: %v", exchangeErr)
		h.redirectWithError(c, "Failed to generate login code")
		return
	}

	callbackURL := h.config.Public.URL + "/callback?code=" + exchangeCode
	c.Redirect(http.StatusSeeOther, callbackURL)
}

// DanLogin initiates DAN SSO flow
// @Summary DAN login
// @Description Initiates DAN (Цахим иргэний үнэмлэх) SSO authentication flow
// @Tags auth
// @Success 303 {string} string "Redirect to DAN SSO"
// @Router /api/auth/dan [get]
func (h *AuthHandler) DanLogin(c *gin.Context) {
	// Generate state token
	stateBytes, err := json.Marshal(map[string]string{
		"redirect_url": h.config.Public.URL + "/callback?dan_success=true",
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate state"})
		return
	}
	state := base64.RawURLEncoding.EncodeToString(stateBytes)

	// Build auth URL
	authURL := fmt.Sprintf(
		"https://sso.gov.mn/login?state=%s&grant_type=authorization_code&response_type=code&client_id=%s&scope=%s&redirect_uri=%s",
		state,
		h.config.Auth.DanClientID,
		h.config.Auth.DanScope,
		h.config.Auth.DanRedirectURL,
	)

	c.Redirect(http.StatusSeeOther, authURL)
}

// DanAuthorized handles the browser redirect from DAN SSO
// DAN redirects here with reg_no and state, then we redirect to the frontend
// @Summary DAN authorized redirect
// @Description Receives redirect from DAN SSO with reg_no and state, redirects to frontend
// @Tags auth
// @Param reg_no query string true "Citizen registration number"
// @Param state query string true "Base64 encoded state with redirect_url"
// @Success 303 {string} string "Redirect to frontend callback"
// @Failure 400 {object} map[string]interface{}
// @Router /api/auth/dan/authorized [get]
func (h *AuthHandler) DanAuthorized(c *gin.Context) {
	regNo := c.Query("reg_no")
	state := c.Query("state")

	if state == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing state"})
		return
	}

	// Decode state to get redirect_url
	stateBytes, err := base64.RawURLEncoding.DecodeString(state)
	if err != nil {
		log.Printf("Failed to decode DAN state: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid state"})
		return
	}

	var stateData map[string]string
	if err := json.Unmarshal(stateBytes, &stateData); err != nil {
		log.Printf("Failed to parse DAN state: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid state format"})
		return
	}

	redirectURL := stateData["redirect_url"]
	if redirectURL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing redirect_url in state"})
		return
	}

	// Append reg_no to redirect URL
	separator := "?"
	if strings.Contains(redirectURL, "?") {
		separator = "&"
	}
	finalURL := fmt.Sprintf("%s%sreg_no=%s", redirectURL, separator, url.QueryEscape(regNo))

	c.Redirect(http.StatusSeeOther, finalURL)
}

// DanCallback handles the frontend API call after DAN redirect
// @Summary DAN callback
// @Description Links citizen identity to user after DAN SSO verification
// @Tags auth
// @Produce json
// @Security BearerAuth
// @Param reg_no query string true "Citizen registration number"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Router /api/auth/dan/callback [get]
func (h *AuthHandler) DanCallback(c *gin.Context) {
	claimsVal, exists := c.Get("claims")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	claims := claimsVal.(*services.Claims)

	regNo := c.Query("reg_no")
	if regNo == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing reg_no"})
		return
	}

	// Find user
	user, err := h.userService.FindByGenID(claims.Subject)
	if err != nil || user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Link citizen
	if err := h.userService.LinkCitizen(user.ID, regNo); err != nil {
		log.Printf("Failed to link citizen: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Log DAN verification
	if err := h.userService.LogDanVerification(user.ID, regNo, "dan_sso"); err != nil {
		log.Printf("Failed to log DAN verification: %v", err)
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "DAN verification successful",
		"reg_no":  regNo,
	})
}

// ConfirmIdentityLink confirms identity and links a new provider to existing user.
// No JWT required - security is provided by the time-limited Redis pending_link entry
// plus the reg_no verification against the citizen database.
// @Summary Confirm identity link
// @Description Confirms identity and links a new OAuth provider to an existing user account
// @Tags auth
// @Accept json
// @Produce json
// @Param body body object true "Confirm link request" example({"gen_id":"abc","reg_no":"AB12345678"})
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Router /api/auth/confirm-link [post]
func (h *AuthHandler) ConfirmIdentityLink(c *gin.Context) {
	ctx := context.Background()

	var req struct {
		GenID string `json:"gen_id" binding:"required"`
		RegNo string `json:"reg_no" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// Check for pending link request (time-limited, single-use)
	pendingKey := "pending_link:" + req.GenID
	pendingJSON, err := h.redis.Get(ctx, pendingKey).Result()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No pending link request or expired"})
		return
	}

	var pendingData map[string]string
	if err := json.Unmarshal([]byte(pendingJSON), &pendingData); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid pending data"})
		return
	}

	// Find user
	user, err := h.userService.FindByGenID(req.GenID)
	if err != nil || user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// If user is not verified, link citizen first
	if !user.Verified {
		if err := h.userService.LinkCitizen(user.ID, req.RegNo); err != nil {
			log.Printf("Failed to link citizen: %v", err)
			middleware.RecordIdentityVerification(false)
			c.JSON(http.StatusBadRequest, gin.H{"error": "Identity verification failed: " + err.Error()})
			return
		}
		middleware.RecordIdentityVerification(true)
		// Reload user with citizen data
		user, _ = h.userService.FindByGenID(req.GenID)
	} else {
		// Verify reg_no matches existing citizen (case-insensitive)
		citizen, err := h.userService.FindCitizenByRegNo(req.RegNo)
		if err != nil || citizen == nil || (user.CitizenID.Valid && citizen.ID != user.CitizenID.Int64) {
			middleware.RecordIdentityVerification(false)
			c.JSON(http.StatusBadRequest, gin.H{"error": "Identity verification failed: reg_no does not match"})
			return
		}
	}

	// Link the new provider
	userID, _ := strconv.ParseInt(pendingData["user_id"], 10, 64)
	switch pendingData["provider"] {
	case "google":
		if err := h.userService.LinkGoogleSub(userID, pendingData["provider_id"]); err != nil {
			log.Printf("Failed to link Google account: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to link account"})
			return
		}
	case "apple":
		if err := h.userService.LinkAppleSub(userID, pendingData["provider_id"]); err != nil {
			log.Printf("Failed to link Apple account: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to link account"})
			return
		}
	case "facebook":
		if err := h.userService.LinkFacebookID(userID, pendingData["provider_id"]); err != nil {
			log.Printf("Failed to link Facebook account: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to link account"})
			return
		}
	case "twitter":
		if err := h.userService.LinkTwitterID(userID, pendingData["provider_id"]); err != nil {
			log.Printf("Failed to link Twitter account: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to link account"})
			return
		}
	}

	// Delete pending link request
	h.redis.Del(ctx, pendingKey)

	// Update last login
	h.userService.UpdateLastLogin(user.ID)

	// Generate JWT
	jwtToken, err := h.jwtService.GenerateToken(user)
	if err != nil {
		log.Printf("Failed to generate JWT: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	// Log audit
	h.auditService.AddLog(user.ID, "provider_linked", map[string]interface{}{
		"provider": pendingData["provider"],
		"email":    pendingData["email"],
	}, c.ClientIP(), c.Request.UserAgent())

	c.JSON(http.StatusOK, gin.H{
		"message": "Account linked successfully",
		"token":   jwtToken,
	})
}

// LoginActivity returns the user's login history and per-provider counts
// @Summary Get login activity
// @Description Returns the authenticated user's login history and provider login counts
// @Tags auth
// @Produce json
// @Security BearerAuth
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Router /api/auth/login-activity [get]
func (h *AuthHandler) LoginActivity(c *gin.Context) {
	claimsVal, exists := c.Get("claims")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	claims := claimsVal.(*services.Claims)

	user, err := h.userService.FindByGenID(claims.Subject)
	if err != nil || user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	logins, err := h.auditService.GetUserLoginActivity(user.ID)
	if err != nil {
		log.Printf("Failed to get login activity: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get login activity"})
		return
	}

	// Aggregate counts by method
	counts := make(map[string]int)
	for _, entry := range logins {
		var details map[string]interface{}
		if err := json.Unmarshal([]byte(entry.Details), &details); err == nil {
			if method, ok := details["method"].(string); ok {
				counts[method]++
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"logins": logins,
		"counts": counts,
	})
}
