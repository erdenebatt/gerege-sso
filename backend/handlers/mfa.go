package handlers

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"

	"gerege-sso/services"

	"github.com/gin-gonic/gin"
	"github.com/go-webauthn/webauthn/protocol"
	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/gorilla/websocket"
	"github.com/redis/go-redis/v9"
)

// MFAHandler handles MFA-related endpoints
type MFAHandler struct {
	totpService        *services.TOTPService
	passkeyService     *services.PasskeyService
	pushAuthService    *services.PushAuthService
	qrLoginService     *services.QRLoginService
	recoveryService    *services.RecoveryService
	mfaSettingsService *services.MFASettingsService
	mfaAuditService    *services.MFAAuditService
	jwtService         *services.JWTService
	userService        *services.UserService
	wsHub              *services.WSHub
	redis              *redis.Client
	allowedOrigins     map[string]bool
}

// NewMFAHandler creates a new MFAHandler
func NewMFAHandler(
	totpService *services.TOTPService,
	passkeyService *services.PasskeyService,
	pushAuthService *services.PushAuthService,
	qrLoginService *services.QRLoginService,
	recoveryService *services.RecoveryService,
	mfaSettingsService *services.MFASettingsService,
	mfaAuditService *services.MFAAuditService,
	jwtService *services.JWTService,
	userService *services.UserService,
	wsHub *services.WSHub,
	rdb *redis.Client,
	allowedOrigins []string,
) *MFAHandler {
	origins := make(map[string]bool, len(allowedOrigins))
	for _, o := range allowedOrigins {
		origins[o] = true
	}
	return &MFAHandler{
		totpService:        totpService,
		passkeyService:     passkeyService,
		pushAuthService:    pushAuthService,
		qrLoginService:     qrLoginService,
		recoveryService:    recoveryService,
		mfaSettingsService: mfaSettingsService,
		mfaAuditService:    mfaAuditService,
		jwtService:         jwtService,
		userService:        userService,
		wsHub:              wsHub,
		redis:              rdb,
		allowedOrigins:     origins,
	}
}

// --- Helper: extract user from JWT claims ---

func (h *MFAHandler) getUserFromClaims(c *gin.Context) (int64, string, string, bool) {
	claimsVal, exists := c.Get("claims")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return 0, "", "", false
	}
	claims := claimsVal.(*services.Claims)

	user, err := h.userService.FindBySubject(claims.Subject)
	if err != nil || user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return 0, "", "", false
	}

	return user.ID, user.GenID, user.Email, true
}

// ============================================================
// TOTP Endpoints
// ============================================================

// SetupTOTP initiates TOTP setup and returns QR code + secret
func (h *MFAHandler) SetupTOTP(c *gin.Context) {
	userID, _, email, ok := h.getUserFromClaims(c)
	if !ok {
		return
	}

	resp, err := h.totpService.SetupTOTP(userID, email)
	if err != nil {
		log.Printf("Failed to setup TOTP: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to setup TOTP"})
		return
	}

	h.mfaAuditService.Log(userID, "totp_setup_started", "totp", true, c.ClientIP(), c.Request.UserAgent(), nil)

	c.JSON(http.StatusOK, resp)
}

