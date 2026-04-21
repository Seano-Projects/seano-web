package repository

import (
	"go-fiber-pgsql/internal/model"
	"time"

	"gorm.io/gorm"
)

type WaypointLogRepository struct {
	db *gorm.DB
}

func NewWaypointLogRepository(db *gorm.DB) *WaypointLogRepository {
	return &WaypointLogRepository{db: db}
}

func (r *WaypointLogRepository) CreateWaypointLog(log *model.WaypointLog) error {
	return r.db.Create(log).Error
}

func (r *WaypointLogRepository) GetWaypointLogs(query model.WaypointLogQuery) ([]model.WaypointLog, error) {
	var logs []model.WaypointLog

	db := r.db.Model(&model.WaypointLog{}).Preload("Vehicle")

	if len(query.VehicleIDs) > 0 {
		db = db.Where("vehicle_id IN ?", query.VehicleIDs)
	} else if query.VehicleID != 0 {
		db = db.Where("vehicle_id = ?", query.VehicleID)
	}
	if query.VehicleCode != "" {
		db = db.Where("vehicle_code = ?", query.VehicleCode)
	}
	if query.MissionID != 0 {
		db = db.Where("mission_id = ?", query.MissionID)
	}
	if query.Status != "" {
		db = db.Where("status = ?", query.Status)
	}
	if !query.StartTime.IsZero() {
		db = db.Where("initiated_at >= ?", query.StartTime)
	}
	if !query.EndTime.IsZero() {
		db = db.Where("initiated_at <= ?", query.EndTime)
	}
	if query.Limit > 0 {
		db = db.Limit(query.Limit)
	}
	if query.Offset > 0 {
		db = db.Offset(query.Offset)
	}

	err := db.Order("initiated_at DESC").Find(&logs).Error
	return logs, err
}

func (r *WaypointLogRepository) GetWaypointLogByID(id uint) (*model.WaypointLog, error) {
	var log model.WaypointLog
	err := r.db.Preload("Vehicle").First(&log, id).Error
	if err != nil {
		return nil, err
	}
	return &log, nil
}

func (r *WaypointLogRepository) GetPendingWaypointLogs(vehicleID uint, vehicleCode string, limit int) ([]model.WaypointLog, error) {
	var logs []model.WaypointLog

	if limit <= 0 {
		limit = 1
	}

	db := r.db.Model(&model.WaypointLog{}).Where("status = ?", "pending")
	if vehicleID != 0 {
		db = db.Where("vehicle_id = ?", vehicleID)
	}
	if vehicleCode != "" {
		db = db.Where("vehicle_code = ?", vehicleCode)
	}

	err := db.Order("initiated_at DESC").Limit(limit).Find(&logs).Error
	return logs, err
}

func (r *WaypointLogRepository) DeleteWaypointLog(id uint) error {
	return r.db.Delete(&model.WaypointLog{}, id).Error
}

func (r *WaypointLogRepository) UpdateLatestPendingWaypointLog(vehicleCode string, missionID *uint, status, message string, resolvedAt time.Time) (*model.WaypointLog, error) {
	var log model.WaypointLog
	query := r.db.Model(&model.WaypointLog{}).Where("vehicle_code = ? AND status = ?", vehicleCode, "pending")
	if missionID != nil {
		query = query.Where("mission_id = ?", *missionID)
	}

	if err := query.Order("initiated_at DESC").First(&log).Error; err != nil {
		return nil, err
	}

	updates := map[string]interface{}{
		"status":      status,
		"message":     message,
		"resolved_at": resolvedAt,
	}

	if err := r.db.Model(&model.WaypointLog{}).Where("id = ?", log.ID).Updates(updates).Error; err != nil {
		return nil, err
	}

	log.Status = status
	log.Message = message
	log.ResolvedAt = &resolvedAt
	return &log, nil
}

func (r *WaypointLogRepository) UpdateWaypointLogStatusByID(id uint, status, message string, resolvedAt time.Time) error {
	updates := map[string]interface{}{
		"status":      status,
		"message":     message,
		"resolved_at": resolvedAt,
	}

	return r.db.Model(&model.WaypointLog{}).Where("id = ?", id).Updates(updates).Error
}

func (r *WaypointLogRepository) CountWaypointLogs(query model.WaypointLogQuery) (int64, error) {
	var count int64
	db := r.db.Model(&model.WaypointLog{})
	if query.VehicleID != 0 {
		db = db.Where("vehicle_id = ?", query.VehicleID)
	}
	if !query.StartTime.IsZero() {
		db = db.Where("initiated_at >= ?", query.StartTime)
	}
	if !query.EndTime.IsZero() {
		db = db.Where("initiated_at <= ?", query.EndTime)
	}
	err := db.Count(&count).Error
	return count, err
}

func (r *WaypointLogRepository) GetYesterdayWaypointLogCount(vehicleID uint) (int64, error) {
	var count int64
	yesterday := time.Now().AddDate(0, 0, -1)
	startOfYesterday := time.Date(yesterday.Year(), yesterday.Month(), yesterday.Day(), 0, 0, 0, 0, yesterday.Location())
	endOfYesterday := startOfYesterday.Add(24 * time.Hour)

	db := r.db.Model(&model.WaypointLog{}).
		Where("initiated_at >= ? AND initiated_at < ?", startOfYesterday, endOfYesterday)
	if vehicleID != 0 {
		db = db.Where("vehicle_id = ?", vehicleID)
	}
	err := db.Count(&count).Error
	return count, err
}
