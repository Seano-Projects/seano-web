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

type VehicleLogHandler struct {
	vehicleLogRepo *repository.VehicleLogRepository
	vehicleRepo    *repository.VehicleRepository
	missionRepo    *repository.MissionRepository
	db             *gorm.DB
}

func NewVehicleLogHandler(vehicleLogRepo *repository.VehicleLogRepository, vehicleRepo *repository.VehicleRepository, missionRepo *repository.MissionRepository, db *gorm.DB) *VehicleLogHandler {
	return &VehicleLogHandler{
		vehicleLogRepo: vehicleLogRepo,
		vehicleRepo:    vehicleRepo,
		missionRepo:    missionRepo,
		db:             db,
	}
}

// GetVehicleLogs godoc
// @Summary Get vehicle logs with filters
// @Description Retrieve vehicle logs with optional filters (vehicle_id, time range)
// @Tags Vehicle Logs
// @Accept json
// @Produce json
// @Param vehicle_id query int false "Vehicle ID"
// @Param start_time query string false "Start Time (ISO 8601)"
// @Param end_time query string false "End Time (ISO 8601)"
// @Param limit query int false "Limit" default(100)
// @Param offset query int false "Offset" default(0)
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /vehicle-logs [get]
func (h *VehicleLogHandler) GetVehicleLogs(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	var query model.VehicleLogQuery

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

	if missionID := c.Query("mission_id"); missionID != "" {
		id, err := strconv.ParseUint(missionID, 10, 32)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid mission_id",
			})
		}
		query.MissionID = uint(id)
	}

	if missionCode := c.Query("mission_code"); missionCode != "" {
		query.MissionCode = missionCode
	}

	// Check permission: if not admin, filter by user's vehicles only
	if !middleware.HasPermission(h.db, userID, "vehicles.read_all") {
		// Get user's vehicle IDs
		userVehicleIDs, err := h.vehicleRepo.GetVehicleIDsByUserID(userID)
		if err != nil || len(userVehicleIDs) == 0 {
			return c.JSON(fiber.Map{
				"data":  []model.VehicleLog{},
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
			// No specific vehicle requested, filter to all user's vehicles
			query.VehicleIDs = userVehicleIDs
		}
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

	logs, err := h.vehicleLogRepo.GetVehicleLogs(query)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch vehicle logs",
		})
	}

	count, _ := h.vehicleLogRepo.CountLogs(query)

	return c.JSON(fiber.Map{
		"data":  logs,
		"count": count,
	})
}

// GetVehicleLogByID godoc
// @Summary Get vehicle log by ID
// @Description Retrieve a specific vehicle log by ID
// @Tags Vehicle Logs
// @Accept json
// @Produce json
// @Param id path int true "Vehicle Log ID"
// @Success 200 {object} model.VehicleLog
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Security BearerAuth
// @Router /vehicle-logs/{id} [get]
func (h *VehicleLogHandler) GetVehicleLogByID(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid ID",
		})
	}

	log, err := h.vehicleLogRepo.GetVehicleLogByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Vehicle log not found",
		})
	}

	return c.JSON(log)
}

// GetLatestVehicleLog godoc
// @Summary Get latest vehicle log
// @Description Retrieve the latest log for a specific vehicle
// @Tags Vehicle Logs
// @Accept json
// @Produce json
// @Param vehicle_id path int true "Vehicle ID"
// @Success 200 {object} model.VehicleLog
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Security BearerAuth
// @Router /vehicle-logs/latest/{vehicle_id} [get]
func (h *VehicleLogHandler) GetLatestVehicleLog(c *fiber.Ctx) error {
	vehicleID, err := strconv.ParseUint(c.Params("vehicle_id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid vehicle_id",
		})
	}

	log, err := h.vehicleLogRepo.GetLatestLogByVehicle(uint(vehicleID))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "No logs found for this vehicle",
		})
	}

	return c.JSON(log)
}

