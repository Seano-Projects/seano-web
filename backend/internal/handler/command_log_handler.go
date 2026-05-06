package handler

import (
	"encoding/csv"
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"

	"go-fiber-pgsql/internal/middleware"
	"go-fiber-pgsql/internal/model"
	"go-fiber-pgsql/internal/repository"
	wsocket "go-fiber-pgsql/internal/websocket"
)

// CommandLogHandler handles HTTP requests for command logs
type CommandLogHandler struct {
	repo        *repository.CommandLogRepository
	vehicleRepo *repository.VehicleRepository
	db          *gorm.DB
	wsHub       *wsocket.Hub
}

func NewCommandLogHandler(repo *repository.CommandLogRepository, vehicleRepo *repository.VehicleRepository, db *gorm.DB, wsHub *wsocket.Hub) *CommandLogHandler {
	return &CommandLogHandler{repo: repo, vehicleRepo: vehicleRepo, db: db, wsHub: wsHub}
}

func toRFC3339NanoPtr(t *time.Time) *string {
	if t == nil {
		return nil
	}
	s := t.Format(time.RFC3339Nano)
	return &s
}

func toCommandLogWSData(entry *model.CommandLog) wsocket.CommandLogData {
	return wsocket.CommandLogData{
		ID:              entry.ID,
		VehicleID:       entry.VehicleID,
		VehicleCode:     entry.VehicleCode,
		RequestID:       entry.RequestID,
		Command:         entry.Command,
		Status:          entry.Status,
		Message:         entry.Message,
		InitiatedAt:     entry.InitiatedAt.Format(time.RFC3339Nano),
		MqttPublishedAt: toRFC3339NanoPtr(entry.MqttPublishedAt),
		UsvAckAt:        toRFC3339NanoPtr(entry.UsvAckAt),
		AckReceivedAt:   toRFC3339NanoPtr(entry.AckReceivedAt),
		ResolvedAt:      toRFC3339NanoPtr(entry.ResolvedAt),
		WsReceivedAt:    toRFC3339NanoPtr(entry.WsReceivedAt),
		CreatedAt:       entry.CreatedAt.Format(time.RFC3339Nano),
	}
}

// GetCommandLogs returns a list of command logs with optional filters
func (h *CommandLogHandler) GetCommandLogs(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	query := model.CommandLogQuery{
		VehicleID:   uint(c.QueryInt("vehicle_id", 0)),
		VehicleCode: c.Query("vehicle_code"),
		Command:     c.Query("command"),
		Status:      c.Query("status"),
		Limit:       c.QueryInt("limit", 200),
		Offset:      c.QueryInt("offset", 0),
	}

	if startTimeStr := c.Query("start_time"); startTimeStr != "" {
		if t, err := time.Parse(time.RFC3339, startTimeStr); err == nil {
			query.StartTime = t
		}
	}
	if endTimeStr := c.Query("end_time"); endTimeStr != "" {
		if t, err := time.Parse(time.RFC3339, endTimeStr); err == nil {
			query.EndTime = t
		}
	}

	// Filter by user's vehicles unless admin
	if !middleware.HasPermission(h.db, userID, "vehicles.read_all") {
		userVehicleIDs, err := h.vehicleRepo.GetVehicleIDsByUserID(userID)
		if err != nil || len(userVehicleIDs) == 0 {
			return c.JSON([]model.CommandLog{})
		}
		if query.VehicleID != 0 {
			found := false
			for _, vid := range userVehicleIDs {
				if vid == query.VehicleID {
					found = true
					break
				}
			}
			if !found {
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
					"error": "You don't have permission to view this vehicle's command logs",
				})
			}
		} else {
			query.VehicleIDs = userVehicleIDs
		}
	}

	logs, err := h.repo.GetCommandLogs(query)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch command logs",
		})
	}

	return c.JSON(logs)
}

