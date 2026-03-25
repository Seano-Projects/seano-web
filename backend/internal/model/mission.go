package model

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Waypoint represents a GPS waypoint with lat/lng coordinates
type Waypoint struct {
	Name     string    `json:"name,omitempty"`
	Type     string    `json:"type,omitempty"`
	Lat      float64   `json:"lat"`
	Lng      float64   `json:"lng"`
	Shape    string    `json:"shape,omitempty"`
	Altitude float64   `json:"altitude,omitempty"`
	Speed    float64   `json:"speed,omitempty"`
	Delay    float64   `json:"delay,omitempty"`
	Loiter   float64   `json:"loiter,omitempty"`
	Radius   float64   `json:"radius,omitempty"`
	Action   string    `json:"action,omitempty"`
	Bounds   *Bounds   `json:"bounds,omitempty"`
	Vertices []Waypoint `json:"vertices,omitempty"`
	Pattern  string    `json:"pattern,omitempty"`
	Coverage float64   `json:"coverage,omitempty"`
	Overlap  float64   `json:"overlap,omitempty"`
}

type Bounds struct {
	North float64 `json:"north"`
	South float64 `json:"south"`
	East  float64 `json:"east"`
	West  float64 `json:"west"`
}

// WaypointArray is a custom type for JSON array of waypoints
type WaypointArray []Waypoint

// Value converts WaypointArray to JSON for database storage
func (w WaypointArray) Value() (driver.Value, error) {
	return json.Marshal(w)
}

// Scan converts database JSON to WaypointArray
func (w *WaypointArray) Scan(value interface{}) error {
	if value == nil {
		*w = WaypointArray{}
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("failed to scan waypoints")
	}
	return json.Unmarshal(bytes, w)
}

type Mission struct {
	ID                uint          `json:"id" gorm:"primaryKey"`
	MissionCode       string        `json:"mission_code" gorm:"type:varchar(64);uniqueIndex"`
	Name              string        `json:"name" gorm:"type:varchar(200);not null"`
	Description       string        `json:"description" gorm:"type:text"`
	Status            string        `json:"status" gorm:"type:varchar(20);default:'Draft'"` // Draft, Ongoing, Completed, Failed, Cancelled
	VehicleID         *uint         `json:"vehicle_id" gorm:"index"`
	Vehicle           *Vehicle      `json:"vehicle,omitempty" gorm:"foreignKey:VehicleID;constraint:OnDelete:SET NULL"`
	Waypoints         WaypointArray `json:"waypoints" gorm:"type:jsonb"`
	HomeLocation      *Waypoint     `json:"home_location,omitempty" gorm:"type:jsonb;serializer:json"`
	StartTime         *time.Time    `json:"start_time"`
	EndTime           *time.Time    `json:"end_time"`
	Progress          float64       `json:"progress" gorm:"type:decimal(5,2);default:0"`              // Progress percentage (0-100)
	EnergyConsumed    float64       `json:"energy_consumed" gorm:"type:decimal(10,2);default:0"`      // kWh consumed
	EnergyBudget      float64       `json:"energy_budget" gorm:"type:decimal(10,2)"`                  // kWh budget
	TimeElapsed       int64         `json:"time_elapsed" gorm:"default:0"`                            // seconds
	CurrentWaypoint   int           `json:"current_waypoint" gorm:"default:0"`                        // Current waypoint index
	CompletedWaypoint int           `json:"completed_waypoint" gorm:"default:0"`                      // Number of completed waypoints
	LastUpdateTime    *time.Time    `json:"last_update_time"`                                         // Last progress update
	CreatedBy         *uint         `json:"created_by,omitempty" gorm:"index"`
	Creator           *User         `json:"creator,omitempty" gorm:"foreignKey:CreatedBy;constraint:OnDelete:SET NULL"`
	CreatedAt         time.Time     `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt         time.Time     `json:"updated_at" gorm:"autoUpdateTime"`
}

func (m *Mission) BeforeCreate(_ *gorm.DB) error {
	if m.MissionCode == "" {
		m.MissionCode = "MSN-" + uuid.New().String()[:8]
	}
	return nil
}

// Request/Response Models for Mission
type CreateMissionRequest struct {
	MissionCode  string     `json:"mission_code,omitempty" example:"MSN-a1b2c3d4"`
	Name         string     `json:"name" example:"Mission Alpha"`
	Description  string     `json:"description" example:"Survey mission in sector A"`
	Status       string     `json:"status,omitempty" example:"Draft"`
	VehicleID    *uint      `json:"vehicle_id,omitempty" example:"1"`
	Waypoints    []Waypoint `json:"waypoints,omitempty"`
	HomeLocation *Waypoint  `json:"home_location,omitempty"`
	StartTime    *time.Time `json:"start_time,omitempty"`
	EndTime      *time.Time `json:"end_time,omitempty"`
	EnergyBudget float64    `json:"energy_budget,omitempty" example:"5.5"`
}

type UpdateMissionRequest struct {
	MissionCode        *string    `json:"mission_code,omitempty"`
	Name              *string    `json:"name,omitempty"`
	Description       *string    `json:"description,omitempty"`
	Status            *string    `json:"status,omitempty"`
	VehicleID         *uint      `json:"vehicle_id,omitempty"`
	Waypoints         []Waypoint `json:"waypoints,omitempty"`
	HomeLocation      *Waypoint  `json:"home_location,omitempty"`
	StartTime         *time.Time `json:"start_time,omitempty"`
	EndTime           *time.Time `json:"end_time,omitempty"`
	Progress          *float64   `json:"progress,omitempty"`
	EnergyConsumed    *float64   `json:"energy_consumed,omitempty"`
	EnergyBudget      *float64   `json:"energy_budget,omitempty"`
	TimeElapsed       *int64     `json:"time_elapsed,omitempty"`
	CurrentWaypoint   *int       `json:"current_waypoint,omitempty"`
	CompletedWaypoint *int       `json:"completed_waypoint,omitempty"`
}

type MissionStats struct {
	TotalMissions     int64 `json:"total_missions"`
	DraftMissions     int64 `json:"draft_missions"`
	OngoingMissions   int64 `json:"ongoing_missions"`
	CompletedMissions int64 `json:"completed_missions"`
	FailedMissions    int64 `json:"failed_missions"`
}

type MissionProgressUpdate struct {
	MissionID         uint      `json:"mission_id"`
	MissionCode       string    `json:"mission_code,omitempty"`
	Progress          float64   `json:"progress"`
	EnergyConsumed    float64   `json:"energy_consumed"`
	TimeElapsed       int64     `json:"time_elapsed"`
	CurrentWaypoint   int       `json:"current_waypoint"`
	CompletedWaypoint int       `json:"completed_waypoint"`
	Status            string    `json:"status"`
	Timestamp         time.Time `json:"timestamp"`
}
