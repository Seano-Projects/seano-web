package handler

import (
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"go-fiber-pgsql/internal/repository"
)

const maxConcurrentSessions = 2

// DeviceLockSession represents a single active session holding a lock.
type DeviceLockSession struct {
	SessionID string `json:"session_id"`
	LockedAt  int64  `json:"locked_at"`
	ExpiresAt int64  `json:"expires_at"`
}

// DeviceLock represents active sessions on a device control page.
type DeviceLock struct {
	DeviceID string               `json:"device_id"`
	Sessions []*DeviceLockSession `json:"sessions"`
}

// DeviceLockHandler manages shared page locks for device control.
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

// pruneSessions removes expired sessions from a DeviceLock.
func pruneSessions(dl *DeviceLock, now time.Time) {
	active := dl.Sessions[:0]
	for _, s := range dl.Sessions {
		if s.ExpiresAt > now.UnixMilli() {
			active = append(active, s)
		}
	}
	dl.Sessions = active
}

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
// Up to maxConcurrentSessions sessions may hold the lock simultaneously.
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

	dl := h.locks[body.DeviceID]
	if dl == nil {
		dl = &DeviceLock{DeviceID: body.DeviceID}
		h.locks[body.DeviceID] = dl
	}
	pruneSessions(dl, now)

	// Check if this session already holds a slot (renew it)
	for _, s := range dl.Sessions {
		if s.SessionID == body.SessionID {
			s.ExpiresAt = now.Add(lockTTL).UnixMilli()
			return c.JSON(fiber.Map{"status": "locked", "session_count": len(dl.Sessions)})
		}
	}

	// Reject if at capacity
	if len(dl.Sessions) >= maxConcurrentSessions {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error":         "device is at maximum concurrent sessions",
			"session_count": len(dl.Sessions),
		})
	}

	// Add new session
	dl.Sessions = append(dl.Sessions, &DeviceLockSession{
		SessionID: body.SessionID,
		LockedAt:  now.UnixMilli(),
		ExpiresAt: now.Add(lockTTL).UnixMilli(),
	})

	return c.JSON(fiber.Map{"status": "locked", "session_count": len(dl.Sessions)})
}

// Heartbeat renews the lock TTL for the requesting session.
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

	dl := h.locks[body.DeviceID]
	if dl == nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "lock not held by this session"})
	}
	for _, s := range dl.Sessions {
		if s.SessionID == body.SessionID {
			s.ExpiresAt = now.Add(lockTTL).UnixMilli()
			return c.JSON(fiber.Map{"status": "renewed", "expires_at": s.ExpiresAt})
		}
	}
	return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "lock not held by this session"})
}

// ReleaseLock releases the session's slot on the lock.
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

	dl := h.locks[body.DeviceID]
	if dl != nil {
		filtered := dl.Sessions[:0]
		for _, s := range dl.Sessions {
			if s.SessionID != body.SessionID {
				filtered = append(filtered, s)
			}
		}
		dl.Sessions = filtered
		if len(dl.Sessions) == 0 {
			delete(h.locks, body.DeviceID)
		}
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
	h.mu.Lock()
	defer h.mu.Unlock()

	dl := h.locks[deviceID]
	if dl == nil {
		return c.JSON(fiber.Map{"locked": false, "session_count": 0})
	}
	pruneSessions(dl, now)
	if len(dl.Sessions) == 0 {
		delete(h.locks, deviceID)
		return c.JSON(fiber.Map{"locked": false, "session_count": 0})
	}

	sessionIDs := make([]string, len(dl.Sessions))
	for i, s := range dl.Sessions {
		sessionIDs[i] = s.SessionID
	}

	return c.JSON(fiber.Map{
		"locked":        true,
		"session_count": len(dl.Sessions),
		"session_ids":   sessionIDs,
		"at_capacity":   len(dl.Sessions) >= maxConcurrentSessions,
	})
}
