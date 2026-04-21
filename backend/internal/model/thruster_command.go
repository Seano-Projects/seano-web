package model

import "time"

// ThrusterCommand records a thruster control request for a vehicle.
type ThrusterCommand struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	VehicleID   uint      `json:"vehicle_id" gorm:"not null;index"`
	Vehicle     *Vehicle  `json:"vehicle,omitempty" gorm:"foreignKey:VehicleID;constraint:OnDelete:CASCADE"`
	VehicleCode string    `json:"vehicle_code" gorm:"type:varchar(64);not null;index"`
	Throttle    int       `json:"throttle" gorm:"not null"` // -100..100
	Steering    int       `json:"steering" gorm:"not null"` // -100..100
	InitiatedAt time.Time `json:"initiated_at" gorm:"not null;index"`
	ExpiresAt   time.Time `json:"expires_at" gorm:"not null;index"`
	CreatedAt   time.Time `json:"created_at" gorm:"autoCreateTime;index"`
}

func (ThrusterCommand) TableName() string {
	return "thruster_commands"
}

// CreateThrusterCommandRequest is the request body for creating a thruster command
// ttl_ms is optional and defaults to a short window on the backend.
type CreateThrusterCommandRequest struct {
	VehicleID   uint  `json:"vehicle_id"`
	VehicleCode string `json:"vehicle_code"`
	Throttle    int   `json:"throttle"`
	Steering    int   `json:"steering"`
	TTLms       int   `json:"ttl_ms,omitempty"`
}
