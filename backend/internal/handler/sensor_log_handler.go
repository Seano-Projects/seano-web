package handler

import (
	"encoding/json"
	"go-fiber-pgsql/internal/middleware"
	"go-fiber-pgsql/internal/model"
	"go-fiber-pgsql/internal/repository"
	"go-fiber-pgsql/internal/util"
	wsocket "go-fiber-pgsql/internal/websocket"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type SensorLogHandler struct {
	sensorLogRepo *repository.SensorLogRepository
	vehicleRepo   *repository.VehicleRepository
	sensorRepo    *repository.SensorRepository
	db            *gorm.DB
	wsHub         *wsocket.Hub
}

type sensorWSReceivedAtRequest struct {
	WSReceivedAt string `json:"ws_received_at"`
}

func NewSensorLogHandler(sensorLogRepo *repository.SensorLogRepository, vehicleRepo *repository.VehicleRepository, sensorRepo *repository.SensorRepository, db *gorm.DB, wsHub *wsocket.Hub) *SensorLogHandler {
	return &SensorLogHandler{
		sensorLogRepo: sensorLogRepo,
		vehicleRepo:   vehicleRepo,
		sensorRepo:    sensorRepo,
		db:            db,
		wsHub:         wsHub,
	}
}

// GetSensorLogs godoc
// @Summary Get sensor logs with filters
// @Description Retrieve sensor logs with optional filters (vehicle_id, sensor_id, time range)
// @Tags Sensor Logs
// @Accept json
// @Produce json
// @Param vehicle_id query int false "Vehicle ID"
// @Param sensor_id query int false "Sensor ID"
// @Param sensor_type query string false "Sensor type name (e.g. ctd, adcp, sbes, mbes)"
// @Param start_time query string false "Start Time (ISO 8601)"
// @Param end_time query string false "End Time (ISO 8601)"
// @Param order query string false "Sort order: asc or desc" default(desc)
// @Param limit query int false "Limit" default(100)
// @Param offset query int false "Offset" default(0)
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /sensor-logs [get]
func (h *SensorLogHandler) GetSensorLogs(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	var query model.SensorLogQuery

	// Parse query parameters
	if vehicleID := c.Query("vehicle_id"); vehicleID != "" {
		id, err := strconv.ParseUint(vehicleID, 10, 32)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid vehicle_id",
			})
		}
		query.VehicleID = uint(id)
	}

	// Check permission: if not admin, filter by user's vehicles only
	if !middleware.HasPermission(h.db, userID, "vehicles.read_all") {
		// Get user's vehicle IDs
		userVehicleIDs, err := h.vehicleRepo.GetVehicleIDsByUserID(userID)
		if err != nil || len(userVehicleIDs) == 0 {
			return c.JSON(fiber.Map{
				"data":  []model.SensorLog{},
				"count": 0,
			})
		}

		// If vehicle_id is specified, check if user owns it
		if query.VehicleID != 0 {
			found := false
			for _, vid := range userVehicleIDs {
				if vid == query.VehicleID {
					found = true
					break
				}
			}
			if !found {
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
					"error": "You don't have permission to view this vehicle's sensor logs",
				})
			}
		} else {
			// No specific vehicle, filter to all user's vehicles
			query.VehicleIDs = userVehicleIDs
		}
	}

	if missionID := c.Query("mission_id"); missionID != "" {
		id, err := strconv.ParseUint(missionID, 10, 32)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid mission_id",
			})
		}
		query.MissionID = uint(id)
	}

	if sensorID := c.Query("sensor_id"); sensorID != "" {
		id, err := strconv.ParseUint(sensorID, 10, 32)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid sensor_id",
			})
		}
		query.SensorID = uint(id)
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

	order := strings.ToLower(strings.TrimSpace(c.Query("order")))
	if order == "" {
		order = "desc"
	}
	if order != "asc" && order != "desc" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid order, use asc or desc",
		})
	}
	query.Order = order

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

	if c.Query("skip_count") == "true" {
		query.SkipCount = true
	}

	logs, err := h.sensorLogRepo.GetSensorLogs(query)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch sensor logs",
		})
	}

	if query.SkipCount {
		return c.JSON(fiber.Map{
			"data": logs,
		})
	}

	count, _ := h.sensorLogRepo.CountLogs(query)

	return c.JSON(fiber.Map{
		"data":  logs,
		"count": count,
	})
}

