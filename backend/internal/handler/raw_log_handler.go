package handler

import (
	"fmt"
	"log"
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

type RawLogHandler struct {
	rawLogRepo  *repository.RawLogRepository
	vehicleRepo *repository.VehicleRepository
	db          *gorm.DB
	enabled     bool
	wsHub       *wsocket.Hub
}

func NewRawLogHandler(rawLogRepo *repository.RawLogRepository, vehicleRepo *repository.VehicleRepository, db *gorm.DB, enabled bool, wsHub *wsocket.Hub) *RawLogHandler {
	return &RawLogHandler{
		rawLogRepo:  rawLogRepo,
		vehicleRepo: vehicleRepo,
		db:          db,
		enabled:     enabled,
		wsHub:       wsHub,
	}
}

// GetRawLogs godoc
// @Summary Get raw logs with filters
// @Description Retrieve raw logs with optional filters (search, time range)
// @Tags Raw Logs
// @Accept json
// @Produce json
// @Param search query string false "Search in logs"
// @Param start_time query string false "Start Time (ISO 8601)"
// @Param end_time query string false "End Time (ISO 8601)"
// @Param limit query int false "Limit" default(100)
// @Param offset query int false "Offset" default(0)
// @Success 200 {array} model.RawLog
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /raw-logs [get]
func (h *RawLogHandler) GetRawLogs(c *fiber.Ctx) error {
	if !h.enabled {
		return c.JSON(fiber.Map{
			"data":  []model.RawLog{},
			"count": 0,
		})
	}

	userID := c.Locals("user_id").(uint)
	var query model.RawLogQuery

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
				"data":  []model.RawLog{},
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
					"error": "You don't have permission to view this vehicle's logs",
				})
			}
		} else {
			// No specific vehicle, filter to all user's vehicles
			query.VehicleIDs = userVehicleIDs
		}
	}

	query.Search = c.Query("search")

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

	logs, err := h.rawLogRepo.GetRawLogs(query)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch raw logs",
		})
	}

	count, _ := h.rawLogRepo.CountLogs(query)

	return c.JSON(fiber.Map{
		"data":  logs,
		"count": count,
	})
}

// GetRawLogByID godoc
// @Summary Get raw log by ID
// @Description Retrieve a specific raw log by ID
// @Tags Raw Logs
// @Accept json
// @Produce json
// @Param id path int true "Raw Log ID"
// @Success 200 {object} model.RawLog
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Security BearerAuth
// @Router /raw-logs/{id} [get]
func (h *RawLogHandler) GetRawLogByID(c *fiber.Ctx) error {
	if !h.enabled {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Raw log persistence is disabled",
		})
	}

	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid ID",
		})
	}

	log, err := h.rawLogRepo.GetRawLogByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Raw log not found",
		})
	}

	return c.JSON(log)
}

// GetRawLogStats godoc
// @Summary Get raw log statistics
// @Description Retrieve statistics for raw logs
// @Tags Raw Logs
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /raw-logs/stats [get]
func (h *RawLogHandler) GetRawLogStats(c *fiber.Ctx) error {
	if !h.enabled {
		return c.JSON(fiber.Map{
			"total_records":      0,
			"today_records":      0,
			"storage_size":       "0 B",
			"last_updated":       nil,
			"data_quality":       100,
			"percentage_increase": 0,
			"storage_percentage": 0,
			"remaining_size":     0,
			"max_storage_size":   0,
		})
	}

	stats, err := h.rawLogRepo.GetStats()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch stats",
		})
	}

	return c.JSON(stats)
}

// CreateRawLog godoc
// @Summary Create a new raw log
// @Description Create a new raw log entry
// @Tags Raw Logs
// @Accept json
// @Produce json
// @Param log body model.CreateRawLogRequest true "Raw Log Data"
// @Success 201 {object} model.RawLog
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /raw-logs [post]
func (h *RawLogHandler) CreateRawLog(c *fiber.Ctx) error {
	if !h.enabled {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error": "Raw log persistence is disabled",
		})
	}

	var req model.CreateRawLogRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	vehicleID := req.VehicleID
	vehicleCode := strings.TrimSpace(req.VehicleCode)
	var vehicle *model.Vehicle

	if vehicleID != 0 {
		found, err := h.vehicleRepo.GetVehicleByID(vehicleID)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid vehicle_id",
			})
		}
		vehicle = found
		vehicleCode = found.Code
	} else if vehicleCode != "" {
		found, err := h.vehicleRepo.GetVehicleByCode(vehicleCode)
		if err != nil {
			log.Printf("Warning: Vehicle not found for code %s (raw log still saved)", vehicleCode)
		} else {
			vehicle = found
			vehicleID = found.ID
			vehicleCode = found.Code
		}
	}

	logText := req.Logs
	if len(logText) > 255 {
		logText = logText[:252] + "..."
	}
	if vehicleCode != "" {
		logText = fmt.Sprintf("[%s] %s", vehicleCode, logText)
	}

	entry := &model.RawLog{
		Logs: logText,
	}
	if vehicle != nil {
		entry.VehicleID = &vehicleID
	}

	if err := h.rawLogRepo.CreateRawLog(entry); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create raw log",
		})
	}

	if h.wsHub != nil {
		wsData := wsocket.RawLogData{
			ID:        entry.ID,
			Logs:      logText,
			CreatedAt: entry.CreatedAt.Format(time.RFC3339),
		}
		if vehicle != nil {
			wsData.Vehicle = &wsocket.VehicleInfo{
				Code: vehicle.Code,
				Name: vehicle.Name,
			}
		}
		h.wsHub.BroadcastRawLog(wsData, entry.CreatedAt.Format(time.RFC3339))
	}

	return c.Status(fiber.StatusCreated).JSON(entry)
}

