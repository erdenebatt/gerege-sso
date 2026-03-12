package handlers

import (
	"log"
	"net/http"

	"gerege-sso/models"
	"gerege-sso/services"

	"github.com/gin-gonic/gin"
)

// EIDHandler handles Gerege e-ID endpoints
type EIDHandler struct {
	eidService  *services.EIDService
	jwtService  *services.JWTService
	userService *services.UserService
}

// NewEIDHandler creates a new EIDHandler
func NewEIDHandler(
	eidService *services.EIDService,
	jwtService *services.JWTService,
	userService *services.UserService,
) *EIDHandler {
	return &EIDHandler{
		eidService:  eidService,
		jwtService:  jwtService,
		userService: userService,
	}
}

func (h *EIDHandler) getUserFromClaims(c *gin.Context) (int64, bool) {
	claimsVal, exists := c.Get("claims")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return 0, false
	}
	claims := claimsVal.(*services.Claims)

	user, err := h.userService.FindBySubject(claims.Subject)
	if err != nil || user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return 0, false
	}

	return user.ID, true
}

// VerifyEID links an e-ID card to the user's citizen record
// POST /api/eid/verify
func (h *EIDHandler) VerifyEID(c *gin.Context) {
	userID, ok := h.getUserFromClaims(c)
	if !ok {
		return
	}

	var req models.EIDVerifyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}

	if err := h.eidService.VerifyEID(userID, &req); err != nil {
		log.Printf("Failed to verify e-ID: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "e-ID verified successfully", "verification_level": 4})
}

// GetEIDStatus returns the e-ID verification status
// GET /api/eid/status
func (h *EIDHandler) GetEIDStatus(c *gin.Context) {
	userID, ok := h.getUserFromClaims(c)
	if !ok {
		return
	}

	status, err := h.eidService.GetEIDStatus(userID)
	if err != nil {
		log.Printf("Failed to get e-ID status: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get e-ID status"})
		return
	}

	c.JSON(http.StatusOK, status)
}

// RegisterCard registers a new e-ID card in the registry
// POST /api/eid/cards
func (h *EIDHandler) RegisterCard(c *gin.Context) {
	userID, ok := h.getUserFromClaims(c)
	if !ok {
		return
	}

	var req models.RegisterCardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}

	card, err := h.eidService.RegisterCard(
		req.CitizenID, req.CardNumber, req.CertificateSerial,
		req.ExpiryDate, req.IssuingAuthority, userID, c.ClientIP(),
	)
	if err != nil {
		log.Printf("Failed to register card: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, card)
}

// GetCard returns card details by card number
// GET /api/eid/cards/:number
func (h *EIDHandler) GetCard(c *gin.Context) {
	_, ok := h.getUserFromClaims(c)
	if !ok {
		return
	}

	cardNumber := c.Param("number")
	if cardNumber == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Card number required"})
		return
	}

	card, err := h.eidService.GetCard(cardNumber)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, card)
}

// RevokeCard revokes an e-ID card
// POST /api/eid/cards/revoke
func (h *EIDHandler) RevokeCard(c *gin.Context) {
	userID, ok := h.getUserFromClaims(c)
	if !ok {
		return
	}

	var req models.RevokeCardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}

	if err := h.eidService.RevokeCard(req.CardNumber, req.Reason, userID, c.ClientIP()); err != nil {
		log.Printf("Failed to revoke card: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Card revoked successfully"})
}

// GetCardHistory returns the audit log for a card
// GET /api/eid/cards/:number/history
func (h *EIDHandler) GetCardHistory(c *gin.Context) {
	_, ok := h.getUserFromClaims(c)
	if !ok {
		return
	}

	cardNumber := c.Param("number")
	if cardNumber == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Card number required"})
		return
	}

	logs, err := h.eidService.GetCardHistory(cardNumber)
	if err != nil {
		log.Printf("Failed to get card history: %v", err)
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"audit_log": logs})
}

// VerifyCard publicly verifies a card by number + certificate serial
// POST /api/eid/cards/verify
func (h *EIDHandler) VerifyCard(c *gin.Context) {
	var req models.EIDVerifyCardRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.CardNumber == "" || req.CertificateSerial == "" {
		c.JSON(http.StatusOK, models.EIDVerifyCardResponse{Valid: false, Status: "not_found"})
		return
	}

	resp, err := h.eidService.VerifyCard(req.CardNumber, req.CertificateSerial)
	if err != nil {
		log.Printf("Failed to verify card: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify card"})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// GetUserCards returns the current user's e-ID cards
// GET /api/eid/cards/user
func (h *EIDHandler) GetUserCards(c *gin.Context) {
	userID, ok := h.getUserFromClaims(c)
	if !ok {
		return
	}

	cards, err := h.eidService.GetUserCards(userID)
	if err != nil {
		log.Printf("Failed to get user cards: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get cards"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"cards": cards})
}