// GetSensorLogByID godoc
// @Summary Get sensor log by ID
// @Description Retrieve a specific sensor log by ID
// @Tags Sensor Logs
// @Accept json
// @Produce json
// @Param id path int true "Sensor Log ID"
// @Success 200 {object} model.SensorLog
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Security BearerAuth
// @Router /sensor-logs/{id} [get]
func (h *SensorLogHandler) GetSensorLogByID(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid ID",
		})
	}

	log, err := h.sensorLogRepo.GetSensorLogByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Sensor log not found",
		})
	}

	return c.JSON(log)
}

// CreateSensorLog godoc
// @Summary Create a new sensor log
// @Description Create a new sensor log entry
// @Tags Sensor Logs
// @Accept json
// @Produce json
// @Param log body model.CreateSensorLogRequest true "Sensor Log Data"
// @Success 201 {object} model.SensorLog
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /sensor-logs [post]
func (h *SensorLogHandler) CreateSensorLog(c *fiber.Ctx) error {
	var req model.CreateSensorLogRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	var vehicle *model.Vehicle
	vehicleID := req.VehicleID
	if req.VehicleCode != "" {
		v, err := h.vehicleRepo.GetVehicleByCode(req.VehicleCode)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid vehicle_code",
			})
		}
		vehicleID = v.ID
		vehicle = v
	}
	if vehicleID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "vehicle_id or vehicle_code is required",
		})
	}

	var sensor *model.Sensor
	sensorID := req.SensorID
	if req.SensorCode != "" {
		s, err := h.sensorRepo.GetSensorByCode(req.SensorCode)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid sensor_code",
			})
		}
		sensorID = s.ID
		sensor = s
	}
	if sensorID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "sensor_id or sensor_code is required",
		})
	}

	// Stamp backend receive time (equivalent to mqtt_received_at for API mode)
	apiReceivedAt := time.Now()

	// Parse usv_timestamp from payload JSON if present
	var usvTimestamp *time.Time
	var payloadData map[string]interface{}
	if err := json.Unmarshal([]byte(req.Data), &payloadData); err == nil {
		rawTs, _ := payloadData["timestamp"].(string)
		if rawTs == "" {
			rawTs, _ = payloadData["date_time"].(string)
		}
		if rawTs != "" {
			if t, err := time.Parse(time.RFC3339Nano, rawTs); err == nil {
				usvTimestamp = &t
			} else if t, err := time.Parse(time.RFC3339, rawTs); err == nil {
				usvTimestamp = &t
			}
		}
	}

	sensorLog := &model.SensorLog{
		VehicleID:      vehicleID,
		SensorID:       sensorID,
		Data:           req.Data,
		UsvTimestamp:   usvTimestamp,
		MqttReceivedAt: &apiReceivedAt,
	}

	if err := h.sensorLogRepo.CreateSensorLog(sensorLog); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create sensor log",
		})
	}

	// Broadcast via WebSocket so frontend latency (ws_sent_at/ws_received_at) is measurable
	if h.wsHub != nil {
		wsSentAt := time.Now()
		if err := h.sensorLogRepo.UpdateWSSentAt(sensorLog.ID, wsSentAt); err == nil {
			sensorLog.WsSentAt = &wsSentAt
		}
		wsVehicle := &wsocket.VehicleInfo{}
		if vehicle != nil {
			wsVehicle.Code = vehicle.Code
			wsVehicle.Name = vehicle.Name
		}
		wsSensor := &wsocket.SensorInfo{}
		if sensor != nil {
			wsSensor.Code = sensor.Code
			wsSensor.Brand = sensor.Brand
			wsSensor.Model = sensor.Model
		}
		wsData := wsocket.SensorLogData{
			ID:        sensorLog.ID,
			VehicleID: sensorLog.VehicleID,
			SensorID:  sensorLog.SensorID,
			Vehicle:   wsVehicle,
			Sensor:    wsSensor,
			Data:      req.Data,
			CreatedAt: sensorLog.CreatedAt.Format(time.RFC3339Nano),
			UsvTimestamp: func() string {
				if usvTimestamp != nil {
					return usvTimestamp.Format(time.RFC3339Nano)
				}
				return ""
			}(),
			MqttReceivedAt: apiReceivedAt.UTC().Format(time.RFC3339Nano),
		}
		h.wsHub.BroadcastSensorLog(wsData, sensorLog.CreatedAt.Format(time.RFC3339Nano), wsSentAt.UTC().Format(time.RFC3339Nano))
	}

	return c.Status(fiber.StatusCreated).JSON(sensorLog)
}

