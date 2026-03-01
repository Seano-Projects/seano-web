package repository

import (
	"go-fiber-pgsql/internal/model"

	"gorm.io/gorm"
)

type VehicleRepository struct {
	db *gorm.DB
}

func NewVehicleRepository(db *gorm.DB) *VehicleRepository {
	return &VehicleRepository{db: db}
}

func (r *VehicleRepository) CreateVehicle(vehicle *model.Vehicle) error {
	return r.db.Create(vehicle).Error
}

func (r *VehicleRepository) GetAllVehicles() ([]model.Vehicle, error) {
	var vehicles []model.Vehicle
	err := r.db.Preload("User").Find(&vehicles).Error
	return vehicles, err
}

func (r *VehicleRepository) GetVehiclesByUserID(userID uint) ([]model.Vehicle, error) {
	var vehicles []model.Vehicle
	err := r.db.Preload("User").Where("user_id = ?", userID).Find(&vehicles).Error
	return vehicles, err
}

func (r *VehicleRepository) GetVehicleByID(id uint) (*model.Vehicle, error) {
	var vehicle model.Vehicle
	err := r.db.Preload("User").First(&vehicle, id).Error
	if err != nil {
		return nil, err
	}
	return &vehicle, nil
}

func (r *VehicleRepository) GetVehicleByCode(code string) (*model.Vehicle, error) {
	var vehicle model.Vehicle
	err := r.db.Preload("User").Where("code = ?", code).First(&vehicle).Error
	if err != nil {
		return nil, err
	}
	return &vehicle, nil
}

func (r *VehicleRepository) UpdateVehicle(id uint, updates map[string]interface{}) error {
	return r.db.Model(&model.Vehicle{}).Where("id = ?", id).Updates(updates).Error
}

func (r *VehicleRepository) DeleteVehicle(id uint) error {
	return r.db.Delete(&model.Vehicle{}, id).Error
}

func (r *VehicleRepository) GetLatestBatteryStatus(vehicleID uint) (*model.VehicleBattery, error) {
	var battery model.VehicleBattery
	err := r.db.Where("vehicle_id = ?", vehicleID).Order("created_at DESC").First(&battery).Error
	if err != nil {
		return nil, err
	}
	return &battery, nil
}

func (r *VehicleRepository) GetAllLatestBatteryStatus() ([]model.VehicleBattery, error) {
	var batteries []model.VehicleBattery
	// Get latest battery for each combination of vehicle_id and battery_id
	// DISTINCT ON returns the first row of each group (when ordered by created_at DESC = latest)
	err := r.db.Raw(`
		SELECT DISTINCT ON (vehicle_id, battery_id) *
		FROM vehicle_batteries
		ORDER BY vehicle_id, battery_id, created_at DESC
	`).Scan(&batteries).Error
	if err != nil {
		return nil, err
	}
	return batteries, nil
}

func (r *VehicleRepository) CreateBatteryStatus(battery *model.VehicleBattery) error {
	return r.db.Create(battery).Error
}

// GetBatteryLogsByVehicleID gets battery history for a specific vehicle
func (r *VehicleRepository) GetBatteryLogsByVehicleID(vehicleID uint, batteryID *int, limit int) ([]model.VehicleBattery, error) {
	var batteries []model.VehicleBattery
	query := r.db.Where("vehicle_id = ?", vehicleID)
	
	if batteryID != nil {
		query = query.Where("battery_id = ?", *batteryID)
	}
	
	if limit <= 0 {
		limit = 100
	}
	
	err := query.Order("created_at DESC").Limit(limit).Find(&batteries).Error
	return batteries, err
}

// GetVehicleIDsByUserID returns list of vehicle IDs owned by a user
func (r *VehicleRepository) GetVehicleIDsByUserID(userID uint) ([]uint, error) {
	var vehicleIDs []uint
	err := r.db.Model(&model.Vehicle{}).Where("user_id = ?", userID).Pluck("id", &vehicleIDs).Error
	return vehicleIDs, err
}

