package repository

import (
	"time"

	"go-fiber-pgsql/internal/model"
	"gorm.io/gorm"
)

type ThrusterCommandRepository struct {
	db *gorm.DB
}

func NewThrusterCommandRepository(db *gorm.DB) *ThrusterCommandRepository {
	return &ThrusterCommandRepository{db: db}
}

func (r *ThrusterCommandRepository) CreateThrusterCommand(cmd *model.ThrusterCommand) error {
	return r.db.Create(cmd).Error
}

func (r *ThrusterCommandRepository) GetLatestActiveCommand(vehicleID uint, vehicleCode string, now time.Time) (*model.ThrusterCommand, error) {
	var cmd model.ThrusterCommand

	db := r.db.Model(&model.ThrusterCommand{}).Where("expires_at > ?", now)
	if vehicleID != 0 {
		db = db.Where("vehicle_id = ?", vehicleID)
	}
	if vehicleCode != "" {
		db = db.Where("vehicle_code = ?", vehicleCode)
	}

	if err := db.Order("initiated_at DESC").First(&cmd).Error; err != nil {
		return nil, err
	}

	return &cmd, nil
}
