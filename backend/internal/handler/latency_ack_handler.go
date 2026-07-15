package handler

import (
	"bytes"
	"encoding/csv"
	"fmt"
	"go-fiber-pgsql/internal/model"
	"go-fiber-pgsql/internal/repository"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

type LatencyAckHandler struct {
	repo *repository.LatencyAckRepository
}

func NewLatencyAckHandler(repo *repository.LatencyAckRepository) *LatencyAckHandler {
	return &LatencyAckHandler{repo: repo}
}

func isValidLogType(logType string) bool {
	switch logType {
	case "vehicle", "sensor", "thruster", "command", "waypoint":
		return true
	}
	return false
}

// CreateLatencyAck records ws_received_at for a monitoring log.
func (h *LatencyAckHandler) CreateLatencyAck(c *fiber.Ctx) error {
	var req model.CreateLatencyAckRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	logType := strings.ToLower(strings.TrimSpace(req.LogType))
	if !isValidLogType(logType) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "log_type must be vehicle, sensor, thruster, command, or waypoint"})
	}
	if req.LogID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "log_id is required"})
	}
	if req.VehicleID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "vehicle_id is required"})
	}

	wsReceivedAt := req.WsReceivedAt
	if wsReceivedAt.IsZero() {
		wsReceivedAt = time.Now().UTC()
	}

	ack := &model.LatencyAck{
		LogType:      logType,
		LogID:        req.LogID,
		VehicleID:    req.VehicleID,
		SensorID:     req.SensorID,
		WsReceivedAt: &wsReceivedAt,
	}

	if err := h.repo.Create(ack); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to record latency ack"})
	}

	return c.Status(fiber.StatusCreated).JSON(ack)
}

