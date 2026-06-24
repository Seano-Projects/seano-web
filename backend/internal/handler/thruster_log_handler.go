package handler

import (
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

// ThrusterLogHandler handles HTTP requests for thruster logs
type ThrusterLogHandler struct {
	repo        *repository.ThrusterLogRepository
	vehicleRepo *repository.VehicleRepository
	db          *gorm.DB
	wsHub       *wsocket.Hub
}

func NewThrusterLogHandler(repo *repository.ThrusterLogRepository, vehicleRepo *repository.VehicleRepository, db *gorm.DB, wsHub *wsocket.Hub) *ThrusterLogHandler {
	return &ThrusterLogHandler{repo: repo, vehicleRepo: vehicleRepo, db: db, wsHub: wsHub}
}

// GetThrusterLogs returns a list of thruster logs with optional filters
func (h *ThrusterLogHandler) GetThrusterLogs(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	query := model.ThrusterLogQuery{
		VehicleID:   uint(c.QueryInt("vehicle_id", 0)),
		VehicleCode: c.Query("vehicle_code"),
		Event:       c.Query("event"),
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

	if !middleware.HasPermission(h.db, userID, "vehicles.read_all") {
		userVehicleIDs, err := h.vehicleRepo.GetVehicleIDsByUserID(userID)
		if err != nil || len(userVehicleIDs) == 0 {
			return c.JSON([]model.ThrusterLog{})
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
					"error": "You don't have permission to view this vehicle's thruster logs",
				})
			}
		} else {
			query.VehicleIDs = userVehicleIDs
		}
	}

	logs, err := h.repo.GetThrusterLogs(query)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch thruster logs",
		})
	}

	return c.JSON(logs)
}

// GetThrusterLogByID returns a single thruster log by ID
func (h *ThrusterLogHandler) GetThrusterLogByID(c *fiber.Ctx) error {
	id, err := c.ParamsInt("id")
	if err != nil || id <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid id"})
	}

	log, err := h.repo.GetThrusterLogByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "thruster log not found"})
	}

	return c.JSON(log)
}

// DeleteThrusterLog removes a thruster log by ID
func (h *ThrusterLogHandler) DeleteThrusterLog(c *fiber.Ctx) error {
	id, err := c.ParamsInt("id")
	if err != nil || id <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid id"})
	}

	if err := h.repo.DeleteThrusterLog(uint(id)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to delete thruster log"})
	}

	return c.SendStatus(fiber.StatusNoContent)
}

// ExportThrusterLogs exports thruster logs to CSV
func (h *ThrusterLogHandler) ExportThrusterLogs(c *fiber.Ctx) error {
	var query model.ThrusterLogQuery

	if vehicleID := c.Query("vehicle_id"); vehicleID != "" {
		id, err := strconv.ParseUint(vehicleID, 10, 32)
		if err == nil {
			query.VehicleID = uint(id)
		}
	}
	if vehicleCode := c.Query("vehicle_code"); vehicleCode != "" {
		query.VehicleCode = vehicleCode
	}
	if event := c.Query("event"); event != "" {
		query.Event = event
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

	query.Limit = 50000
	query.Order = "asc"

	logs, err := h.repo.GetThrusterLogs(query)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch logs for export",
		})
	}

	csvHeader := []string{"Timestamp", "Vehicle", "VehicleCode", "Event", "ThrottlePct", "SteeringPct", "InitiatedAt"}
	var b strings.Builder
	b.WriteString(strings.Join(csvHeader, ","))
	b.WriteString("\n")

	esc := func(s string) string {
		s = strings.ReplaceAll(s, "\"", "\"\"")
		return "\"" + s + "\""
	}

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

		row := []string{
			esc(ts),
			esc(vehicleDisp),
			esc(log.VehicleCode),
			esc(log.Event),
			esc(strconv.Itoa(log.ThrottlePct)),
			esc(strconv.Itoa(log.SteeringPct)),
			esc(initiatedAtStr),
		}

		b.WriteString(strings.Join(row, ","))
		b.WriteString("\n")
	}

	c.Set("Content-Type", "text/csv")
	c.Set("Content-Disposition", "attachment; filename=thruster_logs.csv")

	return c.SendString(b.String())
}
