package model

import "time"

// Notification stores user notifications triggered by system actions/events
// Different from alerts - notifications are for general system activities and user actions
type Notification struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	UserID    uint      `json:"user_id" gorm:"not null;index"`
	User      *User     `json:"user,omitempty" gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
	VehicleID *uint     `json:"vehicle_id,omitempty" gorm:"index"`
	Vehicle   *Vehicle  `json:"vehicle,omitempty" gorm:"foreignKey:VehicleID;constraint:OnDelete:CASCADE"`
	Type      string    `json:"type" gorm:"type:varchar(20);not null;index;default:'info'"` // success, error, warning, info
	Title     string    `json:"title" gorm:"type:varchar(255);not null"`
	Message   string    `json:"message" gorm:"type:text;not null"`
	Action    string    `json:"action" gorm:"type:varchar(100)"` // e.g., "mission_created", "vehicle_selected", "user_created"
	Read      bool      `json:"read" gorm:"type:boolean;default:false;index"`
	Source    string    `json:"source" gorm:"type:varchar(50);default:'system'"` // system, user, api
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime;index"`
	UpdatedAt time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

func (Notification) TableName() string {
	return "notifications"
}

// NotificationQuery for filtering notifications
type NotificationQuery struct {
	UserID    *uint     `query:"user_id"`
	VehicleID *uint     `query:"vehicle_id"`
	Type      string    `query:"type"`
	Action    string    `query:"action"`
	Read      *bool     `query:"read"`
	StartTime time.Time `query:"start_time"`
	EndTime   time.Time `query:"end_time"`
	Limit     int       `query:"limit"`
	Offset    int       `query:"offset"`
}

// Request/Response Models for Notification
type CreateNotificationRequest struct {
	UserID    uint   `json:"user_id" validate:"required" example:"1"`
	VehicleID *uint  `json:"vehicle_id,omitempty" example:"1"`
	Type      string `json:"type" validate:"required,oneof=success error warning info" example:"success"`
	Title     string `json:"title" validate:"required" example:"Mission Created"`
	Message   string `json:"message" validate:"required" example:"Mission 'Patrol Alpha' has been created successfully"`
	Action    string `json:"action,omitempty" example:"mission_created"`
	Source    string `json:"source,omitempty" example:"system"`
}

type UpdateNotificationRequest struct {
	Read *bool `json:"read" example:"true"`
}

type BulkUpdateNotificationRequest struct {
	IDs  []uint `json:"ids" validate:"required" example:"1,2,3"`
	Read *bool  `json:"read" example:"true"`
}

type NotificationResponse struct {
	ID        uint      `json:"id"`
	UserID    uint      `json:"user_id"`
	VehicleID *uint     `json:"vehicle_id,omitempty"`
	Vehicle   string    `json:"vehicle,omitempty"` // Vehicle name for display
	Type      string    `json:"type"`
	Title     string    `json:"title"`
	Message   string    `json:"message"`
	Action    string    `json:"action"`
	Read      bool      `json:"read"`
	Source    string    `json:"source"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type NotificationStats struct {
	Total    int `json:"total"`
	Unread   int `json:"unread"`
	Critical int `json:"critical"`
	Warning  int `json:"warning"`
	Success  int `json:"success"`
	Info     int `json:"info"`
}