// UpdateWsReceived sets ws_received_at on the latency_ack for a given log type and log ID.
// Called via PATCH /latency-acks/by-log/:logType/:logId
func (h *LatencyAckHandler) UpdateWsReceived(c *fiber.Ctx) error {
	logType := c.Params("logType")
	if !isValidLogType(logType) {
		return c.Status(400).JSON(fiber.Map{"error": "invalid log_type"})
	}
	logID, err := c.ParamsInt("logId")
	if err != nil || logID <= 0 {
		return c.Status(400).JSON(fiber.Map{"error": "invalid log_id"})
	}
	var body struct {
		WsReceivedAt time.Time `json:"ws_received_at"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid body"})
	}
	wsAt := body.WsReceivedAt
	if wsAt.IsZero() {
		wsAt = time.Now().UTC()
	}
	if err := h.repo.UpdateWsReceived(logType, uint(logID), wsAt); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "failed to update ws_received_at"})
	}
	return c.SendStatus(204)
}

// ServerTime returns the current server UTC time so browsers can compute clock offset.
func (h *LatencyAckHandler) ServerTime(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"server_time": time.Now().UTC().Format(time.RFC3339Nano)})
}

// ListLatencyAcks returns latency ack records as JSON for the data management table view.
func (h *LatencyAckHandler) ListLatencyAcks(c *fiber.Ctx) error {
	logType := strings.ToLower(strings.TrimSpace(c.Query("log_type")))
	vehicleID := c.QueryInt("vehicle_id", 0)

	var sensorID *uint
	if sid := c.QueryInt("sensor_id", 0); sid > 0 {
		uid := uint(sid)
		sensorID = &uid
	}

	var startTime, endTime time.Time
	if s := c.Query("start_time"); s != "" {
		if t, err := time.Parse(time.RFC3339, s); err == nil {
			startTime = t
		}
	}
	if e := c.Query("end_time"); e != "" {
		if t, err := time.Parse(time.RFC3339, e); err == nil {
			endTime = t
		}
	}

	limit := c.QueryInt("limit", 500)

	acks, err := h.repo.GetByLogType(logType, uint(vehicleID), sensorID, startTime, endTime, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to list latency acks"})
	}

	return c.JSON(fiber.Map{"data": acks, "total": len(acks)})
}

// DeleteLatencyAck removes a latency ack record by ID.
func (h *LatencyAckHandler) DeleteLatencyAck(c *fiber.Ctx) error {
	id, err := c.ParamsInt("id")
	if err != nil || id <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid id"})
	}
	if err := h.repo.Delete(uint(id)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to delete latency ack"})
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// ExportLatencyAcks returns a CSV of latency_acks with all timing fields.
// CSV columns and segment calculations differ per log_type.
func (h *LatencyAckHandler) ExportLatencyAcks(c *fiber.Ctx) error {
	logType := strings.ToLower(strings.TrimSpace(c.Query("log_type")))
	if !isValidLogType(logType) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "log_type must be vehicle, sensor, thruster, command, or waypoint"})
	}

	vehicleID, err := c.ParamsInt("vehicle_id", 0)
	if err != nil || vehicleID == 0 {
		vehicleID = c.QueryInt("vehicle_id", 0)
	}
	if vehicleID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "vehicle_id is required"})
	}

	var sensorID *uint
	if sid := c.QueryInt("sensor_id", 0); sid > 0 {
		uid := uint(sid)
		sensorID = &uid
	}

	var startTime, endTime time.Time
	if s := c.Query("start_time"); s != "" {
		if t, err := time.Parse(time.RFC3339, s); err == nil {
			startTime = t
		}
	}
	if e := c.Query("end_time"); e != "" {
		if t, err := time.Parse(time.RFC3339, e); err == nil {
			endTime = t
		}
	}

	limit := c.QueryInt("limit", 5000)

	rows, err := h.repo.GetForExport(model.LatencyExportQuery{
		LogType:   logType,
		VehicleID: uint(vehicleID),
		SensorID:  sensorID,
		StartTime: startTime,
		EndTime:   endTime,
		Limit:     limit,
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "export query failed"})
	}

	var buf bytes.Buffer
	w := csv.NewWriter(&buf)

	fmtTime := func(t *time.Time) string {
		if t == nil {
			return ""
		}
		return t.UTC().Format(time.RFC3339Nano)
	}

	fmtMs := func(a, b *time.Time) string {
		if a == nil || b == nil {
			return ""
		}
		return fmt.Sprintf("%.3f", float64(b.Sub(*a).Microseconds())/1000.0)
	}

	// fmtMsMin0 is like fmtMs but clamps to 0 for segments involving ws_received_at,
	// which can be negative in old data due to browser clock skew before the fix.
	fmtMsMin0 := func(a, b *time.Time) string {
		if a == nil || b == nil {
			return ""
		}
		ms := float64(b.Sub(*a).Microseconds()) / 1000.0
		if ms < 0 {
			ms = 0
		}
		return fmt.Sprintf("%.3f", ms)
	}

	switch logType {
	case "command":
		header := []string{
			"ack_id", "log_id", "vehicle_id",
			"initiated_at", "mqtt_published_at", "usv_ack_at", "ack_received_at", "ws_sent_at", "ws_received_at",
			"seg_init_publish_ms", "seg_publish_ack_ms", "seg_ack_received_ms", "seg_ws_ms", "total_rtt_ms",
			"created_at",
		}
		if err := w.Write(header); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "csv write failed"})
		}
		for _, row := range rows {
			record := []string{
				fmt.Sprintf("%d", row.ID),
				fmt.Sprintf("%d", row.LogID),
				fmt.Sprintf("%d", row.VehicleID),
				fmtTime(row.InitiatedAt),
				fmtTime(row.MqttPublishedAt),
				fmtTime(row.UsvAckAt),
				fmtTime(row.AckReceivedAt),
				fmtTime(row.WsSentAt),
				fmtTime(row.WsReceivedAt),
				fmtMs(row.InitiatedAt, row.MqttPublishedAt),
				fmtMs(row.MqttPublishedAt, row.AckReceivedAt),
				fmtMs(row.UsvAckAt, row.AckReceivedAt),
				fmtMsMin0(row.WsSentAt, row.WsReceivedAt),
				fmtMsMin0(row.InitiatedAt, row.WsReceivedAt),
				row.CreatedAt.UTC().Format(time.RFC3339Nano),
			}
			if err := w.Write(record); err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "csv write failed"})
			}
		}

	case "waypoint":
		header := []string{
			"ack_id", "log_id", "vehicle_id",
			"initiated_at", "ack_received_at", "ws_sent_at", "ws_received_at",
			"seg_init_ack_ms", "seg_ack_ws_ms", "seg_ws_ms", "total_ms",
			"created_at",
		}
		if err := w.Write(header); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "csv write failed"})
		}
		for _, row := range rows {
			record := []string{
				fmt.Sprintf("%d", row.ID),
				fmt.Sprintf("%d", row.LogID),
				fmt.Sprintf("%d", row.VehicleID),
				fmtTime(row.InitiatedAt),
				fmtTime(row.AckReceivedAt),
				fmtTime(row.WsSentAt),
				fmtTime(row.WsReceivedAt),
				fmtMs(row.InitiatedAt, row.AckReceivedAt),
				fmtMs(row.AckReceivedAt, row.WsSentAt),
				fmtMsMin0(row.WsSentAt, row.WsReceivedAt),
				fmtMsMin0(row.InitiatedAt, row.WsReceivedAt),
				row.CreatedAt.UTC().Format(time.RFC3339Nano),
			}
			if err := w.Write(record); err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "csv write failed"})
			}
		}

	case "thruster":
		header := []string{
			"ack_id", "log_id", "vehicle_id",
			"initiated_at", "mqtt_received_at", "ws_sent_at", "ws_received_at",
			"payload_size_bytes",
			"seg_init_mqtt_ms", "seg_proc_ms", "seg_ws_ms", "e2e_ms",
			"created_at",
		}
		if err := w.Write(header); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "csv write failed"})
		}
		for _, row := range rows {
			record := []string{
				fmt.Sprintf("%d", row.ID),
				fmt.Sprintf("%d", row.LogID),
				fmt.Sprintf("%d", row.VehicleID),
				fmtTime(row.InitiatedAt),
				fmtTime(row.MqttReceivedAt),
				fmtTime(row.WsSentAt),
				fmtTime(row.WsReceivedAt),
				fmt.Sprintf("%d", row.PayloadSizeBytes),
				fmtMs(row.InitiatedAt, row.MqttReceivedAt),
				fmtMs(row.MqttReceivedAt, row.WsSentAt),
				fmtMsMin0(row.WsSentAt, row.WsReceivedAt),
				fmtMsMin0(row.InitiatedAt, row.WsReceivedAt),
				row.CreatedAt.UTC().Format(time.RFC3339Nano),
			}
			if err := w.Write(record); err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "csv write failed"})
			}
		}

	default: // vehicle, sensor
		header := []string{
			"ack_id", "log_id", "vehicle_id", "sensor_id",
			"usv_timestamp", "mqtt_received_at", "ws_sent_at", "ws_received_at",
			"payload_size_bytes",
			"seg_1_2_ms", "seg_proc_ms", "seg_ws_ms", "e2e_ms",
			"created_at",
		}
		if err := w.Write(header); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "csv write failed"})
		}
		for _, row := range rows {
			sensorIDStr := ""
			if row.SensorID != nil {
				sensorIDStr = fmt.Sprintf("%d", *row.SensorID)
			}
			record := []string{
				fmt.Sprintf("%d", row.ID),
				fmt.Sprintf("%d", row.LogID),
				fmt.Sprintf("%d", row.VehicleID),
				sensorIDStr,
				fmtTime(row.UsvTimestamp),
				fmtTime(row.MqttReceivedAt),
				fmtTime(row.WsSentAt),
				fmtTime(row.WsReceivedAt),
				fmt.Sprintf("%d", row.PayloadSizeBytes),
				fmtMs(row.UsvTimestamp, row.MqttReceivedAt),
				fmtMs(row.MqttReceivedAt, row.WsSentAt),
				fmtMsMin0(row.WsSentAt, row.WsReceivedAt),
				fmtMsMin0(row.UsvTimestamp, row.WsReceivedAt),
				row.CreatedAt.UTC().Format(time.RFC3339Nano),
			}
			if err := w.Write(record); err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "csv write failed"})
			}
		}
	}

	w.Flush()
	if err := w.Error(); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "csv flush failed"})
	}

	filename := fmt.Sprintf("latency_%s_%d.csv", logType, vehicleID)
	c.Set("Content-Type", "text/csv")
	c.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	return c.Status(fiber.StatusOK).Send(buf.Bytes())
}
