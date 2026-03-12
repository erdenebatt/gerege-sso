package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	"gerege-sso/models"
	"gerege-sso/services"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

// SignHandler handles Gerege Sign endpoints
type SignHandler struct {
	gesignService   *services.GesignService
	pushAuthService *services.PushAuthService
	jwtService      *services.JWTService
	userService     *services.UserService
	wsHub           *services.WSHub
}

// NewSignHandler creates a new SignHandler
func NewSignHandler(
	gesignService *services.GesignService,
	pushAuthService *services.PushAuthService,
	jwtService *services.JWTService,
	userService *services.UserService,
	wsHub *services.WSHub,
) *SignHandler {
	return &SignHandler{
		gesignService:   gesignService,
		pushAuthService: pushAuthService,
		jwtService:      jwtService,
		userService:     userService,
		wsHub:           wsHub,
	}
}

func (h *SignHandler) getUserFromClaims(c *gin.Context) (int64, string, bool) {
	claimsVal, exists := c.Get("claims")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return 0, "", false
	}
	claims := claimsVal.(*services.Claims)

	user, err := h.userService.FindBySubject(claims.Subject)
	if err != nil || user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return 0, "", false
	}

	return user.ID, user.GenID, true
}

// CreateSignRequest creates a new signing session
// POST /api/sign/request
func (h *SignHandler) CreateSignRequest(c *gin.Context) {
	userID, _, ok := h.getUserFromClaims(c)
	if !ok {
		return
	}

	var req models.CreateSignRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}

	resp, err := h.gesignService.CreateSignRequest(
		userID, req.DocumentHash, req.HashAlgorithm, req.DocumentName,
		c.ClientIP(), c.GetHeader("User-Agent"),
	)
	if err != nil {
		log.Printf("Failed to create sign request: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create signing request"})
		return
	}

	// Send push notification to mobile
	mobileReq, err := h.pushAuthService.SendSignChallenge(userID, resp.SessionID, req.DocumentHash, req.DocumentName)
	if err != nil {
		log.Printf("Failed to send sign push challenge: %v", err)
		// Non-fatal: session still created, user can approve via other means
	} else {
		resp.ChallengeID = mobileReq.ChallengeID
	}

	c.JSON(http.StatusCreated, resp)
}

// GetSignStatus returns the status of a signing session
// GET /api/sign/status/:id
func (h *SignHandler) GetSignStatus(c *gin.Context) {
	_, _, ok := h.getUserFromClaims(c)
	if !ok {
		return
	}

	sessionID := c.Param("id")
	if sessionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Session ID required"})
		return
	}

	status, err := h.gesignService.GetSigningStatus(sessionID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Session not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"session_id": sessionID, "status": status})
}

// ApproveSign approves a signing session from mobile
// POST /api/sign/approve
func (h *SignHandler) ApproveSign(c *gin.Context) {
	userID, _, ok := h.getUserFromClaims(c)
	if !ok {
		return
	}

	var req struct {
		SessionID string `json:"session_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}

	if err := h.gesignService.ApproveSignRequest(req.SessionID, userID); err != nil {
		log.Printf("Failed to approve sign request: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "approved", "session_id": req.SessionID})
}

// DenySign denies a signing session from mobile
// POST /api/sign/deny
func (h *SignHandler) DenySign(c *gin.Context) {
	userID, _, ok := h.getUserFromClaims(c)
	if !ok {
		return
	}

	var req struct {
		SessionID string `json:"session_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}

	if err := h.gesignService.DenySignRequest(req.SessionID, userID); err != nil {
		log.Printf("Failed to deny sign request: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "denied", "session_id": req.SessionID})
}

// CompleteSign submits the actual signature for a session
// POST /api/sign/complete
func (h *SignHandler) CompleteSign(c *gin.Context) {
	_, _, ok := h.getUserFromClaims(c)
	if !ok {
		return
	}

	var req models.CompleteSignRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}

	if err := h.gesignService.CompleteSign(
		req.SessionID, req.Signature, req.CertificateID,
		c.ClientIP(), c.GetHeader("User-Agent"),
	); err != nil {
		log.Printf("Failed to complete sign: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "completed", "session_id": req.SessionID})
}

// VerifyDocument verifies a document by its hash (PUBLIC, no auth)
// POST /api/sign/verify
func (h *SignHandler) VerifyDocument(c *gin.Context) {
	var req models.VerifyDocumentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}

	resp, err := h.gesignService.VerifyDocument(req.DocumentHash)
	if err != nil {
		log.Printf("Failed to verify document: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify document"})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// GetCertificates returns a user's active certificates
// GET /api/sign/certificates
func (h *SignHandler) GetCertificates(c *gin.Context) {
	userID, _, ok := h.getUserFromClaims(c)
	if !ok {
		return
	}

	certs, err := h.gesignService.GetUserCertificates(userID)
	if err != nil {
		log.Printf("Failed to get certificates: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get certificates"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"certificates": certs})
}

// GetSignHistory returns a user's signing history
// GET /api/sign/history
func (h *SignHandler) GetSignHistory(c *gin.Context) {
	userID, _, ok := h.getUserFromClaims(c)
	if !ok {
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	logs, err := h.gesignService.GetSigningHistory(userID, limit, offset)
	if err != nil {
		log.Printf("Failed to get signing history: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get signing history"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"signing_logs": logs})
}

// SignWebSocket handles WebSocket connections for real-time signing session status
// GET /ws/sign/:id
func (h *SignHandler) SignWebSocket(c *gin.Context) {
	sessionID := c.Param("id")
	if sessionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Session ID required"})
		return
	}

	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true // Allow cross-origin for signing widget
		},
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}
	defer conn.Close()

	wsKey := "sign:" + sessionID
	h.wsHub.Register(wsKey, conn)
	defer h.wsHub.Unregister(wsKey, conn)

	// Send current status immediately
	status, err := h.gesignService.GetSigningStatus(sessionID)
	if err != nil {
		status = "unknown"
	}
	initialMsg, _ := json.Marshal(map[string]string{"status": status, "session_id": sessionID})
	conn.WriteMessage(websocket.TextMessage, initialMsg)

	// Keep connection alive, listen for close
	for {
		conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		_, _, err := conn.ReadMessage()
		if err != nil {
			break
		}
	}
}
