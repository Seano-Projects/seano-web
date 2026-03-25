package mqtt

import (
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	mqtt "github.com/eclipse/paho.mqtt.golang"

	"go-fiber-pgsql/internal/model"
	"go-fiber-pgsql/internal/repository"
	wsocket "go-fiber-pgsql/internal/websocket"
)

// SensorLogListener handles MQTT messages for sensor data logs
type SensorLogListener struct {
	client        mqtt.Client
	sensorLogRepo *repository.SensorLogRepository
	vehicleRepo   *repository.VehicleRepository
	sensorRepo    *repository.SensorRepository
	wsHub         *wsocket.Hub
}

// NewSensorLogListener creates a new sensor log listener
func NewSensorLogListener(client mqtt.Client, sensorLogRepo *repository.SensorLogRepository, vehicleRepo *repository.VehicleRepository, sensorRepo *repository.SensorRepository, wsHub *wsocket.Hub) *SensorLogListener {
	return &SensorLogListener{
		client:        client,
		sensorLogRepo: sensorLogRepo,
		vehicleRepo:   vehicleRepo,
		sensorRepo:    sensorRepo,
		wsHub:         wsHub,
	}
}

// Start subscribes to sensor data topics and processes messages
func (l *SensorLogListener) Start() error {
	// Topic pattern: seano/{vehicle_code}/{sensor_code}/data
	topic := "seano/+/+/data"
	
	token := l.client.Subscribe(topic, 1, l.handleMessage)
	token.Wait()
	
	if token.Error() != nil {
		return fmt.Errorf("failed to subscribe to %s: %w", topic, token.Error())
	}
	
	log.Printf("✓ MQTT Sensor Log Listener subscribed to topic: %s", topic)
	return nil
}

// handleMessage processes incoming MQTT messages
func (l *SensorLogListener) handleMessage(client mqtt.Client, msg mqtt.Message) {
	// Parse topic: seano/{vehicle_code}/{sensor_code}/data
	parts := strings.Split(msg.Topic(), "/")
	if len(parts) != 4 {
		log.Printf("Invalid topic format: %s", msg.Topic())
		return
	}
	
	vehicleCodeFromTopic := parts[1]
	sensorCodeFromTopic := parts[2]
	
	// Parse and validate JSON
	var payloadData map[string]interface{}
	if err := json.Unmarshal(msg.Payload(), &payloadData); err != nil {
		log.Printf("Invalid JSON payload: %v", err)
		return
	}
	
	// Use vehicle_code and sensor_code from JSON if provided, otherwise use from topic
	vehicleCode := vehicleCodeFromTopic
	if vCode, ok := payloadData["vehicle_code"].(string); ok && vCode != "" {
		vehicleCode = vCode
	}
	
	sensorCode := sensorCodeFromTopic
	if sCode, ok := payloadData["sensor_code"].(string); ok && sCode != "" {
		sensorCode = sCode
	}
	
	// Get vehicle ID from code
	vehicle, err := l.vehicleRepo.GetVehicleByCode(vehicleCode)
	if err != nil {
		log.Printf("Vehicle not found for code %s: %v", vehicleCode, err)
		return
	}
	
	// Get sensor ID from code
	sensor, err := l.sensorRepo.GetSensorByCode(sensorCode)
	if err != nil {
		log.Printf("Sensor not found for code %s: %v", sensorCode, err)
		return
	}
	
	// Store raw JSON data
	dataJSON := string(msg.Payload())

	// Use sensor-provided event time when available.
	createdAt := time.Now()
	if dateTime, ok := payloadData["date_time"].(string); ok && dateTime != "" {
		if parsedTime, err := time.Parse(time.RFC3339, dateTime); err == nil {
			createdAt = parsedTime
		}
	}
	
	// Create sensor log
	sensorLog := &model.SensorLog{
		VehicleID: vehicle.ID,
		SensorID:  sensor.ID,
		Data:      dataJSON,
		CreatedAt: createdAt,
	}
	
	if err := l.sensorLogRepo.CreateSensorLog(sensorLog); err != nil {
		log.Printf("Failed to save sensor log: %v", err)
		return
	}
	
	log.Printf("✓ Sensor log saved: vehicle=%s, sensor=%s, id=%d", vehicleCode, sensorCode, sensorLog.ID)
	
	// Broadcast via WebSocket
	if l.wsHub != nil {
		wsData := wsocket.SensorLogData{
			ID:        sensorLog.ID,
			VehicleID: sensorLog.VehicleID,
			SensorID:  sensorLog.SensorID,
			Vehicle: &wsocket.VehicleInfo{
				Code: vehicle.Code,
				Name: vehicle.Name,
			},
			Sensor: &wsocket.SensorInfo{
				Code:  sensor.Code,
				Brand: sensor.Brand,
				Model: sensor.Model,
			},
			Data:      dataJSON,
			CreatedAt: sensorLog.CreatedAt.Format(time.RFC3339),
		}
		l.wsHub.BroadcastSensorLog(wsData, sensorLog.CreatedAt.Format("2006-01-02T15:04:05Z07:00"))
	}
}

