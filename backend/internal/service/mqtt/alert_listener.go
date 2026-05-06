package mqtt

import (
	"encoding/json"
	"fmt"
	"log"
	"strings"

	mqtt "github.com/eclipse/paho.mqtt.golang"

	"go-fiber-pgsql/internal/model"
	"go-fiber-pgsql/internal/repository"
	wsocket "go-fiber-pgsql/internal/websocket"
)

// AlertListener handles MQTT alerts for anti-theft, failsafe, and general events.
type AlertListener struct {
	client      mqtt.Client
	alertRepo   *repository.AlertRepository
	vehicleRepo *repository.VehicleRepository
	wsHub       *wsocket.Hub
}

func NewAlertListener(client mqtt.Client, alertRepo *repository.AlertRepository, vehicleRepo *repository.VehicleRepository, wsHub *wsocket.Hub) *AlertListener {
	return &AlertListener{
		client:      client,
		alertRepo:   alertRepo,
		vehicleRepo: vehicleRepo,
		wsHub:       wsHub,
	}
}

func (l *AlertListener) Start() error {
	topics := []string{
		"seano/+/antitheft/alert",
		"seano/+/failsafe/alert",
		"seano/+/faisalfe/alert", // alias typo tolerated for compatibility
		"seano/+/alert",          // general alert from Jetson (GPS, battery, system, etc.)
	}

	for _, topic := range topics {
		token := l.client.Subscribe(topic, 1, l.handleMessage)
		token.Wait()
		if token.Error() != nil {
			return fmt.Errorf("failed to subscribe to %s: %w", topic, token.Error())
		}
		log.Printf("✓ MQTT Alert Listener subscribed to topic: %s", topic)
	}

	return nil
}

func normalizeAlertType(raw string) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "antitheft", "anti-theft", "anti_theft":
		return "antitheft"
	case "failsafe", "faisalfe":
		return "failsafe"
	default:
		return "system"
	}
}

// sanitizeAlertType passes through a custom alert_type from the payload,
// falling back to "general" if empty.
func sanitizeAlertType(raw string) string {
	cleaned := strings.TrimSpace(raw)
	if cleaned == "" {
		return "general"
	}
	return cleaned
}

func normalizeSeverity(raw string, alertType string) string {
	severity := strings.ToLower(strings.TrimSpace(raw))
	switch severity {
	case "critical", "warning", "info":
		return severity
	}

	if alertType == "failsafe" {
		return "critical"
	}

	return "warning"
}

func extractString(m map[string]interface{}, keys ...string) string {
	for _, key := range keys {
		if val, ok := m[key]; ok {
			if s, ok := val.(string); ok && strings.TrimSpace(s) != "" {
				return strings.TrimSpace(s)
			}
		}
	}
	return ""
}

func extractFloatPtr(m map[string]interface{}, keys ...string) *float64 {
	for _, key := range keys {
		val, ok := m[key]
		if !ok || val == nil {
			continue
		}

		switch n := val.(type) {
		case float64:
			return &n
		case float32:
			v := float64(n)
			return &v
		case int:
			v := float64(n)
			return &v
		case int64:
			v := float64(n)
			return &v
		}
	}

	return nil
}

func (l *AlertListener) handleMessage(client mqtt.Client, msg mqtt.Message) {
	parts := strings.Split(msg.Topic(), "/")

	var vehicleCode string
	var alertType string

	switch len(parts) {
	case 3:
		// seano/{vehicle_code}/alert  →  general alert
		if parts[2] != "alert" {
			log.Printf("⚠️ Unexpected alert topic format: %s", msg.Topic())
			return
		}
		vehicleCode = parts[1]
		alertType = "general" // will be overridden by payload alert_type if provided
	case 4:
		// seano/{vehicle_code}/{type}/alert  →  specific alert (antitheft, failsafe, …)
		vehicleCode = parts[1]
		alertType = normalizeAlertType(parts[2])
	default:
		log.Printf("⚠️ Invalid alert topic format: %s", msg.Topic())
		return
	}

	payload := msg.Payload()
	messageText := strings.TrimSpace(string(payload))
	severity := normalizeSeverity("", alertType)
	source := "USV"
	var latitude *float64
	var longitude *float64

	var parsed map[string]interface{}
	if err := json.Unmarshal(payload, &parsed); err == nil {
		if payloadVehicleCode := extractString(parsed, "vehicle_code", "vehicleCode"); payloadVehicleCode != "" {
			vehicleCode = payloadVehicleCode
		}

		if payloadMessage := extractString(parsed, "message", "msg", "text", "description", "alert"); payloadMessage != "" {
			messageText = payloadMessage
		}

		if payloadSeverity := extractString(parsed, "severity", "level", "priority"); payloadSeverity != "" {
			severity = normalizeSeverity(payloadSeverity, alertType)
		}

		if payloadSource := extractString(parsed, "source"); payloadSource != "" {
			source = payloadSource
		}

		// Allow payload to override alert_type (important for general alerts)
		if payloadAlertType := extractString(parsed, "alert_type", "alertType", "type"); payloadAlertType != "" {
			alertType = sanitizeAlertType(payloadAlertType)
		}

		latitude = extractFloatPtr(parsed, "latitude", "lat")
		longitude = extractFloatPtr(parsed, "longitude", "lng", "lon")
	}

	if messageText == "" {
		messageText = fmt.Sprintf("%s alert received", alertType)
	}

	vehicle, err := l.vehicleRepo.GetVehicleByCode(vehicleCode)
	if err != nil {
		log.Printf("⚠️ Alert ignored: vehicle not found for code %s: %v", vehicleCode, err)
		return
	}

	alert := &model.Alert{
		VehicleID: vehicle.ID,
		Severity:  severity,
		AlertType: alertType,
		Message:   messageText,
		Latitude:  latitude,
		Longitude: longitude,
		Source:    source,
	}

	if err := l.alertRepo.CreateAlert(alert); err != nil {
		log.Printf("❌ Failed to save alert: %v", err)
		return
	}

	if l.wsHub != nil {
		message := map[string]interface{}{
			"type":         "alert",
			"id":           alert.ID,
			"vehicle_id":   alert.VehicleID,
			"severity":     alert.Severity,
			"alert_type":   alert.AlertType,
			"message":      alert.Message,
			"latitude":     alert.Latitude,
			"longitude":    alert.Longitude,
			"source":       alert.Source,
			"timestamp":    alert.CreatedAt,
			"acknowledged": alert.Acknowledged,
		}

		if data, err := json.Marshal(message); err == nil {
			l.wsHub.Broadcast(data)
		}
	}

	log.Printf("✓ Alert saved from MQTT: vehicle=%s type=%s severity=%s", vehicleCode, alertType, severity)
}
