package handler

import (
	"encoding/json"
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"

	"go-fiber-pgsql/internal/middleware"
	"go-fiber-pgsql/internal/model"
	"go-fiber-pgsql/internal/repository"
	"go-fiber-pgsql/internal/util"
	wsocket "go-fiber-pgsql/internal/websocket"
)

type VehicleHandler struct {
	vehicleRepo *repository.VehicleRepository
	db          *gorm.DB
	wsHub       *wsocket.Hub
}

func NewVehicleHandler(vehicleRepo *repository.VehicleRepository, db *gorm.DB, wsHub *wsocket.Hub) *VehicleHandler {
	return &VehicleHandler{
		vehicleRepo: vehicleRepo,
		db:          db,
		wsHub:       wsHub,
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

	if strings.TrimSpace(req.Code) == "" || strings.TrimSpace(req.Name) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "code and name are required",
		})
	}

	userID := c.Locals("user_id").(uint)

	status := "active"
	if req.Status != "" {
		status = req.Status
	}

	apiKey := ""
	if req.ApiKey != nil {
		apiKey = strings.TrimSpace(*req.ApiKey)
	}

	batteryCount := 2
	if req.BatteryCount != nil {
		if *req.BatteryCount < 1 || *req.BatteryCount > 2 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "battery_count must be between 1 and 2",
			})
		}

		batteryCount = *req.BatteryCount
	}

	batteryTotalCapacityAh := 20.0
	if req.BatteryTotalCapacityAh != nil {
		if *req.BatteryTotalCapacityAh <= 0 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "battery_total_capacity_ah must be greater than 0",
			})
		}

		batteryTotalCapacityAh = *req.BatteryTotalCapacityAh
	}

	// Enforce unique vehicle code to avoid 500s on DB constraint errors.
	if existing, err := h.vehicleRepo.GetVehicleByCode(req.Code); err == nil && existing != nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error": "vehicle code already exists",
		})
	} else if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to validate vehicle code",
		})
	}

	vehicle := &model.Vehicle{
		Code:                   req.Code,
		ApiKey:                 apiKey,
		Name:                   req.Name,
		Description:            req.Description,
		BatteryCount:           batteryCount,
		BatteryTotalCapacityAh: batteryTotalCapacityAh,
		Status:                 status,
		UserID:                 userID,
	}

	if err := h.vehicleRepo.CreateVehicle(vehicle); err != nil {
		if errors.Is(err, gorm.ErrDuplicatedKey) || strings.Contains(strings.ToLower(err.Error()), "duplicate") {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": "vehicle code already exists",
			})
		}
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
	if middleware.HasPermission(h.db, userID, "vehicles.read_all") {
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
	if vehicle.UserID != userID && !middleware.HasPermission(h.db, userID, "vehicles.read_all") {
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
	if req.BatteryCount != nil {
		if *req.BatteryCount < 1 || *req.BatteryCount > 2 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "battery_count must be between 1 and 2",
			})
		}

		updates["battery_count"] = *req.BatteryCount
	}
	if req.BatteryTotalCapacityAh != nil {
		if *req.BatteryTotalCapacityAh <= 0 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "battery_total_capacity_ah must be greater than 0",
			})
		}

		updates["battery_total_capacity_ah"] = *req.BatteryTotalCapacityAh
	}
	if req.Status != nil {
		updates["status"] = *req.Status
	}
	if req.ApiKey != nil {
		updates["api_key"] = strings.TrimSpace(*req.ApiKey)
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

// GenerateVehicleAPIKey godoc
// @Summary Generate vehicle API key
// @Description Regenerate API key for a vehicle
// @Tags Vehicles
// @Produce json
// @Param vehicle_id path int true "Vehicle ID"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /vehicles/{vehicle_id}/api-key [post]
func (h *VehicleHandler) GenerateVehicleAPIKey(c *fiber.Ctx) error {
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

	if vehicle.UserID != userID && !middleware.HasPermission(h.db, userID, "vehicles.update") {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "You don't have permission to update this vehicle",
		})
	}

	apiKey, err := util.GenerateAPIKey()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to generate API key",
		})
	}

	if err := h.vehicleRepo.UpdateVehicle(uint(id), map[string]interface{}{"api_key": apiKey}); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update vehicle API key",
		})
	}

	return c.JSON(fiber.Map{
		"vehicle_id":   vehicle.ID,
		"vehicle_code": vehicle.Code,
		"api_key":      apiKey,
	})
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
	if vehicle.UserID != userID && !middleware.HasPermission(h.db, userID, "vehicles.read_all") {
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
	if vehicle.UserID != userID && !middleware.HasPermission(h.db, userID, "vehicles.read_all") {
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

// GetVehicleConnectionStatuses godoc
// @Summary Get connection statuses of all vehicles
// @Description Get lightweight connection status data for all accessible vehicles (MQTT LWT)
// @Tags Vehicles
// @Produce json
// @Success 200 {array} map[string]interface{}
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /vehicles/connection-statuses [get]
func (h *VehicleHandler) GetVehicleConnectionStatuses(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	var vehicles []model.Vehicle
	var err error

	// Check if user has vehicles.read permission (admin/moderator)
	if middleware.HasPermission(h.db, userID, "vehicles.read_all") {
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

	// Return lightweight response with only code and connection_status
	statuses := make([]map[string]interface{}, len(vehicles))
	for i, vehicle := range vehicles {
		statuses[i] = map[string]interface{}{
			"vehicle_code":      vehicle.Code,
			"connection_status": vehicle.ConnectionStatus,
			"last_connected":    vehicle.LastConnected,
		}
	}

	return c.JSON(statuses)
}

// CreateVehicleStatus godoc
// @Summary Create vehicle connection status
// @Description Update vehicle connection status (online/offline)
// @Tags Vehicles
// @Accept json
// @Produce json
// @Param status body model.CreateVehicleStatusRequest true "Vehicle status"
// @Success 201 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /vehicle-status [post]
func (h *VehicleHandler) CreateVehicleStatus(c *fiber.Ctx) error {
	var req model.CreateVehicleStatusRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	vehicleID := req.VehicleID
	vehicleCode := strings.TrimSpace(req.VehicleCode)
	var vehicle *model.Vehicle
	var err error

	if vehicleID != 0 {
		vehicle, err = h.vehicleRepo.GetVehicleByID(vehicleID)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid vehicle_id",
			})
		}
		vehicleCode = vehicle.Code
	} else if vehicleCode != "" {
		vehicle, err = h.vehicleRepo.GetVehicleByCode(vehicleCode)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid vehicle_code",
			})
		}
		vehicleCode = vehicle.Code
	} else {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "vehicle_id or vehicle_code is required",
		})
	}

	status := strings.ToLower(strings.TrimSpace(req.Status))
	if status == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "status is required",
		})
	}
	if status != "online" && status != "offline" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "status must be online or offline",
		})
	}

	if err := h.vehicleRepo.UpdateConnectionStatus(vehicleCode, status); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update vehicle status",
		})
	}

	timestamp := strings.TrimSpace(req.Timestamp)
	if timestamp == "" {
		timestamp = time.Now().Format(time.RFC3339)
	}

	response := map[string]interface{}{
		"type":         "vehicle_status",
		"vehicle_code": vehicleCode,
		"status":       status,
		"timestamp":    timestamp,
	}

	if h.wsHub != nil {
		if messageJSON, err := json.Marshal(response); err == nil {
			h.wsHub.Broadcast(messageJSON)
		}
	}

	return c.Status(fiber.StatusCreated).JSON(response)
}

