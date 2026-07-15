package mqtt

import (
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	mqtt "github.com/eclipse/paho.mqtt.golang"

	"go-fiber-pgsql/internal/repository"
	wsocket "go-fiber-pgsql/internal/websocket"
)

// WaypointAckPayload is the MQTT message published by the USV to seano/{vehicle_code}/waypoint/response.
type WaypointAckPayload struct {
	Status        string `json:"status"`
	Message       string `json:"message"`
	VehicleID     string `json:"vehicle_id"`
	Timestamp     string `json:"timestamp,omitempty"`
	WaypointLogID uint   `json:"waypoint_log_id,omitempty"`
}

// WaypointAckListener subscribes to seano/+/waypoint/response and updates
// the waypoint_log status and latency_acks timing upon USV ACK.
type WaypointAckListener struct {
	client          mqtt.Client
	waypointLogRepo *repository.WaypointLogRepository
	vehicleRepo     *repository.VehicleRepository
	latencyAckRepo  *repository.LatencyAckRepository
	wsHub           *wsocket.Hub
}

func NewWaypointAckListener(
	client mqtt.Client,
	waypointLogRepo *repository.WaypointLogRepository,
	vehicleRepo *repository.VehicleRepository,
	latencyAckRepo *repository.LatencyAckRepository,
	wsHub *wsocket.Hub,
) *WaypointAckListener {
	return &WaypointAckListener{
		client:          client,
		waypointLogRepo: waypointLogRepo,
		vehicleRepo:     vehicleRepo,
		latencyAckRepo:  latencyAckRepo,
		wsHub:           wsHub,
	}
}

func (l *WaypointAckListener) Start() error {
	topic := "seano/+/waypoint/response"
	token := l.client.Subscribe(topic, 1, l.handleMessage)
	if token.Wait() && token.Error() != nil {
		return fmt.Errorf("failed to subscribe to %s: %w", topic, token.Error())
	}
	log.Printf("✓ MQTT WaypointAck Listener subscribed to topic: %s", topic)
	return nil
}

