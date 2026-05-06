package repository

import (
	"go-fiber-pgsql/internal/model"
	"strings"
	"time"

	"gorm.io/gorm"
)

type CommandLogRepository struct {
	db *gorm.DB
}

func NewCommandLogRepository(db *gorm.DB) *CommandLogRepository {
	return &CommandLogRepository{db: db}
}

func (r *CommandLogRepository) CreateCommandLog(log *model.CommandLog) error {
	return r.db.Create(log).Error
}

func (r *CommandLogRepository) UpdateCommandLogPublishedAtByRequestID(requestID string, publishedAt time.Time) error {
	return r.db.Model(&model.CommandLog{}).
		Where("request_id = ?", requestID).
		Updates(map[string]interface{}{
			"mqtt_published_at": publishedAt,
		}).Error
}

func (r *CommandLogRepository) GetCommandLogs(query model.CommandLogQuery) ([]model.CommandLog, error) {
	var logs []model.CommandLog

	db := r.db.Model(&model.CommandLog{}).Preload("Vehicle")

	if len(query.VehicleIDs) > 0 {
		db = db.Where("vehicle_id IN ?", query.VehicleIDs)
	} else if query.VehicleID != 0 {
		db = db.Where("vehicle_id = ?", query.VehicleID)
	}
	if query.VehicleCode != "" {
		db = db.Where("vehicle_code = ?", query.VehicleCode)
	}
	if query.Command != "" {
		db = db.Where("command = ?", query.Command)
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

	orderClause := "initiated_at DESC"
	if strings.ToLower(query.Order) == "asc" {
		orderClause = "initiated_at ASC"
	}

	err := db.Order(orderClause).Find(&logs).Error
	return logs, err
}

func (r *CommandLogRepository) GetCommandLogByID(id uint) (*model.CommandLog, error) {
	var log model.CommandLog
	err := r.db.Preload("Vehicle").First(&log, id).Error
	if err != nil {
		return nil, err
	}
	return &log, nil
}

func (r *CommandLogRepository) GetPendingCommandLogs(vehicleID uint, vehicleCode string, limit int) ([]model.CommandLog, error) {
	var logs []model.CommandLog

	if limit <= 0 {
		limit = 1
	}

	db := r.db.Model(&model.CommandLog{}).Where("status = ?", "pending")
	if vehicleID != 0 {
		db = db.Where("vehicle_id = ?", vehicleID)
	}
	if vehicleCode != "" {
		db = db.Where("vehicle_code = ?", vehicleCode)
	}

	err := db.Order("initiated_at DESC").Limit(limit).Find(&logs).Error
	return logs, err
}

func (r *CommandLogRepository) DeleteCommandLog(id uint) error {
	return r.db.Delete(&model.CommandLog{}, id).Error
}

func (r *CommandLogRepository) CountCommandLogs(query model.CommandLogQuery) (int64, error) {
	var count int64
	db := r.db.Model(&model.CommandLog{})
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

func (r *CommandLogRepository) GetYesterdayCommandLogCount(vehicleID uint) (int64, error) {
	var count int64
	yesterday := time.Now().AddDate(0, 0, -1)
	startOfYesterday := time.Date(yesterday.Year(), yesterday.Month(), yesterday.Day(), 0, 0, 0, 0, yesterday.Location())
	endOfYesterday := startOfYesterday.Add(24 * time.Hour)

	db := r.db.Model(&model.CommandLog{}).
		Where("initiated_at >= ? AND initiated_at < ?", startOfYesterday, endOfYesterday)
	if vehicleID != 0 {
		db = db.Where("vehicle_id = ?", vehicleID)
	}
	err := db.Count(&count).Error
	return count, err
}

func (r *CommandLogRepository) UpdateLatestPendingCommandLog(vehicleCode, requestID, command, status, message string, usvAckAt *time.Time, ackReceivedAt, resolvedAt time.Time) (*model.CommandLog, error) {
	var log model.CommandLog
	query := r.db.Model(&model.CommandLog{}).Where("vehicle_code = ? AND status = ?", vehicleCode, "pending")
	if requestID != "" {
		query = query.Where("request_id = ?", requestID)
	}
	if command != "" {
		query = query.Where("command = ?", command)
	}

	if err := query.Order("initiated_at DESC").First(&log).Error; err != nil {
		return nil, err
	}

	updates := map[string]interface{}{
		"status":          status,
		"message":         message,
		"usv_ack_at":      usvAckAt,
		"ack_received_at": ackReceivedAt,
		"resolved_at":     resolvedAt,
	}

	if err := r.db.Model(&model.CommandLog{}).Where("id = ?", log.ID).Updates(updates).Error; err != nil {
		return nil, err
	}

	log.Status = status
	log.Message = message
	log.UsvAckAt = usvAckAt
	log.AckReceivedAt = &ackReceivedAt
	log.ResolvedAt = &resolvedAt
	return &log, nil
}

func (r *CommandLogRepository) UpdateCommandLogWSSentAt(id uint, wsSentAt time.Time) error {
	return r.db.Model(&model.CommandLog{}).
		Where("id = ?", id).
		Update("ws_sent_at", wsSentAt).Error
}

func (r *CommandLogRepository) UpdateCommandLogWSReceivedAt(id uint, wsReceivedAt time.Time) error {
	return r.db.Model(&model.CommandLog{}).
		Where("id = ? AND (ws_received_at IS NULL OR ws_received_at > ?)", id, wsReceivedAt).
		Update("ws_received_at", wsReceivedAt).Error
}

func (r *CommandLogRepository) UpdateCommandLogStatusByID(id uint, status, message string, resolvedAt time.Time) error {
	updates := map[string]interface{}{
		"status":      status,
		"message":     message,
		"resolved_at": resolvedAt,
	}

	return r.db.Model(&model.CommandLog{}).Where("id = ?", id).Updates(updates).Error
}
