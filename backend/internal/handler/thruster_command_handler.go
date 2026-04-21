package handler

import (
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"

	"go-fiber-pgsql/internal/model"
	"go-fiber-pgsql/internal/repository"
)

const (
	thrusterTTLDefaultMs = 2000
	thrusterTTLMinMs     = 200
	thrusterTTLMaxMs     = 10000
)

// ThrusterCommandHandler handles HTTP requests for thruster commands
type ThrusterCommandHandler struct {
	repo        *repository.ThrusterCommandRepository
	vehicleRepo *repository.VehicleRepository
	db          *gorm.DB
}

func NewThrusterCommandHandler(repo *repository.ThrusterCommandRepository, vehicleRepo *repository.VehicleRepository, db *gorm.DB) *ThrusterCommandHandler {
	return &ThrusterCommandHandler{repo: repo, vehicleRepo: vehicleRepo, db: db}
}

// CreateThrusterCommand creates a thruster control command (admin/operator)
func (h *ThrusterCommandHandler) CreateThrusterCommand(c *fiber.Ctx) error {
	var req model.CreateThrusterCommandRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	vehicleCode := strings.TrimSpace(req.VehicleCode)
	vehicleID := req.VehicleID
	if vehicleCode == "" && vehicleID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "vehicle_code or vehicle_id is required"})
	}

	throttle := req.Throttle
	steering := req.Steering
	if throttle < -100 || throttle > 100 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "throttle must be between -100 and 100"})
	}
	if steering < -100 || steering > 100 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "steering must be between -100 and 100"})
	}

	if vehicleID != 0 {
		found, err := h.vehicleRepo.GetVehicleByID(vehicleID)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid vehicle_id"})
		}
		vehicleCode = found.Code
	} else if vehicleCode != "" {
		found, err := h.vehicleRepo.GetVehicleByCode(vehicleCode)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid vehicle_code"})
		}
		vehicleID = found.ID
	}

	ttlMs := req.TTLms
	if ttlMs <= 0 {
		ttlMs = thrusterTTLDefaultMs
	}
	if ttlMs < thrusterTTLMinMs {
		ttlMs = thrusterTTLMinMs
	}
	if ttlMs > thrusterTTLMaxMs {
		ttlMs = thrusterTTLMaxMs
	}

	initiatedAt := time.Now()
	expiresAt := initiatedAt.Add(time.Duration(ttlMs) * time.Millisecond)

	entry := &model.ThrusterCommand{
		VehicleID:   vehicleID,
		VehicleCode: vehicleCode,
		Throttle:    throttle,
		Steering:    steering,
		InitiatedAt: initiatedAt,
		ExpiresAt:   expiresAt,
	}

	if err := h.repo.CreateThrusterCommand(entry); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create thruster command"})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"id":           entry.ID,
		"vehicle_id":   entry.VehicleID,
		"vehicle_code": entry.VehicleCode,
		"throttle":     entry.Throttle,
		"steering":     entry.Steering,
		"initiated_at": entry.InitiatedAt.Format(time.RFC3339),
		"expires_at":   entry.ExpiresAt.Format(time.RFC3339),
	})
}

// GetPendingThrusterCommand returns the latest active thruster command for a vehicle (USV polling)
func (h *ThrusterCommandHandler) GetPendingThrusterCommand(c *fiber.Ctx) error {
	var vehicleID uint
	vehicleCode := ""

	if v := c.Locals("vehicle_id"); v != nil {
		if id, ok := v.(uint); ok {
			vehicleID = id
		}
	}
	if v := c.Locals("vehicle_code"); v != nil {
		if code, ok := v.(string); ok {
			vehicleCode = code
		}
	}

	if vehicleID == 0 && vehicleCode == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "vehicle_code or vehicle_id is required",
		})
	}

	cmd, err := h.repo.GetLatestActiveCommand(vehicleID, vehicleCode, time.Now())
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.JSON(fiber.Map{"data": nil, "count": 0})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to fetch thruster command"})
	}

	return c.JSON(fiber.Map{
		"data": fiber.Map{
			"id":           cmd.ID,
			"vehicle_id":   cmd.VehicleID,
			"vehicle_code": cmd.VehicleCode,
			"throttle":     cmd.Throttle,
			"steering":     cmd.Steering,
			"initiated_at": cmd.InitiatedAt.Format(time.RFC3339),
			"expires_at":   cmd.ExpiresAt.Format(time.RFC3339),
		},
		"count": 1,
	})
}
