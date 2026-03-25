package handler

import (
	"go-fiber-pgsql/internal/middleware"
	"go-fiber-pgsql/internal/model"
	"go-fiber-pgsql/internal/repository"
	mqttservice "go-fiber-pgsql/internal/service/mqtt"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type MissionHandler struct {
	missionRepo *repository.MissionRepository
	vehicleRepo *repository.VehicleRepository
	cmdPublisher *mqttservice.CommandPublisher
	db          *gorm.DB
}

func NewMissionHandler(missionRepo *repository.MissionRepository, vehicleRepo *repository.VehicleRepository, cmdPublisher *mqttservice.CommandPublisher, db *gorm.DB) *MissionHandler {
	return &MissionHandler{
		missionRepo: missionRepo,
		vehicleRepo: vehicleRepo,
		cmdPublisher: cmdPublisher,
		db:          db,
	}
}

type UploadMissionParameters struct {
	Speed    float64 `json:"speed,omitempty"`
	Altitude float64 `json:"altitude,omitempty"`
	Radius   float64 `json:"radius,omitempty"`
}

type UploadMissionRequest struct {
	VehicleID    uint                   `json:"vehicle_id"`
	MissionName  string                 `json:"mission_name,omitempty"`
	Waypoints    []model.Waypoint       `json:"waypoints,omitempty"`
	HomeLocation *model.Waypoint        `json:"home_location,omitempty"`
	Parameters   UploadMissionParameters `json:"parameters,omitempty"`
}

type MissionMQTTPayload struct {
	MissionID    uint                   `json:"mission_id"`
	MissionCode  string                 `json:"mission_code"`
	MissionName  string                 `json:"mission_name"`
	VehicleID    uint                   `json:"vehicle_id"`
	Waypoints    []model.Waypoint       `json:"waypoints,omitempty"`
	HomeLocation *model.Waypoint        `json:"home_location,omitempty"`
	Parameters   UploadMissionParameters `json:"parameters,omitempty"`
	UploadedAt   time.Time              `json:"uploaded_at"`
}

// CreateMission godoc
// @Summary Create a new mission
// @Description Create a new mission with waypoints
// @Tags Missions
// @Accept json
// @Produce json
// @Param mission body model.CreateMissionRequest true "Mission data"
// @Success 201 {object} model.Mission
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /missions [post]
func (h *MissionHandler) CreateMission(c *fiber.Ctx) error {
	var req model.CreateMissionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request data",
		})
	}

	userID := c.Locals("user_id").(uint)

	status := "Draft"
	if req.Status != "" {
		status = req.Status
	}

	// Convert waypoints
	waypoints := model.WaypointArray{}
	if req.Waypoints != nil {
		waypoints = req.Waypoints
	}

	mission := &model.Mission{
		MissionCode: req.MissionCode,
		Name:        req.Name,
		Description: req.Description,
		Status:      status,
		VehicleID:   req.VehicleID,
		Waypoints:   waypoints,
		StartTime:   req.StartTime,
		EndTime:     req.EndTime,
		CreatedBy:   &userID,
	}

	// Save mission to database
	if err := h.missionRepo.CreateMission(mission); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create mission",
		})
	}

	// Reload with associations
	mission, _ = h.missionRepo.GetMissionByID(mission.ID)

	return c.Status(fiber.StatusCreated).JSON(mission)
}

// GetAllMissions godoc
// @Summary Get all missions
// @Description Get all missions (own missions for regular users, all missions for admins)
// @Tags Missions
// @Produce json
// @Success 200 {array} model.Mission
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /missions [get]
func (h *MissionHandler) GetAllMissions(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	var missions []model.Mission
	var err error

	// Check if user has missions management permission (admin)
	if middleware.HasPermission(h.db, userID, "missions.read") {
		// Admin can see all missions
		missions, err = h.missionRepo.GetAllMissions()
	} else {
		// Regular users only see their own missions
		missions, err = h.missionRepo.GetMissionsByUserID(userID)
	}

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch missions",
		})
	}

	return c.JSON(missions)
}