// VerifyTOTPSetup verifies the TOTP code during setup and enables TOTP
func (h *MFAHandler) VerifyTOTPSetup(c *gin.Context) {
	userID, _, _, ok := h.getUserFromClaims(c)
	if !ok {
		return
	}

	var req struct {
		Code string `json:"code" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	if err := h.totpService.VerifyTOTPSetup(userID, req.Code); err != nil {
		h.mfaAuditService.Log(userID, "totp_setup_failed", "totp", false, c.ClientIP(), c.Request.UserAgent(), nil)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Generate recovery codes
	codes, err := h.recoveryService.GenerateCodes(userID)
	if err != nil {
		log.Printf("Failed to generate recovery codes: %v", err)
	}

	h.mfaAuditService.Log(userID, "totp_enabled", "totp", true, c.ClientIP(), c.Request.UserAgent(), nil)

	c.JSON(http.StatusOK, gin.H{
		"message":        "TOTP enabled successfully",
		"recovery_codes": codes,
	})
}

// ValidateTOTP validates a TOTP code during login (MFA challenge)
func (h *MFAHandler) ValidateTOTP(c *gin.Context) {
	claimsVal, exists := c.Get("claims")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	claims := claimsVal.(*services.Claims)

	var req struct {
		Code string `json:"code" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	user, err := h.userService.FindBySubject(claims.Subject)
	if err != nil || user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	valid, err := h.totpService.ValidateTOTP(user.ID, req.Code)
	if err != nil {
		log.Printf("TOTP validation error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Validation failed"})
		return
	}

	if !valid {
		h.mfaAuditService.Log(user.ID, "totp_validate_failed", "totp", false, c.ClientIP(), c.Request.UserAgent(), nil)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid TOTP code"})
		return
	}

	// Generate full JWT (MFA verified)
	fullToken, err := h.jwtService.GenerateToken(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	h.mfaAuditService.Log(user.ID, "mfa_verified", "totp", true, c.ClientIP(), c.Request.UserAgent(), nil)

	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie("gerege_token", fullToken, int(h.jwtService.GetExpiry().Seconds()), "/", "", true, true)

	c.JSON(http.StatusOK, gin.H{
		"message": "MFA verification successful",
		"token":   fullToken,
	})
}

// DisableTOTP disables TOTP for the user
func (h *MFAHandler) DisableTOTP(c *gin.Context) {
	userID, _, _, ok := h.getUserFromClaims(c)
	if !ok {
		return
	}

	if err := h.totpService.DisableTOTP(userID); err != nil {
		log.Printf("Failed to disable TOTP: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to disable TOTP"})
		return
	}

	h.mfaAuditService.Log(userID, "totp_disabled", "totp", true, c.ClientIP(), c.Request.UserAgent(), nil)

	c.JSON(http.StatusOK, gin.H{"message": "TOTP disabled successfully"})
}

// ============================================================
// Passkey Endpoints
// ============================================================

// PasskeyRegisterBegin starts passkey registration
func (h *MFAHandler) PasskeyRegisterBegin(c *gin.Context) {
	if h.passkeyService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Passkey not configured"})
		return
	}

	userID, genID, email, ok := h.getUserFromClaims(c)
	if !ok {
		return
	}

	options, session, err := h.passkeyService.BeginRegistration(userID, genID, email)
	if err != nil {
		log.Printf("Failed to begin passkey registration: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to begin registration"})
		return
	}

	// Store session in Redis
	sessionJSON, _ := json.Marshal(session)
	h.redis.Set(c.Request.Context(), "webauthn_reg:"+genID, string(sessionJSON), 300*1e9) // 5 min

	c.JSON(http.StatusOK, options)
}

// PasskeyRegisterFinish completes passkey registration
func (h *MFAHandler) PasskeyRegisterFinish(c *gin.Context) {
	if h.passkeyService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Passkey not configured"})
		return
	}

	userID, genID, email, ok := h.getUserFromClaims(c)
	if !ok {
		return
	}

	// Get session from Redis
	sessionJSON, err := h.redis.Get(c.Request.Context(), "webauthn_reg:"+genID).Result()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Registration session expired"})
		return
	}
	h.redis.Del(c.Request.Context(), "webauthn_reg:"+genID)

	var session webauthn.SessionData
	if err := json.Unmarshal([]byte(sessionJSON), &session); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid session data"})
		return
	}

	// Parse the credential creation response
	response, err := protocol.ParseCredentialCreationResponseBody(c.Request.Body)
	if err != nil {
		log.Printf("Failed to parse credential creation response: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid credential response"})
		return
	}

	if err := h.passkeyService.FinishRegistration(userID, genID, email, &session, response); err != nil {
		log.Printf("Failed to finish passkey registration: %v", err)
		h.mfaAuditService.Log(userID, "passkey_register_failed", "passkey", false, c.ClientIP(), c.Request.UserAgent(), nil)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to register passkey"})
		return
	}

	h.mfaAuditService.Log(userID, "passkey_registered", "passkey", true, c.ClientIP(), c.Request.UserAgent(), nil)

	c.JSON(http.StatusOK, gin.H{"message": "Passkey registered successfully"})
}

