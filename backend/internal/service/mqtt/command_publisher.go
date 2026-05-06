package mqtt

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"strings"
	"sync"
	"time"

	mqtt "github.com/eclipse/paho.mqtt.golang"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"go-fiber-pgsql/internal/model"
	"go-fiber-pgsql/internal/repository"
	wsocket "go-fiber-pgsql/internal/websocket"
)

// CommandType defines the type of command to send
type CommandType string

const (
	CommandArm         CommandType = "ARM"
	CommandForceArm    CommandType = "FORCE_ARM"
	CommandDisarm      CommandType = "DISARM"
	CommandForceDisarm CommandType = "FORCE_DISARM"
	CommandAuto        CommandType = "AUTO"
	CommandManual      CommandType = "MANUAL"
	CommandHold        CommandType = "HOLD"
	CommandLoiter      CommandType = "LOITER"
	CommandRTL         CommandType = "RTL"
)

// CommandPayload is the MQTT message sent to hardware
type CommandPayload struct {
	RequestID string      `json:"request_id,omitempty"`
	Command   CommandType `json:"command"`
}

// AckPayload is the MQTT feedback received from hardware
// Hardware must publish this to seano/{vehicle_code}/ack
type AckPayload struct {
	RequestID string `json:"request_id"`
	Command   string `json:"command"`
	Status    string `json:"status"`  // "ok" or "error"
	Message   string `json:"message"` // Human-readable description
	Timestamp string `json:"timestamp,omitempty"`
}

type pendingRequest struct {
	ch chan AckPayload
}

// CommandPublisher sends commands via MQTT and waits for hardware ACK
type CommandPublisher struct {
	client         mqtt.Client
	mu             sync.Mutex
	pending        map[string]*pendingRequest
	timeout        time.Duration
	commandLogRepo *repository.CommandLogRepository
	vehicleRepo    *repository.VehicleRepository
	wsHub          *wsocket.Hub
}

// NewCommandPublisher creates a new CommandPublisher with the shared MQTT client
func NewCommandPublisher(client mqtt.Client, commandLogRepo *repository.CommandLogRepository, vehicleRepo *repository.VehicleRepository, wsHub *wsocket.Hub) *CommandPublisher {
	return &CommandPublisher{
		client:         client,
		pending:        make(map[string]*pendingRequest),
		timeout:        8 * time.Second,
		commandLogRepo: commandLogRepo,
		vehicleRepo:    vehicleRepo,
		wsHub:          wsHub,
	}
}

// handleACK processes incoming ACK messages from hardware
func (cp *CommandPublisher) handleACK(_ mqtt.Client, msg mqtt.Message) {
	var ack AckPayload
	if err := json.Unmarshal(msg.Payload(), &ack); err != nil {
		log.Printf("⚠️  Failed to parse ACK payload: %v | raw: %s", err, string(msg.Payload()))
		return
	}

	log.Printf("📥 ACK received from hardware: request_id=%s status=%s message=%s",
		ack.RequestID, ack.Status, ack.Message)

	vehicleCode := ""
	parts := strings.Split(msg.Topic(), "/")
	if len(parts) >= 3 {
		vehicleCode = parts[1]
	}

	if cp.commandLogRepo != nil && vehicleCode != "" {
		status := strings.ToLower(strings.TrimSpace(ack.Status))
		finalStatus := "failed"
		switch status {
		case "ok", "success":
			finalStatus = "success"
		case "error", "failed":
			finalStatus = "failed"
		case "timeout":
			finalStatus = "timeout"
		}

		ackReceivedAt := time.Now().UTC()
		resolvedAt := ackReceivedAt
		var usvAckAt *time.Time
		if ts := strings.TrimSpace(ack.Timestamp); ts != "" {
			if parsed, err := time.Parse(time.RFC3339Nano, ts); err == nil {
				usvAckAt = &parsed
			} else if parsed, err := time.Parse(time.RFC3339, ts); err == nil {
				usvAckAt = &parsed
			}
		}

		updated, err := cp.commandLogRepo.UpdateLatestPendingCommandLog(vehicleCode, strings.TrimSpace(ack.RequestID), ack.Command, finalStatus, ack.Message, usvAckAt, ackReceivedAt, resolvedAt)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) && cp.vehicleRepo != nil {
				vehicle, err := cp.vehicleRepo.GetVehicleByCode(vehicleCode)
				if err == nil {
					entry := &model.CommandLog{
						VehicleID:     vehicle.ID,
						VehicleCode:   vehicleCode,
						RequestID:     strings.TrimSpace(ack.RequestID),
						Command:       ack.Command,
						Status:        finalStatus,
						Message:       ack.Message,
						InitiatedAt:   ackReceivedAt,
						UsvAckAt:      usvAckAt,
						AckReceivedAt: &ackReceivedAt,
						ResolvedAt:    &resolvedAt,
					}
					if err := cp.commandLogRepo.CreateCommandLog(entry); err != nil {
						log.Printf("⚠️  Failed to create command log from ACK: %v", err)
					} else {
						updated = entry
					}
				} else {
					log.Printf("⚠️  Vehicle not found for ACK update: %s", vehicleCode)
				}
			} else {
				log.Printf("⚠️  Failed to update command log from ACK: %v", err)
			}
		}

		if updated != nil && cp.wsHub != nil {
			wsSentAt := time.Now().UTC()
			if err := cp.commandLogRepo.UpdateCommandLogWSSentAt(updated.ID, wsSentAt); err != nil {
				log.Printf("⚠️  Failed to update command ws_sent_at: %v", err)
			} else {
				updated.WsSentAt = &wsSentAt
			}

			var mqttPublishedAtStr *string
			if updated.MqttPublishedAt != nil {
				s := updated.MqttPublishedAt.Format(time.RFC3339Nano)
				mqttPublishedAtStr = &s
			}

			var usvAckAtStr *string
			if updated.UsvAckAt != nil {
				s := updated.UsvAckAt.Format(time.RFC3339Nano)
				usvAckAtStr = &s
			}

			var ackReceivedAtStr *string
			if updated.AckReceivedAt != nil {
				s := updated.AckReceivedAt.Format(time.RFC3339Nano)
				ackReceivedAtStr = &s
			}

			var resolvedAtStr *string
			if updated.ResolvedAt != nil {
				s := updated.ResolvedAt.Format(time.RFC3339Nano)
				resolvedAtStr = &s
			}
			var wsReceivedAtStr *string
			if updated.WsReceivedAt != nil {
				s := updated.WsReceivedAt.Format(time.RFC3339Nano)
				wsReceivedAtStr = &s
			}

			_ = cp.wsHub.BroadcastCommandLog(wsocket.CommandLogData{
				ID:              updated.ID,
				VehicleID:       updated.VehicleID,
				VehicleCode:     updated.VehicleCode,
				RequestID:       updated.RequestID,
				Command:         updated.Command,
				Status:          updated.Status,
				Message:         updated.Message,
				InitiatedAt:     updated.InitiatedAt.Format(time.RFC3339Nano),
				MqttPublishedAt: mqttPublishedAtStr,
				UsvAckAt:        usvAckAtStr,
				AckReceivedAt:   ackReceivedAtStr,
				ResolvedAt:      resolvedAtStr,
				WsReceivedAt:    wsReceivedAtStr,
				CreatedAt:       updated.CreatedAt.Format(time.RFC3339Nano),
			}, wsSentAt.Format(time.RFC3339Nano))
		}
	}

	cp.mu.Lock()
	req, ok := cp.pending[ack.RequestID]
	cp.mu.Unlock()

	if ok {
		req.ch <- ack
	} else {
		log.Printf("⚠️  ACK for unknown request_id: %s (may have timed out)", ack.RequestID)
	}
}

