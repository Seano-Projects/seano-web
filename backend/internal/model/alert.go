package model

import "time"

// Alert stores alert messages from USV via MQTT/WebSocket
// Different from notifications - alerts come from the vehicle hardware
type Alert struct {
	ID           uint      `json:"id" gorm:"primaryKey"`
	VehicleID    uint      `json:"vehicle_id" gorm:"not null;index"`
	Vehicle      *Vehicle  `json:"vehicle,omitempty" gorm:"foreignKey:VehicleID;constraint:OnDelete:CASCADE"`
	SensorID     *uint     `json:"sensor_id,omitempty" gorm:"index"`
	Sensor       *Sensor   `json:"sensor,omitempty" gorm:"foreignKey:SensorID;constraint:OnDelete:CASCADE"`
	Severity     string    `json:"severity" gorm:"type:varchar(20);not null;index;default:'info'"` // critical, warning, info
	AlertType    string    `json:"alert_type" gorm:"type:varchar(50);not null"`                    // System, Battery, Sensor, Communication, etc.
	Message      string    `json:"message" gorm:"type:text;not null"`
	Latitude     *float64  `json:"latitude,omitempty" gorm:"type:numeric"`
	Longitude    *float64  `json:"longitude,omitempty" gorm:"type:numeric"`
	Acknowledged bool      `json:"acknowledged" gorm:"type:boolean;default:false;index"`
	Source       string    `json:"source" gorm:"type:varchar(50);default:'USV'"` // USV, System, Manual
	CreatedAt    time.Time `json:"created_at" gorm:"autoCreateTime;index"`
	UpdatedAt    time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

func (Alert) TableName() string {
	return "alerts"
}

// AlertQuery for filtering alerts
type AlertQuery struct {
	VehicleID    *uint     `query:"vehicle_id"`
	SensorID     *uint     `query:"sensor_id"`
	Severity     string    `query:"severity"`
	AlertType    string    `query:"alert_type"`
	Acknowledged *bool     `query:"acknowledged"`
	StartTime    time.Time `query:"start_time"`
	EndTime      time.Time `query:"end_time"`
	Limit        int       `query:"limit"`
	Offset       int       `query:"offset"`
}

// Request/Response Models for Alert
type CreateAlertRequest struct {
	VehicleID uint     `json:"vehicle_id" validate:"required" example:"1"`
	SensorID  *uint    `json:"sensor_id,omitempty" example:"1"`
	Severity  string   `json:"severity" validate:"required,oneof=critical warning info" example:"warning"`
	AlertType string   `json:"alert_type" validate:"required" example:"Battery"`
	Message   string   `json:"message" validate:"required" example:"Battery voltage low: 10.5V"`
	Latitude  *float64 `json:"latitude,omitempty" example:"-6.2088"`
	Longitude *float64 `json:"longitude,omitempty" example:"106.8456"`
	Source    string   `json:"source,omitempty" example:"USV"`
}

type UpdateAlertRequest struct {
	Severity     *string  `json:"severity,omitempty" validate:"omitempty,oneof=critical warning info"`
	AlertType    *string  `json:"alert_type,omitempty"`
	Message      *string  `json:"message,omitempty"`
	Acknowledged *bool    `json:"acknowledged,omitempty"`
	Latitude     *float64 `json:"latitude,omitempty"`
	Longitude    *float64 `json:"longitude,omitempty"`
}

type AcknowledgeAlertRequest struct {
	Acknowledged bool `json:"acknowledged" example:"true"`
}

type AlertResponse struct {
	ID           uint      `json:"id"`
	VehicleID    uint      `json:"vehicle_id"`
	VehicleName  string    `json:"vehicle_name"`
	SensorID     *uint     `json:"sensor_id,omitempty"`
	SensorName   *string   `json:"sensor_name,omitempty"`
	Severity     string    `json:"severity"`
	AlertType    string    `json:"alert_type"`
	Message      string    `json:"message"`
	Latitude     *float64  `json:"latitude,omitempty"`
	Longitude    *float64  `json:"longitude,omitempty"`
	Acknowledged bool      `json:"acknowledged"`
	Source       string    `json:"source"`
	Timestamp    time.Time `json:"timestamp"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type AlertStats struct {
	Total    int64 `json:"total"`
	Critical int64 `json:"critical"`
	Warning  int64 `json:"warning"`
	Info     int64 `json:"info"`
}
