package handler

import (
	"errors"
	"strconv"
	"strings"

	"go-fiber-pgsql/internal/model"
	"go-fiber-pgsql/internal/repository"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type SensorHandler struct {
	sensorRepo *repository.SensorRepository
	db         *gorm.DB
}

func NewSensorHandler(sensorRepo *repository.SensorRepository, db *gorm.DB) *SensorHandler {
	return &SensorHandler{
		sensorRepo: sensorRepo,
		db:         db,
	}
}

// CreateSensor godoc
// @Summary Create a new sensor (admin only)
// @Description Create a new sensor master data with brand, model, and data structure info
// @Tags Sensors
// @Accept json
// @Produce json
// @Param sensor body model.CreateSensorRequest true "Sensor data"
// @Success 201 {object} model.Sensor
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /sensors [post]
func (h *SensorHandler) CreateSensor(c *fiber.Ctx) error {
	var req model.CreateSensorRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request data",
		})
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	sensor := &model.Sensor{
		Brand:        req.Brand,
		Model:        req.Model,
		Code:         req.Code,
		SensorTypeID: req.SensorTypeID,
		Description:  req.Description,
		IsActive:     isActive,
	}

	// Enforce unique sensor code to avoid 500s on DB constraint errors.
	if existing, err := h.sensorRepo.GetSensorByCode(req.Code); err == nil && existing != nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error": "sensor code already exists",
		})
	} else if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to validate sensor code",
		})
	}

	if err := h.sensorRepo.CreateSensor(sensor); err != nil {
		if errors.Is(err, gorm.ErrDuplicatedKey) || strings.Contains(strings.ToLower(err.Error()), "duplicate") {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": "sensor code already exists",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create sensor",
		})
	}

	// Reload with associations
	sensor, _ = h.sensorRepo.GetSensorByID(sensor.ID)

	return c.Status(fiber.StatusCreated).JSON(sensor)
}

// GetAllSensors godoc
// @Summary Get all sensors
// @Description Get all sensor master data (accessible to all authenticated users for assignment)
// @Tags Sensors
// @Produce json
// @Success 200 {array} model.Sensor
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /sensors [get]
func (h *SensorHandler) GetAllSensors(c *fiber.Ctx) error {
	sensors, err := h.sensorRepo.GetAllSensors()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch sensors",
		})
	}

	return c.JSON(sensors)
}

// GetSensorByID godoc
// @Summary Get a sensor by ID
// @Description Get a specific sensor by ID
// @Tags Sensors
// @Produce json
// @Param sensor_id path int true "Sensor ID"
// @Success 200 {object} model.Sensor
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Security BearerAuth
// @Router /sensors/{sensor_id} [get]
func (h *SensorHandler) GetSensorByID(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("sensor_id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid sensor ID",
		})
	}

	sensor, err := h.sensorRepo.GetSensorByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Sensor not found",
		})
	}

	return c.JSON(sensor)
}

// GetSensorByCode godoc
// @Summary Get a sensor by code
// @Description Get a specific sensor by code
// @Tags Sensors
// @Produce json
// @Param sensor_code path string true "Sensor Code"
// @Success 200 {object} model.Sensor
// @Failure 404 {object} map[string]string
// @Security BearerAuth
// @Router /sensors/code/{sensor_code} [get]
func (h *SensorHandler) GetSensorByCode(c *fiber.Ctx) error {
	code := c.Params("sensor_code")

	sensor, err := h.sensorRepo.GetSensorByCode(code)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Sensor not found",
		})
	}

	return c.JSON(sensor)
}

// UpdateSensor godoc
// @Summary Update a sensor (admin only)
// @Description Update a sensor's information
// @Tags Sensors
// @Accept json
// @Produce json
// @Param sensor_id path int true "Sensor ID"
// @Param sensor body model.UpdateSensorRequest true "Updated sensor data"
// @Success 200 {object} model.Sensor
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /sensors/{sensor_id} [put]
func (h *SensorHandler) UpdateSensor(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("sensor_id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid sensor ID",
		})
	}

	// Check if sensor exists
	sensor, err := h.sensorRepo.GetSensorByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Sensor not found",
		})
	}

	var req model.UpdateSensorRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request data",
		})
	}

	updates := make(map[string]interface{})
	if req.Brand != nil {
		updates["brand"] = *req.Brand
	}
	if req.Model != nil {
		updates["model"] = *req.Model
	}
	if req.Code != nil {
		if existing, err := h.sensorRepo.GetSensorByCode(*req.Code); err == nil && existing != nil && existing.ID != uint(id) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": "sensor code already exists",
			})
		} else if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to validate sensor code",
			})
		}
		updates["code"] = *req.Code
	}
	if req.SensorTypeID != nil {
		updates["sensor_type_id"] = *req.SensorTypeID
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}

	if err := h.sensorRepo.UpdateSensor(uint(id), updates); err != nil {
		if errors.Is(err, gorm.ErrDuplicatedKey) || strings.Contains(strings.ToLower(err.Error()), "duplicate") {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": "sensor code already exists",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update sensor",
		})
	}

	sensor, err = h.sensorRepo.GetSensorByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Sensor not found",
		})
	}

	return c.JSON(sensor)
}

// DeleteSensor godoc
// @Summary Delete a sensor (admin only)
// @Description Delete a sensor by ID
// @Tags Sensors
// @Produce json
// @Param sensor_id path int true "Sensor ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /sensors/{sensor_id} [delete]
func (h *SensorHandler) DeleteSensor(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("sensor_id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid sensor ID",
		})
	}

	// Check if sensor exists
	_, err = h.sensorRepo.GetSensorByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Sensor not found",
		})
	}

	if err := h.sensorRepo.DeleteSensor(uint(id)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete sensor",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Sensor deleted successfully",
	})
}
