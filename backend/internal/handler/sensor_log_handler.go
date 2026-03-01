package handler

import (
	"go-fiber-pgsql/internal/middleware"
	"go-fiber-pgsql/internal/model"
	"go-fiber-pgsql/internal/repository"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type SensorLogHandler struct {
	sensorLogRepo *repository.SensorLogRepository
	vehicleRepo   *repository.VehicleRepository
	db            *gorm.DB
}

func NewSensorLogHandler(sensorLogRepo *repository.SensorLogRepository, vehicleRepo *repository.VehicleRepository, db *gorm.DB) *SensorLogHandler {
	return &SensorLogHandler{
		sensorLogRepo: sensorLogRepo,
		vehicleRepo:   vehicleRepo,
		db:            db,
	}
}

// GetSensorLogs godoc
// @Summary Get sensor logs with filters
// @Description Retrieve sensor logs with optional filters (vehicle_id, sensor_id, time range)
// @Tags Sensor Logs
// @Accept json
// @Produce json
// @Param vehicle_id query int false "Vehicle ID"
// @Param sensor_id query int false "Sensor ID"
// @Param start_time query string false "Start Time (ISO 8601)"
// @Param end_time query string false "End Time (ISO 8601)"
// @Param limit query int false "Limit" default(100)
// @Param offset query int false "Offset" default(0)
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /sensor-logs [get]
func (h *SensorLogHandler) GetSensorLogs(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	var query model.SensorLogQuery

	// Parse query parameters
	if vehicleID := c.Query("vehicle_id"); vehicleID != "" {
		id, err := strconv.ParseUint(vehicleID, 10, 32)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid vehicle_id",
			})
		}
		query.VehicleID = uint(id)
	}

	// Check permission: if not admin, filter by user's vehicles only
	if !middleware.HasPermission(h.db, userID, "sensor_logs.read") {
		// Get user's vehicle IDs
		userVehicleIDs, err := h.vehicleRepo.GetVehicleIDsByUserID(userID)
		if err != nil || len(userVehicleIDs) == 0 {
			return c.JSON(fiber.Map{
				"data":  []model.SensorLog{},
				"count": 0,
			})
		}

		// If vehicle_id is specified, check if user owns it
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
					"error": "You don't have permission to view this vehicle's sensor logs",
				})
			}
		} else {
			// No specific vehicle requested, filter to first user's vehicle for query
			// Note: Repository needs to be updated to support IN clause for multiple vehicles
			query.VehicleID = userVehicleIDs[0]
		}
	}

	if sensorID := c.Query("sensor_id"); sensorID != "" {
		id, err := strconv.ParseUint(sensorID, 10, 32)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid sensor_id",
			})
		}
		query.SensorID = uint(id)
	}

	if startTime := c.Query("start_time"); startTime != "" {
		t, err := time.Parse(time.RFC3339, startTime)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid start_time format",
			})
		}
		query.StartTime = t
	}

	if endTime := c.Query("end_time"); endTime != "" {
		t, err := time.Parse(time.RFC3339, endTime)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid end_time format",
			})
		}
		query.EndTime = t
	}

	if limit := c.Query("limit"); limit != "" {
		l, err := strconv.Atoi(limit)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid limit",
			})
		}
		query.Limit = l
	}

	if offset := c.Query("offset"); offset != "" {
		o, err := strconv.Atoi(offset)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid offset",
			})
		}
		query.Offset = o
	}

	logs, err := h.sensorLogRepo.GetSensorLogs(query)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch sensor logs",
		})
	}

	count, _ := h.sensorLogRepo.CountLogs(query)

	return c.JSON(fiber.Map{
		"data":  logs,
		"count": count,
	})
}

// GetSensorLogByID godoc
// @Summary Get sensor log by ID
// @Description Retrieve a specific sensor log by ID
// @Tags Sensor Logs
// @Accept json
// @Produce json
// @Param id path int true "Sensor Log ID"
// @Success 200 {object} model.SensorLog
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Security BearerAuth
// @Router /sensor-logs/{id} [get]
func (h *SensorLogHandler) GetSensorLogByID(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid ID",
		})
	}

	log, err := h.sensorLogRepo.GetSensorLogByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Sensor log not found",
		})
	}

	return c.JSON(log)
}

// CreateSensorLog godoc
// @Summary Create a new sensor log
// @Description Create a new sensor log entry
// @Tags Sensor Logs
// @Accept json
// @Produce json
// @Param log body model.CreateSensorLogRequest true "Sensor Log Data"
// @Success 201 {object} model.SensorLog
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /sensor-logs [post]
func (h *SensorLogHandler) CreateSensorLog(c *fiber.Ctx) error {
	var req model.CreateSensorLogRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	log := &model.SensorLog{
		VehicleID: req.VehicleID,
		SensorID:  req.SensorID,
		Data:      req.Data,
	}

	if err := h.sensorLogRepo.CreateSensorLog(log); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create sensor log",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(log)
}

// DeleteSensorLog godoc
// @Summary Delete a sensor log
// @Description Delete a sensor log by ID
// @Tags Sensor Logs
// @Accept json
// @Produce json
// @Param id path int true "Sensor Log ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /sensor-logs/{id} [delete]
func (h *SensorLogHandler) DeleteSensorLog(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid ID",
		})
	}

	if err := h.sensorLogRepo.DeleteSensorLog(uint(id)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete sensor log",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Sensor log deleted successfully",
	})
}
