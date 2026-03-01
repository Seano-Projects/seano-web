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

type VehicleLogHandler struct {
	vehicleLogRepo *repository.VehicleLogRepository
	vehicleRepo    *repository.VehicleRepository
	db             *gorm.DB
}

func NewVehicleLogHandler(vehicleLogRepo *repository.VehicleLogRepository, vehicleRepo *repository.VehicleRepository, db *gorm.DB) *VehicleLogHandler {
	return &VehicleLogHandler{
		vehicleLogRepo: vehicleLogRepo,
		vehicleRepo:    vehicleRepo,
		db:             db,
	}
}

// GetVehicleLogs godoc
// @Summary Get vehicle logs with filters
// @Description Retrieve vehicle logs with optional filters (vehicle_id, time range)
// @Tags Vehicle Logs
// @Accept json
// @Produce json
// @Param vehicle_id query int false "Vehicle ID"
// @Param start_time query string false "Start Time (ISO 8601)"
// @Param end_time query string false "End Time (ISO 8601)"
// @Param limit query int false "Limit" default(100)
// @Param offset query int false "Offset" default(0)
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /vehicle-logs [get]
func (h *VehicleLogHandler) GetVehicleLogs(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	var query model.VehicleLogQuery

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
	if !middleware.HasPermission(h.db, userID, "telemetry.read") {
		// Get user's vehicle IDs
		userVehicleIDs, err := h.vehicleRepo.GetVehicleIDsByUserID(userID)
		if err != nil || len(userVehicleIDs) == 0 {
			return c.JSON(fiber.Map{
				"data":  []model.VehicleLog{},
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
					"error": "You don't have permission to view this vehicle's logs",
				})
			}
		} else {
			// No specific vehicle requested, use first vehicle
			query.VehicleID = userVehicleIDs[0]
		}
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

	logs, err := h.vehicleLogRepo.GetVehicleLogs(query)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch vehicle logs",
		})
	}

	count, _ := h.vehicleLogRepo.CountLogs(query)

	return c.JSON(fiber.Map{
		"data":  logs,
		"count": count,
	})
}

// GetVehicleLogByID godoc
// @Summary Get vehicle log by ID
// @Description Retrieve a specific vehicle log by ID
// @Tags Vehicle Logs
// @Accept json
// @Produce json
// @Param id path int true "Vehicle Log ID"
// @Success 200 {object} model.VehicleLog
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Security BearerAuth
// @Router /vehicle-logs/{id} [get]
func (h *VehicleLogHandler) GetVehicleLogByID(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid ID",
		})
	}

	log, err := h.vehicleLogRepo.GetVehicleLogByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Vehicle log not found",
		})
	}

	return c.JSON(log)
}

// GetLatestVehicleLog godoc
// @Summary Get latest vehicle log
// @Description Retrieve the latest log for a specific vehicle
// @Tags Vehicle Logs
// @Accept json
// @Produce json
// @Param vehicle_id path int true "Vehicle ID"
// @Success 200 {object} model.VehicleLog
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Security BearerAuth
// @Router /vehicle-logs/latest/{vehicle_id} [get]
func (h *VehicleLogHandler) GetLatestVehicleLog(c *fiber.Ctx) error {
	vehicleID, err := strconv.ParseUint(c.Params("vehicle_id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid vehicle_id",
		})
	}

	log, err := h.vehicleLogRepo.GetLatestLogByVehicle(uint(vehicleID))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "No logs found for this vehicle",
		})
	}

	return c.JSON(log)
}

// CreateVehicleLog godoc
// @Summary Create a new vehicle log
// @Description Create a new vehicle log entry
// @Tags Vehicle Logs
// @Accept json
// @Produce json
// @Param log body model.CreateVehicleLogRequest true "Vehicle Log Data"
// @Success 201 {object} model.VehicleLog
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /vehicle-logs [post]
func (h *VehicleLogHandler) CreateVehicleLog(c *fiber.Ctx) error {
	var req model.CreateVehicleLogRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Convert FlexibleString to *string for database
	var tempSystem *string
	if req.TemperatureSystem != nil {
		tempSystem = &req.TemperatureSystem.Value
	}
	
	// Calculate battery_percentage if not provided but battery_voltage exists
	batteryPercentage := req.BatteryPercentage
	if batteryPercentage == nil && req.BatteryVoltage != nil {
		voltage := *req.BatteryVoltage
		percentage := ((voltage - 11.0) / 1.6) * 100.0
		if percentage < 0 {
			percentage = 0
		}
		if percentage > 100 {
			percentage = 100
		}
		batteryPercentage = &percentage
	}
	
	log := &model.VehicleLog{
		VehicleID:         req.VehicleID,
		BatteryVoltage:    req.BatteryVoltage,
		BatteryCurrent:    req.BatteryCurrent,
		BatteryPercentage: batteryPercentage,
		RSSI:              req.RSSI,
		Mode:              req.Mode,
		Latitude:          req.Latitude,
		Longitude:         req.Longitude,
		Altitude:          req.Altitude,
		Heading:           req.Heading,
		Armed:             req.Armed,
		GPSok:             req.GPSok,
		SystemStatus:      req.SystemStatus,
		Speed:             req.Speed,
		Roll:              req.Roll,
		Pitch:             req.Pitch,
		Yaw:               req.Yaw,
		TemperatureSystem: tempSystem,
	}

	if err := h.vehicleLogRepo.CreateVehicleLog(log); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create vehicle log",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(log)
}

// DeleteVehicleLog godoc
// @Summary Delete a vehicle log
// @Description Delete a vehicle log by ID
// @Tags Vehicle Logs
// @Accept json
// @Produce json
// @Param id path int true "Vehicle Log ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /vehicle-logs/{id} [delete]
func (h *VehicleLogHandler) DeleteVehicleLog(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid ID",
		})
	}

	if err := h.vehicleLogRepo.DeleteVehicleLog(uint(id)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete vehicle log",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Vehicle log deleted successfully",
	})
}

