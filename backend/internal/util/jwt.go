package util

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"math/big"
	"os"
	"strconv"
	"time"

	"go-fiber-pgsql/internal/middleware"

	"github.com/golang-jwt/jwt/v5"
)

func getAccessTokenDuration() time.Duration {
	if v := os.Getenv("ACCESS_TOKEN_EXPIRE_MINUTES"); v != "" {
		if mins, err := strconv.Atoi(v); err == nil && mins > 0 {
			return time.Duration(mins) * time.Minute
		}
	}
	return 30 * time.Minute
}

func GenerateAccessToken(userID uint, email, role string) (string, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		panic("JWT_SECRET environment variable is required")
	}

	claims := middleware.JWTClaims{
		UserID:   userID,
		Email:    email,
		Role:     role,
		TokenUse: "access",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(getAccessTokenDuration())),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func GenerateRefreshToken(userID uint, email, role string) (string, error) {
	secret := os.Getenv("REFRESH_SECRET")
	if secret == "" {
		secret = os.Getenv("JWT_SECRET")
	}
	if secret == "" {
		panic("REFRESH_SECRET or JWT_SECRET environment variable is required")
	}

	claims := middleware.JWTClaims{
		UserID:   userID,
		Email:    email,
		Role:     role,
		TokenUse: "refresh",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func GenerateWebSocketToken(userID uint, email, role string) (string, error) {
	secret := os.Getenv("WS_TOKEN_SECRET")
	if secret == "" {
		secret = os.Getenv("JWT_SECRET")
	}
	if secret == "" {
		panic("WS_TOKEN_SECRET or JWT_SECRET environment variable is required")
	}

	claims := middleware.JWTClaims{
		UserID:   userID,
		Email:    email,
		Role:     role,
		TokenUse: "ws",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(2 * time.Minute)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func GenerateVerificationToken() string {
	return time.Now().Format("20060102150405") + "-" + RandomString(32)
}

func HashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func RandomString(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, length)
	for i := range b {
		n, _ := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		b[i] = charset[n.Int64()]
	}
	return string(b)
}
