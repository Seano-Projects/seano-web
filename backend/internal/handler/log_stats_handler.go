package handler

import (
	"go-fiber-pgsql/internal/middleware"
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

	var vehicleIDs []uint
	if !middleware.HasPermission(h.db, userID, "vehicles.read_all") {
		ids, err := h.vehicleRepo.GetVehicleIDsByUserID(userID)
		if err != nil {
			ids = []uint{}
		}
		vehicleIDs = ids
	}

	now := time.Now()
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	startOfYesterday := startOfDay.AddDate(0, 0, -1)

	// Helper: single query per table with conditional aggregation (3 queries total instead of 9)
	type statsResult struct {
		Total     int64
		Today     int64
		Yesterday int64
	}

	queryStats := func(table string) statsResult {
		var r statsResult
		q := h.db.Table(table).Select(`
			COUNT(*) as total,
			COUNT(*) FILTER (WHERE created_at >= ? AND created_at < ?) as today,
			COUNT(*) FILTER (WHERE created_at >= ? AND created_at < ?) as yesterday
		`, startOfDay, startOfDay.Add(24*time.Hour), startOfYesterday, startOfDay)

		if len(vehicleIDs) > 0 {
			q = q.Where("vehicle_id IN ?", vehicleIDs)
		}
		q.Row().Scan(&r.Total, &r.Today, &r.Yesterday)
		return r
	}

	vStats := queryStats("vehicle_logs")
	sStats := queryStats("sensor_logs")

	var rStats statsResult
	if h.rawLogsEnabled {
		rStats = queryStats("raw_logs")
	}

	return c.JSON(fiber.Map{
		"vehicle_logs": fiber.Map{
			"today":             vStats.Today,
			"yesterday":         vStats.Yesterday,
			"total":             vStats.Total,
			"percentage_change": calculatePercentageChange(vStats.Yesterday, vStats.Today),
		},
		"sensor_logs": fiber.Map{
			"today":             sStats.Today,
			"yesterday":         sStats.Yesterday,
			"total":             sStats.Total,
			"percentage_change": calculatePercentageChange(sStats.Yesterday, sStats.Today),
		},
		"raw_logs": fiber.Map{
			"today":             rStats.Today,
			"yesterday":         rStats.Yesterday,
			"total":             rStats.Total,
			"percentage_change": calculatePercentageChange(rStats.Yesterday, rStats.Today),
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

	var vehicleIDs []uint
	if !middleware.HasPermission(h.db, userID, "vehicles.read_all") {
		ids, err := h.vehicleRepo.GetVehicleIDsByUserID(userID)
		if err != nil {
			ids = []uint{}
		}
		vehicleIDs = ids
	}

	now := time.Now()
	start := now.Add(-24 * time.Hour)
	start = time.Date(start.Year(), start.Month(), start.Day(), start.Hour(), 0, 0, 0, start.Location())

	// Single query per table with GROUP BY hour (3 queries total instead of 72)
	type hourCount struct {
		Hour  time.Time
		Count int64
	}

	queryHourly := func(table string) map[string]int64 {
		var rows []hourCount
		q := h.db.Table(table).
			Select("date_trunc('hour', created_at) as hour, COUNT(*) as count").
			Where("created_at >= ?", start).
			Group("hour").Order("hour")

		if len(vehicleIDs) > 0 {
			q = q.Where("vehicle_id IN ?", vehicleIDs)
		}
		q.Scan(&rows)

		m := make(map[string]int64, len(rows))
		for _, r := range rows {
			m[r.Hour.Format("15:04")] = r.Count
		}
		return m
	}

	vehicleCounts := queryHourly("vehicle_logs")
	sensorCounts := queryHourly("sensor_logs")

	var rawCounts map[string]int64
	if h.rawLogsEnabled {
		rawCounts = queryHourly("raw_logs")
	} else {
		rawCounts = make(map[string]int64)
	}

	// Build chart data for last 24 hours
	chartData := make([]map[string]interface{}, 0, 24)
	for i := 23; i >= 0; i-- {
		hourStart := now.Add(-time.Duration(i) * time.Hour)
		hourStart = time.Date(hourStart.Year(), hourStart.Month(), hourStart.Day(), hourStart.Hour(), 0, 0, 0, hourStart.Location())
		key := hourStart.Format("15:04")

		chartData = append(chartData, map[string]interface{}{
			"time":         key,
			"vehicle_logs": vehicleCounts[key],
			"sensor_logs":  sensorCounts[key],
			"raw_logs":     rawCounts[key],
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