// PasskeyAuthBegin starts passkey authentication (login)
func (h *MFAHandler) PasskeyAuthBegin(c *gin.Context) {
	if h.passkeyService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Passkey not configured"})
		return
	}

	// For MFA challenge, user is in temp token context
	claimsVal, exists := c.Get("claims")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	claims := claimsVal.(*services.Claims)

	user, err := h.userService.FindBySubject(claims.Subject)
	if err != nil || user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	options, session, err := h.passkeyService.BeginAuthentication(user.ID, user.GenID, user.Email)
	if err != nil {
		log.Printf("Failed to begin passkey auth: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	sessionJSON, _ := json.Marshal(session)
	h.redis.Set(c.Request.Context(), "webauthn_auth:"+user.GenID, string(sessionJSON), 300*1e9)

	c.JSON(http.StatusOK, options)
}

// PasskeyAuthFinish completes passkey authentication (login)
func (h *MFAHandler) PasskeyAuthFinish(c *gin.Context) {
	if h.passkeyService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Passkey not configured"})
		return
	}

	claimsVal, exists := c.Get("claims")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	claims := claimsVal.(*services.Claims)

	user, err := h.userService.FindBySubject(claims.Subject)
	if err != nil || user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	sessionJSON, err := h.redis.Get(c.Request.Context(), "webauthn_auth:"+user.GenID).Result()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Authentication session expired"})
		return
	}
	h.redis.Del(c.Request.Context(), "webauthn_auth:"+user.GenID)

	var session webauthn.SessionData
	if err := json.Unmarshal([]byte(sessionJSON), &session); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid session data"})
		return
	}

	response, err := protocol.ParseCredentialRequestResponseBody(c.Request.Body)
	if err != nil {
		log.Printf("Passkey parse response failed: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid credential response"})
		return
	}

	if err := h.passkeyService.FinishAuthentication(user.ID, user.GenID, user.Email, &session, response); err != nil {
		log.Printf("Passkey auth failed for user %d: %v", user.ID, err)
		h.mfaAuditService.Log(user.ID, "passkey_auth_failed", "passkey", false, c.ClientIP(), c.Request.UserAgent(), nil)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Passkey authentication failed"})
		return
	}

	// Generate full JWT
	fullToken, err := h.jwtService.GenerateToken(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	h.mfaAuditService.Log(user.ID, "mfa_verified", "passkey", true, c.ClientIP(), c.Request.UserAgent(), nil)

	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie("gerege_token", fullToken, int(h.jwtService.GetExpiry().Seconds()), "/", "", true, true)

	c.JSON(http.StatusOK, gin.H{
		"message": "MFA verification successful",
		"token":   fullToken,
	})
}

// ListPasskeys returns user's registered passkeys
func (h *MFAHandler) ListPasskeys(c *gin.Context) {
	if h.passkeyService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Passkey not configured"})
		return
	}

	userID, _, _, ok := h.getUserFromClaims(c)
	if !ok {
		return
	}

	passkeys, err := h.passkeyService.ListPasskeys(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list passkeys"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"passkeys": passkeys})
}

// DeletePasskey removes a passkey
func (h *MFAHandler) DeletePasskey(c *gin.Context) {
	if h.passkeyService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Passkey not configured"})
		return
	}

	userID, _, _, ok := h.getUserFromClaims(c)
	if !ok {
		return
	}

	credID := c.Param("id")
	if credID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing credential ID"})
		return
	}

	if err := h.passkeyService.DeletePasskey(userID, credID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	h.mfaAuditService.Log(userID, "passkey_deleted", "passkey", true, c.ClientIP(), c.Request.UserAgent(), nil)

	c.JSON(http.StatusOK, gin.H{"message": "Passkey deleted successfully"})
}

// ============================================================
// Passwordless Passkey Login (Public — no JWT required)
// ============================================================

