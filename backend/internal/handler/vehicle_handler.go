package handler

import (
	"go-fiber-pgsql/internal/middleware"
	"go-fiber-pgsql/internal/model"
	"go-fiber-pgsql/internal/repository"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type VehicleHandler struct {
	vehicleRepo *repository.VehicleRepository
	db          *gorm.DB
}

func NewVehicleHandler(vehicleRepo *repository.VehicleRepository, db *gorm.DB) *VehicleHandler {
	return &VehicleHandler{
		vehicleRepo: vehicleRepo,
		db:          db,
	}
}

// CreateVehicle godoc
// @Summary Create a new vehicle
// @Description Create a new vehicle with code (used as registration & MQTT topic)
// @Tags Vehicles
// @Accept json
// @Produce json
// @Param vehicle body model.CreateVehicleRequest true "Vehicle data"
// @Success 201 {object} model.Vehicle
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /vehicles [post]
func (h *VehicleHandler) CreateVehicle(c *fiber.Ctx) error {
	var req model.CreateVehicleRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request data",
		})
	}

	userID := c.Locals("user_id").(uint)

	status := "active"
	if req.Status != "" {
		status = req.Status
	}

	vehicle := &model.Vehicle{
		Code:        req.Code,
		Name:        req.Name,
		Description: req.Description,
		Status:      status,
		UserID:      userID,
	}

	if err := h.vehicleRepo.CreateVehicle(vehicle); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create vehicle",
		})
	}

	// Reload with associations
	vehicle, _ = h.vehicleRepo.GetVehicleByID(vehicle.ID)

	return c.Status(fiber.StatusCreated).JSON(vehicle)
}

// GetAllVehicles godoc
// @Summary Get all vehicles
// @Description Get all vehicles (own vehicles for regular users, all vehicles for admins)
// @Tags Vehicles
// @Produce json
// @Success 200 {array} model.Vehicle
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /vehicles [get]
func (h *VehicleHandler) GetAllVehicles(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	var vehicles []model.Vehicle
	var err error

	// Check if user has vehicles.read permission (admin/moderator)
	if middleware.HasPermission(h.db, userID, "vehicles.read") {
		vehicles, err = h.vehicleRepo.GetAllVehicles()
	} else {
		// Regular users only see their own vehicles
		vehicles, err = h.vehicleRepo.GetVehiclesByUserID(userID)
	}

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch vehicles",
		})
	}

	// Enrich vehicles with latest telemetry data from vehicle_logs
	for i := range vehicles {
		var latestLog model.VehicleLog
		err := h.db.Where("vehicle_id = ?", vehicles[i].ID).
			Order("created_at DESC").
			Limit(1).
			First(&latestLog).Error
		
		if err == nil {
			// Update vehicle with latest telemetry data
			if latestLog.BatteryPercentage != nil {
				vehicles[i].BatteryLevel = latestLog.BatteryPercentage
			}
			if latestLog.RSSI != nil {
				rssi := float64(*latestLog.RSSI)
				vehicles[i].SignalStrength = &rssi
			}
			if latestLog.Latitude != nil {
				vehicles[i].Latitude = latestLog.Latitude
			}
			if latestLog.Longitude != nil {
				vehicles[i].Longitude = latestLog.Longitude
			}
			if latestLog.TemperatureSystem != nil {
				vehicles[i].Temperature = latestLog.TemperatureSystem
			}
			vehicles[i].LastSeen = &latestLog.CreatedAt
		}
	}

	return c.JSON(vehicles)
}

// GetVehicleByID godoc
// @Summary Get a vehicle by ID
// @Description Get a specific vehicle by ID (own vehicle or with vehicles.view permission)
// @Tags Vehicles
// @Produce json
// @Param vehicle_id path int true "Vehicle ID"
// @Success 200 {object} model.Vehicle
// @Failure 400 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Security BearerAuth
// @Router /vehicles/{vehicle_id} [get]
func (h *VehicleHandler) GetVehicleByID(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("vehicle_id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid vehicle ID",
		})
	}

	userID := c.Locals("user_id").(uint)

	vehicle, err := h.vehicleRepo.GetVehicleByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Vehicle not found",
		})
	}

	// Check ownership or permission
	if vehicle.UserID != userID && !middleware.HasPermission(h.db, userID, "vehicles.read") {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "You don't have permission to view this vehicle",
		})
	}

	return c.JSON(vehicle)
}

