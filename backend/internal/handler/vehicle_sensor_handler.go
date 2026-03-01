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

type VehicleSensorHandler struct {
	vehicleSensorRepo *repository.VehicleSensorRepository
	vehicleRepo       *repository.VehicleRepository
	sensorRepo        *repository.SensorRepository
	db                *gorm.DB
}

func NewVehicleSensorHandler(
	vehicleSensorRepo *repository.VehicleSensorRepository,
	vehicleRepo *repository.VehicleRepository,
	sensorRepo *repository.SensorRepository,
	db *gorm.DB,
) *VehicleSensorHandler {
	return &VehicleSensorHandler{
		vehicleSensorRepo: vehicleSensorRepo,
		vehicleRepo:       vehicleRepo,
		sensorRepo:        sensorRepo,
		db:                db,
	}
}

// AssignSensorToVehicle godoc
// @Summary Assign a sensor to a vehicle
// @Description Assign a sensor from master data to a vehicle
// @Tags Vehicle-Sensors
// @Accept json
// @Produce json
// @Param vehicle_id path int true "Vehicle ID"
// @Param assignment body model.AssignSensorToVehicleRequest true "Sensor assignment"
// @Success 201 {object} model.VehicleSensor
// @Failure 400 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /vehicles/{vehicle_id}/sensors [post]
func (h *VehicleSensorHandler) AssignSensorToVehicle(c *fiber.Ctx) error {
	vehicleID, err := strconv.ParseUint(c.Params("vehicle_id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid vehicle ID",
		})
	}

	userID := c.Locals("user_id").(uint)

	// Check vehicle ownership
	vehicle, err := h.vehicleRepo.GetVehicleByID(uint(vehicleID))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Vehicle not found",
		})
	}

	if vehicle.UserID != userID && !middleware.HasPermission(h.db, userID, "vehicles.update") {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "You don't have permission to modify this vehicle",
		})
	}

	var req model.AssignSensorToVehicleRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request data",
		})
	}

	// Check if sensor exists
	sensor, err := h.sensorRepo.GetSensorByID(req.SensorID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Sensor not found",
		})
	}

	if !sensor.IsActive {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Cannot assign inactive sensor",
		})
	}

	vehicleSensor := &model.VehicleSensor{
		VehicleID: uint(vehicleID),
		SensorID:  req.SensorID,
		Status:    "active",
	}

	if err := h.vehicleSensorRepo.AssignSensorToVehicle(vehicleSensor); err != nil {
		if err.Error() == "sensor already assigned to this vehicle" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to assign sensor",
		})
	}

	// Reload with associations
	vehicleSensor, _ = h.vehicleSensorRepo.GetVehicleSensorByID(vehicleSensor.ID)

	return c.Status(fiber.StatusCreated).JSON(vehicleSensor)
}

// GetVehicleSensors godoc
// @Summary Get all sensors assigned to a vehicle
// @Description Get all sensors assigned to a specific vehicle
// @Tags Vehicle-Sensors
// @Produce json
// @Param vehicle_id path int true "Vehicle ID"
// @Success 200 {array} model.VehicleSensor
// @Failure 400 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /vehicles/{vehicle_id}/sensors [get]
func (h *VehicleSensorHandler) GetVehicleSensors(c *fiber.Ctx) error {
	vehicleID, err := strconv.ParseUint(c.Params("vehicle_id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid vehicle ID",
		})
	}

	userID := c.Locals("user_id").(uint)

	// Check vehicle ownership
	vehicle, err := h.vehicleRepo.GetVehicleByID(uint(vehicleID))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Vehicle not found",
		})
	}

	if vehicle.UserID != userID && !middleware.HasPermission(h.db, userID, "vehicles.read") {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "You don't have permission to view this vehicle",
		})
	}

	vehicleSensors, err := h.vehicleSensorRepo.GetVehicleSensors(uint(vehicleID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch vehicle sensors",
		})
	}

	return c.JSON(vehicleSensors)
}

