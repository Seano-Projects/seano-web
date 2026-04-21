package model

import "time"

// SensorLog stores all sensor readings/logs from vehicles
type SensorLog struct {
	ID             uint       `json:"id" gorm:"primaryKey"`
	VehicleID      uint       `json:"vehicle_id" gorm:"not null;index"`
	Vehicle        *Vehicle   `json:"vehicle,omitempty" gorm:"foreignKey:VehicleID;constraint:OnDelete:CASCADE"`
	SensorID       uint       `json:"sensor_id" gorm:"not null;index"`
	Sensor         *Sensor    `json:"sensor,omitempty" gorm:"foreignKey:SensorID;constraint:OnDelete:CASCADE"`
	Data           string     `json:"data" gorm:"type:jsonb;not null"` // JSON data from sensor
	UsvTimestamp   *time.Time `json:"usv_timestamp,omitempty" gorm:"type:timestamptz;index"` // timestamp from USV payload
	MqttReceivedAt *time.Time `json:"mqtt_received_at,omitempty" gorm:"type:timestamptz;index"` // when backend received MQTT
	CreatedAt      time.Time  `json:"created_at" gorm:"autoCreateTime"`
}

func (SensorLog) TableName() string {
	return "sensor_logs"
}

// SensorLogQuery for filtering logs
type SensorLogQuery struct {
	VehicleID  uint      `query:"vehicle_id"`
	VehicleIDs []uint    // filter by multiple vehicle IDs (user-scoped)
	SensorID   uint      `query:"sensor_id"`
	StartTime  time.Time `query:"start_time"`
	EndTime    time.Time `query:"end_time"`
	Limit      int       `query:"limit"`
	Offset     int       `query:"offset"`
}

// Request/Response Models for SensorLog
type CreateSensorLogRequest struct {
	VehicleID   uint   `json:"vehicle_id" example:"1"`
	VehicleCode string `json:"vehicle_code,omitempty" example:"USV-01"`
	SensorID    uint   `json:"sensor_id" example:"1"`
	SensorCode  string `json:"sensor_code,omitempty" example:"CTD-MIDAS-01"`
	Data        string `json:"data" example:"{\"temperature\":25.5,\"pressure\":1013}"`
}
