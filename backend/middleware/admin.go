package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// AdminAuth validates the X-Admin-Key header against the configured API key.
func AdminAuth(apiKey string) gin.HandlerFunc {
	return func(c *gin.Context) {
		key := c.GetHeader("X-Admin-Key")
		if key == "" || key != apiKey {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid admin key"})
			c.Abort()
			return
		}
		c.Next()
	}
}
