package repository

import (
	"go-fiber-pgsql/internal/model"
	"strings"
	"time"

	"gorm.io/gorm"
)

type VehicleLogRepository struct {
	db *gorm.DB
}

func NewVehicleLogRepository(db *gorm.DB) *VehicleLogRepository {
	return &VehicleLogRepository{db: db}
}

// CreateVehicleLog saves a new vehicle log entry
func (r *VehicleLogRepository) CreateVehicleLog(log *model.VehicleLog) error {
	return r.db.Create(log).Error
}

// ExistsByVehicleAndUsvTimestamp checks whether a vehicle log with the same
// vehicle_id and usv_timestamp already exists. Used to deduplicate messages
// that may be re-delivered on MQTT QoS-1 reconnect.
func (r *VehicleLogRepository) ExistsByVehicleAndUsvTimestamp(vehicleID uint, usvTimestamp time.Time) (bool, error) {
	var count int64
	err := r.db.Model(&model.VehicleLog{}).
		Where("vehicle_id = ? AND usv_timestamp = ?", vehicleID, usvTimestamp).
		Count(&count).Error
	return count > 0, err
}

// GetVehicleLogs retrieves vehicle logs with filters
func (r *VehicleLogRepository) GetVehicleLogs(query model.VehicleLogQuery) ([]model.VehicleLog, error) {
	var logs []model.VehicleLog
	
	db := r.db.Model(&model.VehicleLog{}).Preload("Vehicle")
	
	if len(query.VehicleIDs) > 0 {
		db = db.Where("vehicle_id IN ?", query.VehicleIDs)
	} else if query.VehicleID != 0 {
		db = db.Where("vehicle_id = ?", query.VehicleID)
	}

	if query.MissionID != 0 {
		db = db.Where("mission_id = ?", query.MissionID)
	}

	if query.MissionCode != "" {
		db = db.Where("mission_code = ?", query.MissionCode)
	}

	if !query.StartTime.IsZero() {
		db = db.Where("created_at >= ?", query.StartTime)
	}

	if !query.EndTime.IsZero() {
		db = db.Where("created_at <= ?", query.EndTime)
	}

	// Default limit cap to prevent unbounded queries
	limit := query.Limit
	if limit <= 0 {
		limit = 500
	} else if limit > 10000 {
		limit = 10000
	}
	db = db.Limit(limit)

	if query.Offset > 0 {
		db = db.Offset(query.Offset)
	}

	orderClause := "created_at DESC"
	if strings.ToLower(query.Order) == "asc" {
		orderClause = "created_at ASC"
	}

	err := db.Order(orderClause).Find(&logs).Error
	return logs, err
}

// GetVehicleLogByID retrieves a vehicle log by ID
func (r *VehicleLogRepository) GetVehicleLogByID(id uint) (*model.VehicleLog, error) {
	var log model.VehicleLog
	err := r.db.Preload("Vehicle").First(&log, id).Error
	if err != nil {
		return nil, err
	}
	return &log, nil
}

// GetLatestLogByVehicle retrieves the latest log for a specific vehicle
func (r *VehicleLogRepository) GetLatestLogByVehicle(vehicleID uint) (*model.VehicleLog, error) {
	var log model.VehicleLog
	err := r.db.Where("vehicle_id = ?", vehicleID).
		Order("created_at DESC").
		Preload("Vehicle").
		First(&log).Error
	
	if err != nil {
		return nil, err
	}
	
	return &log, nil
}

// CountLogs returns the count of logs matching the query
func (r *VehicleLogRepository) CountLogs(query model.VehicleLogQuery) (int64, error) {
	var count int64
	
	db := r.db.Model(&model.VehicleLog{})
	
	if len(query.VehicleIDs) > 0 {
		db = db.Where("vehicle_id IN ?", query.VehicleIDs)
	} else if query.VehicleID != 0 {
		db = db.Where("vehicle_id = ?", query.VehicleID)
	}

	if query.MissionID != 0 {
		db = db.Where("mission_id = ?", query.MissionID)
	}

	if query.MissionCode != "" {
		db = db.Where("mission_code = ?", query.MissionCode)
	}
	
	if !query.StartTime.IsZero() {
		db = db.Where("created_at >= ?", query.StartTime)
	}
	
	if !query.EndTime.IsZero() {
		db = db.Where("created_at <= ?", query.EndTime)
	}
	
	err := db.Count(&count).Error
	return count, err
}