// GetMissionByID godoc
// @Summary Get mission by ID
// @Description Get a mission by its ID (ownership check applied)
// @Tags Missions
// @Produce json
// @Param mission_id path int true "Mission ID"
// @Success 200 {object} model.Mission
// @Failure 403 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /missions/{mission_id} [get]
func (h *MissionHandler) GetMissionByID(c *fiber.Ctx) error {
	missionID, err := strconv.Atoi(c.Params("mission_id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid mission ID",
		})
	}

	mission, err := h.missionRepo.GetMissionByID(uint(missionID))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Mission not found",
		})
	}

	// Check ownership
	userID := c.Locals("user_id").(uint)
	role := c.Locals("role").(string)
	if role != "Admin" && (mission.CreatedBy == nil || *mission.CreatedBy != userID) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "You don't have permission to view this mission",
		})
	}

	return c.JSON(mission)
}

// UpdateMission godoc
// @Summary Update a mission
// @Description Update a mission by its ID (ownership check applied)
// @Tags Missions
// @Accept json
// @Produce json
// @Param mission_id path int true "Mission ID"
// @Param mission body model.UpdateMissionRequest true "Mission update data"
// @Success 200 {object} model.Mission
// @Failure 400 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /missions/{mission_id} [put]
func (h *MissionHandler) UpdateMission(c *fiber.Ctx) error {
	missionID, err := strconv.Atoi(c.Params("mission_id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid mission ID",
		})
	}

	mission, err := h.missionRepo.GetMissionByID(uint(missionID))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Mission not found",
		})
	}

	// Check ownership
	userID := c.Locals("user_id").(uint)
	role := c.Locals("role").(string)
	if role != "Admin" && (mission.CreatedBy == nil || *mission.CreatedBy != userID) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "You don't have permission to update this mission",
		})
	}

	var req model.UpdateMissionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request data",
		})
	}

	updates := make(map[string]interface{})
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.MissionCode != nil {
		updates["mission_code"] = *req.MissionCode
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.Status != nil {
		updates["status"] = *req.Status
	}
	if req.VehicleID != nil {
		updates["vehicle_id"] = *req.VehicleID
	}
	if req.Waypoints != nil {
		updates["waypoints"] = model.WaypointArray(req.Waypoints)
	}
	if req.HomeLocation != nil {
		updates["home_location"] = req.HomeLocation
	}
	if req.StartTime != nil {
		updates["start_time"] = *req.StartTime
	}
	if req.EndTime != nil {
		updates["end_time"] = *req.EndTime
	}

	if err := h.missionRepo.UpdateMission(uint(missionID), updates); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update mission",
		})
	}

	// Reload with associations
	mission, _ = h.missionRepo.GetMissionByID(uint(missionID))

	return c.JSON(mission)
}

func (h *MissionHandler) UploadMissionToVehicle(c *fiber.Ctx) error {
	missionID, err := strconv.Atoi(c.Params("mission_id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid mission ID",
		})
	}

	if h.cmdPublisher == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error": "MQTT broker not configured - mission upload unavailable",
		})
	}

	mission, err := h.missionRepo.GetMissionByID(uint(missionID))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Mission not found",
		})
	}

	userID := c.Locals("user_id").(uint)
	role := c.Locals("role").(string)
	if role != "Admin" && (mission.CreatedBy == nil || *mission.CreatedBy != userID) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "You don't have permission to upload this mission",
		})
	}

	var req UploadMissionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request data",
		})
	}

	if req.VehicleID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "vehicle_id is required",
		})
	}

	vehicle, err := h.vehicleRepo.GetVehicleByID(req.VehicleID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Vehicle not found",
		})
	}

	if role != "Admin" && vehicle.UserID != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "You don't have permission to use this vehicle",
		})
	}

	updates := map[string]interface{}{
		"vehicle_id": req.VehicleID,
	}
	if len(req.Waypoints) > 0 {
		updates["waypoints"] = model.WaypointArray(req.Waypoints)
	}
	if req.HomeLocation != nil {
		updates["home_location"] = req.HomeLocation
	}
	if mission.Status == "Draft" {
		updates["status"] = "Ongoing"
	}
	if err := h.missionRepo.UpdateMission(uint(missionID), updates); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to prepare mission for upload",
		})
	}

	mission, _ = h.missionRepo.GetMissionByID(uint(missionID))
	if mission.MissionCode == "" {
		generatedCode := "MSN-" + uuid.New().String()[:8]
		if err := h.missionRepo.UpdateMission(uint(missionID), map[string]interface{}{"mission_code": generatedCode}); err == nil {
			mission.MissionCode = generatedCode
		}
	}
	payload := MissionMQTTPayload{
		MissionID:    mission.ID,
		MissionCode:  mission.MissionCode,
		MissionName:  mission.Name,
		VehicleID:    req.VehicleID,
		Waypoints:    mission.Waypoints,
		HomeLocation: mission.HomeLocation,
		Parameters:   req.Parameters,
		UploadedAt:   time.Now(),
	}
	if req.MissionName != "" {
		payload.MissionName = req.MissionName
	}
	if len(req.Waypoints) > 0 {
		payload.Waypoints = req.Waypoints
	}
	if req.HomeLocation != nil {
		payload.HomeLocation = req.HomeLocation
	}

	if err := h.cmdPublisher.PublishMission(vehicle.Code, payload); err != nil {
		return c.Status(fiber.StatusGatewayTimeout).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"status": "ok",
		"message": "Mission uploaded to vehicle",
		"mission_id": mission.ID,
		"mission_code": mission.MissionCode,
		"vehicle_code": vehicle.Code,
	})
}

