package midas3000

import (
	"fmt"
	"log"
	"time"

	"go-fiber-pgsql/internal/repository"
	wsocket "go-fiber-pgsql/internal/websocket"
)

type DataHandler struct {
	sensorLogRepo     *repository.SensorLogRepository
	vehicleSensorRepo *repository.VehicleSensorRepository
	wsHub             *wsocket.Hub
}

func NewDataHandler(sensorLogRepo *repository.SensorLogRepository, vehicleSensorRepo *repository.VehicleSensorRepository, wsHub *wsocket.Hub) *DataHandler {
	return &DataHandler{
		sensorLogRepo:     sensorLogRepo,
		vehicleSensorRepo: vehicleSensorRepo,
		wsHub:             wsHub,
	}
}

// ParseColumnar expands a raw columnar MQTT message into a typed batch.
// Returns an error if required fields are missing or columns are invalid.
func (h *DataHandler) ParseColumnar(raw *CTDColumnarMessage) (*CTDMidas3000Batch, error) {
	if raw == nil {
		return nil, fmt.Errorf("nil message")
	}
	if raw.VehicleCode == "" {
		return nil, fmt.Errorf("vehicle_code is required")
	}
	if raw.SensorCode == "" {
		return nil, fmt.Errorf("sensor_code is required")
	}
	if raw.Timestamp == "" {
		return nil, fmt.Errorf("timestamp is required")
	}
	if len(raw.Data) == 0 {
		return nil, fmt.Errorf("data array is empty")
	}

	ts, err := time.Parse(time.RFC3339Nano, raw.Timestamp)
	if err != nil {
		return nil, fmt.Errorf("invalid timestamp %q: %w", raw.Timestamp, err)
	}

	colIdx := make(map[string]int, len(raw.Columns))
	for i, col := range raw.Columns {
		colIdx[col] = i
	}

	required := []string{"depth", "pressure", "temperature", "conductivity", "salinity", "density", "sound_velocity"}
	for _, col := range required {
		if _, ok := colIdx[col]; !ok {
			return nil, fmt.Errorf("missing required column %q", col)
		}
	}

	readings := make([]CTDReading, 0, len(raw.Data))
	for i, row := range raw.Data {
		r, ok := rowToReading(row, colIdx)
		if !ok {
			log.Printf("CTD: skipping row %d — null or non-numeric value", i)
			continue
		}
		readings = append(readings, r)
	}

	if len(readings) == 0 {
		return nil, fmt.Errorf("no valid readings parsed from %d rows", len(raw.Data))
	}

	return &CTDMidas3000Batch{
		Timestamp:   ts,
		VehicleCode: raw.VehicleCode,
		SensorCode:  raw.SensorCode,
		Latitude:    raw.Latitude,
		Longitude:   raw.Longitude,
		Altitude:    raw.Altitude,
		GpsOk:       raw.GpsOk,
		Readings:    readings,
	}, nil
}

// rowToReading maps one data row to a CTDReading using the column index map.
// Returns false if any required value is null or not a float64.
func rowToReading(row []interface{}, colIdx map[string]int) (CTDReading, bool) {
	get := func(name string) (float64, bool) {
		i, ok := colIdx[name]
		if !ok || i >= len(row) || row[i] == nil {
			return 0, false
		}
		f, ok := row[i].(float64)
		return f, ok
	}

	depth, ok1 := get("depth")
	pressure, ok2 := get("pressure")
	temperature, ok3 := get("temperature")
	conductivity, ok4 := get("conductivity")
	salinity, ok5 := get("salinity")
	density, ok6 := get("density")
	soundVelocity, ok7 := get("sound_velocity")

	if !ok1 || !ok2 || !ok3 || !ok4 || !ok5 || !ok6 || !ok7 {
		return CTDReading{}, false
	}

	return CTDReading{
		Depth:         depth,
		Pressure:      pressure,
		Temperature:   temperature,
		Conductivity:  conductivity,
		Salinity:      salinity,
		Density:       density,
		SoundVelocity: soundVelocity,
	}, true
}

