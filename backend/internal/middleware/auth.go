package middleware

import (
	"fmt"
	"os"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

type JWTClaims struct {
	UserID uint   `json:"user_id"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

func getJWTSecret() string {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		panic("JWT_SECRET environment variable is required")
	}
	return secret
}

func parseToken(tokenString string) (*jwt.Token, error) {
	secret := getJWTSecret()
	return jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(secret), nil
	})
}

func AuthRequired() fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(401).JSON(fiber.Map{"error": "You are not authorized. Please login first"})
		}

		var tokenString string

		if strings.HasPrefix(authHeader, "Bearer ") {
			tokenString = strings.TrimPrefix(authHeader, "Bearer ")
		} else if strings.HasPrefix(authHeader, "bearer ") {
			tokenString = strings.TrimPrefix(authHeader, "bearer ")
		} else {
			tokenString = authHeader
		}

		tokenString = strings.TrimSpace(tokenString)

		token, err := parseToken(tokenString)
		if err != nil || !token.Valid {
			return c.Status(401).JSON(fiber.Map{"error": "Your session has expired or token is invalid. Please login again"})
		}

		if claims, ok := token.Claims.(*JWTClaims); ok {
			c.Locals("user_id", claims.UserID)
			c.Locals("email", claims.Email)
			c.Locals("role", claims.Role)
		}

		return c.Next()
	}
}

// WSAuthRequired validates the JWT token passed as a ?token= query param.
func WSAuthRequired() fiber.Handler {
	return func(c *fiber.Ctx) error {
		tokenString := strings.TrimSpace(c.Query("token"))
		if tokenString == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "WebSocket token required"})
		}

		token, err := parseToken(tokenString)
		if err != nil || !token.Valid {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid or expired WebSocket token"})
		}

		if claims, ok := token.Claims.(*JWTClaims); ok {
			c.Locals("user_id", claims.UserID)
			c.Locals("email", claims.Email)
			c.Locals("role", claims.Role)
		}

		return c.Next()
	}
}
