package model

import (
	"time"

	"gorm.io/datatypes"
)

type Vehicle struct {
	ID             uint       `json:"id" gorm:"primaryKey"`
	Code           string     `json:"code" gorm:"type:varchar(50);uniqueIndex;not null"` // Registration code & MQTT topic
	Name           string     `json:"name" gorm:"type:varchar(100);not null"`
	Description    string     `json:"description" gorm:"type:text"`
	Status         string     `json:"status" gorm:"type:varchar(20);default:'active'"` // active, inactive, maintenance
	UserID         uint       `json:"user_id" gorm:"not null;index"`
	User           *User      `json:"user,omitempty" gorm:"foreignKey:UserID;constraint:OnDelete:RESTRICT"`
	
	// Latest telemetry data (populated from vehicle_logs)
	BatteryLevel   *float64   `json:"battery_level,omitempty" gorm:"-"`
	SignalStrength *float64   `json:"signal_strength,omitempty" gorm:"-"`
	Latitude       *float64   `json:"latitude,omitempty" gorm:"-"`
	Longitude      *float64   `json:"longitude,omitempty" gorm:"-"`
	Temperature    *string    `json:"temperature,omitempty" gorm:"-"`
	LastSeen       *time.Time `json:"last_seen,omitempty" gorm:"-"`
	
	CreatedAt      time.Time  `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt      time.Time  `json:"updated_at" gorm:"autoUpdateTime"`
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
	Code        string `json:"code" example:"VEH-001"`
	Name        string `json:"name" example:"Vehicle A"`
	Description string `json:"description" example:"Main delivery vehicle"`
	Status      string `json:"status,omitempty" example:"active"`
}

type UpdateVehicleRequest struct {
	Code        *string `json:"code,omitempty"`
	Name        *string `json:"name,omitempty"`
	Description *string `json:"description,omitempty"`
	Status      *string `json:"status,omitempty"`
}