// DeleteMission godoc
// @Summary Delete a mission
// @Description Delete a mission by its ID (ownership check applied)
// @Tags Missions
// @Produce json
// @Param mission_id path int true "Mission ID"
// @Success 200 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /missions/{mission_id} [delete]
func (h *MissionHandler) DeleteMission(c *fiber.Ctx) error {
	missionID, err := strconv.Atoi(c.Params("mission_id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid mission ID",
		})
	}

	mission, err := h.missionRepo.GetMissionByID(uint(missionID))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Mission not found",
		})
	}

	// Check ownership
	userID := c.Locals("user_id").(uint)
	role := c.Locals("role").(string)
	if role != "Admin" && (mission.CreatedBy == nil || *mission.CreatedBy != userID) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "You don't have permission to delete this mission",
		})
	}

	if err := h.missionRepo.DeleteMission(uint(missionID)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete mission",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Mission deleted successfully",
	})
}

// GetMissionStats godoc
// @Summary Get mission statistics
// @Description Get statistics about missions (total, ongoing, completed, failed)
// @Tags Missions
// @Produce json
// @Success 200 {object} model.MissionStats
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /missions/stats [get]
func (h *MissionHandler) GetMissionStats(c *fiber.Ctx) error {
	stats, err := h.missionRepo.GetMissionStats()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch mission stats",
		})
	}

	return c.JSON(stats)
}

// UpdateMissionProgress godoc
// @Summary Update mission progress
// @Description Update mission progress with real-time metrics
// @Tags Missions
// @Accept json
// @Produce json
// @Param id path int true "Mission ID"
// @Param progress body model.MissionProgressUpdate true "Progress data"
// @Success 200 {object} model.Mission
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Security BearerAuth
// @Router /missions/{id}/progress [put]
func (h *MissionHandler) UpdateMissionProgress(c *fiber.Ctx) error {
	missionID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid mission ID",
		})
	}

	var progress model.MissionProgressUpdate
	if err := c.BodyParser(&progress); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request data",
		})
	}

	progress.MissionID = uint(missionID)
	if progress.Timestamp.IsZero() {
		progress.Timestamp = time.Now()
	}

	if err := h.missionRepo.UpdateMissionProgress(uint(missionID), &progress); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update mission progress",
		})
	}

	// Get updated mission
	mission, err := h.missionRepo.GetMissionByID(uint(missionID))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Mission not found",
		})
	}

	return c.JSON(mission)
}

// GetOngoingMissions godoc
// @Summary Get ongoing missions
// @Description Get all missions with status 'Ongoing'
// @Tags Missions
// @Produce json
// @Success 200 {array} model.Mission
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /missions/ongoing [get]
func (h *MissionHandler) GetOngoingMissions(c *fiber.Ctx) error {
	missions, err := h.missionRepo.GetOngoingMissions()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch ongoing missions",
		})
	}

	return c.JSON(missions)
}

