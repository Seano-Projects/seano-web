package handler

import (
	"encoding/json"
	"go-fiber-pgsql/internal/middleware"
	"go-fiber-pgsql/internal/model"
	"go-fiber-pgsql/internal/repository"
	wsocket "go-fiber-pgsql/internal/websocket"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type AlertHandler struct {
	alertRepo   *repository.AlertRepository
	vehicleRepo *repository.VehicleRepository
	wsHub       *wsocket.Hub
	db          *gorm.DB
}

func NewAlertHandler(alertRepo *repository.AlertRepository, vehicleRepo *repository.VehicleRepository, wsHub *wsocket.Hub, db *gorm.DB) *AlertHandler {
	return &AlertHandler{
		alertRepo:   alertRepo,
		vehicleRepo: vehicleRepo,
		wsHub:       wsHub,
		db:          db,
	}
}

// GetAlerts godoc
// @Summary Get alerts with filters
// @Description Retrieve alerts with optional filters (vehicle_id, sensor_id, severity, acknowledged status, time range)
// @Tags Alerts
// @Accept json
// @Produce json
// @Param vehicle_id query int false "Vehicle ID"
// @Param sensor_id query int false "Sensor ID"
// @Param severity query string false "Severity (critical, warning, info)"
// @Param alert_type query string false "Alert Type"
// @Param acknowledged query bool false "Acknowledged status"
// @Param start_time query string false "Start Time (ISO 8601)"
// @Param end_time query string false "End Time (ISO 8601)"
// @Param limit query int false "Limit" default(100)
// @Param offset query int false "Offset" default(0)
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /api/alerts [get]
func (h *AlertHandler) GetAlerts(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	var query model.AlertQuery

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

	// Check permission: if not admin, filter by user's vehicles only
	if !middleware.HasPermission(h.db, userID, "alerts.read") {
		// Get user's vehicle IDs
		userVehicleIDs, err := h.vehicleRepo.GetVehicleIDsByUserID(userID)
		if err != nil || len(userVehicleIDs) == 0 {
			return c.JSON(fiber.Map{
				"data":  []model.AlertResponse{},
				"count": 0,
			})
		}

		// If vehicle_id is specified, check if user owns it
		if query.VehicleID != nil {
			found := false
			for _, vid := range userVehicleIDs {
				if vid == *query.VehicleID {
					found = true
					break
				}
			}
			if !found {
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
					"error": "You don't have permission to view this vehicle's alerts",
				})
			}
		} else {
			// No specific vehicle requested, use first vehicle
			vid := userVehicleIDs[0]
			query.VehicleID = &vid
		}
	}

	if sensorID := c.Query("sensor_id"); sensorID != "" {
		id, err := strconv.ParseUint(sensorID, 10, 32)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid sensor_id",
			})
		}
		sid := uint(id)
		query.SensorID = &sid
	}

	query.Severity = c.Query("severity")
	query.AlertType = c.Query("alert_type")

	if acknowledged := c.Query("acknowledged"); acknowledged != "" {
		ack := acknowledged == "true"
		query.Acknowledged = &ack
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

	alerts, err := h.alertRepo.GetAlerts(query)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch alerts",
		})
	}

	count, _ := h.alertRepo.CountAlerts(query)

	return c.JSON(fiber.Map{
		"data":  alerts,
		"count": count,
	})
}

// GetAlertByID godoc
// @Summary Get alert by ID
// @Description Retrieve a specific alert by ID
// @Tags Alerts
// @Accept json
// @Produce json
// @Param id path int true "Alert ID"
// @Success 200 {object} model.Alert
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Security BearerAuth
// @Router /api/alerts/{id} [get]
func (h *AlertHandler) GetAlertByID(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid ID",
		})
	}

	alert, err := h.alertRepo.GetAlertByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Alert not found",
		})
	}

	return c.JSON(alert)
}

// CreateAlert godoc
// @Summary Create a new alert
// @Description Create a new alert entry
// @Tags Alerts
// @Accept json
// @Produce json
// @Param alert body model.CreateAlertRequest true "Alert Data"
// @Success 201 {object} model.Alert
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /api/alerts [post]
func (h *AlertHandler) CreateAlert(c *fiber.Ctx) error {
	var req model.CreateAlertRequest

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Set default source if not provided
	if req.Source == "" {
		req.Source = "USV"
	}

	alert := &model.Alert{
		VehicleID: req.VehicleID,
		SensorID:  req.SensorID,
		Severity:  req.Severity,
		AlertType: req.AlertType,
		Message:   req.Message,
		Latitude:  req.Latitude,
		Longitude: req.Longitude,
		Source:    req.Source,
	}

	if err := h.alertRepo.CreateAlert(alert); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create alert",
		})
	}

	// Broadcast alert to WebSocket clients
	h.broadcastAlert(alert)

	return c.Status(fiber.StatusCreated).JSON(alert)
}

