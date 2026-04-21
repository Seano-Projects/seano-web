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

// WaypointLogHandler handles HTTP requests for waypoint logs
type WaypointLogHandler struct {
	repo        *repository.WaypointLogRepository
	vehicleRepo *repository.VehicleRepository
	db          *gorm.DB
	wsHub       *wsocket.Hub
}

func NewWaypointLogHandler(repo *repository.WaypointLogRepository, vehicleRepo *repository.VehicleRepository, db *gorm.DB, wsHub *wsocket.Hub) *WaypointLogHandler {
	return &WaypointLogHandler{repo: repo, vehicleRepo: vehicleRepo, db: db, wsHub: wsHub}
}

// GetWaypointLogs returns a list of waypoint logs with optional filters
func (h *WaypointLogHandler) GetWaypointLogs(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	query := model.WaypointLogQuery{
		VehicleID:   uint(c.QueryInt("vehicle_id", 0)),
		VehicleCode: c.Query("vehicle_code"),
		MissionID:   uint(c.QueryInt("mission_id", 0)),
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
			return c.JSON([]model.WaypointLog{})
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
					"error": "You don't have permission to view this vehicle's waypoint logs",
				})
			}
		} else {
			query.VehicleIDs = userVehicleIDs
		}
	}

	logs, err := h.repo.GetWaypointLogs(query)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch waypoint logs",
		})
	}

	return c.JSON(logs)
}

// GetWaypointLogByID returns a single waypoint log by ID
func (h *WaypointLogHandler) GetWaypointLogByID(c *fiber.Ctx) error {
	id, err := c.ParamsInt("id")
	if err != nil || id <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid id"})
	}

	log, err := h.repo.GetWaypointLogByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "waypoint log not found"})
	}

	return c.JSON(log)
}

// CreateWaypointLog creates a new waypoint log entry
func (h *WaypointLogHandler) CreateWaypointLog(c *fiber.Ctx) error {
	var req model.CreateWaypointLogRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	if req.VehicleCode == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "vehicle_code is required"})
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

	entry := &model.WaypointLog{
		VehicleID:     req.VehicleID,
		VehicleCode:   req.VehicleCode,
		MissionID:     req.MissionID,
		MissionName:   req.MissionName,
		WaypointCount: req.WaypointCount,
		Status:        req.Status,
		Message:       req.Message,
		InitiatedAt:   req.InitiatedAt,
		ResolvedAt:    req.ResolvedAt,
	}

	if err := h.repo.CreateWaypointLog(entry); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create waypoint log"})
	}

	// Broadcast to WebSocket clients
	if h.wsHub != nil {
		var resolvedAt *string
		if entry.ResolvedAt != nil {
			s := entry.ResolvedAt.Format(time.RFC3339)
			resolvedAt = &s
		}
		_ = h.wsHub.BroadcastWaypointLog(wsocket.WaypointLogData{
			ID:            entry.ID,
			VehicleID:     entry.VehicleID,
			VehicleCode:   entry.VehicleCode,
			MissionID:     entry.MissionID,
			MissionName:   entry.MissionName,
			WaypointCount: entry.WaypointCount,
			Status:        entry.Status,
			Message:       entry.Message,
			InitiatedAt:   entry.InitiatedAt.Format(time.RFC3339),
			ResolvedAt:    resolvedAt,
			CreatedAt:     entry.CreatedAt.Format(time.RFC3339),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(entry)
}

// CreateWaypointAck handles ACK updates from USV for mission uploads
func (h *WaypointLogHandler) CreateWaypointAck(c *fiber.Ctx) error {
	var req model.CreateWaypointAckRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	vehicleCode := strings.TrimSpace(req.VehicleCode)
	if vehicleCode == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "vehicle_code is required"})
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

	var updated *model.WaypointLog
	if req.WaypointLogID != 0 {
		if err := h.repo.UpdateWaypointLogStatusByID(req.WaypointLogID, finalStatus, req.Message, resolvedAt); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update waypoint log"})
		}
		logEntry, err := h.repo.GetWaypointLogByID(req.WaypointLogID)
		if err == nil {
			updated = logEntry
		}
	} else {
		entry, err := h.repo.UpdateLatestPendingWaypointLog(vehicleCode, req.MissionID, finalStatus, req.Message, resolvedAt)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "pending waypoint upload not found"})
			}
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update waypoint log"})
		}
		updated = entry
	}

	if h.wsHub != nil && updated != nil {
		var resolvedAtStr *string
		if updated.ResolvedAt != nil {
			s := updated.ResolvedAt.Format(time.RFC3339)
			resolvedAtStr = &s
		}
		_ = h.wsHub.BroadcastWaypointLog(wsocket.WaypointLogData{
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

	return c.JSON(updated)
}

// DeleteWaypointLog removes a waypoint log by ID
func (h *WaypointLogHandler) DeleteWaypointLog(c *fiber.Ctx) error {
	id, err := c.ParamsInt("id")
	if err != nil || id <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid id"})
	}

	if err := h.repo.DeleteWaypointLog(uint(id)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to delete waypoint log"})
	}

	return c.SendStatus(fiber.StatusNoContent)
}
