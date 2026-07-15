package mqtt

import (
	"encoding/json"
	"fmt"
	"log"
	"strings"

	mqtt "github.com/eclipse/paho.mqtt.golang"

	wsocket "go-fiber-pgsql/internal/websocket"
)

// WaypointClearResponsePayload is published by the vehicle's waypoint_node
// to seano/{vehicle_code}/waypoint/clear/response after executing /mavros/mission/clear.
type WaypointClearResponsePayload struct {
	Status    string `json:"status"`           // "ok" or "error"
	Message   string `json:"message"`          // human-readable description
	VehicleID string `json:"vehicle_id,omitempty"`
	Timestamp string `json:"timestamp,omitempty"`
}

// WaypointClearListener subscribes to seano/+/waypoint/clear/response and
// broadcasts the result to all connected WebSocket clients so the frontend
// can show a confirmation toast.
type WaypointClearListener struct {
	client mqtt.Client
	wsHub  *wsocket.Hub
}

// NewWaypointClearListener creates a new WaypointClearListener.
func NewWaypointClearListener(client mqtt.Client, wsHub *wsocket.Hub) *WaypointClearListener {
	return &WaypointClearListener{
		client: client,
		wsHub:  wsHub,
	}
}

// Start subscribes to the waypoint clear response topic.
func (l *WaypointClearListener) Start() error {
	topic := "seano/+/waypoint/clear/response"
	token := l.client.Subscribe(topic, 1, l.handleMessage)
	if token.Wait() && token.Error() != nil {
		return fmt.Errorf("failed to subscribe to %s: %w", topic, token.Error())
	}
	log.Printf("✓ MQTT WaypointClear Listener subscribed to topic: %s", topic)
	return nil
}

func (l *WaypointClearListener) handleMessage(_ mqtt.Client, msg mqtt.Message) {
	// topic: seano/{vehicle_code}/waypoint/clear/response  →  5 parts
	parts := strings.Split(msg.Topic(), "/")
	if len(parts) != 5 {
		log.Printf("❌ WaypointClear: unexpected topic format: %s", msg.Topic())
		return
	}
	vehicleCode := parts[1]

	var payload WaypointClearResponsePayload
	if err := json.Unmarshal(msg.Payload(), &payload); err != nil {
		log.Printf("❌ WaypointClear: failed to parse payload: %v | raw: %s", err, string(msg.Payload()))
		return
	}

	if vehicleCode == "" {
		vehicleCode = strings.TrimSpace(payload.VehicleID)
	}

	status := strings.ToLower(strings.TrimSpace(payload.Status))
	log.Printf("📥 Waypoint clear response: vehicle=%s status=%s message=%s", vehicleCode, status, payload.Message)

	if l.wsHub == nil {
		return
	}

	type clearResponseMsg struct {
		Type        string `json:"type"`
		VehicleCode string `json:"vehicle_code"`
		Status      string `json:"status"`
		Message     string `json:"message"`
	}
	outPayload, err := json.Marshal(clearResponseMsg{
		Type:        "mission_clear_response",
		VehicleCode: vehicleCode,
		Status:      status,
		Message:     payload.Message,
	})
	if err != nil {
		log.Printf("❌ WaypointClear: failed to marshal WS payload: %v", err)
		return
	}
	l.wsHub.Broadcast(outPayload)
}
