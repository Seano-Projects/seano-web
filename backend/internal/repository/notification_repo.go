package repository

import (
	"go-fiber-pgsql/internal/model"

	"gorm.io/gorm"
)

type NotificationRepository struct {
	db *gorm.DB
}

func NewNotificationRepository(db *gorm.DB) *NotificationRepository {
	return &NotificationRepository{db: db}
}

// CreateNotification saves a new notification entry
func (r *NotificationRepository) CreateNotification(notification *model.Notification) error {
	return r.db.Create(notification).Error
}

// GetNotifications retrieves notifications with filters
func (r *NotificationRepository) GetNotifications(query model.NotificationQuery) ([]model.NotificationResponse, error) {
	var notifications []model.Notification

	db := r.db.Model(&model.Notification{}).Preload("Vehicle")

	if query.UserID != nil {
		db = db.Where("user_id = ?", *query.UserID)
	}

	if query.VehicleID != nil {
		db = db.Where("vehicle_id = ?", *query.VehicleID)
	}

	if query.Type != "" {
		db = db.Where("type = ?", query.Type)
	}

	if query.Action != "" {
		db = db.Where("action = ?", query.Action)
	}

	if query.Read != nil {
		db = db.Where("read = ?", *query.Read)
	}

	if !query.StartTime.IsZero() {
		db = db.Where("created_at >= ?", query.StartTime)
	}

	if !query.EndTime.IsZero() {
		db = db.Where("created_at <= ?", query.EndTime)
	}

	if query.Limit > 0 {
		db = db.Limit(query.Limit)
	} else {
		db = db.Limit(100) // Default limit
	}

	if query.Offset > 0 {
		db = db.Offset(query.Offset)
	}

	err := db.Order("created_at DESC").Find(&notifications).Error
	if err != nil {
		return nil, err
	}

	// Convert to response format
	var responses []model.NotificationResponse
	for _, notif := range notifications {
		response := model.NotificationResponse{
			ID:        notif.ID,
			UserID:    notif.UserID,
			VehicleID: notif.VehicleID,
			Type:      notif.Type,
			Title:     notif.Title,
			Message:   notif.Message,
			Action:    notif.Action,
			Read:      notif.Read,
			Source:    notif.Source,
			CreatedAt: notif.CreatedAt,
			UpdatedAt: notif.UpdatedAt,
		}

		// Add vehicle name if loaded
		if notif.Vehicle != nil {
			response.Vehicle = notif.Vehicle.Name
		}

		responses = append(responses, response)
	}

	return responses, nil
}

// GetNotificationByID retrieves a notification by ID
func (r *NotificationRepository) GetNotificationByID(id uint) (*model.Notification, error) {
	var notification model.Notification
	err := r.db.Preload("Vehicle").First(&notification, id).Error
	if err != nil {
		return nil, err
	}
	return &notification, nil
}

// UpdateNotification updates an existing notification
func (r *NotificationRepository) UpdateNotification(id uint, updates map[string]interface{}) error {
	return r.db.Model(&model.Notification{}).Where("id = ?", id).Updates(updates).Error
}

// MarkAsRead marks a notification as read
func (r *NotificationRepository) MarkAsRead(id uint) error {
	return r.db.Model(&model.Notification{}).Where("id = ?", id).Update("read", true).Error
}

// BulkMarkAsRead marks multiple notifications as read
func (r *NotificationRepository) BulkMarkAsRead(ids []uint) error {
	return r.db.Model(&model.Notification{}).Where("id IN ?", ids).Update("read", true).Error
}

// MarkAllAsRead marks all notifications as read for a user
func (r *NotificationRepository) MarkAllAsRead(userID uint) error {
	return r.db.Model(&model.Notification{}).Where("user_id = ?", userID).Update("read", true).Error
}

// DeleteNotification deletes a notification by ID
func (r *NotificationRepository) DeleteNotification(id uint) error {
	return r.db.Delete(&model.Notification{}, id).Error
}

// DeleteAllRead deletes all read notifications for a user
func (r *NotificationRepository) DeleteAllRead(userID uint) error {
	return r.db.Where("user_id = ? AND read = ?", userID, true).Delete(&model.Notification{}).Error
}

// GetNotificationStats returns statistics about notifications for a user
func (r *NotificationRepository) GetNotificationStats(userID uint) (*model.NotificationStats, error) {
	var stats model.NotificationStats

	row := r.db.Table("notifications").
		Select(`
			COUNT(*) as total,
			COUNT(*) FILTER (WHERE read = false) as unread,
			COUNT(*) FILTER (WHERE type = 'error') as critical,
			COUNT(*) FILTER (WHERE type = 'warning') as warning,
			COUNT(*) FILTER (WHERE type = 'success') as success,
			COUNT(*) FILTER (WHERE type = 'info') as info
		`).
		Where("user_id = ?", userID).Row()

	if err := row.Scan(&stats.Total, &stats.Unread, &stats.Critical, &stats.Warning, &stats.Success, &stats.Info); err != nil {
		return nil, err
	}

	return &stats, nil
}