// PasskeyLoginBegin starts a passwordless passkey login (discoverable credentials)
func (h *MFAHandler) PasskeyLoginBegin(c *gin.Context) {
	if h.passkeyService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Passkey not configured"})
		return
	}

	options, session, err := h.passkeyService.BeginDiscoverableLogin()
	if err != nil {
		log.Printf("Failed to begin passkey login: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to begin passkey login"})
		return
	}

	// Store session with random key
	keyBytes := make([]byte, 16)
	rand.Read(keyBytes)
	sessionKey := hex.EncodeToString(keyBytes)

	sessionJSON, _ := json.Marshal(session)
	h.redis.Set(c.Request.Context(), "webauthn_login:"+sessionKey, string(sessionJSON), 300*1e9)

	c.JSON(http.StatusOK, gin.H{
		"publicKey":   options.Response,
		"session_key": sessionKey,
	})
}

// PasskeyLoginFinish completes a passwordless passkey login
func (h *MFAHandler) PasskeyLoginFinish(c *gin.Context) {
	if h.passkeyService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Passkey not configured"})
		return
	}

	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read request"})
		return
	}

	var envelope struct {
		SessionKey string `json:"session_key"`
	}
	if err := json.Unmarshal(body, &envelope); err != nil || envelope.SessionKey == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing session_key"})
		return
	}

	sessionJSON, err := h.redis.Get(c.Request.Context(), "webauthn_login:"+envelope.SessionKey).Result()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Login session expired"})
		return
	}
	h.redis.Del(c.Request.Context(), "webauthn_login:"+envelope.SessionKey)

	var session webauthn.SessionData
	if err := json.Unmarshal([]byte(sessionJSON), &session); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid session data"})
		return
	}

	response, err := protocol.ParseCredentialRequestResponseBody(bytes.NewReader(body))
	if err != nil {
		log.Printf("Passkey login parse response failed: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid credential response"})
		return
	}

	findUser := func(rawID, userHandle []byte) (int64, string, string, error) {
		genID := string(userHandle)
		user, err := h.userService.FindByGenID(genID)
		if err != nil || user == nil {
			return 0, "", "", fmt.Errorf("user not found")
		}
		return user.ID, user.GenID, user.Email, nil
	}

	userID, err := h.passkeyService.FinishDiscoverableLogin(&session, response, findUser)
	if err != nil {
		log.Printf("Passkey login failed: %v", err)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Passkey authentication failed"})
		return
	}

	user, err := h.userService.FindByID(userID)
	if err != nil || user == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to find user"})
		return
	}

	fullToken, err := h.jwtService.GenerateToken(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	h.mfaAuditService.Log(userID, "passkey_login", "passkey", true, c.ClientIP(), c.Request.UserAgent(), nil)

	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie("gerege_token", fullToken, int(h.jwtService.GetExpiry().Seconds()), "/", "", true, true)

	c.JSON(http.StatusOK, gin.H{
		"message": "Passkey login successful",
		"token":   fullToken,
	})
}

// ============================================================
// Push Auth Endpoints
// ============================================================

