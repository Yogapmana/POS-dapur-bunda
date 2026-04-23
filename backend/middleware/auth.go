package middleware

import (
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Bearer token required"})
			c.Abort()
			return
		}

		secret := os.Getenv("JWT_SECRET")
		if secret == "" {
			secret = "dapur-bunda-secret-key"
		}

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(secret), nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			c.Abort()
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
			c.Abort()
			return
		}

		// Handle sub claim - may be float64 (from JSON) or string
		sub := claims["sub"]
		switch v := sub.(type) {
		case float64:
			c.Set("userID", uint(v))
		case uint:
			c.Set("userID", v)
		case int:
			c.Set("userID", uint(v))
		default:
			c.Set("userID", sub)
		}

		// Handle role claim - ensure it's a string
		role := claims["role"]
		switch v := role.(type) {
		case string:
			c.Set("userRole", v)
		case float64:
			c.Set("userRole", strconv.FormatFloat(v, 'f', -1, 64))
		default:
			c.Set("userRole", "")
		}

		c.Next()
	}
}

func RoleMiddleware(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole, exists := c.Get("userRole")
		if !exists {
			log.Printf("[DEBUG] RoleMiddleware: userRole not found in context")
			c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
			c.Abort()
			return
		}

		roleStr, ok := userRole.(string)
		if !ok {
			log.Printf("[DEBUG] RoleMiddleware: userRole is not a string, got %T", userRole)
			c.JSON(http.StatusForbidden, gin.H{"error": "Invalid role"})
			c.Abort()
			return
		}

		log.Printf("[DEBUG] RoleMiddleware: userRole=%s, requiredRoles=%v", roleStr, roles)

		for _, role := range roles {
			if roleStr == role {
				c.Next()
				return
			}
		}

		c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
		c.Abort()
	}
}
