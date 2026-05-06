package model

import "time"

// CommandLog records every control command sent to a vehicle (ARM, DISARM, mode changes, etc.)
type CommandLog struct {
	ID              uint       `json:"id" gorm:"primaryKey"`
	VehicleID       uint       `json:"vehicle_id" gorm:"not null;index"`
	Vehicle         *Vehicle   `json:"vehicle,omitempty" gorm:"foreignKey:VehicleID;constraint:OnDelete:CASCADE"`
	VehicleCode     string     `json:"vehicle_code" gorm:"type:varchar(64);not null;index"`
	RequestID       string     `json:"request_id,omitempty" gorm:"type:varchar(128);index"` // correlation id for command -> ack
	Command         string     `json:"command" gorm:"type:varchar(64);not null"`
	Status          string     `json:"status" gorm:"type:varchar(32);not null;default:'pending'"` // pending, success, failed, timeout
	Message         string     `json:"message" gorm:"type:text"`
	InitiatedAt     time.Time  `json:"initiated_at" gorm:"not null;index"` // when web initiated command
	MqttPublishedAt *time.Time `json:"mqtt_published_at,omitempty" gorm:"type:timestamptz;index"` // when backend published MQTT command
	UsvAckAt        *time.Time `json:"usv_ack_at,omitempty" gorm:"type:timestamptz;index"` // timestamp provided by USV ACK payload
	AckReceivedAt   *time.Time `json:"ack_received_at,omitempty" gorm:"type:timestamptz;index"` // when backend received ACK
	ResolvedAt      *time.Time `json:"resolved_at,omitempty"` // when command marked final
	WsSentAt        *time.Time `json:"ws_sent_at,omitempty" gorm:"type:timestamptz;index"` // when backend pushed command update to websocket
	WsReceivedAt    *time.Time `json:"ws_received_at,omitempty" gorm:"type:timestamptz;index"` // when frontend ACK reached backend
	CreatedAt       time.Time  `json:"created_at" gorm:"autoCreateTime;index"`
}

func (CommandLog) TableName() string {
	return "command_logs"
}

// CommandLogQuery for filtering command logs
type CommandLogQuery struct {
	VehicleID   uint      `query:"vehicle_id"`
	VehicleIDs  []uint    // filter by multiple vehicle IDs (user-scoped)
	VehicleCode string    `query:"vehicle_code"`
	Command     string    `query:"command"`
	Status      string    `query:"status"`
	StartTime   time.Time `query:"start_time"`
	EndTime     time.Time `query:"end_time"`
	Order       string    `query:"order"`
	Limit       int       `query:"limit"`
	Offset      int       `query:"offset"`
}

// CreateCommandLogRequest is the request body for creating a command log
type CreateCommandLogRequest struct {
	VehicleID       uint       `json:"vehicle_id"`
	VehicleCode     string     `json:"vehicle_code"`
	RequestID       string     `json:"request_id,omitempty"`
	Command         string     `json:"command"`
	Status          string     `json:"status"`
	Message         string     `json:"message"`
	InitiatedAt     time.Time  `json:"initiated_at"`
	MqttPublishedAt *time.Time `json:"mqtt_published_at,omitempty"`
	UsvAckAt        *time.Time `json:"usv_ack_at,omitempty"`
	AckReceivedAt   *time.Time `json:"ack_received_at,omitempty"`
	ResolvedAt      *time.Time `json:"resolved_at,omitempty"`
	WsSentAt        *time.Time `json:"ws_sent_at,omitempty"`
	WsReceivedAt    *time.Time `json:"ws_received_at,omitempty"`
}

// CreateCommandAckRequest is the request body for ACK updates from USV
type CreateCommandAckRequest struct {
	VehicleCode string `json:"vehicle_code" example:"USV-001"`
	RequestID   string `json:"request_id,omitempty" example:"c2e5b7f6-9d2e-4b26-8b0c-2d9802b12b9a"`
	Command     string `json:"command" example:"AUTO"`
	Status      string `json:"status" example:"ok"`
	Message     string `json:"message,omitempty" example:"Mode set to AUTO"`
	Timestamp   string `json:"timestamp,omitempty" example:"2025-01-01T08:30:05Z"`
}
