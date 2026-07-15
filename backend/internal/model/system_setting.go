package model

import "time"

// SystemSetting is a single-row table (id=1) holding admin-configurable
// third-party credentials and feature toggles for the frontend.
type SystemSetting struct {
	ID uint `json:"id" gorm:"primaryKey"`

	GoogleMapsAPIKey  string `json:"google_maps_api_key" gorm:"type:varchar(255)"`
	GoogleMapsEnabled bool   `json:"google_maps_enabled" gorm:"default:false"`

	MapboxToken   string `json:"mapbox_token" gorm:"type:varchar(255)"`
	MapboxEnabled bool   `json:"mapbox_enabled" gorm:"default:false"`

	OpenWeatherAPIKey string `json:"openweather_api_key" gorm:"type:varchar(255)"`
	WeatherEnabled    bool   `json:"weather_enabled" gorm:"default:false"`

	OpenRouterAPIKey         string `json:"openrouter_api_key" gorm:"type:varchar(255)"`
	AIChatEnabled            bool   `json:"ai_chat_enabled" gorm:"default:false"`
	AIWeatherAnalysisEnabled bool   `json:"ai_weather_analysis_enabled" gorm:"default:false"`
	AIBatteryAnalysisEnabled bool   `json:"ai_battery_analysis_enabled" gorm:"default:false"`

	UpdatedAt time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

// UpdateSystemSettingRequest — all fields optional (partial update).
type UpdateSystemSettingRequest struct {
	GoogleMapsAPIKey  *string `json:"google_maps_api_key,omitempty"`
	GoogleMapsEnabled *bool   `json:"google_maps_enabled,omitempty"`

	MapboxToken   *string `json:"mapbox_token,omitempty"`
	MapboxEnabled *bool   `json:"mapbox_enabled,omitempty"`

	OpenWeatherAPIKey *string `json:"openweather_api_key,omitempty"`
	WeatherEnabled    *bool   `json:"weather_enabled,omitempty"`

	OpenRouterAPIKey         *string `json:"openrouter_api_key,omitempty"`
	AIChatEnabled            *bool   `json:"ai_chat_enabled,omitempty"`
	AIWeatherAnalysisEnabled *bool   `json:"ai_weather_analysis_enabled,omitempty"`
	AIBatteryAnalysisEnabled *bool   `json:"ai_battery_analysis_enabled,omitempty"`
}