// GetMissionTelemetryStats computes first/last ping, avg/max speed, and
// battery usage for a mission entirely in SQL, so callers don't need to
// download every row (a mission running for hours/days can have far more
// rows than any sane fetch limit) just to derive these aggregate figures.
//
// completedAt, when non-nil, caps the window at the mission's end_time —
// telemetry keeps getting tagged with the same mission_id while the vehicle
// transits/loiters home after completion, and that post-completion idling
// would otherwise skew last-ping/avg-speed/battery figures.
func (r *VehicleLogRepository) GetMissionTelemetryStats(missionID uint, completedAt *time.Time) (*model.MissionTelemetryStats, error) {
	type aggRow struct {
		Count    int64
		FirstAt  *time.Time
		LastAt   *time.Time
		AvgSpeed *float64
		MaxSpeed *float64
	}

	scoped := func(db *gorm.DB) *gorm.DB {
		db = db.Where("mission_id = ?", missionID)
		if completedAt != nil {
			db = db.Where("created_at <= ?", completedAt)
		}
		return db
	}

	var agg aggRow
	err := scoped(r.db.Model(&model.VehicleLog{})).
		Select(
			"COUNT(*) AS count, " +
				"MIN(created_at) AS first_at, " +
				"MAX(created_at) AS last_at, " +
				"AVG(speed) FILTER (WHERE speed > 0) AS avg_speed, " +
				"MAX(speed) AS max_speed",
		).
		Scan(&agg).Error
	if err != nil {
		return nil, err
	}

	stats := &model.MissionTelemetryStats{
		SampleCount: agg.Count,
		FirstPingAt: agg.FirstAt,
		LastPingAt:  agg.LastAt,
		AvgSpeed:    agg.AvgSpeed,
		MaxSpeed:    agg.MaxSpeed,
	}

	if agg.Count == 0 {
		return stats, nil
	}

	var firstLog, lastLog model.VehicleLog
	if err := scoped(r.db).
		Order("created_at ASC").
		Select("battery_percentage").
		First(&firstLog).Error; err == nil {
		stats.BatteryStart = firstLog.BatteryPercentage
	}

	if err := scoped(r.db).
		Order("created_at DESC").
		Select("battery_percentage").
		First(&lastLog).Error; err == nil {
		stats.BatteryEnd = lastLog.BatteryPercentage
	}

	return stats, nil
}