// GetCommandLogByID returns a single command log by ID
func (h *CommandLogHandler) GetCommandLogByID(c *fiber.Ctx) error {
	id, err := c.ParamsInt("id")
	if err != nil || id <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid id"})
	}

	log, err := h.repo.GetCommandLogByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "command log not found"})
	}

	return c.JSON(log)
}

// GetPendingCommands returns pending commands for a vehicle (USV polling)
func (h *CommandLogHandler) GetPendingCommands(c *fiber.Ctx) error {
	limit := c.QueryInt("limit", 1)
	if limit <= 0 {
		limit = 1
	}
	if limit > 20 {
		limit = 20
	}

	var vehicleID uint
	vehicleCode := ""

	if v := c.Locals("vehicle_id"); v != nil {
		if id, ok := v.(uint); ok {
			vehicleID = id
		}
	}
	if v := c.Locals("vehicle_code"); v != nil {
		if code, ok := v.(string); ok {
			vehicleCode = code
		}
	}

	if vehicleID == 0 && vehicleCode == "" {
		vehicleCode = strings.TrimSpace(c.Query("vehicle_code"))
		if vehicleCode == "" {
			id := c.QueryInt("vehicle_id", 0)
			if id > 0 {
				vehicleID = uint(id)
			}
		}
	}

	if vehicleID == 0 && vehicleCode == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "vehicle_code or vehicle_id is required",
		})
	}

	logs, err := h.repo.GetPendingCommandLogs(vehicleID, vehicleCode, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch pending commands",
		})
	}

	return c.JSON(fiber.Map{
		"data":  logs,
		"count": len(logs),
	})
}

// CreateCommandLog creates a new command log entry
func (h *CommandLogHandler) CreateCommandLog(c *fiber.Ctx) error {
	var req model.CreateCommandLogRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	if req.VehicleCode == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "vehicle_code is required"})
	}
	if req.Command == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "command is required"})
	}

	// Default initiated_at to now if not provided
	if req.InitiatedAt.IsZero() {
		req.InitiatedAt = time.Now()
	}

	// Set default status
	if req.Status == "" {
		req.Status = "pending"
	}

	// Try to resolve vehicle_id from vehicle_code if not given
	if req.VehicleID == 0 && req.VehicleCode != "" {
		var vehicle model.Vehicle
		if err := h.db.Where("code = ?", req.VehicleCode).First(&vehicle).Error; err == nil {
			req.VehicleID = vehicle.ID
		}
	}

	entry := &model.CommandLog{
		VehicleID:       req.VehicleID,
		VehicleCode:     req.VehicleCode,
		RequestID:       req.RequestID,
		Command:         req.Command,
		Status:          req.Status,
		Message:         req.Message,
		InitiatedAt:     req.InitiatedAt,
		MqttPublishedAt: req.MqttPublishedAt,
		UsvAckAt:        req.UsvAckAt,
		AckReceivedAt:   req.AckReceivedAt,
		ResolvedAt:      req.ResolvedAt,
		WsSentAt:        req.WsSentAt,
		WsReceivedAt:    req.WsReceivedAt,
	}

	if err := h.repo.CreateCommandLog(entry); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create command log"})
	}

	// Broadcast to WebSocket clients
	if h.wsHub != nil {
		wsSentAt := time.Now().UTC()
		if err := h.repo.UpdateCommandLogWSSentAt(entry.ID, wsSentAt); err == nil {
			entry.WsSentAt = &wsSentAt
		}
		_ = h.wsHub.BroadcastCommandLog(toCommandLogWSData(entry), wsSentAt.Format(time.RFC3339Nano))
	}

	return c.Status(fiber.StatusCreated).JSON(entry)
}