// UpdateVehicle godoc
// @Summary Update a vehicle
// @Description Update a vehicle's information (own vehicle or with vehicles.update permission)
// @Tags Vehicles
// @Accept json
// @Produce json
// @Param vehicle_id path int true "Vehicle ID"
// @Param vehicle body model.UpdateVehicleRequest true "Updated vehicle data"
// @Success 200 {object} model.Vehicle
// @Failure 400 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /vehicles/{vehicle_id} [put]
func (h *VehicleHandler) UpdateVehicle(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("vehicle_id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid vehicle ID",
		})
	}

	userID := c.Locals("user_id").(uint)

	// Check if vehicle exists and check ownership
	vehicle, err := h.vehicleRepo.GetVehicleByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Vehicle not found",
		})
	}

	// Check ownership or permission
	if vehicle.UserID != userID && !middleware.HasPermission(h.db, userID, "vehicles.update") {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "You don't have permission to update this vehicle",
		})
	}

	var req model.UpdateVehicleRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request data",
		})
	}

	updates := make(map[string]interface{})
	if req.Code != nil {
		updates["code"] = *req.Code
	}
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.Status != nil {
		updates["status"] = *req.Status
	}

	if err := h.vehicleRepo.UpdateVehicle(uint(id), updates); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update vehicle",
		})
	}

	vehicle, err = h.vehicleRepo.GetVehicleByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Vehicle not found",
		})
	}

	return c.JSON(vehicle)
}

// DeleteVehicle godoc
// @Summary Delete a vehicle
// @Description Delete a vehicle by ID (own vehicle or with vehicles.delete permission)
// @Tags Vehicles
// @Produce json
// @Param vehicle_id path int true "Vehicle ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /vehicles/{vehicle_id} [delete]
func (h *VehicleHandler) DeleteVehicle(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("vehicle_id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid vehicle ID",
		})
	}

	userID := c.Locals("user_id").(uint)

	// Check if vehicle exists and check ownership
	vehicle, err := h.vehicleRepo.GetVehicleByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Vehicle not found",
		})
	}

	// Check ownership or permission
	if vehicle.UserID != userID && !middleware.HasPermission(h.db, userID, "vehicles.delete") {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "You don't have permission to delete this vehicle",
		})
	}

	if err := h.vehicleRepo.DeleteVehicle(uint(id)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete vehicle",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Vehicle deleted successfully",
	})
}

// GetVehicleBatteryStatus godoc
// @Summary Get vehicle battery status
// @Description Get the latest battery status for a vehicle
// @Tags Vehicles
// @Produce json
// @Param vehicle_id path int true "Vehicle ID"
// @Success 200 {object} model.VehicleBattery
// @Failure 400 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Security BearerAuth
// @Router /vehicles/{vehicle_id}/battery [get]
func (h *VehicleHandler) GetVehicleBatteryStatus(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("vehicle_id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid vehicle ID",
		})
	}

	userID := c.Locals("user_id").(uint)

	// Check if vehicle exists and check ownership
	vehicle, err := h.vehicleRepo.GetVehicleByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Vehicle not found",
		})
	}

	// Check ownership or permission
	if vehicle.UserID != userID && !middleware.HasPermission(h.db, userID, "vehicles.read") {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "You don't have permission to view this vehicle",
		})
	}

	battery, err := h.vehicleRepo.GetLatestBatteryStatus(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "No battery data found",
		})
	}

	return c.JSON(battery)
}

// GetAllLatestBatteryStatus godoc
// @Summary Get latest battery status for all vehicles
// @Description Get the most recent battery status for all vehicles
// @Tags Vehicles
// @Produce json
// @Success 200 {array} model.VehicleBattery
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /vehicle-batteries/latest [get]
func (h *VehicleHandler) GetAllLatestBatteryStatus(c *fiber.Ctx) error {
	batteries, err := h.vehicleRepo.GetAllLatestBatteryStatus()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch battery data",
		})
	}

	return c.JSON(batteries)
}

// GetBatteryLogs godoc
// @Summary Get battery logs for a vehicle
// @Description Get battery history/logs for a specific vehicle
// @Tags Vehicles
// @Produce json
// @Param id path int true "Vehicle ID"
// @Param battery_id query int false "Battery ID (1 or 2)"
// @Param limit query int false "Number of records (default 100)"
// @Success 200 {array} model.VehicleBattery
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /vehicles/{id}/battery-logs [get]
func (h *VehicleHandler) GetBatteryLogs(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid vehicle ID",
		})
	}

	// Check if vehicle exists and check ownership
	vehicle, err := h.vehicleRepo.GetVehicleByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Vehicle not found",
		})
	}

	// Check ownership or permission
	if vehicle.UserID != userID && !middleware.HasPermission(h.db, userID, "vehicles.read") {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "You don't have permission to view this vehicle",
		})
	}

	// Get query parameters
	var batteryID *int
	if batteryIDStr := c.Query("battery_id"); batteryIDStr != "" {
		if bid, err := strconv.Atoi(batteryIDStr); err == nil {
			batteryID = &bid
		}
	}

	limit, _ := strconv.Atoi(c.Query("limit"))
	if limit <= 0 {
		limit = 100
	}

	logs, err := h.vehicleRepo.GetBatteryLogsByVehicleID(uint(id), batteryID, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch battery logs",
		})
	}

	return c.JSON(logs)
}