func (l *WaypointAckListener) handleMessage(_ mqtt.Client, msg mqtt.Message) {
	parts := strings.Split(msg.Topic(), "/")
	if len(parts) != 4 {
		log.Printf("❌ WaypointAck: unexpected topic format: %s", msg.Topic())
		return
	}
	vehicleCode := parts[1]

	var payload WaypointAckPayload
	if err := json.Unmarshal(msg.Payload(), &payload); err != nil {
		log.Printf("❌ WaypointAck: failed to parse payload: %v | raw: %s", err, string(msg.Payload()))
		return
	}

	if vehicleCode == "" {
		vehicleCode = strings.TrimSpace(payload.VehicleID)
	}

	status := strings.ToLower(strings.TrimSpace(payload.Status))
	finalStatus := "failed"
	switch status {
	case "ok", "success":
		finalStatus = "success"
	case "error", "failed":
		finalStatus = "failed"
	case "timeout":
		finalStatus = "timeout"
	}

	resolvedAt := time.Now().UTC()
	if ts := strings.TrimSpace(payload.Timestamp); ts != "" {
		if parsed, err := time.Parse(time.RFC3339, ts); err == nil {
			resolvedAt = parsed.UTC()
		} else if parsed, err := time.Parse(time.RFC3339Nano, ts); err == nil {
			resolvedAt = parsed.UTC()
		}
	}

	// Capture ackReceivedAt first so we can detect race conditions in the fallback path.
	ackReceivedAt := time.Now().UTC()

	var logID uint
	skipLatencyUpdate := false

	if payload.WaypointLogID != 0 {
		if err := l.waypointLogRepo.UpdateWaypointLogStatusByID(payload.WaypointLogID, finalStatus, payload.Message, resolvedAt); err != nil {
			log.Printf("⚠️  WaypointAck: failed to update log id=%d: %v", payload.WaypointLogID, err)
			return
		}
		logID = payload.WaypointLogID
		log.Printf("✅ WaypointAck: updated log id=%d status=%s via waypoint_log_id", logID, finalStatus)
	} else {
		// waypoint_log_id not in payload — find latest unacked log for this vehicle.
		unacked, err := l.waypointLogRepo.GetLatestUnackedWaypointLog(vehicleCode)
		if err != nil {
			log.Printf("⚠️  WaypointAck: no unacked waypoint log for %s: %v", vehicleCode, err)
			return
		}
		logID = unacked.ID

		// Guard: if this log was created after the ACK arrived, a race condition occurred —
		// a late/duplicate ACK from a previous mission matched a newly-created log.
		// Skip latency timing update to avoid negative seg_init_ack_ms in the data.
		if unacked.InitiatedAt.After(ackReceivedAt) {
			skipLatencyUpdate = true
			log.Printf("⚠️  WaypointAck: skipping latency_ack update for log %d — race condition (initiated_at=%v > ack_received_at=%v)", logID, unacked.InitiatedAt, ackReceivedAt)
		}

		// Only update status if still pending (avoid overwriting a status set by HTTP flow)
		if unacked.Status == "pending" {
			if err := l.waypointLogRepo.UpdateWaypointLogStatusByID(logID, finalStatus, payload.Message, resolvedAt); err != nil {
				log.Printf("⚠️  WaypointAck: failed to update log id=%d status: %v", logID, err)
			}
		}
		log.Printf("✅ WaypointAck: resolved log id=%d (status=%s) via unacked fallback for %s", logID, finalStatus, vehicleCode)
	}

	var usvAckAt *time.Time
	if !resolvedAt.IsZero() {
		t := resolvedAt
		usvAckAt = &t
	}

	if l.wsHub == nil || logID == 0 {
		if l.latencyAckRepo != nil && !skipLatencyUpdate {
			_ = l.latencyAckRepo.UpdateAckTimingFull("waypoint", logID, usvAckAt, ackReceivedAt, ackReceivedAt)
		}
		return
	}

	updated, err := l.waypointLogRepo.GetWaypointLogByID(logID)
	if err != nil {
		log.Printf("⚠️  WaypointAck: failed to fetch log %d for WS broadcast: %v", logID, err)
		if l.latencyAckRepo != nil && !skipLatencyUpdate {
			_ = l.latencyAckRepo.UpdateAckTimingFull("waypoint", logID, usvAckAt, ackReceivedAt, ackReceivedAt)
		}
		return
	}

	// Capture wsSentAt after all DB work, right before the broadcast.
	// This makes seg_ack_ws_ms reflect actual processing time instead of always being 0.
	wsSentAt := time.Now().UTC()

	if l.latencyAckRepo != nil && !skipLatencyUpdate {
		if err := l.latencyAckRepo.UpdateAckTimingFull("waypoint", logID, usvAckAt, ackReceivedAt, wsSentAt); err != nil {
			log.Printf("⚠️  WaypointAck: failed to update latency_ack for log %d: %v", logID, err)
		}
	}

	var resolvedAtStr *string
	if updated.ResolvedAt != nil {
		s := updated.ResolvedAt.Format(time.RFC3339)
		resolvedAtStr = &s
	}
	_ = l.wsHub.BroadcastWaypointLog(wsocket.WaypointLogData{
		ID:            updated.ID,
		VehicleID:     updated.VehicleID,
		VehicleCode:   updated.VehicleCode,
		MissionID:     updated.MissionID,
		MissionName:   updated.MissionName,
		WaypointCount: updated.WaypointCount,
		Status:        updated.Status,
		Message:       updated.Message,
		InitiatedAt:   updated.InitiatedAt.Format(time.RFC3339),
		ResolvedAt:    resolvedAtStr,
		CreatedAt:     updated.CreatedAt.Format(time.RFC3339),
	})
}