// DeleteSensorLog godoc
// @Summary Delete a sensor log
// @Description Delete a sensor log by ID
// @Tags Sensor Logs
// @Accept json
// @Produce json
// @Param id path int true "Sensor Log ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /sensor-logs/{id} [delete]
func (h *SensorLogHandler) DeleteSensorLog(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid ID",
		})
	}

	if err := h.sensorLogRepo.DeleteSensorLog(uint(id)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete sensor log",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Sensor log deleted successfully",
	})
}

// MarkWSReceivedAt stores frontend websocket receive timestamp for a sensor log.
func (h *SensorLogHandler) MarkWSReceivedAt(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid ID",
		})
	}

	logEntry, err := h.sensorLogRepo.GetSensorLogByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Sensor log not found",
		})
	}

	if !middleware.HasPermission(h.db, userID, "vehicles.read_all") {
		userVehicleIDs, err := h.vehicleRepo.GetVehicleIDsByUserID(userID)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to validate ownership",
			})
		}

		allowed := false
		for _, vid := range userVehicleIDs {
			if vid == logEntry.VehicleID {
				allowed = true
				break
			}
		}

		if !allowed {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "You don't have permission to update this sensor log",
			})
		}
	}

	// Use server receipt time to avoid negative latency from client clock skew.
	wsReceivedAt := time.Now().UTC()

	if err := h.sensorLogRepo.UpdateWSReceivedAt(uint(id), wsReceivedAt); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update ws_received_at",
		})
	}

	return c.JSON(fiber.Map{
		"message": "ws_received_at updated",
	})
}

