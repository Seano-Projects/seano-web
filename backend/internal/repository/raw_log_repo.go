package repository

import (
	"go-fiber-pgsql/internal/model"
	"os"
	"strconv"
	"time"

	"gorm.io/gorm"
)

type RawLogRepository struct {
	db *gorm.DB
}

func NewRawLogRepository(db *gorm.DB) *RawLogRepository {
	return &RawLogRepository{db: db}
}

// CreateRawLog saves a new raw log entry
func (r *RawLogRepository) CreateRawLog(log *model.RawLog) error {
	return r.db.Create(log).Error
}

// GetRawLogs retrieves raw logs with filters
func (r *RawLogRepository) GetRawLogs(query model.RawLogQuery) ([]model.RawLog, error) {
	var logs []model.RawLog
	
	db := r.db.Model(&model.RawLog{})
	
	if len(query.VehicleIDs) > 0 {
		db = db.Where("vehicle_id IN ?", query.VehicleIDs)
	} else if query.VehicleID != 0 {
		db = db.Where("vehicle_id = ?", query.VehicleID)
	}
	
	if query.Search != "" {
		db = db.Where("logs ILIKE ?", "%"+query.Search+"%")
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
	
	// Preload Vehicle relation
	err := db.Preload("Vehicle").Order("created_at DESC").Find(&logs).Error
	return logs, err
}

// GetRawLogByID retrieves a raw log by ID
func (r *RawLogRepository) GetRawLogByID(id uint) (*model.RawLog, error) {
	var log model.RawLog
	err := r.db.First(&log, id).Error
	if err != nil {
		return nil, err
	}
	return &log, nil
}

// CountLogs returns the count of logs matching the query
func (r *RawLogRepository) CountLogs(query model.RawLogQuery) (int64, error) {
	var count int64
	
	db := r.db.Model(&model.RawLog{})
	
	if len(query.VehicleIDs) > 0 {
		db = db.Where("vehicle_id IN ?", query.VehicleIDs)
	} else if query.VehicleID != 0 {
		db = db.Where("vehicle_id = ?", query.VehicleID)
	}
	
	if query.Search != "" {
		db = db.Where("logs ILIKE ?", "%"+query.Search+"%")
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

// GetStats returns statistics for raw logs
func (r *RawLogRepository) GetStats() (map[string]interface{}, error) {
	var totalCount int64
	var todayCount int64
	var lastWeekCount int64
	var qualityCount int64
	
	// Total count
	if err := r.db.Model(&model.RawLog{}).Count(&totalCount).Error; err != nil {
		return nil, err
	}
	
	// Today count
	today := time.Now().Truncate(24 * time.Hour)
	if err := r.db.Model(&model.RawLog{}).
		Where("created_at >= ?", today).
		Count(&todayCount).Error; err != nil {
		return nil, err
	}
	
	// Last week count (for growth calculation)
	oneWeekAgo := time.Now().AddDate(0, 0, -7)
	if err := r.db.Model(&model.RawLog{}).
		Where("created_at >= ?", oneWeekAgo).
		Count(&lastWeekCount).Error; err != nil {
		return nil, err
	}
	
	// Calculate weekly growth percentage
	var weeklyGrowth float64
	if lastWeekCount > 0 {
		twoWeeksAgo := time.Now().AddDate(0, 0, -14)
		var previousWeekCount int64
		if err := r.db.Model(&model.RawLog{}).
			Where("created_at >= ? AND created_at < ?", twoWeeksAgo, oneWeekAgo).
			Count(&previousWeekCount).Error; err == nil && previousWeekCount > 0 {
			weeklyGrowth = float64(lastWeekCount-previousWeekCount) / float64(previousWeekCount) * 100
		}
	}
	
	// Data Quality: Count logs with non-empty logs field
	if err := r.db.Model(&model.RawLog{}).
		Where("logs IS NOT NULL AND logs != ''").
		Count(&qualityCount).Error; err != nil {
		return nil, err
	}
	
	// Calculate quality percentage
	var qualityPercentage float64
	if totalCount > 0 {
		qualityPercentage = float64(qualityCount) / float64(totalCount) * 100
	}
	
	// Get table size estimation (PostgreSQL specific)
	var tableSize int64
	err := r.db.Raw("SELECT pg_total_relation_size('raw_logs')").Scan(&tableSize).Error
	if err != nil {
		// If error (e.g., not postgres), estimate based on average row size
		tableSize = totalCount * 1024 // rough estimate: 1KB per row
	}

	// Get combined storage size for all log tables
	var combinedSize int64
	sizeQuery := `
		SELECT 
			COALESCE(pg_total_relation_size('raw_logs'), 0) +
			COALESCE(pg_total_relation_size('vehicle_logs'), 0) +
			COALESCE(pg_total_relation_size('sensor_logs'), 0) +
			COALESCE(pg_total_relation_size('alerts'), 0)
		AS combined_size
	`
	err = r.db.Raw(sizeQuery).Scan(&combinedSize).Error
	if err != nil {
		// Fallback to individual table size
		combinedSize = tableSize
	}
	
	// Get last sync time (most recent log timestamp)
	var lastLog model.RawLog
	lastSyncTime := time.Now()
	if err := r.db.Model(&model.RawLog{}).
		Order("created_at DESC").
		First(&lastLog).Error; err == nil {
		lastSyncTime = lastLog.CreatedAt
	}
	
	// Detect maximum storage capacity from system
	// Priority: 1) Environment variable, 2) PostgreSQL tablespace size, 3) Default
	var maxStorageSize int64
	
	// Try to get from environment variable
	if envMaxSize := os.Getenv("MAX_STORAGE_SIZE_GB"); envMaxSize != "" {
		if sizeGB, err := strconv.ParseInt(envMaxSize, 10, 64); err == nil && sizeGB > 0 {
			maxStorageSize = sizeGB * 1024 * 1024 * 1024 // Convert GB to bytes
		}
	}
	
	// If not set via env, try to detect from PostgreSQL tablespace
	if maxStorageSize == 0 {
		// Query total size of pg_default tablespace (where database lives)
		// This gives us the total space available for PostgreSQL data
		var tablespaceSize int64
		tablespaceQuery := `
			SELECT COALESCE(
				(SELECT setting::bigint FROM pg_settings WHERE name = 'data_directory_size'),
				200 * 1024 * 1024 * 1024::bigint
			) as max_size
		`
		// Fallback: use a reasonable default based on typical Docker volume size
		// Most prod servers have at least 100-200GB for database
		if err := r.db.Raw(tablespaceQuery).Scan(&tablespaceSize).Error; err == nil && tablespaceSize > 0 {
			// Use 90% of detected space as max to leave headroom
			maxStorageSize = int64(float64(tablespaceSize) * 0.9)
		} else {
			// Default to 100 GB if detection fails
			maxStorageSize = 107374182400 // 100 GB in bytes
		}
	}
	
	// Calculate remaining storage
	remainingSize := maxStorageSize - combinedSize
	if remainingSize < 0 {
		remainingSize = 0
	}
	
	// Calculate storage percentage
	var storagePercentage float64
	if maxStorageSize > 0 {
		storagePercentage = float64(combinedSize) / float64(maxStorageSize) * 100
	}
	
	return map[string]interface{}{
		"total_records":       totalCount,
		"total_size":          tableSize,          // Size of raw_logs table only
		"combined_size":       combinedSize,       // Total storage across all log tables
		"max_storage_size":    maxStorageSize,     // Maximum storage capacity (100 GB)
		"remaining_size":      remainingSize,      // Storage remaining (max - used)
		"storage_percentage":  storagePercentage,  // Percentage of storage used
		"last_sync":           lastSyncTime.Format(time.RFC3339),
		"quality_percentage":  qualityPercentage,
		"today_records":       todayCount,
		"weekly_growth":       weeklyGrowth,
		"last_week_records":   lastWeekCount,
	}, nil
}

// DeleteRawLog deletes a raw log by ID
func (r *RawLogRepository) DeleteRawLog(id uint) error {
	return r.db.Delete(&model.RawLog{}, id).Error
}

// DeleteOldLogs deletes logs older than the specified date
func (r *RawLogRepository) DeleteOldLogs(beforeDate time.Time) (int64, error) {
	result := r.db.Where("created_at < ?", beforeDate).Delete(&model.RawLog{})
	return result.RowsAffected, result.Error
}

