package repository

import (
	"go-fiber-pgsql/internal/model"
	"time"

	"gorm.io/gorm"
)

type LatencyAckRepository struct {
	db *gorm.DB
}

func NewLatencyAckRepository(db *gorm.DB) *LatencyAckRepository {
	return &LatencyAckRepository{db: db}
}

func (r *LatencyAckRepository) Create(ack *model.LatencyAck) error {
	return r.db.Create(ack).Error
}

// GetForExport returns completed latency ack records (ws_received_at IS NOT NULL) for CSV export.
func (r *LatencyAckRepository) GetForExport(q model.LatencyExportQuery) ([]model.LatencyAck, error) {
	var rows []model.LatencyAck
	limit := q.Limit
	if limit <= 0 {
		limit = 5000
	}
	db := r.db.Where("log_type = ?", q.LogType)
	if q.VehicleID != 0 {
		db = db.Where("vehicle_id = ?", q.VehicleID)
	}
	if q.SensorID != nil {
		db = db.Where("sensor_id = ?", *q.SensorID)
	}
	if !q.StartTime.IsZero() {
		db = db.Where("created_at >= ?", q.StartTime)
	}
	if !q.EndTime.IsZero() {
		db = db.Where("created_at <= ?", q.EndTime)
	}
	return rows, db.Order("created_at ASC").Limit(limit).Find(&rows).Error
}

// GetByLogType returns latency acks for a given log type and optional vehicle/sensor filter.
func (r *LatencyAckRepository) GetByLogType(logType string, vehicleID uint, sensorID *uint, start, end time.Time, limit int) ([]model.LatencyAck, error) {
	var acks []model.LatencyAck
	db := r.db.Where("log_type = ?", logType)
	if vehicleID != 0 {
		db = db.Where("vehicle_id = ?", vehicleID)
	}
	if sensorID != nil {
		db = db.Where("sensor_id = ?", *sensorID)
	}
	if !start.IsZero() {
		db = db.Where("created_at >= ?", start)
	}
	if !end.IsZero() {
		db = db.Where("created_at <= ?", end)
	}
	if limit <= 0 {
		limit = 1000
	}
	return acks, db.Order("created_at DESC").Limit(limit).Find(&acks).Error
}

// UpdateWsReceived sets ws_received_at on the latency_ack matching logType and logID.
// Uses GREATEST to ensure ws_received_at is never earlier than ws_sent_at,
// which is physically impossible and indicates browser clock skew.
func (r *LatencyAckRepository) UpdateWsReceived(logType string, logID uint, wsReceivedAt time.Time) error {
	return r.db.Exec(
		`UPDATE latency_acks
		 SET ws_received_at = GREATEST($1::timestamptz, COALESCE(ws_sent_at, $1::timestamptz))
		 WHERE log_type = $2 AND log_id = $3`,
		wsReceivedAt, logType, logID,
	).Error
}

// UpdateCommandAck sets usv_ack_at, ack_received_at, and ws_sent_at on the latency_ack for a command log.
func (r *LatencyAckRepository) UpdateCommandAck(logID uint, usvAckAt *time.Time, ackReceivedAt time.Time, wsSentAt time.Time) error {
	return r.db.Model(&model.LatencyAck{}).
		Where("log_type = ? AND log_id = ?", "command", logID).
		Updates(map[string]interface{}{
			"usv_ack_at":      usvAckAt,
			"ack_received_at": ackReceivedAt,
			"ws_sent_at":      wsSentAt,
		}).Error
}

// UpdateMqttPublishedAt sets mqtt_published_at on the latency_ack for a given log type and log ID.
func (r *LatencyAckRepository) UpdateMqttPublishedAt(logType string, logID uint, mqttPublishedAt time.Time) error {
	return r.db.Model(&model.LatencyAck{}).
		Where("log_type = ? AND log_id = ?", logType, logID).
		Update("mqtt_published_at", mqttPublishedAt).Error
}

// UpdateAckTiming sets ack_received_at and ws_sent_at on the latency_ack for any log type.
func (r *LatencyAckRepository) UpdateAckTiming(logType string, logID uint, ackReceivedAt time.Time, wsSentAt time.Time) error {
	return r.db.Model(&model.LatencyAck{}).
		Where("log_type = ? AND log_id = ?", logType, logID).
		Updates(map[string]interface{}{
			"ack_received_at": ackReceivedAt,
			"ws_sent_at":      wsSentAt,
		}).Error
}

// UpdateAckTimingFull sets usv_ack_at, ack_received_at, and ws_sent_at on the latency_ack.
// usvAckAt is the timestamp from the USV payload (nil if not provided).
func (r *LatencyAckRepository) UpdateAckTimingFull(logType string, logID uint, usvAckAt *time.Time, ackReceivedAt time.Time, wsSentAt time.Time) error {
	return r.db.Model(&model.LatencyAck{}).
		Where("log_type = ? AND log_id = ?", logType, logID).
		Updates(map[string]interface{}{
			"usv_ack_at":      usvAckAt,
			"ack_received_at": ackReceivedAt,
			"ws_sent_at":      wsSentAt,
		}).Error
}

func (r *LatencyAckRepository) Delete(id uint) error {
	return r.db.Delete(&model.LatencyAck{}, id).Error
}
