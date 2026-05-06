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

// VehicleLogListener handles MQTT messages for vehicle telemetry logs
type VehicleLogListener struct {
	client         mqtt.Client
	vehicleLogRepo *repository.VehicleLogRepository
	vehicleRepo    *repository.VehicleRepository
	missionRepo    *repository.MissionRepository
	wsHub          *wsocket.Hub
}

// NewVehicleLogListener creates a new vehicle log listener
func NewVehicleLogListener(client mqtt.Client, vehicleLogRepo *repository.VehicleLogRepository, vehicleRepo *repository.VehicleRepository, missionRepo *repository.MissionRepository, wsHub *wsocket.Hub) *VehicleLogListener {
	return &VehicleLogListener{
		client:         client,
		vehicleLogRepo: vehicleLogRepo,
		vehicleRepo:    vehicleRepo,
		missionRepo:    missionRepo,
		wsHub:          wsHub,
	}
}

// Start subscribes to vehicle telemetry topics and processes messages
func (l *VehicleLogListener) Start() error {
	// Topic pattern: seano/{vehicle_code}/telemetry
	topic := "seano/+/telemetry"
	
	token := l.client.Subscribe(topic, 1, l.handleMessage)
	token.Wait()
	
	if token.Error() != nil {
		return fmt.Errorf("failed to subscribe to %s: %w", topic, token.Error())
	}
	
	log.Printf("✓ MQTT Vehicle Log Listener subscribed to topic: %s", topic)
	return nil
}