// ExportSensorLogs godoc
// @Summary Export sensor logs to CSV
// @Description Export sensor logs to CSV file with optional filters
// @Tags Sensor Logs
// @Accept json
// @Produce text/csv
// @Param vehicle_id query int false "Vehicle ID"
// @Param sensor_id query int false "Sensor ID"
// @Param start_time query string false "Start Time (ISO 8601)"
// @Param end_time query string false "End Time (ISO 8601)"
// @Success 200 {file} file "CSV file"
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /sensor-logs/export [get]
func (h *SensorLogHandler) ExportSensorLogs(c *fiber.Ctx) error {
	var query model.SensorLogQuery

	// Parse query parameters
	if vehicleID := c.Query("vehicle_id"); vehicleID != "" {
		id, err := strconv.ParseUint(vehicleID, 10, 32)
		if err == nil {
			query.VehicleID = uint(id)
		}
	}

	if sensorID := c.Query("sensor_id"); sensorID != "" {
		id, err := strconv.ParseUint(sensorID, 10, 32)
		if err == nil {
			query.SensorID = uint(id)
		}
	}

	if missionID := c.Query("mission_id"); missionID != "" {
		id, err := strconv.ParseUint(missionID, 10, 32)
		if err == nil {
			query.MissionID = uint(id)
		}
	}

	if startTime := c.Query("start_time"); startTime != "" {
		t, err := time.Parse(time.RFC3339, startTime)
		if err == nil {
			query.StartTime = t
		}
	}

	if endTime := c.Query("end_time"); endTime != "" {
		t, err := time.Parse(time.RFC3339, endTime)
		if err == nil {
			query.EndTime = t
		}
	}

	// No limit for export
	query.Limit = 50000
	query.Order = "asc"

	// Get all logs matching query
	logs, err := h.sensorLogRepo.GetSensorLogs(query)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch logs for export",
		})
	}

	// Build CSV content
	csvHeader := []string{"Timestamp", "Vehicle", "Sensor", "Mission", "Data", "UsvTimestamp", "MqttReceivedAt", "WsSentAt"}
	var b strings.Builder
	b.WriteString(strings.Join(csvHeader, ","))
	b.WriteString("\n")

	for _, log := range logs {
		// Prefer USV timestamp if present, otherwise created_at
		ts := log.CreatedAt.Format("2006-01-02T15:04:05.000Z07:00")
		if log.UsvTimestamp != nil {
			ts = log.UsvTimestamp.Format("2006-01-02T15:04:05.000Z07:00")
		}

		vehicleDisp := ""
		if log.Vehicle != nil {
			if log.Vehicle.Name != "" {
				vehicleDisp = log.Vehicle.Name
			} else if log.Vehicle.Code != "" {
				vehicleDisp = log.Vehicle.Code
			}
		} else if log.VehicleID != 0 {
			vehicleDisp = strconv.Itoa(int(log.VehicleID))
		}

		sensorDisp := ""
		if log.Sensor != nil {
			if log.Sensor.Code != "" {
				sensorDisp = log.Sensor.Code
			} else if log.Sensor.Model != "" {
				sensorDisp = log.Sensor.Model
			} else if log.Sensor.Brand != "" {
				sensorDisp = log.Sensor.Brand
			}
		} else if log.SensorID != 0 {
			sensorDisp = strconv.Itoa(int(log.SensorID))
		}

		missionDisp := ""
		if log.MissionCode != nil && *log.MissionCode != "" {
			missionDisp = *log.MissionCode
		} else if log.MissionID != nil {
			missionDisp = strconv.Itoa(int(*log.MissionID))
		}

		usvTs := ""
		if log.UsvTimestamp != nil {
			usvTs = log.UsvTimestamp.Format("2006-01-02T15:04:05.000Z07:00")
		}

		mqttTs := ""
		if log.MqttReceivedAt != nil {
			mqttTs = log.MqttReceivedAt.Format("2006-01-02T15:04:05.000Z07:00")
		}

		wsSentAt := ""
		if log.WsSentAt != nil {
			wsSentAt = log.WsSentAt.Format("2006-01-02T15:04:05.000000Z07:00")
		}

		esc := func(s string) string {
			s = strings.ReplaceAll(s, "\"", "\"\"")
			return "\"" + s + "\""
		}

		row := []string{
			esc(ts),
			esc(vehicleDisp),
			esc(sensorDisp),
			esc(missionDisp),
			esc(log.Data),
			esc(usvTs),
			esc(mqttTs),
			esc(wsSentAt),
		}

		b.WriteString(strings.Join(row, ","))
		b.WriteString("\n")
	}

	csv := b.String()

	// Set headers for file download
	c.Set("Content-Type", "text/csv")
	c.Set("Content-Disposition", "attachment; filename=sensor_logs.csv")

	return c.SendString(csv)
}

