package middleware

import (
	"net/http"

	"gerege-sso/services"

	"github.com/gin-gonic/gin"
)

// RequireRole returns middleware that checks the user's role from JWT claims.
// It accepts one or more allowed roles. If the user's role matches any of them, access is granted.
func RequireRole(jwtService *services.JWTService, roles ...string) gin.HandlerFunc {
	allowed := make(map[string]bool, len(roles))
	for _, r := range roles {
		allowed[r] = true
	}

	return func(c *gin.Context) {
		claimsVal, exists := c.Get("claims")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			c.Abort()
			return
		}

		claims, ok := claimsVal.(*services.Claims)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid claims"})
			c.Abort()
			return
		}

		userRole := claims.Gerege.Role
		if !allowed[userRole] {
			c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
			c.Abort()
			return
		}

		c.Next()
	}
}