// CreateCommandAck handles ACK updates from USV
func (h *CommandLogHandler) CreateCommandAck(c *fiber.Ctx) error {
	var req model.CreateCommandAckRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	vehicleCode := strings.TrimSpace(req.VehicleCode)
	if vehicleCode == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "vehicle_code is required"})
	}
	command := strings.TrimSpace(req.Command)
	if command == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "command is required"})
	}

	status := strings.ToLower(strings.TrimSpace(req.Status))
	if status == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "status is required"})
	}

	finalStatus := ""
	switch status {
	case "ok", "success":
		finalStatus = "success"
	case "error", "failed":
		finalStatus = "failed"
	case "timeout":
		finalStatus = "timeout"
	default:
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "status must be ok, error, success, failed, or timeout",
		})
	}

	ackReceivedAt := time.Now().UTC()
	resolvedAt := ackReceivedAt
	var usvAckAt *time.Time
	if ts := strings.TrimSpace(req.Timestamp); ts != "" {
		if parsed, err := time.Parse(time.RFC3339Nano, ts); err == nil {
			usvAckAt = &parsed
		} else if parsed, err := time.Parse(time.RFC3339, ts); err == nil {
			usvAckAt = &parsed
		} else {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "timestamp must be RFC3339/RFC3339Nano",
			})
		}
	}

	updated, err := h.repo.UpdateLatestPendingCommandLog(vehicleCode, strings.TrimSpace(req.RequestID), command, finalStatus, req.Message, usvAckAt, ackReceivedAt, resolvedAt)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			var vehicle model.Vehicle
			if err := h.db.Where("code = ?", vehicleCode).First(&vehicle).Error; err != nil {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid vehicle_code"})
			}

			entry := &model.CommandLog{
				VehicleID:      vehicle.ID,
				VehicleCode:    vehicleCode,
				RequestID:      strings.TrimSpace(req.RequestID),
				Command:        command,
				Status:         finalStatus,
				Message:        req.Message,
				InitiatedAt:    ackReceivedAt,
				UsvAckAt:       usvAckAt,
				AckReceivedAt:  &ackReceivedAt,
				ResolvedAt:     &resolvedAt,
			}

			if err := h.repo.CreateCommandLog(entry); err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create command log"})
			}
			updated = entry
		} else {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update command log"})
		}
	}

	if h.wsHub != nil && updated != nil {
		wsSentAt := time.Now().UTC()
		if err := h.repo.UpdateCommandLogWSSentAt(updated.ID, wsSentAt); err == nil {
			updated.WsSentAt = &wsSentAt
		}
		_ = h.wsHub.BroadcastCommandLog(toCommandLogWSData(updated), wsSentAt.Format(time.RFC3339Nano))
	}

	return c.JSON(updated)
}

// DeleteCommandLog removes a command log by ID
func (h *CommandLogHandler) DeleteCommandLog(c *fiber.Ctx) error {
	id, err := c.ParamsInt("id")
	if err != nil || id <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid id"})
	}

	if err := h.repo.DeleteCommandLog(uint(id)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to delete command log"})
	}

	return c.SendStatus(fiber.StatusNoContent)
}

// MarkWSReceivedAt stores frontend websocket receive timestamp for a command log.
func (h *CommandLogHandler) MarkWSReceivedAt(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	id, err := c.ParamsInt("id")
	if err != nil || id <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid id"})
	}

	logEntry, err := h.repo.GetCommandLogByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "command log not found"})
	}

	if !middleware.HasPermission(h.db, userID, "vehicles.read_all") {
		userVehicleIDs, err := h.vehicleRepo.GetVehicleIDsByUserID(userID)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to validate ownership"})
		}

		allowed := false
		for _, vid := range userVehicleIDs {
			if vid == logEntry.VehicleID {
				allowed = true
				break
			}
		}

		if !allowed {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "You don't have permission to update this command log"})
		}
	}

	wsReceivedAt := time.Now().UTC()
	if err := h.repo.UpdateCommandLogWSReceivedAt(uint(id), wsReceivedAt); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update ws_received_at"})
	}

	return c.JSON(fiber.Map{"message": "ws_received_at updated"})
}