// ImportSensorLogs godoc
// @Summary Import sensor logs from CSV
// @Description Import sensor logs from CSV file
// @Tags Sensor Logs
// @Accept multipart/form-data
// @Produce json
// @Param file formData file true "CSV file"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /sensor-logs/import [post]
func (h *SensorLogHandler) ImportSensorLogs(c *fiber.Ctx) error {
	// Get uploaded file
	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No file uploaded",
		})
	}

	// Limit file size to 10MB
	if file.Size > 10*1024*1024 {
		return c.Status(fiber.StatusRequestEntityTooLarge).JSON(fiber.Map{
			"error": "File too large. Maximum size is 10MB",
		})
	}

	// Check file extension
	if file.Header.Get("Content-Type") != "text/csv" && !util.Contains(file.Filename, ".csv") {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "File must be CSV format",
		})
	}

	// Open and read CSV file
	fileContent, err := file.Open()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to open file",
		})
	}
	defer fileContent.Close()

	// Parse CSV
	csvBytes := make([]byte, file.Size)
	_, err = fileContent.Read(csvBytes)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to read file",
		})
	}

	csvContent := string(csvBytes)
	lines := util.SplitLines(csvContent)

	if len(lines) < 2 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "CSV file is empty or invalid",
		})
	}

	// Build column index map from header row (case-insensitive, strip spaces)
	headerFields := util.ParseCSVLine(lines[0])
	colIndex := make(map[string]int)
	for i, h := range headerFields {
		colIndex[strings.ToLower(strings.TrimSpace(h))] = i
	}

	// Cache vehicle/sensor lookups to avoid repeated DB queries
	vehicleCache := map[string]uint{}
	sensorCache := map[string]uint{}

	successCount := 0
	errorCount := 0

	for i := 1; i < len(lines); i++ {
		if lines[i] == "" {
			continue
		}

		fields := util.ParseCSVLine(lines[i])

		// Resolve vehicle by code string or numeric ID
		var vehicleID uint
		if idx, ok := colIndex["vehicle"]; ok && idx < len(fields) {
			vField := strings.TrimSpace(fields[idx])
			if id, err := strconv.ParseUint(vField, 10, 32); err == nil {
				vehicleID = uint(id)
			} else if vField != "" {
				if cached, ok := vehicleCache[vField]; ok {
					vehicleID = cached
				} else if v, err := h.vehicleRepo.GetVehicleByCode(vField); err == nil {
					vehicleID = v.ID
					vehicleCache[vField] = v.ID
				}
			}
		}

		// Resolve sensor by code string or numeric ID
		var sensorID uint
		if idx, ok := colIndex["sensor"]; ok && idx < len(fields) {
			sField := strings.TrimSpace(fields[idx])
			if id, err := strconv.ParseUint(sField, 10, 32); err == nil {
				sensorID = uint(id)
			} else if sField != "" {
				if cached, ok := sensorCache[sField]; ok {
					sensorID = cached
				} else if s, err := h.sensorRepo.GetSensorByCode(sField); err == nil {
					sensorID = s.ID
					sensorCache[sField] = s.ID
				}
			}
		}

		if vehicleID == 0 || sensorID == 0 {
			errorCount++
			continue
		}

		// Get data field by header name
		var dataVal string
		if idx, ok := colIndex["data"]; ok && idx < len(fields) {
			dataVal = strings.TrimSpace(fields[idx])
		}
		if dataVal == "" {
			errorCount++
			continue
		}

		logEntry := &model.SensorLog{
			VehicleID: vehicleID,
			SensorID:  sensorID,
			Data:      dataVal,
		}

		// Parse optional mission code
		if idx, ok := colIndex["mission"]; ok && idx < len(fields) {
			if mCode := strings.TrimSpace(fields[idx]); mCode != "" {
				logEntry.MissionCode = &mCode
			}
		}

		// Parse optional USV timestamp
		for _, tsKey := range []string{"usvtimestamp", "usv_timestamp"} {
			if idx, ok := colIndex[tsKey]; ok && idx < len(fields) {
				if tsStr := strings.TrimSpace(fields[idx]); tsStr != "" {
					if t, err := time.Parse(time.RFC3339Nano, tsStr); err == nil {
						logEntry.UsvTimestamp = &t
						break
					} else if t, err := time.Parse(time.RFC3339, tsStr); err == nil {
						logEntry.UsvTimestamp = &t
						break
					}
				}
			}
		}

		if err := h.sensorLogRepo.CreateSensorLog(logEntry); err != nil {
			errorCount++
		} else {
			successCount++
		}
	}

	return c.JSON(fiber.Map{
		"message": "Import completed",
		"success_count": successCount,
		"error_count": errorCount,
		"total_processed": successCount + errorCount,
	})
}
