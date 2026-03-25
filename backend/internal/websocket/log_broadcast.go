package websocket

import (
	"encoding/json"
	"log"
)

// LogMessage represents a log message to be broadcasted
type LogMessage struct {
	Type      string      `json:"type"`       // "vehicle_log", "sensor_log", "raw_log"
	Timestamp string      `json:"timestamp"`  // ISO 8601 format
	Data      interface{} `json:"data"`       // Actual log data
}

// VehicleInfo represents vehicle basic info for frontend
type VehicleInfo struct {
	Code string `json:"code"`
	Name string `json:"name"`
}

// VehicleLogData represents vehicle telemetry log data
type VehicleLogData struct {
	ID                  uint         `json:"id"`
	VehicleID           uint         `json:"vehicle_id"`
	MissionID           uint         `json:"mission_id,omitempty"`
	MissionCode         *string      `json:"mission_code,omitempty"`
	Vehicle             *VehicleInfo `json:"vehicle,omitempty"`
	BatteryVoltage      *float64     `json:"battery_voltage,omitempty"`
	BatteryCurrent      *float64     `json:"battery_current,omitempty"`
	BatteryPercentage   *float64     `json:"battery_percentage,omitempty"`
	RSSI                *int         `json:"rssi,omitempty"`
	Mode                *string      `json:"mode,omitempty"`
	Latitude            *float64     `json:"latitude,omitempty"`
	Longitude           *float64     `json:"longitude,omitempty"`
	Altitude            *float64     `json:"altitude,omitempty"`
	Heading             *float64     `json:"heading,omitempty"`
	Armed               *bool        `json:"armed,omitempty"`
	GPSok               *bool        `json:"gps_ok,omitempty"`
	SystemStatus        *string      `json:"system_status,omitempty"`
	Speed               *float64     `json:"speed,omitempty"`
	Roll                *float64     `json:"roll,omitempty"`
	Pitch               *float64     `json:"pitch,omitempty"`
	Yaw                 *float64     `json:"yaw,omitempty"`
	TemperatureSystem   *string      `json:"temperature_system,omitempty"`
	CreatedAt           string       `json:"created_at"`
}

// SensorInfo represents sensor basic info for frontend
type SensorInfo struct {
	Code  string `json:"code"`
	Brand string `json:"brand"`
	Model string `json:"model"`
}

// SensorLogData represents sensor data log
type SensorLogData struct {
	ID        uint         `json:"id"`
	VehicleID uint         `json:"vehicle_id"`
	SensorID  uint         `json:"sensor_id"`
	Vehicle   *VehicleInfo `json:"vehicle,omitempty"`
	Sensor    *SensorInfo  `json:"sensor,omitempty"`
	Data      string       `json:"data"` // JSON string
	CreatedAt string       `json:"created_at"`
}

// RawLogData represents raw text log
type RawLogData struct {
	ID        uint         `json:"id"`
	Vehicle   *VehicleInfo `json:"vehicle,omitempty"`
	Logs      string       `json:"logs"`
	CreatedAt string       `json:"created_at"`
}

// BatteryMessage represents battery data message
type BatteryMessage struct {
	Type        string   `json:"type"` // "battery"
	VehicleID   uint     `json:"vehicle_id"`
	VehicleCode string   `json:"vehicle_code"`
	BatteryID   int      `json:"battery_id"`   // 1 or 2
	Percentage  float64  `json:"percentage"`   // 0-100
	Voltage     *float64 `json:"voltage,omitempty"`
	Current     *float64 `json:"current,omitempty"`
	Temperature *float64 `json:"temperature,omitempty"`
	Status      string   `json:"status"` // charging, discharging, full, low, normal
	Timestamp   string   `json:"timestamp,omitempty"`
}

// BroadcastVehicleLog broadcasts vehicle log to all connected clients
func (h *Hub) BroadcastVehicleLog(data VehicleLogData, timestamp string) error {
	msg := LogMessage{
		Type:      "vehicle_log",
		Timestamp: timestamp,
		Data:      data,
	}
	
	jsonData, err := json.Marshal(msg)
	if err != nil {
		log.Printf("Failed to marshal vehicle log: %v", err)
		return err
	}
	
	h.broadcast <- jsonData
	log.Printf("Broadcasted vehicle log ID=%d to %d clients", data.ID, h.GetClientCount())
	return nil
}

// BroadcastSensorLog broadcasts sensor log to all connected clients
func (h *Hub) BroadcastSensorLog(data SensorLogData, timestamp string) error {
	msg := LogMessage{
		Type:      "sensor_log",
		Timestamp: timestamp,
		Data:      data,
	}
	
	jsonData, err := json.Marshal(msg)
	if err != nil {
		log.Printf("Failed to marshal sensor log: %v", err)
		return err
	}
	
	h.broadcast <- jsonData
	log.Printf("Broadcasted sensor log ID=%d to %d clients", data.ID, h.GetClientCount())
	return nil
}

// BroadcastRawLog broadcasts raw log to all connected clients
func (h *Hub) BroadcastRawLog(data RawLogData, timestamp string) error {
	msg := LogMessage{
		Type:      "raw_log",
		Timestamp: timestamp,
		Data:      data,
	}
	
	jsonData, err := json.Marshal(msg)
	if err != nil {
		log.Printf("Failed to marshal raw log: %v", err)
		return err
	}
	
	h.broadcast <- jsonData
	log.Printf("Broadcasted raw log ID=%d to %d clients", data.ID, h.GetClientCount())
	return nil
}

// BroadcastToVehicle broadcasts message to all clients watching a specific vehicle
func (h *Hub) BroadcastToVehicle(vehicleID uint, data interface{}) error {
	jsonData, err := json.Marshal(data)
	if err != nil {
		log.Printf("Failed to marshal data: %v", err)
		return err
	}

	h.broadcast <- jsonData
	log.Printf("Broadcasted to vehicle %d: %d clients", vehicleID, h.GetClientCount())
	return nil
}