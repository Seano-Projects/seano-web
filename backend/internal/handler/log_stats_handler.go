package handler

import (
	"go-fiber-pgsql/internal/middleware"
	"go-fiber-pgsql/internal/model"
	"go-fiber-pgsql/internal/repository"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type LogStatsHandler struct {
	vehicleLogRepo *repository.VehicleLogRepository
	sensorLogRepo  *repository.SensorLogRepository
	rawLogRepo     *repository.RawLogRepository
	vehicleRepo    *repository.VehicleRepository
	db             *gorm.DB
	rawLogsEnabled bool
}

func NewLogStatsHandler(
	vehicleLogRepo *repository.VehicleLogRepository,
	sensorLogRepo *repository.SensorLogRepository,
	rawLogRepo *repository.RawLogRepository,
	vehicleRepo *repository.VehicleRepository,
	db *gorm.DB,
	rawLogsEnabled bool,
) *LogStatsHandler {
	return &LogStatsHandler{
		vehicleLogRepo: vehicleLogRepo,
		sensorLogRepo:  sensorLogRepo,
		rawLogRepo:     rawLogRepo,
		vehicleRepo:    vehicleRepo,
		db:             db,
		rawLogsEnabled: rawLogsEnabled,
	}
}

// GetLogStats godoc
// @Summary Get log statistics
// @Description Get statistics for all log types (vehicle, sensor, raw)
// @Tags Log Stats
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /logs/stats [get]
func (h *LogStatsHandler) GetLogStats(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	// Determine which vehicle IDs to scope stats to
	var vehicleIDs []uint
	if !middleware.HasPermission(h.db, userID, "vehicles.read_all") {
		ids, err := h.vehicleRepo.GetVehicleIDsByUserID(userID)
		if err != nil {
			ids = []uint{}
		}
		vehicleIDs = ids
	}

	// Get today's date range
	now := time.Now()
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	endOfDay := startOfDay.Add(24 * time.Hour)

	// Get yesterday's date range
	yesterday := now.AddDate(0, 0, -1)
	startOfYesterday := time.Date(yesterday.Year(), yesterday.Month(), yesterday.Day(), 0, 0, 0, 0, yesterday.Location())
	endOfYesterday := startOfYesterday.Add(24 * time.Hour)

	// Vehicle logs stats
	vehicleLogsToday, _ := h.vehicleLogRepo.CountLogs(model.VehicleLogQuery{
		VehicleIDs: vehicleIDs,
		StartTime:  startOfDay,
		EndTime:    endOfDay,
	})
	vehicleLogsYesterday, _ := h.vehicleLogRepo.CountLogs(model.VehicleLogQuery{
		VehicleIDs: vehicleIDs,
		StartTime:  startOfYesterday,
		EndTime:    endOfYesterday,
	})
	vehicleLogsTotal, _ := h.vehicleLogRepo.CountLogs(model.VehicleLogQuery{
		VehicleIDs: vehicleIDs,
	})

	// Sensor logs stats
	sensorLogsToday, _ := h.sensorLogRepo.CountLogs(model.SensorLogQuery{
		VehicleIDs: vehicleIDs,
		StartTime:  startOfDay,
		EndTime:    endOfDay,
	})
	sensorLogsYesterday, _ := h.sensorLogRepo.CountLogs(model.SensorLogQuery{
		VehicleIDs: vehicleIDs,
		StartTime:  startOfYesterday,
		EndTime:    endOfYesterday,
	})
	sensorLogsTotal, _ := h.sensorLogRepo.CountLogs(model.SensorLogQuery{
		VehicleIDs: vehicleIDs,
	})

	// Raw logs stats
	rawLogsToday := int64(0)
	rawLogsYesterday := int64(0)
	rawLogsTotal := int64(0)
	if h.rawLogsEnabled {
		rawLogsToday, _ = h.rawLogRepo.CountLogs(model.RawLogQuery{
			VehicleIDs: vehicleIDs,
			StartTime:  startOfDay,
			EndTime:    endOfDay,
		})
		rawLogsYesterday, _ = h.rawLogRepo.CountLogs(model.RawLogQuery{
			VehicleIDs: vehicleIDs,
			StartTime:  startOfYesterday,
			EndTime:    endOfYesterday,
		})
		rawLogsTotal, _ = h.rawLogRepo.CountLogs(model.RawLogQuery{
			VehicleIDs: vehicleIDs,
		})
	}

	// Calculate percentage changes
	vehicleChange := calculatePercentageChange(vehicleLogsYesterday, vehicleLogsToday)
	sensorChange := calculatePercentageChange(sensorLogsYesterday, sensorLogsToday)
	rawChange := calculatePercentageChange(rawLogsYesterday, rawLogsToday)

	return c.JSON(fiber.Map{
		"vehicle_logs": fiber.Map{
			"today":             vehicleLogsToday,
			"yesterday":         vehicleLogsYesterday,
			"total":             vehicleLogsTotal,
			"percentage_change": vehicleChange,
		},
		"sensor_logs": fiber.Map{
			"today":             sensorLogsToday,
			"yesterday":         sensorLogsYesterday,
			"total":             sensorLogsTotal,
			"percentage_change": sensorChange,
		},
		"raw_logs": fiber.Map{
			"today":             rawLogsToday,
			"yesterday":         rawLogsYesterday,
			"total":             rawLogsTotal,
			"percentage_change": rawChange,
		},
	})
}

// GetLogChartData godoc
// @Summary Get log chart data
// @Description Get time-series data for log charts (last 24 hours by hour)
// @Tags Log Stats
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /logs/chart [get]
func (h *LogStatsHandler) GetLogChartData(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	// Determine which vehicle IDs to scope chart data to
	var vehicleIDs []uint
	if !middleware.HasPermission(h.db, userID, "vehicles.read_all") {
		ids, err := h.vehicleRepo.GetVehicleIDsByUserID(userID)
		if err != nil {
			ids = []uint{}
		}
		vehicleIDs = ids
	}

	now := time.Now()

	// Get data for last 24 hours
	chartData := make([]map[string]interface{}, 0, 24)

	for i := 23; i >= 0; i-- {
		hourStart := now.Add(-time.Duration(i) * time.Hour)
		hourStart = time.Date(hourStart.Year(), hourStart.Month(), hourStart.Day(), hourStart.Hour(), 0, 0, 0, hourStart.Location())
		hourEnd := hourStart.Add(time.Hour)

		vehicleCount, _ := h.vehicleLogRepo.CountLogs(model.VehicleLogQuery{
			VehicleIDs: vehicleIDs,
			StartTime:  hourStart,
			EndTime:    hourEnd,
		})

		sensorCount, _ := h.sensorLogRepo.CountLogs(model.SensorLogQuery{
			VehicleIDs: vehicleIDs,
			StartTime:  hourStart,
			EndTime:    hourEnd,
		})

		rawCount := int64(0)
		if h.rawLogsEnabled {
			rawCount, _ = h.rawLogRepo.CountLogs(model.RawLogQuery{
				VehicleIDs: vehicleIDs,
				StartTime:  hourStart,
				EndTime:    hourEnd,
			})
		}
		
		chartData = append(chartData, map[string]interface{}{
			"time":         hourStart.Format("15:04"),
			"vehicle_logs": vehicleCount,
			"sensor_logs":  sensorCount,
			"raw_logs":     rawCount,
		})
	}
	
	return c.JSON(fiber.Map{
		"chart_data": chartData,
	})
}

func calculatePercentageChange(yesterday, today int64) float64 {
	if yesterday == 0 {
		if today > 0 {
			return 100.0
		}
		return 0.0
	}
	return ((float64(today) - float64(yesterday)) / float64(yesterday)) * 100.0
}