// CreateVehicleLog godoc
// @Summary Create a new vehicle log
// @Description Create a new vehicle log entry
// @Tags Vehicle Logs
// @Accept json
// @Produce json
// @Param log body model.CreateVehicleLogRequest true "Vehicle Log Data"
// @Success 201 {object} model.VehicleLog
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /vehicle-logs [post]
func (h *VehicleLogHandler) CreateVehicleLog(c *fiber.Ctx) error {
	var req model.CreateVehicleLogRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	vehicleID := req.VehicleID
	if vehicleID == 0 && req.VehicleCode != "" {
		vehicle, err := h.vehicleRepo.GetVehicleByCode(req.VehicleCode)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid vehicle_code",
			})
		}
		vehicleID = vehicle.ID
	}
	if vehicleID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "vehicle_id or vehicle_code is required",
		})
	}

	// Convert FlexibleString to *string for database
	var tempSystem *string
	if req.TemperatureSystem != nil {
		tempSystem = &req.TemperatureSystem.Value
	}
	
	// Calculate battery_percentage if not provided but battery_voltage exists
	batteryPercentage := req.BatteryPercentage
	if batteryPercentage == nil && req.BatteryVoltage != nil {
		voltage := *req.BatteryVoltage
		percentage := ((voltage - 11.0) / 1.6) * 100.0
		if percentage < 0 {
			percentage = 0
		}
		if percentage > 100 {
			percentage = 100
		}
		batteryPercentage = &percentage
	}
	
	log := &model.VehicleLog{
		VehicleID:         vehicleID,
		MissionID:         req.MissionID,
		MissionCode:       req.MissionCode,
		BatteryVoltage:    req.BatteryVoltage,
		BatteryCurrent:    req.BatteryCurrent,
		BatteryPercentage: batteryPercentage,
		RSSI:              req.RSSI,
		Mode:              req.Mode,
		Latitude:          req.Latitude,
		Longitude:         req.Longitude,
		Altitude:          req.Altitude,
		Heading:           req.Heading,
		Armed:             req.Armed,
		GPSok:             req.GPSok,
		SystemStatus:      req.SystemStatus,
		Speed:             req.Speed,
		Roll:              req.Roll,
		Pitch:             req.Pitch,
		Yaw:               req.Yaw,
		TemperatureSystem: tempSystem,
	}

	if log.MissionID == nil && req.MissionCode != nil && *req.MissionCode != "" && h.missionRepo != nil {
		if mission, err := h.missionRepo.GetMissionByCode(*req.MissionCode); err == nil {
			log.MissionID = &mission.ID
		}
	}

	if log.MissionID != nil && (log.MissionCode == nil || *log.MissionCode == "") && h.missionRepo != nil {
		if mission, err := h.missionRepo.GetMissionByID(*log.MissionID); err == nil {
			log.MissionCode = &mission.MissionCode
		}
	}

	if err := h.vehicleLogRepo.CreateVehicleLog(log); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create vehicle log",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(log)
}

// DeleteVehicleLog godoc
// @Summary Delete a vehicle log
// @Description Delete a vehicle log by ID
// @Tags Vehicle Logs
// @Accept json
// @Produce json
// @Param id path int true "Vehicle Log ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /vehicle-logs/{id} [delete]
func (h *VehicleLogHandler) DeleteVehicleLog(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid ID",
		})
	}

	if err := h.vehicleLogRepo.DeleteVehicleLog(uint(id)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete vehicle log",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Vehicle log deleted successfully",
	})
}

