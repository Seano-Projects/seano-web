package handler

import (
	"go-fiber-pgsql/internal/middleware"
	"go-fiber-pgsql/internal/model"
	"go-fiber-pgsql/internal/repository"
	"go-fiber-pgsql/internal/util"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type RawLogHandler struct {
	rawLogRepo  *repository.RawLogRepository
	vehicleRepo *repository.VehicleRepository
	db          *gorm.DB
}

func NewRawLogHandler(rawLogRepo *repository.RawLogRepository, vehicleRepo *repository.VehicleRepository, db *gorm.DB) *RawLogHandler {
	return &RawLogHandler{
		rawLogRepo:  rawLogRepo,
		vehicleRepo: vehicleRepo,
		db:          db,
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
	if !middleware.HasPermission(h.db, userID, "raw_logs.read") {
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
			// No specific vehicle requested, use first vehicle
			query.VehicleID = userVehicleIDs[0]
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
	var req model.CreateRawLogRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	log := &model.RawLog{
		Logs: req.Logs,
	}

	if err := h.rawLogRepo.CreateRawLog(log); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create raw log",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(log)
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
			log.CreatedAt.Format(time.RFC3339) + "\n"
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

