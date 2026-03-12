package handler

import (
	"go-fiber-pgsql/internal/model"
	"go-fiber-pgsql/internal/repository"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type NotificationHandler struct {
	notificationRepo *repository.NotificationRepository
	db               *gorm.DB
}

func NewNotificationHandler(notificationRepo *repository.NotificationRepository, db *gorm.DB) *NotificationHandler {
	return &NotificationHandler{
		notificationRepo: notificationRepo,
		db:               db,
	}
}

// GetNotifications godoc
// @Summary Get notifications with filters
// @Description Retrieve notifications for the current user with optional filters
// @Tags Notifications
// @Accept json
// @Produce json
// @Param vehicle_id query int false "Vehicle ID"
// @Param type query string false "Type (success, error, warning, info)"
// @Param action query string false "Action"
// @Param read query bool false "Read status"
// @Param start_time query string false "Start Time (ISO 8601)"
// @Param end_time query string false "End Time (ISO 8601)"
// @Param limit query int false "Limit" default(100)
// @Param offset query int false "Offset" default(0)
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /api/notifications [get]
func (h *NotificationHandler) GetNotifications(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	var query model.NotificationQuery

	// Always filter by current user
	query.UserID = &userID

	// Parse query parameters
	if vehicleID := c.Query("vehicle_id"); vehicleID != "" {
		id, err := strconv.ParseUint(vehicleID, 10, 32)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid vehicle_id",
			})
		}
		vid := uint(id)
		query.VehicleID = &vid
	}

	query.Type = c.Query("type")
	query.Action = c.Query("action")

	if read := c.Query("read"); read != "" {
		r := read == "true"
		query.Read = &r
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

	notifications, err := h.notificationRepo.GetNotifications(query)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch notifications",
		})
	}

	// Get stats
	stats, _ := h.notificationRepo.GetNotificationStats(userID)

	return c.JSON(fiber.Map{
		"data":  notifications,
		"stats": stats,
	})
}

// GetNotificationByID godoc
// @Summary Get notification by ID
// @Description Retrieve a specific notification by ID
// @Tags Notifications
// @Accept json
// @Produce json
// @Param id path int true "Notification ID"
// @Success 200 {object} model.Notification
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Security BearerAuth
// @Router /api/notifications/{id} [get]
func (h *NotificationHandler) GetNotificationByID(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid ID",
		})
	}

	notification, err := h.notificationRepo.GetNotificationByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Notification not found",
		})
	}

	// Check if the notification belongs to the current user
	if notification.UserID != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "You don't have permission to view this notification",
		})
	}

	return c.JSON(notification)
}

// CreateNotification godoc
// @Summary Create a new notification
// @Description Create a new notification (internal use or API)
// @Tags Notifications
// @Accept json
// @Produce json
// @Param notification body model.CreateNotificationRequest true "Notification Data"
// @Success 201 {object} model.Notification
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /api/notifications [post]
func (h *NotificationHandler) CreateNotification(c *fiber.Ctx) error {
	var req model.CreateNotificationRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	notification := model.Notification{
		UserID:    req.UserID,
		VehicleID: req.VehicleID,
		Type:      req.Type,
		Title:     req.Title,
		Message:   req.Message,
		Action:    req.Action,
		Read:      false,
		Source:    req.Source,
	}

	if notification.Source == "" {
		notification.Source = "system"
	}

	if err := h.notificationRepo.CreateNotification(&notification); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create notification",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(notification)
}

// UpdateNotification godoc
// @Summary Update notification
// @Description Update notification (mark as read/unread)
// @Tags Notifications
// @Accept json
// @Produce json
// @Param id path int true "Notification ID"
// @Param notification body model.UpdateNotificationRequest true "Notification Update Data"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Security BearerAuth
// @Router /api/notifications/{id} [patch]
func (h *NotificationHandler) UpdateNotification(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid ID",
		})
	}

	// Check if notification belongs to user
	notification, err := h.notificationRepo.GetNotificationByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Notification not found",
		})
	}

	if notification.UserID != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "You don't have permission to update this notification",
		})
	}

	var req model.UpdateNotificationRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	updates := make(map[string]interface{})
	if req.Read != nil {
		updates["read"] = *req.Read
	}

	if err := h.notificationRepo.UpdateNotification(uint(id), updates); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update notification",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Notification updated successfully",
	})
}

