package repository

import (
	"errors"
	"time"

	"go-fiber-pgsql/internal/model"

	"gorm.io/gorm"
)

func CreateUserWithEmail(db *gorm.DB, email, token string) (*model.User, error) {
	var count int64
	db.Model(&model.User{}).Where("email = ?", email).Count(&count)
	if count > 0 {
		return nil, errors.New("email already registered")
	}

	user := &model.User{
		Email:              email,
		VerificationToken:  token,
		VerificationExpiry: time.Now().Add(24 * time.Hour), 
		IsVerified:         false,
	}

	result := db.Create(user)
	if result.Error != nil {
		return nil, result.Error
	}

	return user, nil
}

func GetUserByVerificationToken(db *gorm.DB, token string) (*model.User, error) {
	var user model.User
	result := db.Where("verification_token = ? AND verification_expiry > ?", token, time.Now()).First(&user)
	
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, errors.New("invalid or expired token")
		}
		return nil, result.Error
	}

	return &user, nil
}

func SetUserCredentials(db *gorm.DB, userID uint, username, hashedPassword string) error {
	return db.Model(&model.User{}).Where("id = ?", userID).Updates(map[string]interface{}{
		"username":            username,
		"password":            hashedPassword,
		"is_verified":         true,
		"verification_token":  "",
		"verification_expiry": time.Time{},
	}).Error
}

func GetUserByEmail(db *gorm.DB, email string) (*model.User, error) {
	var user model.User
	result := db.Preload("Role").Where("email = ?", email).First(&user)
	
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, errors.New("user not found")
		}
		return nil, result.Error
	}

	return &user, nil
}

func CreateRefreshToken(db *gorm.DB, userID uint, refreshToken, deviceInfo, ipAddress, userAgent string) error {
	// Clean expired tokens first
	db.Where("expires_at < ?", time.Now()).Delete(&model.RefreshToken{})
	
	// Check if token already exists for this user from same IP/UserAgent
	var existingToken model.RefreshToken
	result := db.Where("user_id = ? AND ip_address = ? AND user_agent = ?", userID, ipAddress, userAgent).First(&existingToken)
	
	if result.Error == nil {
		// Update existing token
		existingToken.Token = refreshToken
		existingToken.LastUsedAt = time.Now()
		existingToken.ExpiresAt = time.Now().Add(7 * 24 * time.Hour)
		return db.Save(&existingToken).Error
	}
	
	// Count existing tokens for user
	var count int64
	db.Model(&model.RefreshToken{}).Where("user_id = ?", userID).Count(&count)
	
	// If user has 4+ tokens, remove oldest one
	if count >= 4 {
		var oldestToken model.RefreshToken
		db.Where("user_id = ?", userID).Order("last_used_at ASC").First(&oldestToken)
		db.Delete(&oldestToken)
	}
	
	// Create new token
	newToken := &model.RefreshToken{
		UserID:     userID,
		Token:      refreshToken,
		DeviceInfo: deviceInfo,
		IPAddress:  ipAddress,
		UserAgent:  userAgent,
		ExpiresAt:  time.Now().Add(7 * 24 * time.Hour),
		LastUsedAt: time.Now(),
	}
	
	return db.Create(newToken).Error
}

func UpdateRefreshToken(db *gorm.DB, userID uint, refreshToken string) error {
	return CreateRefreshToken(db, userID, refreshToken, "", "", "")
}

func UpdateRefreshTokenWithContext(db *gorm.DB, userID uint, refreshToken, ipAddress, userAgent string) error {
	return CreateRefreshToken(db, userID, refreshToken, "", ipAddress, userAgent)
}

func GetUserByRefreshToken(db *gorm.DB, refreshToken string) (*model.User, error) {
	var token model.RefreshToken
	result := db.Where("token = ? AND expires_at > ?", refreshToken, time.Now()).First(&token)
	
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, errors.New("invalid refresh token")
		}
		return nil, result.Error
	}
	
	// Update last used time (don't create new token)
	db.Model(&token).Update("last_used_at", time.Now())
	
	// Get user with role
	var user model.User
	result = db.Preload("Role").First(&user, token.UserID)
	if result.Error != nil {
		return nil, result.Error
	}
	
	return &user, nil
}

func ClearRefreshToken(db *gorm.DB, userID uint) error {
	return db.Where("user_id = ?", userID).Delete(&model.RefreshToken{}).Error
}

func ClearSpecificRefreshToken(db *gorm.DB, refreshToken string) error {
	return db.Where("token = ?", refreshToken).Delete(&model.RefreshToken{}).Error
}

func GetActiveSessionsByUserID(db *gorm.DB, userID uint) ([]model.RefreshToken, error) {
	var tokens []model.RefreshToken
	result := db.Where("user_id = ? AND expires_at > ?", userID, time.Now()).
		Order("last_used_at DESC").Find(&tokens)
	return tokens, result.Error
}

func GetAllActiveSessions(db *gorm.DB) ([]model.RefreshToken, error) {
	var tokens []model.RefreshToken
	result := db.Preload("User").Where("expires_at > ?", time.Now()).
		Order("last_used_at DESC").Find(&tokens)
	return tokens, result.Error
}

func UpdateVerificationToken(db *gorm.DB, email, token string) error {
	return db.Model(&model.User{}).Where("email = ?", email).Updates(map[string]interface{}{
		"verification_token":  token,
		"verification_expiry": time.Now().Add(24 * time.Hour),
	}).Error
}

func ClearRefreshTokenByID(db *gorm.DB, sessionID string) error {
	result := db.Where("id = ?", sessionID).Delete(&model.RefreshToken{})
	if result.RowsAffected == 0 {
		return errors.New("session not found")
	}
	return result.Error
}
