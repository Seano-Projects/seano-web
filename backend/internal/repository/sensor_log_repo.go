package repository

import (
	"go-fiber-pgsql/internal/model"
	"time"

	"gorm.io/gorm"
)

type SensorLogRepository struct {
	db *gorm.DB
}

func NewSensorLogRepository(db *gorm.DB) *SensorLogRepository {
	return &SensorLogRepository{db: db}
}

// CreateSensorLog saves a new sensor log entry
func (r *SensorLogRepository) CreateSensorLog(log *model.SensorLog) error {
	return r.db.Create(log).Error
}

// GetSensorLogs retrieves sensor logs with filters
func (r *SensorLogRepository) GetSensorLogs(query model.SensorLogQuery) ([]model.SensorLog, error) {
	var logs []model.SensorLog
	
	db := r.db.Model(&model.SensorLog{}).Preload("Vehicle").Preload("Sensor").Preload("Sensor.SensorType")
	
	if len(query.VehicleIDs) > 0 {
		db = db.Where("vehicle_id IN ?", query.VehicleIDs)
	} else if query.VehicleID != 0 {
		db = db.Where("vehicle_id = ?", query.VehicleID)
	}
	
	if query.SensorID != 0 {
		db = db.Where("sensor_id = ?", query.SensorID)
	}

	if query.MissionID != 0 {
		db = db.Where("mission_id = ?", query.MissionID)
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
	
	err := db.Order("created_at ASC").Find(&logs).Error
	return logs, err
}

// GetSensorLogByID retrieves a sensor log by ID
func (r *SensorLogRepository) GetSensorLogByID(id uint) (*model.SensorLog, error) {
	var log model.SensorLog
	err := r.db.Preload("Vehicle").Preload("Sensor").Preload("Sensor.SensorType").First(&log, id).Error
	if err != nil {
		return nil, err
	}
	return &log, nil
}

// GetLatestLog retrieves the latest log for a specific vehicle and sensor
func (r *SensorLogRepository) GetLatestLog(vehicleID, sensorID uint) (*model.SensorLog, error) {
	var log model.SensorLog
	err := r.db.Where("vehicle_id = ? AND sensor_id = ?", vehicleID, sensorID).
		Order("created_at DESC").
		Preload("Vehicle").Preload("Sensor").Preload("Sensor.SensorType").
		First(&log).Error
	
	if err != nil {
		return nil, err
	}
	
	return &log, nil
}

// CountLogs returns the count of logs matching the query
func (r *SensorLogRepository) CountLogs(query model.SensorLogQuery) (int64, error) {
	var count int64
	
	db := r.db.Model(&model.SensorLog{})
	
	if len(query.VehicleIDs) > 0 {
		db = db.Where("vehicle_id IN ?", query.VehicleIDs)
	} else if query.VehicleID != 0 {
		db = db.Where("vehicle_id = ?", query.VehicleID)
	}
	
	if query.SensorID != 0 {
		db = db.Where("sensor_id = ?", query.SensorID)
	}

	if query.MissionID != 0 {
		db = db.Where("mission_id = ?", query.MissionID)
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

// DeleteSensorLog deletes a sensor log by ID
func (r *SensorLogRepository) DeleteSensorLog(id uint) error {
	return r.db.Delete(&model.SensorLog{}, id).Error
}

// DeleteOldLogs deletes logs older than the specified date
func (r *SensorLogRepository) DeleteOldLogs(beforeDate time.Time) (int64, error) {
	result := r.db.Where("created_at < ?", beforeDate).Delete(&model.SensorLog{})
	return result.RowsAffected, result.Error
}
