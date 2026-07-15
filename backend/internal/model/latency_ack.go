package model

import "time"

type LatencyAck struct {
	ID               uint       `json:"id" gorm:"primaryKey"`
	LogType          string     `json:"log_type" gorm:"type:varchar(20);not null;index"`
	LogID            uint       `json:"log_id" gorm:"not null;index"`
	VehicleID        uint       `json:"vehicle_id" gorm:"not null;index"`
	SensorID         *uint      `json:"sensor_id,omitempty" gorm:"index"`
	UsvTimestamp     *time.Time `json:"usv_timestamp,omitempty" gorm:"type:timestamptz;index"`
	MqttReceivedAt   *time.Time `json:"mqtt_received_at,omitempty" gorm:"type:timestamptz"`
	WsSentAt         *time.Time `json:"ws_sent_at,omitempty" gorm:"type:timestamptz"`
	WsReceivedAt     *time.Time `json:"ws_received_at,omitempty" gorm:"type:timestamptz;index"`
	PayloadSizeBytes int        `json:"payload_size_bytes" gorm:"default:0"`
	InitiatedAt      *time.Time `json:"initiated_at,omitempty" gorm:"type:timestamptz"`
	MqttPublishedAt  *time.Time `json:"mqtt_published_at,omitempty" gorm:"type:timestamptz"`
	UsvAckAt         *time.Time `json:"usv_ack_at,omitempty" gorm:"type:timestamptz"`
	AckReceivedAt    *time.Time `json:"ack_received_at,omitempty" gorm:"type:timestamptz"`
	CreatedAt        time.Time  `json:"created_at" gorm:"autoCreateTime;index"`
}

func (LatencyAck) TableName() string { return "latency_acks" }

type CreateLatencyAckRequest struct {
	LogType      string    `json:"log_type"`
	LogID        uint      `json:"log_id"`
	VehicleID    uint      `json:"vehicle_id"`
	SensorID     *uint     `json:"sensor_id,omitempty"`
	WsReceivedAt time.Time `json:"ws_received_at"`
}

type LatencyExportQuery struct {
	LogType   string
	VehicleID uint
	SensorID  *uint
	StartTime time.Time
	EndTime   time.Time
	Limit     int
}
