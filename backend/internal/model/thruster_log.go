package model

import "time"

// ThrusterLog records every thruster override command sent to a vehicle
type ThrusterLog struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	VehicleID   uint      `json:"vehicle_id" gorm:"not null;index"`
	Vehicle     *Vehicle  `json:"vehicle,omitempty" gorm:"foreignKey:VehicleID;constraint:OnDelete:CASCADE"`
	VehicleCode string    `json:"vehicle_code" gorm:"type:varchar(64);not null;index"`
	Event       string    `json:"event" gorm:"type:varchar(32);not null"` // OVERRIDE or RELEASE
	ThrottlePct int       `json:"throttle_pct" gorm:"not null;default:0"`  // -100..100
	SteeringPct int       `json:"steering_pct" gorm:"not null;default:0"`  // -100..100
	InitiatedAt time.Time `json:"initiated_at" gorm:"not null;index"`
	CreatedAt   time.Time `json:"created_at" gorm:"autoCreateTime;index"`
}

func (ThrusterLog) TableName() string {
	return "thruster_logs"
}

// ThrusterLogQuery for filtering thruster logs
type ThrusterLogQuery struct {
	VehicleID   uint      `query:"vehicle_id"`
	VehicleIDs  []uint    // filter by multiple vehicle IDs (user-scoped)
	VehicleCode string    `query:"vehicle_code"`
	Event       string    `query:"event"`
	StartTime   time.Time `query:"start_time"`
	EndTime     time.Time `query:"end_time"`
	Order       string    `query:"order"`
	Limit       int       `query:"limit"`
	Offset      int       `query:"offset"`
}
