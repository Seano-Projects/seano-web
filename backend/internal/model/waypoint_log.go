package model

import "time"

// WaypointLog records every mission/waypoint upload attempt to a vehicle
type WaypointLog struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	VehicleID   uint      `json:"vehicle_id" gorm:"not null;index"`
	Vehicle     *Vehicle  `json:"vehicle,omitempty" gorm:"foreignKey:VehicleID;constraint:OnDelete:CASCADE"`
	VehicleCode string    `json:"vehicle_code" gorm:"type:varchar(64);not null;index"`
	MissionID   *uint     `json:"mission_id,omitempty" gorm:"index"`
	MissionName string    `json:"mission_name" gorm:"type:varchar(256)"`
	WaypointCount int     `json:"waypoint_count" gorm:"not null;default:0"`
	Status      string    `json:"status" gorm:"type:varchar(32);not null;default:'pending'"` // pending, success, failed, timeout
	Message     string    `json:"message" gorm:"type:text"`
	InitiatedAt time.Time `json:"initiated_at" gorm:"not null;index"` // when upload button was clicked
	ResolvedAt  *time.Time `json:"resolved_at,omitempty"`              // when ack was received
	CreatedAt   time.Time `json:"created_at" gorm:"autoCreateTime;index"`
}

func (WaypointLog) TableName() string {
	return "waypoint_logs"
}

// WaypointLogQuery for filtering waypoint logs
type WaypointLogQuery struct {
	VehicleID   uint      `query:"vehicle_id"`
	VehicleIDs  []uint    // filter by multiple vehicle IDs (user-scoped)
	VehicleCode string    `query:"vehicle_code"`
	MissionID   uint      `query:"mission_id"`
	Status      string    `query:"status"`
	StartTime   time.Time `query:"start_time"`
	EndTime     time.Time `query:"end_time"`
	Order       string    `query:"order"`
	Limit       int       `query:"limit"`
	Offset      int       `query:"offset"`
}

// CreateWaypointLogRequest is the request body for creating a waypoint log
type CreateWaypointLogRequest struct {
	VehicleID     uint       `json:"vehicle_id"`
	VehicleCode   string     `json:"vehicle_code"`
	MissionID     *uint      `json:"mission_id,omitempty"`
	MissionName   string     `json:"mission_name"`
	WaypointCount int        `json:"waypoint_count"`
	Status        string     `json:"status"`
	Message       string     `json:"message"`
	InitiatedAt   time.Time  `json:"initiated_at"`
	ResolvedAt    *time.Time `json:"resolved_at,omitempty"`
}

// CreateWaypointAckRequest is the request body for waypoint upload ACK updates from USV
type CreateWaypointAckRequest struct {
	VehicleCode  string `json:"vehicle_code" example:"USV-001"`
	WaypointLogID uint   `json:"waypoint_log_id,omitempty"`
	MissionID    *uint  `json:"mission_id,omitempty"`
	Status       string `json:"status" example:"ok"`
	Message      string `json:"message,omitempty"`
	Timestamp    string `json:"timestamp,omitempty" example:"2025-01-01T08:30:05Z"`
}