// DeleteRawLog godoc
// @Summary Delete a raw log
// @Description Delete a raw log by ID
// @Tags Raw Logs
// @Accept json
// @Produce json
// @Param id path int true "Raw Log ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /raw-logs/{id} [delete]
func (h *RawLogHandler) DeleteRawLog(c *fiber.Ctx) error {
	if !h.enabled {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Raw log persistence is disabled",
		})
	}

	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid ID",
		})
	}

	if err := h.rawLogRepo.DeleteRawLog(uint(id)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete raw log",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Raw log deleted successfully",
	})
}

// ExportRawLogs godoc
// @Summary Export raw logs to CSV
// @Description Export raw logs to CSV file with optional filters
// @Tags Raw Logs
// @Accept json
// @Produce text/csv
// @Param search query string false "Search in logs"
// @Param vehicle_id query int false "Vehicle ID"
// @Param start_time query string false "Start Time (ISO 8601)"
// @Param end_time query string false "End Time (ISO 8601)"
// @Success 200 {file} file "CSV file"
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /raw-logs/export [get]
func (h *RawLogHandler) ExportRawLogs(c *fiber.Ctx) error {
	if !h.enabled {
		c.Set("Content-Type", "text/csv")
		c.Set("Content-Disposition", "attachment; filename=raw_logs_disabled.csv")
		return c.SendString("ID,Vehicle ID,Vehicle Code,Logs,Created At\n")
	}

	var query model.RawLogQuery

	// Parse query parameters
	if vehicleID := c.Query("vehicle_id"); vehicleID != "" {
		id, err := strconv.ParseUint(vehicleID, 10, 32)
		if err == nil {
			query.VehicleID = uint(id)
		}
	}

	query.Search = c.Query("search")

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
	query.Limit = 0

	// Get all logs matching query
	logs, err := h.rawLogRepo.GetRawLogs(query)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch logs for export",
		})
	}

	// Build CSV content
	csv := "ID,Vehicle ID,Vehicle Code,Logs,Created At\n"
	for _, log := range logs {
		vehicleCode := ""
		vehicleIDStr := ""
		if log.Vehicle != nil {
			vehicleCode = log.Vehicle.Code
		}
		if log.VehicleID != nil {
			vehicleIDStr = strconv.Itoa(int(*log.VehicleID))
		}
		// Escape quotes and commas in logs field
		logsContent := "\"" + log.Logs + "\""
		csv += strconv.Itoa(int(log.ID)) + "," +
			vehicleIDStr + "," +
			vehicleCode + "," +
			logsContent + "," +
			log.CreatedAt.Format("2006-01-02T15:04:05.000Z07:00") + "\n"
	}

	// Set headers for file download
	c.Set("Content-Type", "text/csv")
	c.Set("Content-Disposition", "attachment; filename=raw_logs_"+time.Now().Format("20060102_150405")+".csv")

	return c.SendString(csv)
}

// ImportRawLogs godoc
// @Summary Import raw logs from CSV
// @Description Import raw logs from CSV file
// @Tags Raw Logs
// @Accept multipart/form-data
// @Produce json
// @Param file formData file true "CSV file"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /raw-logs/import [post]
func (h *RawLogHandler) ImportRawLogs(c *fiber.Ctx) error {
	if !h.enabled {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error": "Raw log persistence is disabled",
		})
	}

	// Get uploaded file
	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No file uploaded",
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

	// Skip header line
	successCount := 0
	errorCount := 0
	
	for i := 1; i < len(lines); i++ {
		if lines[i] == "" {
			continue
		}
		
		fields := util.ParseCSVLine(lines[i])
		if len(fields) < 4 {
			errorCount++
			continue
		}

		// Parse vehicle ID (optional)
		var vehicleID *uint
		if fields[1] != "" {
			parsedID, err := strconv.ParseUint(fields[1], 10, 32)
			if err == nil {
				convertedID := uint(parsedID)
				vehicleID = &convertedID
			}
		}

		// Create raw log (fields[3] is logs content)
		log := &model.RawLog{
			VehicleID: vehicleID,
			Logs:      fields[3],
		}

		if err := h.rawLogRepo.CreateRawLog(log); err != nil {
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