// ExportVehicleLogs godoc
// @Summary Export vehicle logs to CSV
// @Description Export vehicle logs to CSV file with optional filters
// @Tags Vehicle Logs
// @Accept json
// @Produce text/csv
// @Param vehicle_id query int false "Vehicle ID"
// @Param start_time query string false "Start Time (ISO 8601)"
// @Param end_time query string false "End Time (ISO 8601)"
// @Success 200 {file} file "CSV file"
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /vehicle-logs/export [get]
func (h *VehicleLogHandler) ExportVehicleLogs(c *fiber.Ctx) error {
	var query model.VehicleLogQuery

	// Parse query parameters
	if vehicleID := c.Query("vehicle_id"); vehicleID != "" {
		id, err := strconv.ParseUint(vehicleID, 10, 32)
		if err == nil {
			query.VehicleID = uint(id)
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
	query.Limit = 0

	// Get all logs matching query
	logs, err := h.vehicleLogRepo.GetVehicleLogs(query)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch logs for export",
		})
	}

	// Build CSV content
	csv := "ID,Vehicle ID,Vehicle Code,Latitude,Longitude,Speed,Heading,Battery Voltage,Mode,Created At\n"
	for _, log := range logs {
		vehicleCode := ""
		if log.Vehicle != nil {
			vehicleCode = log.Vehicle.Code
		}
		vehicleIDStr := strconv.Itoa(int(log.VehicleID))
		
		latStr := ""
		if log.Latitude != nil {
			latStr = strconv.FormatFloat(*log.Latitude, 'f', 6, 64)
		}
		
		lonStr := ""
		if log.Longitude != nil {
			lonStr = strconv.FormatFloat(*log.Longitude, 'f', 6, 64)
		}
		
		speedStr := ""
		if log.Speed != nil {
			speedStr = strconv.FormatFloat(*log.Speed, 'f', 2, 64)
		}
		
		headingStr := ""
		if log.Heading != nil {
			headingStr = strconv.FormatFloat(*log.Heading, 'f', 2, 64)
		}
		
		batteryStr := ""
		if log.BatteryVoltage != nil {
			batteryStr = strconv.FormatFloat(*log.BatteryVoltage, 'f', 2, 64)
		}
		
		modeStr := ""
		if log.Mode != nil {
			modeStr = *log.Mode
		}
		
		csv += strconv.Itoa(int(log.ID)) + "," +
			vehicleIDStr + "," +
			vehicleCode + "," +
			latStr + "," +
			lonStr + "," +
			speedStr + "," +
			headingStr + "," +
			batteryStr + "," +
			modeStr + "," +
			log.CreatedAt.Format(time.RFC3339) + "\n"
	}

	// Set headers for file download
	c.Set("Content-Type", "text/csv")
	c.Set("Content-Disposition", "attachment; filename=vehicle_logs_"+time.Now().Format("20060102_150405")+".csv")

	return c.SendString(csv)
}

// ImportVehicleLogs godoc
// @Summary Import vehicle logs from CSV
// @Description Import vehicle logs from CSV file
// @Tags Vehicle Logs
// @Accept multipart/form-data
// @Produce json
// @Param file formData file true "CSV file"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /vehicle-logs/import [post]
func (h *VehicleLogHandler) ImportVehicleLogs(c *fiber.Ctx) error {
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
		if len(fields) < 9 {
			errorCount++
			continue
		}

		// Parse vehicle ID
		vehicleID, err := strconv.ParseUint(fields[1], 10, 32)
		if err != nil {
			errorCount++
			continue
		}

		// Parse numeric fields (all optional)
		var latitude, longitude, speed, heading, batteryVoltage *float64
		var mode *string
		
		if fields[3] != "" {
			lat, err := strconv.ParseFloat(fields[3], 64)
			if err == nil {
				latitude = &lat
			}
		}
		
		if fields[4] != "" {
			lon, err := strconv.ParseFloat(fields[4], 64)
			if err == nil {
				longitude = &lon
			}
		}
		
		if fields[5] != "" {
			spd, err := strconv.ParseFloat(fields[5], 64)
			if err == nil {
				speed = &spd
			}
		}
		
		if fields[6] != "" {
			hdg, err := strconv.ParseFloat(fields[6], 64)
			if err == nil {
				heading = &hdg
			}
		}
		
		if fields[7] != "" {
			bat, err := strconv.ParseFloat(fields[7], 64)
			if err == nil {
				batteryVoltage = &bat
			}
		}
		
		if fields[8] != "" {
			mode = &fields[8]
		}

		// Create vehicle log
		log := &model.VehicleLog{
			VehicleID:      uint(vehicleID),
			Latitude:       latitude,
			Longitude:      longitude,
			Speed:          speed,
			Heading:        heading,
			BatteryVoltage: batteryVoltage,
			Mode:           mode,
		}

		if err := h.vehicleLogRepo.CreateVehicleLog(log); err != nil {
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

