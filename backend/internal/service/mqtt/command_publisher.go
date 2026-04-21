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
	Command CommandType `json:"command"`
}

// AckPayload is the MQTT feedback received from hardware
// Hardware must publish this to seano/{vehicle_code}/ack
type AckPayload struct {
	RequestID string `json:"request_id"`
	Command   string `json:"command"`
	Status    string `json:"status"`  // "ok" or "error"
	Message   string `json:"message"` // Human-readable description
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

		resolvedAt := time.Now()
		updated, err := cp.commandLogRepo.UpdateLatestPendingCommandLog(vehicleCode, ack.Command, finalStatus, ack.Message, resolvedAt)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) && cp.vehicleRepo != nil {
				vehicle, err := cp.vehicleRepo.GetVehicleByCode(vehicleCode)
				if err == nil {
					entry := &model.CommandLog{
						VehicleID:   vehicle.ID,
						VehicleCode: vehicleCode,
						Command:     ack.Command,
						Status:      finalStatus,
						Message:     ack.Message,
						InitiatedAt: resolvedAt,
						ResolvedAt:  &resolvedAt,
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
			var resolvedAtStr *string
			if updated.ResolvedAt != nil {
				s := updated.ResolvedAt.Format(time.RFC3339)
				resolvedAtStr = &s
			}
			_ = cp.wsHub.BroadcastCommandLog(wsocket.CommandLogData{
				ID:          updated.ID,
				VehicleID:   updated.VehicleID,
				VehicleCode: updated.VehicleCode,
				Command:     updated.Command,
				Status:      updated.Status,
				Message:     updated.Message,
				InitiatedAt: updated.InitiatedAt.Format(time.RFC3339),
				ResolvedAt:  resolvedAtStr,
				CreatedAt:   updated.CreatedAt.Format(time.RFC3339),
			})
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
func (cp *CommandPublisher) SendCommand(vehicleCode string, cmdType CommandType) (*AckPayload, error) {
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
	requestID := uuid.New().String()
	cmd := CommandPayload{
		Command: cmdType,
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
