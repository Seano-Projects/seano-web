package repository

import (
	"errors"

	"gorm.io/gorm"

	"go-fiber-pgsql/internal/model"
)

type SystemSettingRepository struct {
	db *gorm.DB
}

func NewSystemSettingRepository(db *gorm.DB) *SystemSettingRepository {
	return &SystemSettingRepository{db: db}
}

// GetSettings returns the single settings row (id=1), creating a default
// (all-disabled, empty-key) row on first access.
func (r *SystemSettingRepository) GetSettings() (*model.SystemSetting, error) {
	var settings model.SystemSetting
	if err := r.db.First(&settings, 1).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			settings = model.SystemSetting{ID: 1}
			if err := r.db.Create(&settings).Error; err != nil {
				return nil, err
			}
			return &settings, nil
		}
		return nil, err
	}
	return &settings, nil
}

func (r *SystemSettingRepository) UpdateSettings(updates map[string]interface{}) (*model.SystemSetting, error) {
	if _, err := r.GetSettings(); err != nil {
		return nil, err
	}
	if len(updates) > 0 {
		if err := r.db.Model(&model.SystemSetting{}).Where("id = ?", 1).Updates(updates).Error; err != nil {
			return nil, err
		}
	}
	return r.GetSettings()
}
