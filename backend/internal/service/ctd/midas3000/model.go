package midas3000

import "time"

// CTDColumnarMessage is the raw MQTT payload in columnar format.
// One message per dive; all depth readings packed as arrays to save bandwidth.
type CTDColumnarMessage struct {
	Timestamp   string          `json:"timestamp"`
	VehicleCode string          `json:"vehicle_code"`
	SensorCode  string          `json:"sensor_code"`
	Latitude    float64         `json:"latitude"`
	Longitude   float64         `json:"longitude"`
	Altitude    float64         `json:"altitude"`
	GpsOk       bool            `json:"gps_ok"`
	Columns     []string        `json:"columns"`
	Units       []string        `json:"units"`
	Data        [][]interface{} `json:"data"`
}

// CTDReading is a single depth reading expanded from one row in CTDColumnarMessage.Data.
type CTDReading struct {
	Depth         float64 `json:"depth"`
	Pressure      float64 `json:"pressure"`
	Temperature   float64 `json:"temperature"`
	Conductivity  float64 `json:"conductivity"`
	Salinity      float64 `json:"salinity"`
	Density       float64 `json:"density"`
	SoundVelocity float64 `json:"sound_velocity"`
}

// CTDMidas3000Batch holds parsed metadata and all expanded readings for one dive.
type CTDMidas3000Batch struct {
	Timestamp   time.Time
	VehicleCode string
	SensorCode  string
	Latitude    float64
	Longitude   float64
	Altitude    float64
	GpsOk       bool
	Readings    []CTDReading
}