// ExportCommandLogs godoc
// @Summary Export command logs to CSV
// @Description Export command logs to CSV file with optional filters
// @Tags Command Logs
// @Accept json
// @Produce text/csv
// @Param vehicle_id query int false "Vehicle ID"
// @Param start_time query string false "Start Time (ISO 8601)"
// @Param end_time query string false "End Time (ISO 8601)"
// @Success 200 {file} file "CSV file"
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /command-logs/export [get]
func (h *CommandLogHandler) ExportCommandLogs(c *fiber.Ctx) error {
	var query model.CommandLogQuery

	// Parse query parameters
	if vehicleID := c.Query("vehicle_id"); vehicleID != "" {
		id, err := strconv.ParseUint(vehicleID, 10, 32)
		if err == nil {
			query.VehicleID = uint(id)
		}
	}

	if startTime := c.Query("start_time"); startTime != "" {
		t, err := time.Parse(time.RFC3339, startTime)
		if err == nil {
			query.StartTime = t
		}
	}

	if endTime := c.Query("end_time"); endTime != "" {
		t, err := time.Parse(time.RFC3339, endTime)
		if err == nil {
			query.EndTime = t
		}
	}

	// No limit for export
	query.Limit = 0
	query.Order = "asc"

	// Get all logs matching query
	logs, err := h.repo.GetCommandLogs(query)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch logs for export",
		})
	}

	// Set CSV response headers
	c.Set("Content-Type", "text/csv")
	c.Set("Content-Disposition", "attachment; filename=command_logs.csv")

	// Use CSV writer with proper formatting
	writer := csv.NewWriter(c.Response().BodyWriter())
	defer writer.Flush()

	// Write header
	header := []string{"Timestamp", "Vehicle", "VehicleCode", "RequestID", "Command", "Status", "Message", "InitiatedAt", "MqttPublishedAt", "UsvAckAt", "AckReceivedAt", "ResolvedAt", "WsSentAt", "WsReceivedAt"}
	if err := writer.Write(header); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to write CSV header"})
	}

	// Write data rows
	for _, log := range logs {
		ts := log.CreatedAt.Format("2006-01-02T15:04:05.000Z07:00")

		vehicleDisp := ""
		if log.Vehicle != nil {
			if log.Vehicle.Name != "" {
				vehicleDisp = log.Vehicle.Name
			} else if log.Vehicle.Code != "" {
				vehicleDisp = log.Vehicle.Code
			}
		} else if log.VehicleID != 0 {
			vehicleDisp = strconv.Itoa(int(log.VehicleID))
		}

		initiatedAtStr := log.InitiatedAt.Format("2006-01-02T15:04:05.000Z07:00")
		mqttPublishedAtStr := ""
		if log.MqttPublishedAt != nil {
			mqttPublishedAtStr = log.MqttPublishedAt.Format("2006-01-02T15:04:05.000Z07:00")
		}
		usvAckAtStr := ""
		if log.UsvAckAt != nil {
			usvAckAtStr = log.UsvAckAt.Format("2006-01-02T15:04:05.000Z07:00")
		}
		ackReceivedAtStr := ""
		if log.AckReceivedAt != nil {
			ackReceivedAtStr = log.AckReceivedAt.Format("2006-01-02T15:04:05.000Z07:00")
		}
		resolvedAtStr := ""
		if log.ResolvedAt != nil {
			resolvedAtStr = log.ResolvedAt.Format("2006-01-02T15:04:05.000Z07:00")
		}
		wsSentAtStr := ""
		if log.WsSentAt != nil {
			wsSentAtStr = log.WsSentAt.Format("2006-01-02T15:04:05.000Z07:00")
		}
		wsReceivedAtStr := ""
		if log.WsReceivedAt != nil {
			wsReceivedAtStr = log.WsReceivedAt.Format("2006-01-02T15:04:05.000Z07:00")
		}

		row := []string{
			ts,
			vehicleDisp,
			log.VehicleCode,
			log.RequestID,
			log.Command,
			log.Status,
			log.Message,
			initiatedAtStr,
			mqttPublishedAtStr,
			usvAckAtStr,
			ackReceivedAtStr,
			resolvedAtStr,
			wsSentAtStr,
			wsReceivedAtStr,
		}

		if err := writer.Write(row); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to write CSV row"})
		}
	}

	return nil
}
