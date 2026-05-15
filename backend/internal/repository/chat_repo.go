package repository

import (
	"go-fiber-pgsql/internal/model"

	"gorm.io/gorm"
)

type ChatRepository struct {
	db *gorm.DB
}

func NewChatRepository(db *gorm.DB) *ChatRepository {
	return &ChatRepository{db: db}
}

func (r *ChatRepository) CreateSession(session *model.ChatSession) error {
	return r.db.Create(session).Error
}

func (r *ChatRepository) GetSessionsByUser(userID uint) ([]model.ChatSession, error) {
	var sessions []model.ChatSession
	err := r.db.Where("user_id = ?", userID).Order("updated_at DESC").Find(&sessions).Error
	return sessions, err
}

func (r *ChatRepository) GetSession(id, userID uint) (*model.ChatSession, error) {
	var session model.ChatSession
	err := r.db.Where("id = ? AND user_id = ?", id, userID).First(&session).Error
	return &session, err
}

func (r *ChatRepository) DeleteSession(id, userID uint) error {
	return r.db.Where("id = ? AND user_id = ?", id, userID).Delete(&model.ChatSession{}).Error
}

func (r *ChatRepository) AddMessage(msg *model.ChatMessage) error {
	return r.db.Create(msg).Error
}

func (r *ChatRepository) GetMessages(sessionID uint) ([]model.ChatMessage, error) {
	var messages []model.ChatMessage
	err := r.db.Where("session_id = ?", sessionID).Order("created_at ASC").Find(&messages).Error
	return messages, err
}

func (r *ChatRepository) UpdateSessionTitle(id uint, title string) error {
	return r.db.Model(&model.ChatSession{}).Where("id = ?", id).Updates(map[string]interface{}{"title": title}).Error
}
