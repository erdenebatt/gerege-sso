package handlers

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
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
	middleware.RecordLoginAttempt(true, "google")

	// Log audit
	h.auditService.AddLog(user.ID, "login", map[string]interface{}{
		"method": "google_oauth",
		"email":  user.Email,
	}, c.ClientIP(), c.Request.UserAgent())

	// Redirect to callback page with token
	callbackURL := h.config.Public.URL + "/callback?token=" + jwtToken
	c.Redirect(http.StatusSeeOther, callbackURL)
}

// redirectWithError redirects to the frontend with an error message
func (h *AuthHandler) redirectWithError(c *gin.Context, message string) {
	c.Redirect(http.StatusSeeOther, h.config.Public.URL+"/?error="+message)
}

// AppleLogin initiates Apple Sign-In flow
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
		// Check if user exists with same email
		if appleUser.Email != "" {
			existingUser, err := h.userService.FindByEmail(appleUser.Email)
			if err == nil && existingUser != nil {
				// Link Apple account to existing user
				if err := h.userService.LinkAppleSub(existingUser.ID, appleUser.Sub); err != nil {
					log.Printf("Failed to link Apple account: %v", err)
				}
				user = existingUser
			}
		}

		// Create new user if not found
		if user == nil {
			user, err = h.userService.CreateFromApple(appleUser)
			if err != nil {
				log.Printf("Failed to create user: %v", err)
				middleware.RecordLoginAttempt(false, "apple")
				h.redirectWithError(c, "Failed to create user")
				return
			}
			log.Printf("Created new user from Apple: %s (gen_id: %s)", user.Email, user.GenID)
		}
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

	// Redirect to callback page with token
	callbackURL := h.config.Public.URL + "/callback?token=" + jwtToken
	c.Redirect(http.StatusSeeOther, callbackURL)
}

// Logout handles user logout
func (h *AuthHandler) Logout(c *gin.Context) {
	// In a stateless JWT system, logout is handled client-side
	// We can optionally blacklist the token in Redis
	c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}

// Me returns the current user's information
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

	// Build response
	response := models.UserResponse{
		GenID:    user.GenID,
		Email:    user.Email,
		Verified: user.Verified,
		Gerege: models.GeregeInfo{
			Verified: user.Verified,
		},
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
			response.Gerege.BirthDate = user.Citizen.BirthDate.Time.Format("2006-01-02")
		}
		if user.Citizen.Sex.Valid {
			response.Gerege.Gender = user.Citizen.Sex.String
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

	// Log audit
	h.auditService.AddLog(user.ID, "identity_verified", map[string]interface{}{
		"reg_no": req.RegNo,
	}, c.ClientIP(), c.Request.UserAgent())

	c.JSON(http.StatusOK, gin.H{"message": "Identity verified successfully"})
}

// FacebookLogin initiates Facebook OAuth flow
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
		// Check if user exists with same email
		if fbUser.Email != "" {
			existingUser, err := h.userService.FindByEmail(fbUser.Email)
			if err == nil && existingUser != nil {
				// Link Facebook account to existing user
				if err := h.userService.LinkFacebookID(existingUser.ID, fbUser.ID); err != nil {
					log.Printf("Failed to link Facebook account: %v", err)
				}
				user = existingUser
			}
		}

		// Create new user if not found
		if user == nil {
			user, err = h.userService.CreateFromFacebook(fbUser)
			if err != nil {
				log.Printf("Failed to create user: %v", err)
				middleware.RecordLoginAttempt(false, "facebook")
				h.redirectWithError(c, "Failed to create user")
				return
			}
			log.Printf("Created new user from Facebook: %s (gen_id: %s)", user.Email, user.GenID)
		}
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
	middleware.RecordLoginAttempt(true, "facebook")

	// Log audit
	h.auditService.AddLog(user.ID, "login", map[string]interface{}{
		"method": "facebook_oauth",
		"email":  user.Email,
	}, c.ClientIP(), c.Request.UserAgent())

	// Redirect to callback page with token
	callbackURL := h.config.Public.URL + "/callback?token=" + jwtToken
	c.Redirect(http.StatusSeeOther, callbackURL)
}

// TwitterLogin initiates Twitter/X OAuth flow
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
	middleware.RecordLoginAttempt(true, "twitter")

	// Log audit
	h.auditService.AddLog(user.ID, "login", map[string]interface{}{
		"method":   "twitter_oauth",
		"username": twitterUser.Username,
	}, c.ClientIP(), c.Request.UserAgent())

	// Redirect to callback page with token
	callbackURL := h.config.Public.URL + "/callback?token=" + jwtToken
	c.Redirect(http.StatusSeeOther, callbackURL)
}

// ConfirmIdentityLink confirms identity and links a new provider to existing user
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

	// Check for pending link request
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
		// Verify reg_no matches existing citizen
		if user.Citizen == nil || user.Citizen.RegNo != req.RegNo {
			// Also check with Latin to Cyrillic conversion
			citizen, err := h.userService.FindCitizenByRegNo(req.RegNo)
			if err != nil || citizen == nil || (user.CitizenID.Valid && citizen.ID != user.CitizenID.Int64) {
				middleware.RecordIdentityVerification(false)
				c.JSON(http.StatusBadRequest, gin.H{"error": "Identity verification failed: reg_no does not match"})
				return
			}
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
