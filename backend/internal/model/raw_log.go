package model

import "time"

// RawLog stores raw text logs from various sources
type RawLog struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	VehicleID *uint     `json:"vehicle_id,omitempty" gorm:"index"` // Optional vehicle association
	Vehicle   *Vehicle  `json:"vehicle,omitempty" gorm:"foreignKey:VehicleID;constraint:OnDelete:SET NULL"`
	Logs      string    `json:"logs" gorm:"type:text;not null"` // Raw log text (changed to text for longer logs)
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime;index"`
}

func (RawLog) TableName() string {
	return "raw_logs"
}

// RawLogQuery for filtering logs
type RawLogQuery struct {
	VehicleID  uint      `query:"vehicle_id"`
	VehicleIDs []uint    // filter by multiple vehicle IDs (user-scoped)
	Search     string    `query:"search"`
	StartTime  time.Time `query:"start_time"`
	EndTime    time.Time `query:"end_time"`
	Limit      int       `query:"limit"`
	Offset     int       `query:"offset"`
}

// Request/Response Models for RawLog
type CreateRawLogRequest struct {
	VehicleID   uint   `json:"vehicle_id,omitempty" example:"1"`
	VehicleCode string `json:"vehicle_code,omitempty" example:"USV-001"`
	Logs        string `json:"logs" example:"System started successfully"`
}

