package model

import (
	"time"

	"gorm.io/datatypes"
)

type Vehicle struct {
	ID                     uint       `json:"id" gorm:"primaryKey"`
	Code                   string     `json:"code" gorm:"type:varchar(50);uniqueIndex;not null"`                  // Registration code & MQTT topic
	ApiKey                 *string    `json:"-" gorm:"type:varchar(128);uniqueIndex"`                               // Per-vehicle API key for USV ingest
	Name                   string     `json:"name" gorm:"type:varchar(100);not null"`
	Description            string     `json:"description" gorm:"type:text"`
	BatteryCount           int        `json:"battery_count" gorm:"type:int;default:2"`                            // Number of battery units (1-2)
	BatteryTotalCapacityAh float64    `json:"battery_total_capacity_ah" gorm:"type:decimal(10,2);default:20.00"` // Total battery pack capacity in Ah
	Status                 string     `json:"status" gorm:"type:varchar(20);default:'active'"`                    // active, inactive, maintenance
	ConnectionStatus       string     `json:"connection_status" gorm:"type:varchar(20);default:'offline'"`        // online, offline (MQTT LWT)
	LastConnected          *time.Time `json:"last_connected,omitempty" gorm:"index"`                              // Last seen timestamp
	UserID                 uint       `json:"user_id" gorm:"not null;index"`
	User                   *User      `json:"user,omitempty" gorm:"foreignKey:UserID;constraint:OnDelete:RESTRICT"`

	// Latest telemetry data (populated from vehicle_logs)
	BatteryLevel   *float64   `json:"battery_level,omitempty" gorm:"-"`
	SignalStrength *float64   `json:"signal_strength,omitempty" gorm:"-"`
	Latitude       *float64   `json:"latitude,omitempty" gorm:"-"`
	Longitude      *float64   `json:"longitude,omitempty" gorm:"-"`
	Temperature    *string    `json:"temperature,omitempty" gorm:"-"`
	LastSeen       *time.Time `json:"last_seen,omitempty" gorm:"-"`

	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

type VehicleBattery struct {
	ID           uint           `json:"id" gorm:"primaryKey"`
	VehicleID    uint           `json:"vehicle_id" gorm:"not null;index"`
	Vehicle      *Vehicle       `json:"vehicle,omitempty" gorm:"foreignKey:VehicleID;constraint:OnDelete:CASCADE"`
	BatteryID    int            `json:"battery_id" gorm:"type:int;default:1;index"` // 1 or 2 for dual battery systems
	Percentage   float64        `json:"percentage" gorm:"type:decimal(5,2)"` // 0.00 - 100.00
	Voltage      float64        `json:"voltage" gorm:"type:decimal(5,2)"`    // Voltage in V
	Current      float64        `json:"current" gorm:"type:decimal(5,2)"`    // Current in A (Ampere)
	Status       string         `json:"status" gorm:"type:varchar(20)"`      // charging, discharging, full, low
	Temperature  float64        `json:"temperature" gorm:"type:decimal(5,2)"` // Battery temperature in Celsius
	CellVoltages datatypes.JSON `json:"cell_voltages,omitempty" gorm:"type:jsonb"` // Cell voltages array
	Metadata     datatypes.JSON `json:"metadata,omitempty" gorm:"type:jsonb"`      // Additional metadata
	CreatedAt    time.Time      `json:"created_at" gorm:"autoCreateTime"`
}

// Request/Response Models for Vehicle
type CreateVehicleRequest struct {
	Code                   string   `json:"code" example:"VEH-001"`
	ApiKey                 *string  `json:"api_key,omitempty" example:"usv-key-001"`
	Name                   string   `json:"name" example:"Vehicle A"`
	Description            string   `json:"description" example:"Main delivery vehicle"`
	BatteryCount           *int     `json:"battery_count,omitempty" example:"2"`
	BatteryTotalCapacityAh *float64 `json:"battery_total_capacity_ah,omitempty" example:"20"`
	Status                 string   `json:"status,omitempty" example:"active"`
}

type UpdateVehicleRequest struct {
	Code                   *string  `json:"code,omitempty"`
	ApiKey                 *string  `json:"api_key,omitempty"`
	Name                   *string  `json:"name,omitempty"`
	Description            *string  `json:"description,omitempty"`
	BatteryCount           *int     `json:"battery_count,omitempty"`
	BatteryTotalCapacityAh *float64 `json:"battery_total_capacity_ah,omitempty"`
	Status                 *string  `json:"status,omitempty"`
}

type CreateVehicleStatusRequest struct {
	VehicleID   uint   `json:"vehicle_id,omitempty" example:"1"`
	VehicleCode string `json:"vehicle_code,omitempty" example:"USV-001"`
	Status      string `json:"status" example:"online"`
	Timestamp   string `json:"timestamp,omitempty" example:"2025-01-01T08:30:05Z"`
}

type CreateVehicleBatteryRequest struct {
	VehicleID    uint      `json:"vehicle_id,omitempty" example:"1"`
	VehicleCode  string    `json:"vehicle_code,omitempty" example:"USV-001"`
	BatteryID    int       `json:"battery_id" example:"1"`
	Percentage   float64   `json:"percentage" example:"85.5"`
	Voltage      *float64  `json:"voltage,omitempty" example:"12.5"`
	Current      *float64  `json:"current,omitempty" example:"2.3"`
	Temperature  *float64  `json:"temperature,omitempty" example:"32.1"`
	Status       string    `json:"status,omitempty" example:"Normal"`
	CellVoltages []float64 `json:"cell_voltages,omitempty" example:"[4.1,4.1,4.1]"`
	CellCount    *int      `json:"cell_count,omitempty" example:"3"`
	Timestamp    string    `json:"timestamp,omitempty" example:"2025-01-01T08:30:05Z"`
}
