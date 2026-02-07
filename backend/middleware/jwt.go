package middleware

import (
	"net/http"
	"strings"

	"gerege-sso/services"

	"github.com/gin-gonic/gin"
)

// JWTAuth middleware validates JWT tokens and checks blacklist
func JWTAuth(jwtService *services.JWTService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get token from Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			// Fallback: check httpOnly cookie
			if cookie, err := c.Cookie("gerege_token"); err == nil && cookie != "" {
				authHeader = "Bearer " + cookie
			}
		}
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		// Check Bearer prefix
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization format"})
			c.Abort()
			return
		}

		tokenString := parts[1]

		// Validate token
		claims, err := jwtService.ValidateToken(tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			c.Abort()
			return
		}

		// Check if token has been blacklisted (logout)
		if jwtService.IsBlacklisted(claims.ID) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Token has been revoked"})
			c.Abort()
			return
		}

		// Set claims in context
		c.Set("claims", claims)
		c.Set("user_id", claims.Subject)

		c.Next()
	}
}
