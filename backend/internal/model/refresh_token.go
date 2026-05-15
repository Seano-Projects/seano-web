package model

import (
	"time"
)

// RefreshToken represents a refresh token for multi-device support
type RefreshToken struct {
	ID         uint      `json:"id" gorm:"primaryKey"`
	UserID     uint      `json:"user_id" gorm:"not null;index"`
	Token      string    `json:"-" gorm:"type:varchar(500);not null;uniqueIndex"`
	DeviceInfo string    `json:"device_info" gorm:"type:varchar(255)"`
	IPAddress  string    `json:"ip_address" gorm:"type:varchar(45)"`
	UserAgent  string    `json:"user_agent" gorm:"type:text"`
	ExpiresAt  time.Time `json:"expires_at" gorm:"not null;index"`
	CreatedAt  time.Time `json:"created_at"`
	LastUsedAt time.Time `json:"last_used_at"`
	
	// Relationship
	User User `json:"-" gorm:"foreignKey:UserID"`
}