// RegisterDevice registers a device for push notifications
func (h *MFAHandler) RegisterDevice(c *gin.Context) {
	userID, _, _, ok := h.getUserFromClaims(c)
	if !ok {
		return
	}

	var req struct {
		Token      string `json:"token" binding:"required"`
		DeviceName string `json:"device_name" binding:"required"`
		DeviceType string `json:"device_type" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	device, err := h.pushAuthService.RegisterDevice(userID, req.Token, req.DeviceName, req.DeviceType)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	h.mfaAuditService.Log(userID, "device_registered", "push", true, c.ClientIP(), c.Request.UserAgent(), nil)

	c.JSON(http.StatusOK, device)
}

// SendPushChallenge sends a push notification challenge
func (h *MFAHandler) SendPushChallenge(c *gin.Context) {
	claimsVal, exists := c.Get("claims")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	claims := claimsVal.(*services.Claims)

	user, err := h.userService.FindBySubject(claims.Subject)
	if err != nil || user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	resp, err := h.pushAuthService.SendChallenge(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send push challenge"})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// RespondPushChallenge handles approve/deny from mobile
func (h *MFAHandler) RespondPushChallenge(c *gin.Context) {
	var req struct {
		ChallengeID string `json:"challenge_id" binding:"required"`
		Action      string `json:"action" binding:"required"` // "approve" | "deny"
		NumberMatch int    `json:"number_match"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	if req.Action == "deny" {
		if err := h.pushAuthService.DenyChallenge(req.ChallengeID); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Challenge denied"})
		return
	}

	userID, err := h.pushAuthService.ApproveChallenge(req.ChallengeID, req.NumberMatch)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	h.mfaAuditService.Log(userID, "mfa_verified", "push", true, c.ClientIP(), c.Request.UserAgent(), nil)

	c.JSON(http.StatusOK, gin.H{"message": "Challenge approved"})
}

// GetPushChallengeStatus returns the status of a push challenge
func (h *MFAHandler) GetPushChallengeStatus(c *gin.Context) {
	challengeID := c.Param("id")
	if challengeID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing challenge ID"})
		return
	}

	status, userID, err := h.pushAuthService.GetChallengeStatus(challengeID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get status"})
		return
	}

	response := gin.H{"status": status}

	if status == "approved" && userID > 0 {
		// Generate full JWT for the approved user
		user, err := h.userService.FindByID(userID)
		if err == nil && user != nil {
			fullToken, err := h.jwtService.GenerateToken(user)
			if err == nil {
				response["token"] = fullToken
			}
		}
	}

	c.JSON(http.StatusOK, response)
}

// ============================================================
// QR Login Endpoints
// ============================================================

// GenerateQR creates a new QR login session
func (h *MFAHandler) GenerateQR(c *gin.Context) {
	resp, err := h.qrLoginService.GenerateSession(c.ClientIP(), c.Request.UserAgent())
	if err != nil {
		log.Printf("Failed to generate QR session: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate QR code"})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// ApproveQR approves a QR login session (called from mobile with JWT)
func (h *MFAHandler) ApproveQR(c *gin.Context) {
	userID, _, _, ok := h.getUserFromClaims(c)
	if !ok {
		return
	}

	var req struct {
		SessionID string `json:"session_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	if err := h.qrLoginService.ApproveSession(req.SessionID, userID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	h.mfaAuditService.Log(userID, "qr_login_approved", "qr", true, c.ClientIP(), c.Request.UserAgent(), nil)

	c.JSON(http.StatusOK, gin.H{"message": "QR login approved"})
}

// GetQRStatus returns the status of a QR login session (polling)
func (h *MFAHandler) GetQRStatus(c *gin.Context) {
	sessionID := c.Param("id")
	if sessionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing session ID"})
		return
	}

	status, userID, err := h.qrLoginService.GetSessionStatus(sessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get status"})
		return
	}

	response := gin.H{"status": status}

	if status == "approved" && userID > 0 {
		user, err := h.userService.FindByID(userID)
		if err == nil && user != nil {
			fullToken, err := h.jwtService.GenerateToken(user)
			if err == nil {
				response["token"] = fullToken
			}
		}
	}

	c.JSON(http.StatusOK, response)
}

// QRWebSocket handles WebSocket connections for real-time QR status
func (h *MFAHandler) QRWebSocket(c *gin.Context) {
	sessionID := c.Param("id")
	if sessionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing session ID"})
		return
	}

	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			origin := r.Header.Get("Origin")
			return origin == "" || h.allowedOrigins[origin]
		},
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}
	defer conn.Close()

	h.wsHub.Register(sessionID, conn)
	defer h.wsHub.Unregister(sessionID, conn)

	// Keep connection alive, read messages to detect close
	for {
		if _, _, err := conn.ReadMessage(); err != nil {
			break
		}
	}
}

// QRMarkScanned marks a QR session as scanned (called when mobile opens the QR URL)
func (h *MFAHandler) QRMarkScanned(c *gin.Context) {
	var req struct {
		SessionID string `json:"session_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	if err := h.qrLoginService.MarkScanned(req.SessionID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Session marked as scanned"})
}

// ============================================================
// Recovery Endpoints
// ============================================================

