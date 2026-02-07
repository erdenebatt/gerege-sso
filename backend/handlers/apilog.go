package handlers

import (
	"log"
	"net/http"

	"gerege-sso/services"

	"github.com/gin-gonic/gin"
)

// APILogHandler handles API log endpoints
type APILogHandler struct {
	apiLogService *services.APILogService
}

// NewAPILogHandler creates a new APILogHandler
func NewAPILogHandler(apiLogService *services.APILogService) *APILogHandler {
	return &APILogHandler{apiLogService: apiLogService}
}

// GetAPILogs returns the last 50 API logs
// @Summary Get API logs
// @Description Returns the last 50 API request/response logs
// @Tags admin
// @Produce json
// @Security BearerAuth
// @Success 200 {object} map[string]interface{}
// @Router /api/auth/api-logs [get]
func (h *APILogHandler) GetAPILogs(c *gin.Context) {
	logs, err := h.apiLogService.GetRecentLogs(50)
	if err != nil {
		log.Printf("Failed to fetch API logs: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch API logs"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"logs": logs})
}
