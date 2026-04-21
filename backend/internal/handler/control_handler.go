package handler

import (
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"

	"go-fiber-pgsql/internal/model"
	"go-fiber-pgsql/internal/repository"
	mqttservice "go-fiber-pgsql/internal/service/mqtt"
)

// ControlHandler handles vehicle control commands via MQTT
type ControlHandler struct {
	cmdPublisher  *mqttservice.CommandPublisher
	commandLogRepo *repository.CommandLogRepository
	vehicleRepo    *repository.VehicleRepository
}

// NewControlHandler creates a new ControlHandler.
// cmdPublisher may be nil when MQTT is not configured (dev/no-broker mode).
func NewControlHandler(cmdPublisher *mqttservice.CommandPublisher, commandLogRepo *repository.CommandLogRepository, vehicleRepo *repository.VehicleRepository) *ControlHandler {
	return &ControlHandler{
		cmdPublisher:  cmdPublisher,
		commandLogRepo: commandLogRepo,
		vehicleRepo:    vehicleRepo,
	}
}

// SendCommandRequest is the request body for control commands
type SendCommandRequest struct {
	Command string `json:"command"`
}

// SendCommand godoc
// @Summary Send a control command to a vehicle via MQTT
// @Tags control
// @Accept json
// @Produce json
// @Param vehicle_code path string true "Vehicle code"
// @Param body body SendCommandRequest true "Command payload"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 503 {object} map[string]interface{}
// @Failure 504 {object} map[string]interface{}
// @Router /api/control/{vehicle_code}/command [post]
func (h *ControlHandler) SendCommand(c *fiber.Ctx) error {
	vehicleCode := c.Params("vehicle_code")
	if vehicleCode == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "vehicle_code is required",
		})
	}

	// If MQTT not configured, return 503
	var req SendCommandRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	command := strings.TrimSpace(req.Command)
	if command == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "command is required",
		})
	}

	// Validate supported command
	switch command {
	case "ARM", "FORCE_ARM", "DISARM", "FORCE_DISARM", "AUTO", "MANUAL", "HOLD", "LOITER", "RTL":
		// valid
	default:
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "command must be one of: ARM, FORCE_ARM, DISARM, FORCE_DISARM, AUTO, MANUAL, HOLD, LOITER, RTL",
		})
	}

	if h.commandLogRepo == nil || h.vehicleRepo == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error": "Command storage not configured",
		})
	}

	vehicle, err := h.vehicleRepo.GetVehicleByCode(vehicleCode)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Vehicle not found",
		})
	}

	initiatedAt := time.Now()
	entry := &model.CommandLog{
		VehicleID:   vehicle.ID,
		VehicleCode: vehicle.Code,
		Command:     command,
		Status:      "pending",
		Message:     "queued",
		InitiatedAt: initiatedAt,
	}

	if err := h.commandLogRepo.CreateCommandLog(entry); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create command log",
		})
	}

	// If MQTT not configured, queue command for USV polling
	if h.cmdPublisher == nil {
		return c.Status(fiber.StatusAccepted).JSON(fiber.Map{
			"status":        "queued",
			"command_log_id": entry.ID,
			"vehicle_code":  entry.VehicleCode,
			"command":       entry.Command,
			"initiated_at":  entry.InitiatedAt.Format(time.RFC3339),
		})
	}

	// Send command and wait for hardware ACK
	ack, err := h.cmdPublisher.SendCommand(vehicleCode, mqttservice.CommandType(command))
	if err != nil {
		status := "failed"
		if strings.Contains(strings.ToLower(err.Error()), "timeout") {
			status = "timeout"
		}
		resolvedAt := time.Now()
		_ = h.commandLogRepo.UpdateCommandLogStatusByID(entry.ID, status, err.Error(), resolvedAt)

		return c.Status(fiber.StatusGatewayTimeout).JSON(fiber.Map{
			"error":   err.Error(),
			"command": command,
			"command_log_id": entry.ID,
		})
	}

	// Hardware replied with error
	if ack.Status == "error" {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{
			"error":   ack.Message,
			"command": ack.Command,
			"command_log_id": entry.ID,
		})
	}

	// Success
	return c.JSON(fiber.Map{
		"status":  "ok",
		"message": ack.Message,
		"command": ack.Command,
		"command_log_id": entry.ID,
	})
}
