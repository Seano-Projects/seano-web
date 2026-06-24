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

type ThrusterListener struct {
	client      mqtt.Client
	repo        *repository.ThrusterLogRepository
	vehicleRepo *repository.VehicleRepository
	wsHub       *wsocket.Hub
}

func NewThrusterListener(client mqtt.Client, repo *repository.ThrusterLogRepository, vehicleRepo *repository.VehicleRepository, wsHub *wsocket.Hub) *ThrusterListener {
	return &ThrusterListener{client: client, repo: repo, vehicleRepo: vehicleRepo, wsHub: wsHub}
}

func (l *ThrusterListener) Start() error {
	topic := "seano/+/thruster"
	token := l.client.Subscribe(topic, 0, l.handleMessage)
	token.Wait()
	if token.Error() != nil {
		return fmt.Errorf("failed to subscribe to %s: %w", topic, token.Error())
	}
	log.Printf("✓ MQTT Thruster Listener subscribed to topic: %s", topic)
	return nil
}

func (l *ThrusterListener) handleMessage(_ mqtt.Client, msg mqtt.Message) {
	parts := strings.Split(msg.Topic(), "/")
	if len(parts) != 3 {
		return
	}
	vehicleCode := parts[1]

	var payload struct {
		Throttle int `json:"throttle"`
		Steering int `json:"steering"`
	}
	if err := json.Unmarshal(msg.Payload(), &payload); err != nil {
		log.Printf("Failed to parse thruster payload: %v", err)
		return
	}

	vehicle, err := l.vehicleRepo.GetVehicleByCode(vehicleCode)
	if err != nil {
		log.Printf("Vehicle not found for thruster command: %s", vehicleCode)
		return
	}

	now := time.Now().UTC()
	entry := &model.ThrusterLog{
		VehicleID:   vehicle.ID,
		VehicleCode: vehicleCode,
		Event:       "MQTT",
		ThrottlePct: payload.Throttle,
		SteeringPct: payload.Steering,
		InitiatedAt: now,
	}

	if err := l.repo.CreateThrusterLog(entry); err != nil {
		log.Printf("Failed to save thruster log: %v", err)
		return
	}

	if l.wsHub != nil {
		_ = l.wsHub.BroadcastThrusterLog(wsocket.ThrusterLogData{
			ID:          entry.ID,
			VehicleID:   entry.VehicleID,
			VehicleCode: entry.VehicleCode,
			Event:       entry.Event,
			ThrottlePct: entry.ThrottlePct,
			SteeringPct: entry.SteeringPct,
			InitiatedAt: entry.InitiatedAt.Format(time.RFC3339),
			CreatedAt:   entry.CreatedAt.Format(time.RFC3339),
		})
	}
}
