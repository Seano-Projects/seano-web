package model

import (
	"encoding/json"
	"fmt"
	"time"
)

// FlexibleString can unmarshal both string and number types
type FlexibleString struct {
	Value string
}

// UnmarshalJSON implements custom unmarshaling for FlexibleString
func (fs *FlexibleString) UnmarshalJSON(data []byte) error {
	// Try to unmarshal as string first
	var str string
	if err := json.Unmarshal(data, &str); err == nil {
		fs.Value = str
		return nil
	}

	// Try to unmarshal as number
	var num float64
	if err := json.Unmarshal(data, &num); err == nil {
		fs.Value = fmt.Sprintf("%.1f", num)
		return nil
	}

	// Try to unmarshal as int
	var integer int
	if err := json.Unmarshal(data, &integer); err == nil {
		fs.Value = fmt.Sprintf("%d", integer)
		return nil
	}

	return fmt.Errorf("cannot unmarshal to FlexibleString")
}

// MarshalJSON implements custom marshaling for FlexibleString
func (fs FlexibleString) MarshalJSON() ([]byte, error) {
	return json.Marshal(fs.Value)
}

// VehicleLog stores telemetry and status logs from vehicles
type VehicleLog struct {
	ID                uint      `json:"id" gorm:"primaryKey"`
	VehicleID         uint      `json:"vehicle_id" gorm:"not null;index"`
	Vehicle           *Vehicle  `json:"vehicle,omitempty" gorm:"foreignKey:VehicleID;constraint:OnDelete:CASCADE"`
	BatteryVoltage    *float64  `json:"battery_voltage" gorm:"type:numeric"`
	BatteryCurrent    *float64  `json:"battery_current" gorm:"type:numeric"`
	BatteryPercentage *float64  `json:"battery_percentage" gorm:"type:numeric"`
	RSSI              *int      `json:"rssi" gorm:"type:int"`
	Mode              *string   `json:"mode" gorm:"type:varchar(50)"`
	Latitude          *float64  `json:"latitude" gorm:"type:numeric"`
	Longitude         *float64  `json:"longitude" gorm:"type:numeric"`
	Altitude          *float64  `json:"altitude" gorm:"type:numeric"`
	Heading           *float64  `json:"heading" gorm:"type:numeric"`
	Armed             *bool     `json:"armed" gorm:"type:boolean"`
	GPSok             *bool     `json:"gps_ok" gorm:"type:boolean"`
	SystemStatus      *string   `json:"system_status" gorm:"type:varchar(50)"`
	Speed             *float64  `json:"speed" gorm:"type:numeric"`
	Roll              *float64  `json:"roll" gorm:"type:numeric"`
	Pitch             *float64  `json:"pitch" gorm:"type:numeric"`
	Yaw               *float64  `json:"yaw" gorm:"type:numeric"`
	TemperatureSystem *string   `json:"temperature_system" gorm:"type:varchar(50)"` // Type field from schema
	CreatedAt         time.Time `json:"created_at" gorm:"autoCreateTime;index"`
}

func (VehicleLog) TableName() string {
	return "vehicle_logs"
}

// VehicleLogQuery for filtering logs
type VehicleLogQuery struct {
	VehicleID uint      `query:"vehicle_id"`
	StartTime time.Time `query:"start_time"`
	EndTime   time.Time `query:"end_time"`
	Limit     int       `query:"limit"`
	Offset    int       `query:"offset"`
}

// Request/Response Models for VehicleLog
type CreateVehicleLogRequest struct {
	VehicleID         uint             `json:"vehicle_id" example:"1"`
	BatteryVoltage    *float64         `json:"battery_voltage,omitempty" example:"12.5"`
	BatteryCurrent    *float64         `json:"battery_current,omitempty" example:"2.3"`
	BatteryPercentage *float64         `json:"battery_percentage,omitempty" example:"85.5"`
	RSSI              *int             `json:"rssi,omitempty" example:"-65"`
	Mode              *string          `json:"mode,omitempty" example:"AUTO"`
	Latitude          *float64         `json:"latitude,omitempty" example:"-6.2088"`
	Longitude         *float64         `json:"longitude,omitempty" example:"106.8456"`
	Altitude          *float64         `json:"altitude,omitempty" example:"10.5"`
	Heading           *float64         `json:"heading,omitempty" example:"90.5"`
	Armed             *bool            `json:"armed,omitempty" example:"true"`
	GPSok             *bool            `json:"gps_ok,omitempty" example:"true"`
	SystemStatus      *string          `json:"system_status,omitempty" example:"OK"`
	Speed             *float64         `json:"speed,omitempty" example:"5.2"`
	Roll              *float64         `json:"roll,omitempty" example:"0.5"`
	Pitch             *float64         `json:"pitch,omitempty" example:"1.2"`
	Yaw               *float64         `json:"yaw,omitempty" example:"90.5"`
	TemperatureSystem *FlexibleString  `json:"temperature_system,omitempty" example:"Normal"`
}

