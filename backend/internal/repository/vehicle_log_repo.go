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

// UpdateWSSentAt stores backend websocket send time for a vehicle log
func (r *VehicleLogRepository) UpdateWSSentAt(id uint, wsSentAt time.Time) error {
	return r.db.Model(&model.VehicleLog{}).
		Where("id = ?", id).
		Update("ws_sent_at", wsSentAt).Error
}

// UpdateWSReceivedAt stores frontend websocket receive time for a vehicle log.
// Keeps the earliest receive timestamp when multiple clients report the same log.
func (r *VehicleLogRepository) UpdateWSReceivedAt(id uint, wsReceivedAt time.Time) error {
	return r.db.Model(&model.VehicleLog{}).
		Where("id = ? AND (ws_received_at IS NULL OR ws_received_at > ?)", id, wsReceivedAt).
		Update("ws_received_at", wsReceivedAt).Error
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

	if query.Limit > 0 {
		db = db.Limit(query.Limit)
	}

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

// DeleteVehicleLog deletes a vehicle log by ID
func (r *VehicleLogRepository) DeleteVehicleLog(id uint) error {
	return r.db.Delete(&model.VehicleLog{}, id).Error
}

// DeleteOldLogs deletes logs older than the specified date
func (r *VehicleLogRepository) DeleteOldLogs(beforeDate time.Time) (int64, error) {
	result := r.db.Where("created_at < ?", beforeDate).Delete(&model.VehicleLog{})
	return result.RowsAffected, result.Error
}