// UpdateAlert godoc
// @Summary Update an alert
// @Description Update an existing alert
// @Tags Alerts
// @Accept json
// @Produce json
// @Param id path int true "Alert ID"
// @Param alert body model.UpdateAlertRequest true "Alert Update Data"
// @Success 200 {object} model.Alert
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /api/alerts/{id} [put]
func (h *AlertHandler) UpdateAlert(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid ID",
		})
	}

	var req model.UpdateAlertRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Build update map
	updates := make(map[string]interface{})
	if req.Severity != nil {
		updates["severity"] = *req.Severity
	}
	if req.AlertType != nil {
		updates["alert_type"] = *req.AlertType
	}
	if req.Message != nil {
		updates["message"] = *req.Message
	}
	if req.Acknowledged != nil {
		updates["acknowledged"] = *req.Acknowledged
	}
	if req.Latitude != nil {
		updates["latitude"] = *req.Latitude
	}
	if req.Longitude != nil {
		updates["longitude"] = *req.Longitude
	}

	if err := h.alertRepo.UpdateAlert(uint(id), updates); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update alert",
		})
	}

	// Get updated alert
	alert, err := h.alertRepo.GetAlertByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Alert not found",
		})
	}

	// Broadcast update to WebSocket clients
	h.broadcastAlertUpdate(alert)

	return c.JSON(alert)
}

// AcknowledgeAlert godoc
// @Summary Acknowledge an alert
// @Description Mark an alert as acknowledged
// @Tags Alerts
// @Accept json
// @Produce json
// @Param id path int true "Alert ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /api/alerts/{id}/acknowledge [patch]
func (h *AlertHandler) AcknowledgeAlert(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid ID",
		})
	}

	if err := h.alertRepo.AcknowledgeAlert(uint(id)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to acknowledge alert",
		})
	}

	// Get updated alert
	alert, _ := h.alertRepo.GetAlertByID(uint(id))
	if alert != nil {
		h.broadcastAlertUpdate(alert)
	}

	return c.JSON(fiber.Map{
		"message": "Alert acknowledged successfully",
	})
}

// DeleteAlert godoc
// @Summary Delete an alert
// @Description Delete an alert by ID
// @Tags Alerts
// @Accept json
// @Produce json
// @Param id path int true "Alert ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /api/alerts/{id} [delete]
func (h *AlertHandler) DeleteAlert(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid ID",
		})
	}

	if err := h.alertRepo.DeleteAlert(uint(id)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete alert",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Alert deleted successfully",
	})
}

// ClearAllAlerts godoc
// @Summary Clear all alerts
// @Description Delete all alerts or only acknowledged ones
// @Tags Alerts
// @Accept json
// @Produce json
// @Param acknowledged_only query bool false "Clear only acknowledged alerts"
// @Success 200 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /api/alerts/clear [delete]
func (h *AlertHandler) ClearAllAlerts(c *fiber.Ctx) error {
	acknowledgedOnly := c.Query("acknowledged_only") == "true"

	if err := h.alertRepo.ClearAllAlerts(acknowledgedOnly); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to clear alerts",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Alerts cleared successfully",
	})
}

// GetAlertStats godoc
// @Summary Get alert statistics
// @Description Get statistics about alerts (total, critical, warning, info)
// @Tags Alerts
// @Accept json
// @Produce json
// @Success 200 {object} model.AlertStats
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /api/alerts/stats [get]
func (h *AlertHandler) GetAlertStats(c *fiber.Ctx) error {
	stats, err := h.alertRepo.GetAlertStats()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch alert statistics",
		})
	}

	return c.JSON(stats)
}

// GetRecentAlerts godoc
// @Summary Get recent alerts
// @Description Get the most recent alerts (last 24 hours)
// @Tags Alerts
// @Accept json
// @Produce json
// @Param limit query int false "Limit" default(10)
// @Success 200 {object} map[string]interface{}
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /api/alerts/recent [get]
func (h *AlertHandler) GetRecentAlerts(c *fiber.Ctx) error {
	limit := 10
	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil {
			limit = l
		}
	}

	alerts, err := h.alertRepo.GetRecentAlerts(limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch recent alerts",
		})
	}

	return c.JSON(fiber.Map{
		"data": alerts,
	})
}

// GetUnacknowledgedAlerts godoc
// @Summary Get unacknowledged alerts
// @Description Get all unacknowledged alerts
// @Tags Alerts
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /api/alerts/unacknowledged [get]
func (h *AlertHandler) GetUnacknowledgedAlerts(c *fiber.Ctx) error {
	alerts, err := h.alertRepo.GetUnacknowledgedAlerts()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch unacknowledged alerts",
		})
	}

	return c.JSON(fiber.Map{
		"data": alerts,
	})
}

// broadcastAlert sends a new alert to all connected WebSocket clients
func (h *AlertHandler) broadcastAlert(alert *model.Alert) {
	if h.wsHub == nil {
		return
	}

	message := map[string]interface{}{
		"type":         "alert",
		"id":           alert.ID,
		"vehicle_id":   alert.VehicleID,
		"sensor_id":    alert.SensorID,
		"severity":     alert.Severity,
		"alert_type":   alert.AlertType,
		"message":      alert.Message,
		"latitude":     alert.Latitude,
		"longitude":    alert.Longitude,
		"source":       alert.Source,
		"timestamp":    alert.CreatedAt,
		"acknowledged": alert.Acknowledged,
	}

	data, _ := json.Marshal(message)
	h.wsHub.Broadcast(data)
}

// broadcastAlertUpdate sends an alert update to all connected WebSocket clients
func (h *AlertHandler) broadcastAlertUpdate(alert *model.Alert) {
	if h.wsHub == nil {
		return
	}

	message := map[string]interface{}{
		"type": "alert_update",
		"id":   alert.ID,
		"updates": map[string]interface{}{
			"severity":     alert.Severity,
			"alert_type":   alert.AlertType,
			"message":      alert.Message,
			"acknowledged": alert.Acknowledged,
			"updated_at":   alert.UpdatedAt,
		},
	}

	data, _ := json.Marshal(message)
	h.wsHub.Broadcast(data)
}