// CreateVehicleBatteryStatus godoc
// @Summary Create vehicle battery status
// @Description Create a new battery status entry for a vehicle
// @Tags Vehicles
// @Accept json
// @Produce json
// @Param battery body model.CreateVehicleBatteryRequest true "Vehicle battery status"
// @Success 201 {object} model.VehicleBattery
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /vehicle-batteries [post]
func (h *VehicleHandler) CreateVehicleBatteryStatus(c *fiber.Ctx) error {
	var req model.CreateVehicleBatteryRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if req.BatteryID < 1 || req.BatteryID > 2 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "battery_id must be 1 or 2",
		})
	}
	if req.Percentage < 0 || req.Percentage > 100 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "percentage must be between 0 and 100",
		})
	}

	vehicleID := req.VehicleID
	vehicleCode := strings.TrimSpace(req.VehicleCode)
	var vehicle *model.Vehicle
	var err error

	if vehicleID != 0 {
		vehicle, err = h.vehicleRepo.GetVehicleByID(vehicleID)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid vehicle_id",
			})
		}
		vehicleCode = vehicle.Code
	} else if vehicleCode != "" {
		vehicle, err = h.vehicleRepo.GetVehicleByCode(vehicleCode)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid vehicle_code",
			})
		}
		vehicleID = vehicle.ID
		vehicleCode = vehicle.Code
	} else {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "vehicle_id or vehicle_code is required",
		})
	}

	status := strings.TrimSpace(req.Status)
	if status == "" {
		if req.Percentage >= 90 {
			status = "Full"
		} else if req.Percentage <= 20 {
			status = "Low"
		} else {
			status = "Normal"
		}
	}

	cellVoltagesJSON, _ := json.Marshal(req.CellVoltages)
	metadataMap := map[string]interface{}{}
	if req.CellCount != nil {
		metadataMap["cell_count"] = *req.CellCount
	}
	metadataJSON, _ := json.Marshal(metadataMap)

	battery := &model.VehicleBattery{
		VehicleID:    vehicleID,
		BatteryID:    req.BatteryID,
		Percentage:   req.Percentage,
		Voltage:      valueOrZero(req.Voltage),
		Current:      valueOrZero(req.Current),
		Status:       status,
		Temperature:  valueOrZero(req.Temperature),
		CellVoltages: cellVoltagesJSON,
		Metadata:     metadataJSON,
	}

	if err := h.vehicleRepo.CreateBatteryStatus(battery); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create battery status",
		})
	}

	timestamp := strings.TrimSpace(req.Timestamp)
	if timestamp == "" {
		timestamp = time.Now().Format(time.RFC3339)
	}

	if h.wsHub != nil {
		wsMessage := map[string]interface{}{
			"type":          "battery",
			"vehicle_id":    vehicleID,
			"vehicle_code":  vehicleCode,
			"battery_id":    req.BatteryID,
			"percentage":    req.Percentage,
			"voltage":       req.Voltage,
			"current":       req.Current,
			"temperature":   req.Temperature,
			"status":        status,
			"cell_voltages": req.CellVoltages,
			"cell_count":    req.CellCount,
			"timestamp":     timestamp,
		}
		_ = h.wsHub.BroadcastToVehicle(vehicleID, wsMessage)
	}

	return c.Status(fiber.StatusCreated).JSON(battery)
}

func valueOrZero(value *float64) float64 {
	if value != nil {
		return *value
	}
	return 0
}
