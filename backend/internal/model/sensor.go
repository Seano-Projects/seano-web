package model

import "time"

type SensorType struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Name        string    `json:"name" gorm:"type:varchar(100);uniqueIndex;not null"`
	Description string    `json:"description" gorm:"type:varchar(255)"`
	CreatedAt   time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt   time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

// Sensor is master data (admin-only) - represents physical sensor models/brands
// Examples: ADCP, CTD, SBES, MBES, etc.
// Data processing and visualization are manually programmed for each sensor type
type Sensor struct {
	ID           uint        `json:"id" gorm:"primaryKey"`
	Brand        string      `json:"brand" gorm:"type:varchar(100);not null"` // ADCP, CTD, SBES, MBES
	Model        string      `json:"model" gorm:"type:varchar(100);not null"` // Model/series name
	Code         string      `json:"code" gorm:"type:varchar(50);uniqueIndex;not null"` // Unique identifier for routing data
	SensorTypeID uint        `json:"sensor_type_id" gorm:"not null;index"`
	SensorType   *SensorType `json:"sensor_type,omitempty" gorm:"foreignKey:SensorTypeID"`
	Description  string      `json:"description" gorm:"type:text"` // Sensor info and notes
	IsActive     bool        `json:"is_active" gorm:"default:true"`
	CreatedAt    time.Time   `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt    time.Time   `json:"updated_at" gorm:"autoUpdateTime"`
}

// VehicleSensor - Junction table for many-to-many relationship between Vehicle and Sensor
type VehicleSensor struct {
	ID              uint      `json:"id" gorm:"primaryKey"`
	VehicleID       uint      `json:"vehicle_id" gorm:"not null;index"`
	Vehicle         *Vehicle  `json:"vehicle,omitempty" gorm:"foreignKey:VehicleID;constraint:OnDelete:CASCADE"`
	SensorID        uint      `json:"sensor_id" gorm:"not null;index"`
	Sensor          *Sensor   `json:"sensor,omitempty" gorm:"foreignKey:SensorID;constraint:OnDelete:CASCADE"`
	Status          string    `json:"status" gorm:"type:varchar(20);default:'active'"` // active, inactive, maintenance, error
	LastReading     string    `json:"last_reading" gorm:"type:text"` // JSON string of last sensor reading
	LastReadingTime *time.Time `json:"last_reading_time"`
	CreatedAt       time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt       time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

// Unique constraint: one sensor can only be assigned once per vehicle
func (VehicleSensor) TableName() string {
	return "vehicle_sensors"
}

// Request/Response Models for SensorType
type CreateSensorTypeRequest struct {
	Name        string `json:"name" example:"Oceanography"`
	Description string `json:"description" example:"Sensors for ocean data measurement and analysis"`
}

type UpdateSensorTypeRequest struct {
	Name        *string `json:"name,omitempty"`
	Description *string `json:"description,omitempty"`
}

// Request/Response Models for Sensor (admin-only)
type CreateSensorRequest struct {
	Brand        string `json:"brand" example:"ADCP"`
	Model        string `json:"model" example:"WorkHorse 600kHz"`
	Code         string `json:"code" example:"ADCP-WH600"`
	SensorTypeID uint   `json:"sensor_type_id" example:"1"`
	Description  string `json:"description" example:"Acoustic Doppler Current Profiler - measures water current velocity and direction"`
	IsActive     *bool  `json:"is_active,omitempty" example:"true"`
}

type UpdateSensorRequest struct {
	Brand        *string `json:"brand,omitempty"`
	Model        *string `json:"model,omitempty"`
	Code         *string `json:"code,omitempty"`
	SensorTypeID *uint   `json:"sensor_type_id,omitempty"`
	Description  *string `json:"description,omitempty"`
	IsActive     *bool   `json:"is_active,omitempty"`
}

// Request/Response Models for VehicleSensor (user can assign)
type AssignSensorToVehicleRequest struct {
	SensorID uint `json:"sensor_id" example:"1"`
}

type UpdateVehicleSensorStatusRequest struct {
	Status          *string `json:"status,omitempty" example:"active"`
	LastReading     *string `json:"last_reading,omitempty" example:"{\"temperature\": 25.5}"`
	LastReadingTime *string `json:"last_reading_time,omitempty" example:"2025-12-29T15:30:00Z"`
}
