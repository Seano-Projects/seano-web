package model

import "time"

// ChatSession represents a chat conversation session per user
type ChatSession struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	UserID    uint      `json:"user_id" gorm:"not null;index"`
	Title     string    `json:"title" gorm:"type:varchar(255);not null"`
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

func (ChatSession) TableName() string {
	return "chat_sessions"
}

// ChatMessage represents a single message in a chat session
type ChatMessage struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	SessionID uint      `json:"session_id" gorm:"not null;index"`
	Role      string    `json:"role" gorm:"type:varchar(20);not null"` // user, assistant
	Content   string    `json:"content" gorm:"type:text;not null"`
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
}

func (ChatMessage) TableName() string {
	return "chat_messages"
}
