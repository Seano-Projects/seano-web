package repository

import (
	"go-fiber-pgsql/internal/model"
	"time"

	"gorm.io/gorm"
)

type AlertRepository struct {
	db *gorm.DB
}

func NewAlertRepository(db *gorm.DB) *AlertRepository {
	return &AlertRepository{db: db}
}

// CreateAlert saves a new alert entry
func (r *AlertRepository) CreateAlert(alert *model.Alert) error {
	return r.db.Create(alert).Error
}

// GetAlerts retrieves alerts with filters
func (r *AlertRepository) GetAlerts(query model.AlertQuery) ([]model.AlertResponse, error) {
	var alerts []model.Alert

	db := r.db.Model(&model.Alert{}).Preload("Vehicle").Preload("Sensor")

	if len(query.VehicleIDs) > 0 {
		db = db.Where("vehicle_id IN ?", query.VehicleIDs)
	} else if query.VehicleID != nil {
		db = db.Where("vehicle_id = ?", *query.VehicleID)
	}

	if query.SensorID != nil {
		db = db.Where("sensor_id = ?", *query.SensorID)
	}

	if query.Severity != "" {
		db = db.Where("severity = ?", query.Severity)
	}

	if query.AlertType != "" {
		db = db.Where("alert_type = ?", query.AlertType)
	}

	if query.Acknowledged != nil {
		db = db.Where("acknowledged = ?", *query.Acknowledged)
	}

	if !query.StartTime.IsZero() {
		db = db.Where("created_at >= ?", query.StartTime)
	}

	if !query.EndTime.IsZero() {
		db = db.Where("created_at <= ?", query.EndTime)
	}

	if query.Limit > 0 {
		db = db.Limit(query.Limit)
	} else {
		db = db.Limit(100) // Default limit
	}

	if query.Offset > 0 {
		db = db.Offset(query.Offset)
	}

	err := db.Order("created_at DESC").Find(&alerts).Error
	if err != nil {
		return nil, err
	}

	// Convert to response format
	var responses []model.AlertResponse
	for _, alert := range alerts {
		response := model.AlertResponse{
			ID:           alert.ID,
			VehicleID:    alert.VehicleID,
			VehicleName:  "",
			SensorID:     alert.SensorID,
			SensorName:   nil,
			Severity:     alert.Severity,
			AlertType:    alert.AlertType,
			Message:      alert.Message,
			Latitude:     alert.Latitude,
			Longitude:    alert.Longitude,
			Acknowledged: alert.Acknowledged,
			Source:       alert.Source,
			Timestamp:    alert.CreatedAt,
			CreatedAt:    alert.CreatedAt,
			UpdatedAt:    alert.UpdatedAt,
		}

		// Add vehicle name if loaded
		if alert.Vehicle != nil {
			response.VehicleName = alert.Vehicle.Name
		}

		// Add sensor name if loaded
		if alert.Sensor != nil {
			sensorName := alert.Sensor.Model
			response.SensorName = &sensorName
		}

		responses = append(responses, response)
	}

	return responses, nil
}

// GetAlertByID retrieves an alert by ID
func (r *AlertRepository) GetAlertByID(id uint) (*model.Alert, error) {
	var alert model.Alert
	err := r.db.Preload("Vehicle").Preload("Sensor").First(&alert, id).Error
	if err != nil {
		return nil, err
	}
	return &alert, nil
}

// UpdateAlert updates an existing alert
func (r *AlertRepository) UpdateAlert(id uint, updates map[string]interface{}) error {
	return r.db.Model(&model.Alert{}).Where("id = ?", id).Updates(updates).Error
}

// AcknowledgeAlert marks an alert as acknowledged
func (r *AlertRepository) AcknowledgeAlert(id uint) error {
	return r.db.Model(&model.Alert{}).Where("id = ?", id).Update("acknowledged", true).Error
}

// DeleteAlert deletes an alert by ID
func (r *AlertRepository) DeleteAlert(id uint) error {
	return r.db.Delete(&model.Alert{}, id).Error
}

// ClearAllAlerts deletes all alerts (or only acknowledged ones)
func (r *AlertRepository) ClearAllAlerts(acknowledgedOnly bool) error {
	db := r.db
	if acknowledgedOnly {
		db = db.Where("acknowledged = ?", true)
	} else {
		db = db.Where("1 = 1")
	}
	return db.Delete(&model.Alert{}).Error
}

// GetAlertStats returns statistics about alerts
func (r *AlertRepository) GetAlertStats(query model.AlertQuery) (*model.AlertStats, error) {
	var stats model.AlertStats
	baseQuery := query
	baseQuery.Severity = ""

	// Total alerts
	total, err := r.CountAlerts(baseQuery)
	if err != nil {
		return nil, err
	}
	stats.Total = total

	// Critical alerts
	criticalQuery := baseQuery
	criticalQuery.Severity = "critical"
	criticalCount, err := r.CountAlerts(criticalQuery)
	if err != nil {
		return nil, err
	}
	stats.Critical = criticalCount

	// Warning alerts
	warningQuery := baseQuery
	warningQuery.Severity = "warning"
	warningCount, err := r.CountAlerts(warningQuery)
	if err != nil {
		return nil, err
	}
	stats.Warning = warningCount

	// Info alerts
	infoQuery := baseQuery
	infoQuery.Severity = "info"
	infoCount, err := r.CountAlerts(infoQuery)
	if err != nil {
		return nil, err
	}
	stats.Info = infoCount

	return &stats, nil
}

// CountAlerts returns the count of alerts matching the query
func (r *AlertRepository) CountAlerts(query model.AlertQuery) (int64, error) {
	var count int64

	db := r.db.Model(&model.Alert{})

	if len(query.VehicleIDs) > 0 {
		db = db.Where("vehicle_id IN ?", query.VehicleIDs)
	} else if query.VehicleID != nil {
		db = db.Where("vehicle_id = ?", *query.VehicleID)
	}

	if query.SensorID != nil {
		db = db.Where("sensor_id = ?", *query.SensorID)
	}

	if query.Severity != "" {
		db = db.Where("severity = ?", query.Severity)
	}

	if query.AlertType != "" {
		db = db.Where("alert_type = ?", query.AlertType)
	}

	if query.Acknowledged != nil {
		db = db.Where("acknowledged = ?", *query.Acknowledged)
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

// GetRecentAlerts retrieves the most recent alerts (last 24 hours by default)
func (r *AlertRepository) GetRecentAlerts(limit int) ([]model.AlertResponse, error) {
	if limit <= 0 {
		limit = 10
	}

	query := model.AlertQuery{
		StartTime: time.Now().Add(-24 * time.Hour),
		Limit:     limit,
	}

	return r.GetAlerts(query)
}

// GetUnacknowledgedAlerts retrieves all unacknowledged alerts
func (r *AlertRepository) GetUnacknowledgedAlerts() ([]model.AlertResponse, error) {
	acknowledged := false
	query := model.AlertQuery{
		Acknowledged: &acknowledged,
		Limit:        100,
	}

	return r.GetAlerts(query)
}
