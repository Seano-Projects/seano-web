package handler

import (
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"go-fiber-pgsql/internal/repository"
)

// DeviceLock represents an active lock on a device control page.
type DeviceLock struct {
	DeviceID        string `json:"device_id"`
	LockedBySession string `json:"locked_by_session"`
	LockedAt        int64  `json:"locked_at"`
	ExpiresAt       int64  `json:"expires_at"`
}

// DeviceLockHandler manages exclusive page locks for device control.
type DeviceLockHandler struct {
	mu          sync.RWMutex
	locks       map[string]*DeviceLock // keyed by device_id
	vehicleRepo *repository.VehicleRepository
}

func NewDeviceLockHandler(vehicleRepo *repository.VehicleRepository) *DeviceLockHandler {
	return &DeviceLockHandler{
		locks:       make(map[string]*DeviceLock),
		vehicleRepo: vehicleRepo,
	}
}

const lockTTL = 30 * time.Second

// checkDeviceOwnership verifies the user owns the vehicle referenced by device_id (format: "control-{vehicleID}")
func (h *DeviceLockHandler) checkDeviceOwnership(c *fiber.Ctx, deviceID string) error {
	parts := strings.SplitN(deviceID, "-", 2)
	if len(parts) != 2 {
		return nil // non-vehicle device, allow
	}
	vehicleID, err := strconv.ParseUint(parts[1], 10, 64)
	if err != nil {
		return nil
	}
	vehicle, err := h.vehicleRepo.GetVehicleByID(uint(vehicleID))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Vehicle not found"})
	}
	userID := c.Locals("user_id").(uint)
	if vehicle.UserID != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "You do not have permission to lock this device"})
	}
	return nil
}

// AcquireLock attempts to acquire or renew a lock for the requesting session.
func (h *DeviceLockHandler) AcquireLock(c *fiber.Ctx) error {
	var body struct {
		DeviceID  string `json:"device_id"`
		SessionID string `json:"session_id"`
	}
	if err := c.BodyParser(&body); err != nil || body.DeviceID == "" || body.SessionID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "device_id and session_id are required"})
	}

	if err := h.checkDeviceOwnership(c, body.DeviceID); err != nil {
		return err
	}

	now := time.Now()
	h.mu.Lock()
	defer h.mu.Unlock()

	existing := h.locks[body.DeviceID]
	if existing != nil && existing.LockedBySession != body.SessionID && existing.ExpiresAt > now.UnixMilli() {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error":             "device is locked by another session",
			"locked_by_session": existing.LockedBySession,
			"expires_at":        existing.ExpiresAt,
		})
	}

	lock := &DeviceLock{
		DeviceID:        body.DeviceID,
		LockedBySession: body.SessionID,
		LockedAt:        now.UnixMilli(),
		ExpiresAt:       now.Add(lockTTL).UnixMilli(),
	}
	h.locks[body.DeviceID] = lock

	return c.JSON(fiber.Map{"status": "locked", "lock": lock})
}

// Heartbeat renews the lock TTL.
func (h *DeviceLockHandler) Heartbeat(c *fiber.Ctx) error {
	var body struct {
		DeviceID  string `json:"device_id"`
		SessionID string `json:"session_id"`
	}
	if err := c.BodyParser(&body); err != nil || body.DeviceID == "" || body.SessionID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "device_id and session_id are required"})
	}

	now := time.Now()
	h.mu.Lock()
	defer h.mu.Unlock()

	existing := h.locks[body.DeviceID]
	if existing == nil || existing.LockedBySession != body.SessionID {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "lock not held by this session"})
	}

	existing.ExpiresAt = now.Add(lockTTL).UnixMilli()
	return c.JSON(fiber.Map{"status": "renewed", "expires_at": existing.ExpiresAt})
}

// ReleaseLock releases the lock for the requesting session.
func (h *DeviceLockHandler) ReleaseLock(c *fiber.Ctx) error {
	var body struct {
		DeviceID  string `json:"device_id"`
		SessionID string `json:"session_id"`
	}
	if err := c.BodyParser(&body); err != nil || body.DeviceID == "" || body.SessionID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "device_id and session_id are required"})
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	existing := h.locks[body.DeviceID]
	if existing != nil && existing.LockedBySession == body.SessionID {
		delete(h.locks, body.DeviceID)
	}

	return c.JSON(fiber.Map{"status": "released"})
}

// GetLockStatus returns the current lock status for a device.
func (h *DeviceLockHandler) GetLockStatus(c *fiber.Ctx) error {
	deviceID := c.Query("device_id")
	if deviceID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "device_id query param is required"})
	}

	now := time.Now()
	h.mu.RLock()
	defer h.mu.RUnlock()

	existing := h.locks[deviceID]
	if existing == nil || existing.ExpiresAt <= now.UnixMilli() {
		return c.JSON(fiber.Map{"locked": false})
	}

	return c.JSON(fiber.Map{
		"locked":            true,
		"locked_by_session": existing.LockedBySession,
		"locked_at":         existing.LockedAt,
		"expires_at":        existing.ExpiresAt,
	})
}
