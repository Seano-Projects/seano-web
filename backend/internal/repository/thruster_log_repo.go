package repository

import (
	"go-fiber-pgsql/internal/model"
	"strings"
	"time"

	"gorm.io/gorm"
)

type ThrusterLogRepository struct {
	db *gorm.DB
}

func NewThrusterLogRepository(db *gorm.DB) *ThrusterLogRepository {
	return &ThrusterLogRepository{db: db}
}

func (r *ThrusterLogRepository) CreateThrusterLog(log *model.ThrusterLog) error {
	return r.db.Create(log).Error
}

func (r *ThrusterLogRepository) GetThrusterLogs(query model.ThrusterLogQuery) ([]model.ThrusterLog, error) {
	var logs []model.ThrusterLog

	db := r.db.Model(&model.ThrusterLog{}).Preload("Vehicle")

	if len(query.VehicleIDs) > 0 {
		db = db.Where("vehicle_id IN ?", query.VehicleIDs)
	} else if query.VehicleID != 0 {
		db = db.Where("vehicle_id = ?", query.VehicleID)
	}
	if query.VehicleCode != "" {
		db = db.Where("vehicle_code = ?", query.VehicleCode)
	}
	if query.Event != "" {
		db = db.Where("event = ?", strings.ToUpper(query.Event))
	}
	if !query.StartTime.IsZero() {
		db = db.Where("initiated_at >= ?", query.StartTime)
	}
	if !query.EndTime.IsZero() {
		db = db.Where("initiated_at <= ?", query.EndTime)
	}
	if query.Limit > 0 {
		db = db.Limit(query.Limit)
	} else {
		db = db.Limit(500)
	}
	if query.Offset > 0 {
		db = db.Offset(query.Offset)
	}

	orderClause := "initiated_at DESC"
	if strings.ToLower(query.Order) == "asc" {
		orderClause = "initiated_at ASC"
	}

	err := db.Order(orderClause).Find(&logs).Error
	return logs, err
}

func (r *ThrusterLogRepository) GetThrusterLogByID(id uint) (*model.ThrusterLog, error) {
	var log model.ThrusterLog
	err := r.db.Preload("Vehicle").First(&log, id).Error
	if err != nil {
		return nil, err
	}
	return &log, nil
}

func (r *ThrusterLogRepository) DeleteThrusterLog(id uint) error {
	return r.db.Delete(&model.ThrusterLog{}, id).Error
}

func (r *ThrusterLogRepository) CountThrusterLogs(query model.ThrusterLogQuery) (int64, error) {
	var count int64
	db := r.db.Model(&model.ThrusterLog{})
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

func (r *ThrusterLogRepository) GetYesterdayThrusterLogCount(vehicleID uint) (int64, error) {
	var count int64
	yesterday := time.Now().AddDate(0, 0, -1)
	startOfYesterday := time.Date(yesterday.Year(), yesterday.Month(), yesterday.Day(), 0, 0, 0, 0, yesterday.Location())
	endOfYesterday := startOfYesterday.Add(24 * time.Hour)

	db := r.db.Model(&model.ThrusterLog{}).
		Where("initiated_at >= ? AND initiated_at < ?", startOfYesterday, endOfYesterday)
	if vehicleID != 0 {
		db = db.Where("vehicle_id = ?", vehicleID)
	}
	err := db.Count(&count).Error
	return count, err
}
