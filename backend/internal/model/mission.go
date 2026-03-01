package model

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"
)

// Waypoint represents a GPS waypoint with lat/lng coordinates
type Waypoint struct {
	Lat float64 `json:"lat"`
	Lng float64 `json:"lng"`
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

// Request/Response Models for Mission
type CreateMissionRequest struct {
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
	Progress          float64   `json:"progress"`
	EnergyConsumed    float64   `json:"energy_consumed"`
	TimeElapsed       int64     `json:"time_elapsed"`
	CurrentWaypoint   int       `json:"current_waypoint"`
	CompletedWaypoint int       `json:"completed_waypoint"`
	Status            string    `json:"status"`
	Timestamp         time.Time `json:"timestamp"`
}
