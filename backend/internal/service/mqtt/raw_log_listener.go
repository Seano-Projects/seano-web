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

// RawLogListener handles MQTT messages for raw logs
type RawLogListener struct {
	client      mqtt.Client
	rawLogRepo  *repository.RawLogRepository
	vehicleRepo *repository.VehicleRepository
	wsHub       *wsocket.Hub
	saveToDB    bool
}

// NewRawLogListener creates a new raw log listener
func NewRawLogListener(client mqtt.Client, rawLogRepo *repository.RawLogRepository, vehicleRepo *repository.VehicleRepository, wsHub *wsocket.Hub, saveToDB bool) *RawLogListener {
	return &RawLogListener{
		client:      client,
		rawLogRepo:  rawLogRepo,
		vehicleRepo: vehicleRepo,
		wsHub:       wsHub,
		saveToDB:    saveToDB,
	}
}

// Start subscribes to raw log topics and processes messages
func (l *RawLogListener) Start() error {
	// Topic pattern: seano/{vehicle_code}/raw
	topic := "seano/+/raw"
	
	token := l.client.Subscribe(topic, 1, l.handleMessage)
	token.Wait()
	
	if token.Error() != nil {
		return fmt.Errorf("failed to subscribe to %s: %w", topic, token.Error())
	}
	
	log.Printf("✓ MQTT Raw Log Listener subscribed to topic: %s", topic)
	return nil
}

// handleMessage processes incoming MQTT messages
func (l *RawLogListener) handleMessage(client mqtt.Client, msg mqtt.Message) {
	// Parse topic: seano/{vehicle_code}/raw
	parts := strings.Split(msg.Topic(), "/")
	if len(parts) != 3 {
		log.Printf("Invalid topic format: %s", msg.Topic())
		return
	}
	
	vehicleCodeFromTopic := parts[1]
	payload := msg.Payload()
	
	var logText string
	var vehicleCode string
	
	// Try to parse as JSON first
	var jsonPayload map[string]interface{}
	if err := json.Unmarshal(payload, &jsonPayload); err == nil {
		// It's JSON - extract fields
		
		// Get vehicle_code (from JSON or topic)
		if vCode, ok := jsonPayload["vehicle_code"].(string); ok && vCode != "" {
			vehicleCode = vCode
		} else {
			vehicleCode = vehicleCodeFromTopic
		}
		
		// Get log text from various possible fields or nested object
		if logs, ok := jsonPayload["logs"]; ok {
			// Check if logs is a string
			if logsStr, ok := logs.(string); ok {
				logText = logsStr
			} else {
				// If logs is an object/array, convert to compact JSON (1 line)
				compactJSON, err := json.Marshal(logs)
				if err == nil {
					logText = string(compactJSON)
				} else {
					logText = fmt.Sprintf("%v", logs)
				}
			}
		} else if message, ok := jsonPayload["message"].(string); ok {
			logText = message
		} else if text, ok := jsonPayload["text"].(string); ok {
			logText = text
		} else if log, ok := jsonPayload["log"].(string); ok {
			logText = log
		} else {
			// If no specific field, compact the whole JSON to 1 line
			compactJSON, err := json.Marshal(jsonPayload)
			if err == nil {
				logText = string(compactJSON)
			} else {
				logText = string(payload)
			}
		}
	} else {
		// It's plain text
		vehicleCode = vehicleCodeFromTopic
		logText = string(payload)
	}
	
	// Truncate if too long (max 255 chars in DB)
	if len(logText) > 255 {
		logText = logText[:252] + "..."
	}
	
	// Get vehicle info first
	vehicle, err := l.vehicleRepo.GetVehicleByCode(vehicleCode)
	if err != nil {
		log.Printf("Warning: Vehicle not found for code %s (log will still be saved): %v", vehicleCode, err)
	}
	
	formattedLog := fmt.Sprintf("[%s] %s", vehicleCode, logText)
	broadcastTime := time.Now().UTC()
	var rawLogID uint = 0

	if l.saveToDB {
		// Create raw log with vehicle prefix and vehicle ID
		rawLog := &model.RawLog{
			Logs: formattedLog,
		}

		// Set VehicleID if vehicle found
		if vehicle != nil {
			rawLog.VehicleID = &vehicle.ID
		}

		if err := l.rawLogRepo.CreateRawLog(rawLog); err != nil {
			log.Printf("Failed to save raw log: %v", err)
			return
		}

		rawLogID = rawLog.ID
		broadcastTime = rawLog.CreatedAt
		log.Printf("✓ Raw log saved: vehicle=%s, id=%d", vehicleCode, rawLog.ID)
	} else {
		// Realtime-only mode: skip DB write and avoid per-message log spam.
	}

	// Broadcast via WebSocket
	if l.wsHub != nil {
		wsData := wsocket.RawLogData{
			ID:        rawLogID,
			Logs:      formattedLog,
			CreatedAt: broadcastTime.Format(time.RFC3339),
		}
		
		// Add vehicle info if available
		if vehicle != nil {
			wsData.Vehicle = &wsocket.VehicleInfo{
				Code: vehicle.Code,
				Name: vehicle.Name,
			}
		}
		
		l.wsHub.BroadcastRawLog(wsData, broadcastTime.Format("2006-01-02T15:04:05Z07:00"))
	}
}