// GetVehicleSensorsStatus godoc
// @Summary Get vehicle sensors status
// @Description Get detailed status of all sensors assigned to a vehicle including last readings
// @Tags Vehicle-Sensors
// @Produce json
// @Param vehicle_id path int true "Vehicle ID"
// @Success 200 {array} model.VehicleSensor
// @Failure 400 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /vehicles/{vehicle_id}/sensors/status [get]
func (h *VehicleSensorHandler) GetVehicleSensorsStatus(c *fiber.Ctx) error {
	// Same as GetVehicleSensors for now
	return h.GetVehicleSensors(c)
}

// RemoveSensorFromVehicle godoc
// @Summary Remove a sensor from a vehicle
// @Description Remove a sensor assignment from a vehicle
// @Tags Vehicle-Sensors
// @Produce json
// @Param vehicle_id path int true "Vehicle ID"
// @Param sensor_id path int true "Sensor ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /vehicles/{vehicle_id}/sensors/{sensor_id} [delete]
func (h *VehicleSensorHandler) RemoveSensorFromVehicle(c *fiber.Ctx) error {
	vehicleID, err := strconv.ParseUint(c.Params("vehicle_id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid vehicle ID",
		})
	}

	sensorID, err := strconv.ParseUint(c.Params("sensor_id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid sensor ID",
		})
	}

	userID := c.Locals("user_id").(uint)

	// Check vehicle ownership
	vehicle, err := h.vehicleRepo.GetVehicleByID(uint(vehicleID))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Vehicle not found",
		})
	}

	if vehicle.UserID != userID && !middleware.HasPermission(h.db, userID, "vehicles.update") {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "You don't have permission to modify this vehicle",
		})
	}

	if err := h.vehicleSensorRepo.RemoveSensorFromVehicle(uint(vehicleID), uint(sensorID)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to remove sensor",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Sensor removed from vehicle successfully",
	})
}

// GetAllSensorsStatus godoc
// @Summary Get all sensors status across all vehicles
// @Description Get status of all sensor assignments (admin only or user's own vehicles)
// @Tags Vehicle-Sensors
// @Produce json
// @Success 200 {array} model.VehicleSensor
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /sensors/status [get]
func (h *VehicleSensorHandler) GetAllSensorsStatus(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	var vehicleSensors []model.VehicleSensor
	var err error

	// Check if user has vehicles.read permission (admin/moderator)
	if middleware.HasPermission(h.db, userID, "vehicles.read") {
		vehicleSensors, err = h.vehicleSensorRepo.GetAllVehicleSensorsWithStatus()
	} else {
		// Regular users only see their own vehicle sensors
		vehicleSensors, err = h.vehicleSensorRepo.GetVehicleSensorsByUserID(userID)
	}

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch sensors status",
		})
	}

	return c.JSON(vehicleSensors)
}

// UpdateVehicleSensorStatus godoc
// @Summary Update sensor status (for MQTT data updates)
// @Description Update the status and last reading of a vehicle sensor
// @Tags Vehicle-Sensors
// @Accept json
// @Produce json
// @Param vehicle_id path int true "Vehicle ID"
// @Param sensor_id path int true "Sensor ID"
// @Param update body model.UpdateVehicleSensorStatusRequest true "Status update"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /vehicles/{vehicle_id}/sensors/{sensor_id}/status [put]
func (h *VehicleSensorHandler) UpdateVehicleSensorStatus(c *fiber.Ctx) error {
	vehicleID, err := strconv.ParseUint(c.Params("vehicle_id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid vehicle ID",
		})
	}

	sensorID, err := strconv.ParseUint(c.Params("sensor_id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid sensor ID",
		})
	}

	var req model.UpdateVehicleSensorStatusRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request data",
		})
	}

	updates := make(map[string]interface{})
	if req.Status != nil {
		updates["status"] = *req.Status
	}
	if req.LastReading != nil {
		updates["last_reading"] = *req.LastReading
	}
	if req.LastReadingTime != nil {
		parsedTime, err := time.Parse(time.RFC3339, *req.LastReadingTime)
		if err == nil {
			updates["last_reading_time"] = parsedTime
		}
	}

	if err := h.vehicleSensorRepo.UpdateVehicleSensorStatus(uint(vehicleID), uint(sensorID), updates); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update sensor status",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Sensor status updated successfully",
	})
}
