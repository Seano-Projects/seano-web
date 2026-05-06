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
	missionRepo   *repository.MissionRepository
	wsHub         *wsocket.Hub
}

// NewSensorLogListener creates a new sensor log listener
func NewSensorLogListener(client mqtt.Client, sensorLogRepo *repository.SensorLogRepository, vehicleRepo *repository.VehicleRepository, sensorRepo *repository.SensorRepository, missionRepo *repository.MissionRepository, wsHub *wsocket.Hub) *SensorLogListener {
	return &SensorLogListener{
		client:        client,
		sensorLogRepo: sensorLogRepo,
		vehicleRepo:   vehicleRepo,
		sensorRepo:    sensorRepo,
		missionRepo:   missionRepo,
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

	// Record the moment MQTT message was received by the backend
	mqttReceivedAt := time.Now()

	// Parse USV timestamp from payload (Jetson-side timestamp) — support sub-second precision
	var usvTimestamp *time.Time
	createdAt := mqttReceivedAt
	if dateTime, ok := payloadData["date_time"].(string); ok && dateTime != "" {
		var parsedTime time.Time
		var err error
		// Try RFC3339Nano first (supports microseconds), then RFC3339
		parsedTime, err = time.Parse(time.RFC3339Nano, dateTime)
		if err != nil {
			parsedTime, err = time.Parse(time.RFC3339, dateTime)
		}
		if err == nil {
			usvTimestamp = &parsedTime
			createdAt = parsedTime
		}
	}

	// Create sensor log
	sensorLog := &model.SensorLog{
		VehicleID:      vehicle.ID,
		SensorID:       sensor.ID,
		Data:           dataJSON,
		CreatedAt:      createdAt,
		UsvTimestamp:   usvTimestamp,
		MqttReceivedAt: &mqttReceivedAt,
	}

	// Auto-detect active mission for this vehicle
	if l.missionRepo != nil {
		if activeMission, err := l.missionRepo.GetLatestActiveMissionByVehicleID(vehicle.ID); err == nil {
			sensorLog.MissionID = &activeMission.ID
			sensorLog.MissionCode = &activeMission.MissionCode
		}
	}

	if err := l.sensorLogRepo.CreateSensorLog(sensorLog); err != nil {
		log.Printf("Failed to save sensor log: %v", err)
		return
	}

	wsSentAt := time.Now()
	if err := l.sensorLogRepo.UpdateWSSentAt(sensorLog.ID, wsSentAt); err != nil {
		log.Printf("Failed to update sensor ws_sent_at: %v", err)
	} else {
		sensorLog.WsSentAt = &wsSentAt
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
			CreatedAt: sensorLog.CreatedAt.Format(time.RFC3339Nano),
			UsvTimestamp: func() string {
				if sensorLog.UsvTimestamp != nil {
					return sensorLog.UsvTimestamp.Format(time.RFC3339Nano)
				}
				return ""
			}(),
			MqttReceivedAt: func() string {
				if sensorLog.MqttReceivedAt != nil {
					return sensorLog.MqttReceivedAt.Format(time.RFC3339Nano)
				}
				return ""
			}(),
		}
		l.wsHub.BroadcastSensorLog(wsData, sensorLog.CreatedAt.Format(time.RFC3339Nano), wsSentAt.UTC().Format(time.RFC3339Nano))
	}
}

