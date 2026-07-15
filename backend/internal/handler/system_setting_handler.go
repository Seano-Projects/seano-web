package handler

import (
	"github.com/gofiber/fiber/v2"

	"go-fiber-pgsql/internal/model"
	"go-fiber-pgsql/internal/repository"
)

type SystemSettingHandler struct {
	repo *repository.SystemSettingRepository
}

func NewSystemSettingHandler(repo *repository.SystemSettingRepository) *SystemSettingHandler {
	return &SystemSettingHandler{repo: repo}
}

// GetSettings godoc
// @Summary Get system settings
// @Description Get admin-configurable third-party credentials and feature toggles
// @Tags System Settings
// @Produce json
// @Success 200 {object} model.SystemSetting
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /system-settings [get]
func (h *SystemSettingHandler) GetSettings(c *fiber.Ctx) error {
	settings, err := h.repo.GetSettings()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to load system settings",
		})
	}
	return c.JSON(settings)
}

// UpdateSettings godoc
// @Summary Update system settings
// @Description Update admin-configurable third-party credentials and feature toggles
// @Tags System Settings
// @Accept json
// @Produce json
// @Param settings body model.UpdateSystemSettingRequest true "Settings to update"
// @Success 200 {object} model.SystemSetting
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /system-settings [put]
func (h *SystemSettingHandler) UpdateSettings(c *fiber.Ctx) error {
	var req model.UpdateSystemSettingRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request data",
		})
	}

	updates := map[string]interface{}{}
	if req.GoogleMapsAPIKey != nil {
		updates["google_maps_api_key"] = *req.GoogleMapsAPIKey
	}
	if req.GoogleMapsEnabled != nil {
		updates["google_maps_enabled"] = *req.GoogleMapsEnabled
	}
	if req.MapboxToken != nil {
		updates["mapbox_token"] = *req.MapboxToken
	}
	if req.MapboxEnabled != nil {
		updates["mapbox_enabled"] = *req.MapboxEnabled
	}
	if req.OpenWeatherAPIKey != nil {
		updates["openweather_api_key"] = *req.OpenWeatherAPIKey
	}
	if req.WeatherEnabled != nil {
		updates["weather_enabled"] = *req.WeatherEnabled
	}
	if req.OpenRouterAPIKey != nil {
		updates["openrouter_api_key"] = *req.OpenRouterAPIKey
	}
	if req.AIChatEnabled != nil {
		updates["ai_chat_enabled"] = *req.AIChatEnabled
	}
	if req.AIWeatherAnalysisEnabled != nil {
		updates["ai_weather_analysis_enabled"] = *req.AIWeatherAnalysisEnabled
	}
	if req.AIBatteryAnalysisEnabled != nil {
		updates["ai_battery_analysis_enabled"] = *req.AIBatteryAnalysisEnabled
	}

	settings, err := h.repo.UpdateSettings(updates)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update system settings",
		})
	}
	return c.JSON(settings)
}