// handleMessage processes incoming MQTT messages
func (l *VehicleLogListener) handleMessage(client mqtt.Client, msg mqtt.Message) {
	log.Printf("🚗 Received vehicle telemetry on topic: %s", msg.Topic())
	log.Printf("   Payload: %s", string(msg.Payload()))
	
	// Parse topic: seano/{vehicle_code}/telemetry
	parts := strings.Split(msg.Topic(), "/")
	if len(parts) != 3 {
		log.Printf("❌ Invalid topic format: %s", msg.Topic())
		return
	}
	
	vehicleCodeFromTopic := parts[1]
	log.Printf("   Vehicle code from topic: %s", vehicleCodeFromTopic)
	
	// Parse JSON payload (might contain vehicle_code)
	var payloadWithCode struct {
		VehicleCode *string `json:"vehicle_code"`
		model.CreateVehicleLogRequest
	}
	
	if err := json.Unmarshal(msg.Payload(), &payloadWithCode); err != nil {
		log.Printf("❌ Failed to parse vehicle log data: %v", err)
		log.Printf("   Raw payload: %s", string(msg.Payload()))
		return
	}
	
	log.Printf("   Parsed successfully")
	
	// Use vehicle_code from JSON if provided, otherwise use from topic
	vehicleCode := vehicleCodeFromTopic
	if payloadWithCode.VehicleCode != nil && *payloadWithCode.VehicleCode != "" {
		vehicleCode = *payloadWithCode.VehicleCode
	}
	
	// Get vehicle ID from code
	vehicle, err := l.vehicleRepo.GetVehicleByCode(vehicleCode)
	if err != nil {
		log.Printf("❌ Vehicle not found for code %s: %v", vehicleCode, err)
		return
	}
	
	log.Printf("   Found vehicle: ID=%d, Code=%s, Name=%s", vehicle.ID, vehicle.Code, vehicle.Name)
	
	data := payloadWithCode.CreateVehicleLogRequest

	missionID := data.MissionID
	missionCode := data.MissionCode
	if missionID == nil && (missionCode == nil || *missionCode == "") && l.missionRepo != nil {
		if activeMission, err := l.missionRepo.GetLatestActiveMissionByVehicleID(vehicle.ID); err == nil {
			missionID = &activeMission.ID
			missionCode = &activeMission.MissionCode
			log.Printf("   Fallback mission mapping applied: mission_id=%d mission_code=%s", activeMission.ID, activeMission.MissionCode)
		}
	}
	if missionID == nil && missionCode != nil && *missionCode != "" && l.missionRepo != nil {
		if mission, err := l.missionRepo.GetMissionByCode(*missionCode); err == nil {
			missionID = &mission.ID
		}
	}
	if missionID != nil && (missionCode == nil || *missionCode == "") && l.missionRepo != nil {
		if mission, err := l.missionRepo.GetMissionByID(*missionID); err == nil {
			missionCode = &mission.MissionCode
		}
	}
	
	// Convert FlexibleString to *string for database
	var tempSystem *string
	if data.TemperatureSystem != nil {
		tempSystem = &data.TemperatureSystem.Value
	}
	
	// Calculate battery_percentage if not provided but battery_voltage exists
	batteryPercentage := data.BatteryPercentage
	if batteryPercentage == nil && data.BatteryVoltage != nil {
		// Convert 11V-12.6V to 0-100%
		voltage := *data.BatteryVoltage
		percentage := ((voltage - 11.0) / 1.6) * 100.0
		if percentage < 0 {
			percentage = 0
		}
		if percentage > 100 {
			percentage = 100
		}
		batteryPercentage = &percentage
	}
	
	// Record MQTT receive time and parse USV timestamp for latency measurement
	mqttReceivedAt := time.Now()
	var usvTimestamp *time.Time
	if data.DateTime != nil && *data.DateTime != "" {
		var parsedTime time.Time
		var err error
		parsedTime, err = time.Parse(time.RFC3339Nano, *data.DateTime)
		if err != nil {
			parsedTime, err = time.Parse(time.RFC3339, *data.DateTime)
		}
		if err == nil {
			usvTimestamp = &parsedTime
		}
	}

	// Create vehicle log
	vehicleLog := &model.VehicleLog{
		VehicleID:         vehicle.ID,
		MissionID:         missionID,
		MissionCode:       missionCode,
		BatteryVoltage:    data.BatteryVoltage,
		BatteryCurrent:    data.BatteryCurrent,
		BatteryPercentage: batteryPercentage,
		RSSI:              data.RSSI,
		Mode:              data.Mode,
		Latitude:          data.Latitude,
		Longitude:         data.Longitude,
		Altitude:          data.Altitude,
		Heading:           data.Heading,
		Armed:             data.Armed,
		GPSok:             data.GPSok,
		SystemStatus:      data.SystemStatus,
		Speed:             data.Speed,
		Roll:              data.Roll,
		Pitch:             data.Pitch,
		Yaw:               data.Yaw,
		TemperatureSystem: tempSystem,
		UsvTimestamp:      usvTimestamp,
		MqttReceivedAt:    &mqttReceivedAt,
	}
	
	if err := l.vehicleLogRepo.CreateVehicleLog(vehicleLog); err != nil {
		log.Printf("Failed to save vehicle log: %v", err)
		return
	}

	wsSentAt := time.Now()
	if err := l.vehicleLogRepo.UpdateWSSentAt(vehicleLog.ID, wsSentAt); err != nil {
		log.Printf("Failed to update vehicle ws_sent_at: %v", err)
	} else {
		vehicleLog.WsSentAt = &wsSentAt
	}
	
	log.Printf("✓ Vehicle log saved: vehicle=%s, id=%d", vehicleCode, vehicleLog.ID)
	
	// Broadcast via WebSocket
	if l.wsHub != nil {
		wsData := wsocket.VehicleLogData{
			ID:                vehicleLog.ID,
			VehicleID:         vehicleLog.VehicleID,
			Vehicle: &wsocket.VehicleInfo{
				Code: vehicle.Code,
				Name: vehicle.Name,
			},
			MissionID:         func() uint { if missionID != nil { return *missionID }; return 0 }(),
			MissionCode:       missionCode,
			BatteryVoltage:    vehicleLog.BatteryVoltage,
			BatteryCurrent:    vehicleLog.BatteryCurrent,
			BatteryPercentage: vehicleLog.BatteryPercentage,
			RSSI:              vehicleLog.RSSI,
			Mode:              vehicleLog.Mode,
			Latitude:          vehicleLog.Latitude,
			Longitude:         vehicleLog.Longitude,
			Altitude:          vehicleLog.Altitude,
			Heading:           vehicleLog.Heading,
			Armed:             vehicleLog.Armed,
			GPSok:             vehicleLog.GPSok,
			SystemStatus:      vehicleLog.SystemStatus,
			Speed:             vehicleLog.Speed,
			Roll:              vehicleLog.Roll,
			Pitch:             vehicleLog.Pitch,
			Yaw:               vehicleLog.Yaw,
			TemperatureSystem: vehicleLog.TemperatureSystem,
			CreatedAt:         vehicleLog.CreatedAt.Format(time.RFC3339Nano),
			UsvTimestamp:      func() string {
				if vehicleLog.UsvTimestamp != nil {
					return vehicleLog.UsvTimestamp.Format(time.RFC3339Nano)
				}
				return ""
			}(),
			MqttReceivedAt: func() string {
				if vehicleLog.MqttReceivedAt != nil {
					return vehicleLog.MqttReceivedAt.Format(time.RFC3339Nano)
				}
				return ""
			}(),
		}
		l.wsHub.BroadcastVehicleLog(wsData, vehicleLog.CreatedAt.Format(time.RFC3339Nano), wsSentAt.UTC().Format(time.RFC3339Nano))
	}
}