// GetRecoveryCodes returns masked recovery codes
func (h *MFAHandler) GetRecoveryCodes(c *gin.Context) {
	userID, _, _, ok := h.getUserFromClaims(c)
	if !ok {
		return
	}

	remaining, err := h.recoveryService.GetRemainingCount(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get recovery codes"})
		return
	}

	codes, err := h.recoveryService.GetCodes(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get recovery codes"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"codes":     codes,
		"remaining": remaining,
		"total":     len(codes),
	})
}

// RegenerateCodes generates new recovery codes
func (h *MFAHandler) RegenerateCodes(c *gin.Context) {
	userID, _, _, ok := h.getUserFromClaims(c)
	if !ok {
		return
	}

	codes, err := h.recoveryService.GenerateCodes(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to regenerate codes"})
		return
	}

	h.mfaAuditService.Log(userID, "recovery_codes_regenerated", "", true, c.ClientIP(), c.Request.UserAgent(), nil)

	c.JSON(http.StatusOK, codes)
}

// ValidateRecovery validates a recovery code during MFA challenge
func (h *MFAHandler) ValidateRecovery(c *gin.Context) {
	claimsVal, exists := c.Get("claims")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	claims := claimsVal.(*services.Claims)

	var req struct {
		Code string `json:"code" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	user, err := h.userService.FindBySubject(claims.Subject)
	if err != nil || user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	valid, err := h.recoveryService.ValidateCode(user.ID, req.Code)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Validation failed"})
		return
	}

	if !valid {
		h.mfaAuditService.Log(user.ID, "recovery_code_failed", "recovery", false, c.ClientIP(), c.Request.UserAgent(), nil)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid recovery code"})
		return
	}

	// Generate full JWT
	fullToken, err := h.jwtService.GenerateToken(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	remaining, _ := h.recoveryService.GetRemainingCount(user.ID)
	h.mfaAuditService.Log(user.ID, "mfa_verified", "recovery", true, c.ClientIP(), c.Request.UserAgent(), map[string]interface{}{
		"remaining_codes": remaining,
	})

	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie("gerege_token", fullToken, int(h.jwtService.GetExpiry().Seconds()), "/", "", true, true)

	c.JSON(http.StatusOK, gin.H{
		"message":         "MFA verification successful",
		"token":           fullToken,
		"remaining_codes": remaining,
	})
}

// ============================================================
// MFA Settings Endpoints
// ============================================================

// GetMFASettings returns the user's MFA settings
func (h *MFAHandler) GetMFASettings(c *gin.Context) {
	userID, _, _, ok := h.getUserFromClaims(c)
	if !ok {
		return
	}

	settings, err := h.mfaSettingsService.GetSettings(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get MFA settings"})
		return
	}

	c.JSON(http.StatusOK, settings)
}

// UpdateMFASettings updates the user's MFA preferred method
func (h *MFAHandler) UpdateMFASettings(c *gin.Context) {
	userID, _, _, ok := h.getUserFromClaims(c)
	if !ok {
		return
	}

	var req struct {
		PreferredMethod string `json:"preferred_method" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	if err := h.mfaSettingsService.UpdatePreferredMethod(userID, req.PreferredMethod); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Settings updated"})
}

// ============================================================
// Device Endpoints
// ============================================================

// ListDevices returns the user's registered devices
func (h *MFAHandler) ListDevices(c *gin.Context) {
	userID, _, _, ok := h.getUserFromClaims(c)
	if !ok {
		return
	}

	devices, err := h.pushAuthService.ListDevices(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list devices"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"devices": devices})
}

// RemoveDevice removes a registered device
func (h *MFAHandler) RemoveDevice(c *gin.Context) {
	userID, _, _, ok := h.getUserFromClaims(c)
	if !ok {
		return
	}

	deviceID := c.Param("id")
	if deviceID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing device ID"})
		return
	}

	if err := h.pushAuthService.RemoveDevice(userID, deviceID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	h.mfaAuditService.Log(userID, "device_removed", "push", true, c.ClientIP(), c.Request.UserAgent(), nil)

	c.JSON(http.StatusOK, gin.H{"message": "Device removed successfully"})
}
