package mqtt

import (
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"go-fiber-pgsql/internal/repository"
	wsocket "go-fiber-pgsql/internal/websocket"

	mqtt "github.com/eclipse/paho.mqtt.golang"
)

// StatusMessage represents MQTT status message structure
type StatusMessage struct {
	VehicleCode string `json:"vehicle_code"`
	Status      string `json:"status"` // "online" or "offline"
	Timestamp   string `json:"timestamp,omitempty"`
}

// StatusListener handles MQTT LWT (Last Will and Testament) messages
// Subscribes to: seano/+/status (e.g., seano/USV-01/status)
type StatusListener struct {
	client      mqtt.Client
	vehicleRepo *repository.VehicleRepository
	wsHub       *wsocket.Hub
}

// NewStatusListener creates a new StatusListener
func NewStatusListener(client mqtt.Client, vehicleRepo *repository.VehicleRepository, wsHub *wsocket.Hub) *StatusListener {
	return &StatusListener{
		client:      client,
		vehicleRepo: vehicleRepo,
		wsHub:       wsHub,
	}
}

// Start subscribes to vehicle status topics
func (l *StatusListener) Start() error {
	// Subscribe to wildcard topic: seano/+/status
	// This catches all vehicle status messages
	topic := "seano/+/status"
	
	token := l.client.Subscribe(topic, 1, l.handleMessage)
	if token.Wait() && token.Error() != nil {
		return fmt.Errorf("failed to subscribe to %s: %w", topic, token.Error())
	}
	
	log.Printf("✓ MQTT Status Listener subscribed to topic: %s", topic)
	return nil
}

// handleMessage processes incoming MQTT status messages (LWT)
func (l *StatusListener) handleMessage(client mqtt.Client, msg mqtt.Message) {
	topic := msg.Topic()
	payload := string(msg.Payload())
	
	// Extract vehicle code from topic: seano/{vehicleCode}/status
	parts := strings.Split(topic, "/")
	if len(parts) != 3 {
		log.Printf("Invalid status topic format: %s", topic)
		return
	}
	
	vehicleCode := parts[1]
	
	// Parse status (can be simple string "online"/"offline" or JSON)
	var status string
	var statusMsg StatusMessage
	
	// Try JSON first
	if err := json.Unmarshal(msg.Payload(), &statusMsg); err == nil {
		status = statusMsg.Status
		if statusMsg.VehicleCode == "" {
			statusMsg.VehicleCode = vehicleCode
		}
	} else {
		// Simple string payload
		status = strings.TrimSpace(payload)
		statusMsg = StatusMessage{
			VehicleCode: vehicleCode,
			Status:      status,
			Timestamp:   time.Now().Format(time.RFC3339),
		}
	}
	
	// Validate status
	if status != "online" && status != "offline" {
		log.Printf("Invalid status value '%s' for vehicle %s", status, vehicleCode)
		return
	}
	
	log.Printf("📡 Vehicle %s changed status to: %s", vehicleCode, status)
	
	// Update vehicle status in database
	if err := l.vehicleRepo.UpdateConnectionStatus(vehicleCode, status); err != nil {
		log.Printf("Error updating vehicle %s status: %v", vehicleCode, err)
		return
	}
	
	// Broadcast status change to WebSocket clients
	l.broadcastStatusChange(statusMsg)
}

// broadcastStatusChange sends status update to all connected WebSocket clients
func (l *StatusListener) broadcastStatusChange(status StatusMessage) {
	message := map[string]interface{}{
		"type":         "vehicle_status",
		"vehicle_code": status.VehicleCode,
		"status":       status.Status,
		"timestamp":    status.Timestamp,
	}
	
	messageJSON, err := json.Marshal(message)
	if err != nil {
		log.Printf("Error marshaling status message: %v", err)
		return
	}
	
	// Broadcast to all connected clients
	l.wsHub.Broadcast(messageJSON)
	
	log.Printf("✓ Broadcasted status change for %s: %s", status.VehicleCode, status.Status)
}
