package handler

import (
	"github.com/gofiber/fiber/v2"

	mqttservice "go-fiber-pgsql/internal/service/mqtt"
)

// ControlHandler handles vehicle control commands via MQTT
type ControlHandler struct {
	cmdPublisher *mqttservice.CommandPublisher
}

// NewControlHandler creates a new ControlHandler.
// cmdPublisher may be nil when MQTT is not configured (dev/no-broker mode).
func NewControlHandler(cmdPublisher *mqttservice.CommandPublisher) *ControlHandler {
	return &ControlHandler{cmdPublisher: cmdPublisher}
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
	if h.cmdPublisher == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error": "MQTT broker not configured — control commands unavailable",
		})
	}

	var req SendCommandRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Validate supported command
	switch req.Command {
	case "ARM", "FORCE_ARM", "DISARM", "FORCE_DISARM", "AUTO", "MANUAL", "HOLD", "LOITER", "RTL":
		// valid
	default:
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "command must be one of: ARM, FORCE_ARM, DISARM, FORCE_DISARM, AUTO, MANUAL, HOLD, LOITER, RTL",
		})
	}

	// Send command and wait for hardware ACK
	ack, err := h.cmdPublisher.SendCommand(vehicleCode, mqttservice.CommandType(req.Command))
	if err != nil {
		return c.Status(fiber.StatusGatewayTimeout).JSON(fiber.Map{
			"error":   err.Error(),
			"command": req.Command,
		})
	}

	// Hardware replied with error
	if ack.Status == "error" {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{
			"error":   ack.Message,
			"command": ack.Command,
		})
	}

	// Success
	return c.JSON(fiber.Map{
		"status":  "ok",
		"message": ack.Message,
		"command": ack.Command,
	})
}
