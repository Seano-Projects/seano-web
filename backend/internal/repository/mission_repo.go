package repository

import (
	"go-fiber-pgsql/internal/model"

	"gorm.io/gorm"
)

type MissionRepository struct {
	db *gorm.DB
}

func NewMissionRepository(db *gorm.DB) *MissionRepository {
	return &MissionRepository{db: db}
}

func (r *MissionRepository) CreateMission(mission *model.Mission) error {
	return r.db.Create(mission).Error
}

func (r *MissionRepository) GetAllMissions() ([]model.Mission, error) {
	var missions []model.Mission
	err := r.db.Preload("Vehicle").Preload("Creator").Order("created_at DESC").Find(&missions).Error
	return missions, err
}

func (r *MissionRepository) GetMissionsByUserID(userID uint) ([]model.Mission, error) {
	var missions []model.Mission
	err := r.db.Preload("Vehicle").Preload("Creator").Where("created_by = ?", userID).Order("created_at DESC").Find(&missions).Error
	return missions, err
}

func (r *MissionRepository) GetMissionByID(id uint) (*model.Mission, error) {
	var mission model.Mission
	err := r.db.Preload("Vehicle").Preload("Creator").First(&mission, id).Error
	if err != nil {
		return nil, err
	}
	return &mission, nil
}

func (r *MissionRepository) GetMissionByCode(code string) (*model.Mission, error) {
	var mission model.Mission
	err := r.db.Preload("Vehicle").Preload("Creator").Where("mission_code = ?", code).First(&mission).Error
	if err != nil {
		return nil, err
	}
	return &mission, nil
}

func (r *MissionRepository) GetLatestActiveMissionByVehicleID(vehicleID uint) (*model.Mission, error) {
	var mission model.Mission
	err := r.db.Preload("Vehicle").Preload("Creator").
		Where("vehicle_id = ?", vehicleID).
		Where("LOWER(status) IN ?", []string{"ongoing", "active", "running", "in_progress"}).
		Order("last_update_time DESC NULLS LAST, updated_at DESC").
		First(&mission).Error
	if err != nil {
		return nil, err
	}
	return &mission, nil
}

func (r *MissionRepository) GetLatestMissionByVehicleIDAndStatuses(vehicleID uint, statuses []string) (*model.Mission, error) {
	var mission model.Mission
	query := r.db.Preload("Vehicle").Preload("Creator").
		Where("vehicle_id = ?", vehicleID)
	if len(statuses) > 0 {
		query = query.Where("status IN ?", statuses)
	}
	err := query.
		Order("last_update_time DESC NULLS LAST, updated_at DESC").
		First(&mission).Error
	if err != nil {
		return nil, err
	}
	return &mission, nil
}

func (r *MissionRepository) UpdateMission(id uint, updates map[string]interface{}) error {
	return r.db.Model(&model.Mission{}).Where("id = ?", id).Updates(updates).Error
}

func (r *MissionRepository) DeleteMission(id uint) error {
	return r.db.Delete(&model.Mission{}, id).Error
}

func (r *MissionRepository) GetMissionStats() (*model.MissionStats, error) {
	var stats model.MissionStats

	// Total missions
	r.db.Model(&model.Mission{}).Count(&stats.TotalMissions)

	// Draft missions
	r.db.Model(&model.Mission{}).Where("status = ?", "Draft").Count(&stats.DraftMissions)

	// Ongoing missions
	r.db.Model(&model.Mission{}).Where("status = ?", "Ongoing").Count(&stats.OngoingMissions)

	// Completed missions
	r.db.Model(&model.Mission{}).Where("status = ?", "Completed").Count(&stats.CompletedMissions)

	// Failed missions
	r.db.Model(&model.Mission{}).Where("status = ?", "Failed").Count(&stats.FailedMissions)

	return &stats, nil
}

func (r *MissionRepository) GetMissionsByVehicleID(vehicleID uint) ([]model.Mission, error) {
	var missions []model.Mission
	err := r.db.Preload("Vehicle").Preload("Creator").Where("vehicle_id = ?", vehicleID).Order("created_at DESC").Find(&missions).Error
	return missions, err
}

func (r *MissionRepository) GetMissionsByStatus(status string) ([]model.Mission, error) {
	var missions []model.Mission
	err := r.db.Preload("Vehicle").Preload("Creator").Where("status = ?", status).Order("created_at DESC").Find(&missions).Error
	return missions, err
}

func (r *MissionRepository) UpdateMissionProgress(id uint, progress *model.MissionProgressUpdate) error {
	updates := map[string]interface{}{
		"progress":           progress.Progress,
		"energy_consumed":    progress.EnergyConsumed,
		"time_elapsed":       progress.TimeElapsed,
		"current_waypoint":   progress.CurrentWaypoint,
		"completed_waypoint": progress.CompletedWaypoint,
		"status":             progress.Status,
		"last_update_time":   progress.Timestamp,
	}
	return r.db.Model(&model.Mission{}).Where("id = ?", id).Updates(updates).Error
}

func (r *MissionRepository) GetOngoingMissions() ([]model.Mission, error) {
	var missions []model.Mission
	err := r.db.Preload("Vehicle").Preload("Creator").Where("status = ?", "Ongoing").Order("last_update_time DESC").Find(&missions).Error
	return missions, err
}