// SendCommand publishes a command and waits for hardware ACK.
// Returns error if MQTT publish fails or hardware does not respond within timeout.
func (cp *CommandPublisher) SendCommand(vehicleCode string, cmdType CommandType, requestID string) (*AckPayload, error) {
	ackTopic := fmt.Sprintf("seano/%s/ack", vehicleCode)
	cmdTopic := fmt.Sprintf("seano/%s/command", vehicleCode)

	// Subscribe to ACK topic before publishing (avoid race)
	token := cp.client.Subscribe(ackTopic, 1, cp.handleACK)
	if !token.WaitTimeout(3 * time.Second) {
		return nil, fmt.Errorf("timeout subscribing to ACK topic")
	}
	if token.Error() != nil {
		return nil, fmt.Errorf("failed to subscribe to ACK topic: %w", token.Error())
	}
	defer cp.client.Unsubscribe(ackTopic)

	// Build command payload
	if strings.TrimSpace(requestID) == "" {
		requestID = uuid.New().String()
	}
	cmd := CommandPayload{
		RequestID: requestID,
		Command:   cmdType,
	}

	// Register pending before publish (avoid race)
	ch := make(chan AckPayload, 1)
	cp.mu.Lock()
	cp.pending[requestID] = &pendingRequest{ch: ch}
	cp.mu.Unlock()

	defer func() {
		cp.mu.Lock()
		delete(cp.pending, requestID)
		cp.mu.Unlock()
	}()

	// Publish command
	payload, err := json.Marshal(cmd)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal command: %w", err)
	}

	pubToken := cp.client.Publish(cmdTopic, 1, false, payload)
	if !pubToken.WaitTimeout(3 * time.Second) {
		return nil, fmt.Errorf("timeout publishing command to MQTT broker")
	}
	if pubToken.Error() != nil {
		return nil, fmt.Errorf("failed to publish command: %w", pubToken.Error())
	}

	if cp.commandLogRepo != nil {
		publishedAt := time.Now().UTC()
		if err := cp.commandLogRepo.UpdateCommandLogPublishedAtByRequestID(requestID, publishedAt); err != nil {
			log.Printf("⚠️  Failed to update mqtt_published_at for request_id=%s: %v", requestID, err)
		}
	}

	log.Printf("📤 Command published: topic=%s payload=%s", cmdTopic, string(payload))

	// Wait for ACK from hardware
	select {
	case ack := <-ch:
		return &ack, nil
	case <-time.After(cp.timeout):
		return nil, fmt.Errorf("hardware did not respond within %v", cp.timeout)
	}
}

// PublishMission publishes mission payload to hardware without waiting for ACK.
func (cp *CommandPublisher) PublishMission(vehicleCode string, payload interface{}) error {
	if cp == nil || cp.client == nil {
		return fmt.Errorf("MQTT publisher not configured")
	}

	missionTopic := fmt.Sprintf("seano/%s/mission", vehicleCode)
	message, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal mission payload: %w", err)
	}

	token := cp.client.Publish(missionTopic, 1, false, message)
	if !token.WaitTimeout(3 * time.Second) {
		return fmt.Errorf("timeout publishing mission to MQTT broker")
	}
	if token.Error() != nil {
		return fmt.Errorf("failed to publish mission payload: %w", token.Error())
	}

	log.Printf("📤 Mission published: topic=%s payload=%s", missionTopic, string(message))
	return nil
}