// ProcessBatch validates, stores, and broadcasts a parsed CTD batch.
func (h *DataHandler) ProcessBatch(batch *CTDMidas3000Batch) error {
	if err := h.validateBatch(batch); err != nil {
		return fmt.Errorf("validation failed: %w", err)
	}

	log.Printf("CTD batch: vehicle=%s sensor=%s readings=%d depth=%.1f–%.1fm",
		batch.VehicleCode, batch.SensorCode, len(batch.Readings),
		batch.Readings[0].Depth, batch.Readings[len(batch.Readings)-1].Depth)

	// TODO: Save to sensor_logs (needs vehicle/sensor ID lookup from codes)
	log.Printf("TODO: Save CTD batch to sensor_logs for vehicle=%s sensor=%s", batch.VehicleCode, batch.SensorCode)

	if err := h.updateVehicleSensorLastReading(batch); err != nil {
		log.Printf("Warning: failed to update vehicle_sensor last reading: %v", err)
	}

	if h.wsHub != nil {
		wsMsg := wsocket.SensorDataMessage{
			MessageType: "sensor_data",
			SensorType:  "ctd_midas3000",
			VehicleCode: batch.VehicleCode,
			SensorCode:  batch.SensorCode,
			Timestamp:   batch.Timestamp.Format(time.RFC3339Nano),
			Data:        h.toBroadcastData(batch),
		}
		if err := h.wsHub.BroadcastSensorData(wsMsg); err != nil {
			log.Printf("Warning: failed to broadcast via WebSocket: %v", err)
		} else {
			log.Printf("Broadcasted CTD batch (%d readings) to %d WebSocket clients",
				len(batch.Readings), h.wsHub.GetClientCount())
		}
	}

	return nil
}

// ctdWsBroadcast is the payload shape sent to the frontend.
// Uses profile[] so useCTDData.js can parse it without changes.
type ctdWsBroadcast struct {
	Timestamp   string       `json:"timestamp"`
	VehicleCode string       `json:"vehicle_code"`
	SensorCode  string       `json:"sensor_code"`
	Latitude    float64      `json:"latitude"`
	Longitude   float64      `json:"longitude"`
	Altitude    float64      `json:"altitude"`
	GpsOk       bool         `json:"gps_ok"`
	Profile     []CTDReading `json:"profile"`
}

func (h *DataHandler) toBroadcastData(batch *CTDMidas3000Batch) ctdWsBroadcast {
	return ctdWsBroadcast{
		Timestamp:   batch.Timestamp.Format(time.RFC3339Nano),
		VehicleCode: batch.VehicleCode,
		SensorCode:  batch.SensorCode,
		Latitude:    batch.Latitude,
		Longitude:   batch.Longitude,
		Altitude:    batch.Altitude,
		GpsOk:       batch.GpsOk,
		Profile:     batch.Readings,
	}
}

func (h *DataHandler) validateBatch(batch *CTDMidas3000Batch) error {
	if batch == nil {
		return fmt.Errorf("nil batch")
	}
	if batch.VehicleCode == "" {
		return fmt.Errorf("vehicle_code is required")
	}
	if batch.SensorCode == "" {
		return fmt.Errorf("sensor_code is required")
	}
	if batch.Timestamp.IsZero() {
		return fmt.Errorf("timestamp is required")
	}
	if len(batch.Readings) == 0 {
		return fmt.Errorf("readings array is empty")
	}
	for i, r := range batch.Readings {
		if err := validateReading(r, i); err != nil {
			return err
		}
	}
	return nil
}

func validateReading(r CTDReading, idx int) error {
	if r.Depth < -10 || r.Depth > 6000 {
		return fmt.Errorf("reading[%d]: depth %.2f out of range [-10, 6000]", idx, r.Depth)
	}
	if r.Pressure < -10 || r.Pressure > 6120 {
		return fmt.Errorf("reading[%d]: pressure %.2f out of range [-10, 6120]", idx, r.Pressure)
	}
	if r.Temperature < -2.0 || r.Temperature > 40.0 {
		return fmt.Errorf("reading[%d]: temperature %.2f out of range [-2, 40]", idx, r.Temperature)
	}
	if r.Conductivity < 0 || r.Conductivity > 100 {
		return fmt.Errorf("reading[%d]: conductivity %.2f out of range [0, 100]", idx, r.Conductivity)
	}
	if r.Salinity < 0 || r.Salinity > 45 {
		return fmt.Errorf("reading[%d]: salinity %.2f out of range [0, 45]", idx, r.Salinity)
	}
	if r.Density < 990 || r.Density > 1050 {
		return fmt.Errorf("reading[%d]: density %.2f out of range [990, 1050]", idx, r.Density)
	}
	if r.SoundVelocity < 1400 || r.SoundVelocity > 1600 {
		return fmt.Errorf("reading[%d]: sound_velocity %.2f out of range [1400, 1600]", idx, r.SoundVelocity)
	}
	return nil
}

func (h *DataHandler) updateVehicleSensorLastReading(batch *CTDMidas3000Batch) error {
	log.Printf("TODO: Update vehicle_sensor last reading for vehicle=%s sensor=%s",
		batch.VehicleCode, batch.SensorCode)
	return nil
}
