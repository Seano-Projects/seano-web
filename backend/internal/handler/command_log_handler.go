package handler

import (
	"errors"
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
		VehicleID:   req.VehicleID,
		VehicleCode: req.VehicleCode,
		Command:     req.Command,
		Status:      req.Status,
		Message:     req.Message,
		InitiatedAt: req.InitiatedAt,
		ResolvedAt:  req.ResolvedAt,
	}

	if err := h.repo.CreateCommandLog(entry); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create command log"})
	}

	// Broadcast to WebSocket clients
	if h.wsHub != nil {
		var resolvedAt *string
		if entry.ResolvedAt != nil {
			s := entry.ResolvedAt.Format(time.RFC3339)
			resolvedAt = &s
		}
		_ = h.wsHub.BroadcastCommandLog(wsocket.CommandLogData{
			ID:          entry.ID,
			VehicleID:   entry.VehicleID,
			VehicleCode: entry.VehicleCode,
			Command:     entry.Command,
			Status:      entry.Status,
			Message:     entry.Message,
			InitiatedAt: entry.InitiatedAt.Format(time.RFC3339),
			ResolvedAt:  resolvedAt,
			CreatedAt:   entry.CreatedAt.Format(time.RFC3339),
		})
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

	resolvedAt := time.Now()
	if ts := strings.TrimSpace(req.Timestamp); ts != "" {
		parsed, err := time.Parse(time.RFC3339, ts)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "timestamp must be RFC3339",
			})
		}
		resolvedAt = parsed
	}

	updated, err := h.repo.UpdateLatestPendingCommandLog(vehicleCode, command, finalStatus, req.Message, resolvedAt)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			var vehicle model.Vehicle
			if err := h.db.Where("code = ?", vehicleCode).First(&vehicle).Error; err != nil {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid vehicle_code"})
			}

			entry := &model.CommandLog{
				VehicleID:   vehicle.ID,
				VehicleCode: vehicleCode,
				Command:     command,
				Status:      finalStatus,
				Message:     req.Message,
				InitiatedAt: resolvedAt,
				ResolvedAt:  &resolvedAt,
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
		var resolvedAtStr *string
		if updated.ResolvedAt != nil {
			s := updated.ResolvedAt.Format(time.RFC3339)
			resolvedAtStr = &s
		}
		_ = h.wsHub.BroadcastCommandLog(wsocket.CommandLogData{
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