// MarkAsRead godoc
// @Summary Mark notification as read
// @Description Mark a notification as read
// @Tags Notifications
// @Accept json
// @Produce json
// @Param id path int true "Notification ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Security BearerAuth
// @Router /api/notifications/{id}/read [put]
func (h *NotificationHandler) MarkAsRead(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid ID",
		})
	}

	// Check if notification belongs to user
	notification, err := h.notificationRepo.GetNotificationByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Notification not found",
		})
	}

	if notification.UserID != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "You don't have permission to update this notification",
		})
	}

	if err := h.notificationRepo.MarkAsRead(uint(id)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to mark notification as read",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Notification marked as read",
	})
}

// BulkMarkAsRead godoc
// @Summary Bulk mark notifications as read
// @Description Mark multiple notifications as read
// @Tags Notifications
// @Accept json
// @Produce json
// @Param request body model.BulkUpdateNotificationRequest true "IDs to mark as read"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Security BearerAuth
// @Router /api/notifications/bulk-read [put]
func (h *NotificationHandler) BulkMarkAsRead(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	var req model.BulkUpdateNotificationRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if len(req.IDs) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No IDs provided",
		})
	}

	// Verify all notifications belong to the user
	for _, id := range req.IDs {
		notification, err := h.notificationRepo.GetNotificationByID(id)
		if err != nil {
			continue
		}
		if notification.UserID != userID {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "You don't have permission to update these notifications",
			})
		}
	}

	if err := h.notificationRepo.BulkMarkAsRead(req.IDs); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to mark notifications as read",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Notifications marked as read",
	})
}

// MarkAllAsRead godoc
// @Summary Mark all notifications as read
// @Description Mark all notifications as read for the current user
// @Tags Notifications
// @Accept json
// @Produce json
// @Success 200 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /api/notifications/read-all [put]
func (h *NotificationHandler) MarkAllAsRead(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	if err := h.notificationRepo.MarkAllAsRead(userID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to mark all notifications as read",
		})
	}

	return c.JSON(fiber.Map{
		"message": "All notifications marked as read",
	})
}

// DeleteNotification godoc
// @Summary Delete notification
// @Description Delete a notification by ID
// @Tags Notifications
// @Accept json
// @Produce json
// @Param id path int true "Notification ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Security BearerAuth
// @Router /api/notifications/{id} [delete]
func (h *NotificationHandler) DeleteNotification(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid ID",
		})
	}

	// Check if notification belongs to user
	notification, err := h.notificationRepo.GetNotificationByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Notification not found",
		})
	}

	if notification.UserID != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "You don't have permission to delete this notification",
		})
	}

	if err := h.notificationRepo.DeleteNotification(uint(id)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete notification",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Notification deleted successfully",
	})
}

// DeleteAllRead godoc
// @Summary Delete all read notifications
// @Description Delete all read notifications for the current user
// @Tags Notifications
// @Accept json
// @Produce json
// @Success 200 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /api/notifications/clear-read [delete]
func (h *NotificationHandler) DeleteAllRead(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	if err := h.notificationRepo.DeleteAllRead(userID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete read notifications",
		})
	}

	return c.JSON(fiber.Map{
		"message": "All read notifications deleted successfully",
	})
}

// GetStats godoc
// @Summary Get notification statistics
// @Description Get notification statistics for the current user
// @Tags Notifications
// @Accept json
// @Produce json
// @Success 200 {object} model.NotificationStats
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /api/notifications/stats [get]
func (h *NotificationHandler) GetStats(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	stats, err := h.notificationRepo.GetNotificationStats(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch notification stats",
		})
	}

	return c.JSON(stats)
}
