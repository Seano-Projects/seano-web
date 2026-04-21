package util

import (
	"crypto/rand"
	"encoding/hex"
)

func GenerateAPIKey() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}

	return "usv_" + hex.EncodeToString(bytes), nil
}