// GetMissionTelemetryStatsBatch computes the same aggregate figures as
// GetMissionTelemetryStats but for many missions in a fixed number of
// queries (not one per mission), so a list page showing dozens of missions
// doesn't turn into an N+1 query storm just to fill in duration/energy
// columns. Each mission's own end_time still caps its window via a join.
func (r *VehicleLogRepository) GetMissionTelemetryStatsBatch(missionIDs []uint) (map[uint]*model.MissionTelemetryStats, error) {
	result := make(map[uint]*model.MissionTelemetryStats)
	if len(missionIDs) == 0 {
		return result, nil
	}

	type aggRow struct {
		MissionID uint
		Count     int64
		FirstAt   *time.Time
		LastAt    *time.Time
		AvgSpeed  *float64
		MaxSpeed  *float64
	}

	var aggRows []aggRow
	err := r.db.Raw(`
		SELECT vl.mission_id AS mission_id,
			COUNT(*) AS count,
			MIN(vl.created_at) AS first_at,
			MAX(vl.created_at) AS last_at,
			AVG(vl.speed) FILTER (WHERE vl.speed > 0) AS avg_speed,
			MAX(vl.speed) AS max_speed
		FROM vehicle_logs vl
		JOIN missions m ON m.id = vl.mission_id
		WHERE vl.mission_id IN ?
			AND (m.end_time IS NULL OR vl.created_at <= m.end_time)
		GROUP BY vl.mission_id
	`, missionIDs).Scan(&aggRows).Error
	if err != nil {
		return nil, err
	}

	for _, row := range aggRows {
		result[row.MissionID] = &model.MissionTelemetryStats{
			SampleCount: row.Count,
			FirstPingAt: row.FirstAt,
			LastPingAt:  row.LastAt,
			AvgSpeed:    row.AvgSpeed,
			MaxSpeed:    row.MaxSpeed,
		}
	}

	type batteryRow struct {
		MissionID         uint
		BatteryPercentage *float64
	}

	var firstBattery []batteryRow
	if err := r.db.Raw(`
		SELECT DISTINCT ON (vl.mission_id) vl.mission_id AS mission_id, vl.battery_percentage
		FROM vehicle_logs vl
		JOIN missions m ON m.id = vl.mission_id
		WHERE vl.mission_id IN ?
			AND (m.end_time IS NULL OR vl.created_at <= m.end_time)
		ORDER BY vl.mission_id, vl.created_at ASC
	`, missionIDs).Scan(&firstBattery).Error; err == nil {
		for _, row := range firstBattery {
			if stats, ok := result[row.MissionID]; ok {
				stats.BatteryStart = row.BatteryPercentage
			}
		}
	}

	var lastBattery []batteryRow
	if err := r.db.Raw(`
		SELECT DISTINCT ON (vl.mission_id) vl.mission_id AS mission_id, vl.battery_percentage
		FROM vehicle_logs vl
		JOIN missions m ON m.id = vl.mission_id
		WHERE vl.mission_id IN ?
			AND (m.end_time IS NULL OR vl.created_at <= m.end_time)
		ORDER BY vl.mission_id, vl.created_at DESC
	`, missionIDs).Scan(&lastBattery).Error; err == nil {
		for _, row := range lastBattery {
			if stats, ok := result[row.MissionID]; ok {
				stats.BatteryEnd = row.BatteryPercentage
			}
		}
	}

	return result, nil
}

// GetMissionTrajectoryPoints returns a downsampled set of GPS points for a
// mission's actual route, so drawing the trajectory on a map never requires
// fetching every ping — a mission running for hours/days can have far more
// rows than a map polyline needs to look right. First and last points are
// always included so the route's start/end stay accurate; everything in
// between is decimated evenly via a window-function stride.
//
// completedAt, when non-nil, caps the window at the mission's end_time so
// post-completion transit/loitering near home (still tagged with the same
// mission_id) doesn't tangle the drawn route with station-keeping GPS jitter.
func (r *VehicleLogRepository) GetMissionTrajectoryPoints(missionID uint, maxPoints int, completedAt *time.Time) ([]model.VehicleLog, error) {
	if maxPoints <= 0 {
		maxPoints = 2000
	}

	var logs []model.VehicleLog
	err := r.db.Raw(`
		WITH ordered AS (
			SELECT *,
				ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rn,
				COUNT(*) OVER () AS total
			FROM vehicle_logs
			WHERE mission_id = ?
				AND latitude IS NOT NULL
				AND longitude IS NOT NULL
				AND (?::timestamptz IS NULL OR created_at <= ?::timestamptz)
		)
		SELECT * FROM ordered
		WHERE total <= ?
			OR rn = 1
			OR rn = total
			OR rn % GREATEST(1, total / ?) = 0
		ORDER BY created_at ASC
	`, missionID, completedAt, completedAt, maxPoints, maxPoints).Scan(&logs).Error

	return logs, err
}

// DeleteVehicleLog deletes a vehicle log by ID
func (r *VehicleLogRepository) DeleteVehicleLog(id uint) error {
	return r.db.Delete(&model.VehicleLog{}, id).Error
}

// DeleteOldLogs deletes logs older than the specified date
func (r *VehicleLogRepository) DeleteOldLogs(beforeDate time.Time) (int64, error) {
	result := r.db.Where("created_at < ?", beforeDate).Delete(&model.VehicleLog{})
	return result.RowsAffected, result.Error
}

