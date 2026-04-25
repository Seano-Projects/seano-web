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

// WaypointReachedMessage represents the MQTT payload from the USV.
// Topic: seano/{vehicle_code}/mission/waypoint_reached
type WaypointReachedMessage struct {
	VehicleID string `json:"vehicle_id"` // vehicle code, e.g. "USV-001"
	Event     string `json:"event"`      // "waypoint_reached"
	WpSeq     int    `json:"wp_seq"`     // sequence number of reached waypoint (1-based)
	Total     int    `json:"total"`      // total waypoints in mission
	Remaining int    `json:"remaining"`  // remaining waypoints
}

// WaypointListener subscribes to seano/+/mission/waypoint_reached and updates
// the active mission progress in the database and over WebSocket.
type WaypointListener struct {
	client      mqtt.Client
	vehicleRepo *repository.VehicleRepository
	missionRepo *repository.MissionRepository
	wsHub       *wsocket.Hub
}

// NewWaypointListener creates a new WaypointListener.
func NewWaypointListener(
	client mqtt.Client,
	vehicleRepo *repository.VehicleRepository,
	missionRepo *repository.MissionRepository,
	wsHub *wsocket.Hub,
) *WaypointListener {
	return &WaypointListener{
		client:      client,
		vehicleRepo: vehicleRepo,
		missionRepo: missionRepo,
		wsHub:       wsHub,
	}
}

// Start subscribes to the waypoint_reached topic.
func (l *WaypointListener) Start() error {
	topic := "seano/+/mission/waypoint_reached"

	token := l.client.Subscribe(topic, 1, l.handleMessage)
	if token.Wait() && token.Error() != nil {
		return fmt.Errorf("failed to subscribe to %s: %w", topic, token.Error())
	}

	log.Printf("✓ MQTT Waypoint Listener subscribed to topic: %s", topic)
	return nil
}

func (l *WaypointListener) handleMessage(_ mqtt.Client, msg mqtt.Message) {
	log.Printf("📍 Received waypoint_reached on topic: %s", msg.Topic())

	// topic: seano/{vehicle_code}/mission/waypoint_reached
	parts := strings.Split(msg.Topic(), "/")
	if len(parts) != 4 {
		log.Printf("❌ Unexpected topic format: %s", msg.Topic())
		return
	}
	vehicleCodeFromTopic := parts[1]

	var payload WaypointReachedMessage
	if err := json.Unmarshal(msg.Payload(), &payload); err != nil {
		log.Printf("❌ Failed to parse waypoint_reached payload: %v", err)
		return
	}

	// Use vehicle code from topic; fall back to payload if topic is ambiguous
	vehicleCode := vehicleCodeFromTopic
	if vehicleCode == "" {
		vehicleCode = payload.VehicleID
	}

	// Look up the vehicle
	vehicle, err := l.vehicleRepo.GetVehicleByCode(vehicleCode)
	if err != nil {
		log.Printf("❌ Vehicle not found for code %s: %v", vehicleCode, err)
		return
	}

	// Find active mission first; fallback to latest draft for easier recovery/testing
	mission, err := l.missionRepo.GetLatestActiveMissionByVehicleID(vehicle.ID)
	if err != nil {
		mission, err = l.missionRepo.GetLatestMissionByVehicleIDAndStatuses(vehicle.ID, []string{"Draft"})
		if err != nil {
			log.Printf("⚠️  No active/draft mission for vehicle %s: %v", vehicleCode, err)
			return
		}
		log.Printf("ℹ️  Using latest Draft mission %d for vehicle %s", mission.ID, vehicleCode)
	}

	// Defensive: total must be > 0
	total := payload.Total
	if total <= 0 {
		// Use mission's stored total_waypoints as fallback
		total = mission.TotalWaypoints
	}
	if total <= 0 {
		log.Printf("⚠️  Cannot compute progress: total waypoints is 0")
		return
	}

	progress := (float64(payload.WpSeq) / float64(total)) * 100
	if progress > 100 {
		progress = 100
	}

	status := mission.Status
	now := time.Now()
	if status == "Draft" {
		status = "Ongoing"
	}

	var endTime *time.Time
	if payload.Remaining <= 0 {
		status = "Completed"
		endTime = &now
	}

	// Build update map
	updates := map[string]interface{}{
		"completed_waypoint": payload.WpSeq,
		"current_waypoint":   payload.WpSeq,
		"progress":           progress,
		"status":             status,
		"last_update_time":   now,
	}
	if endTime != nil {
		updates["end_time"] = endTime
	}

	if err := l.missionRepo.UpdateMission(mission.ID, updates); err != nil {
		log.Printf("❌ Failed to update mission %d progress: %v", mission.ID, err)
		return
	}

	log.Printf("✅ Mission %d progress: %.1f%% (%d/%d) status=%s",
		mission.ID, progress, payload.WpSeq, total, status)

	// Broadcast to all WebSocket clients via MissionProgressMessage
	progressMsg := wsocket.MissionProgressMessage{
		MessageType:       "mission_progress",
		MissionID:         mission.ID,
		VehicleCode:       vehicleCode,
		Progress:          progress,
		EnergyConsumed:    mission.EnergyConsumed,
		EnergyBudget:      mission.EnergyBudget,
		TimeElapsed:       mission.TimeElapsed,
		CurrentWaypoint:   payload.WpSeq,
		CompletedWaypoint: payload.WpSeq,
		Status:            status,
		Timestamp:         now.Format(time.RFC3339),
	}

	if err := l.wsHub.BroadcastMissionProgress(progressMsg); err != nil {
		log.Printf("⚠️  Failed to broadcast mission progress: %v", err)
	}

	// Broadcast updated mission via mission_update so MissionPlanner also reflects it
	updatedMission := *mission
	updatedMission.CompletedWaypoint = payload.WpSeq
	updatedMission.CurrentWaypoint = payload.WpSeq
	updatedMission.Progress = progress
	updatedMission.Status = status

	type missionUpdateMsg struct {
		Type string        `json:"type"`
		Data model.Mission `json:"data"`
	}
	updatePayload, _ := json.Marshal(missionUpdateMsg{
		Type: "mission_update",
		Data: updatedMission,
	})
	l.wsHub.Broadcast(updatePayload)
}
