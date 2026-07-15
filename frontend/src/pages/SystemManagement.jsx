import { useState, useEffect } from "react";
import useTitle from "../hooks/useTitle";
import { Title, toast } from "../components/ui";
import { useSystemSettings } from "../contexts/SystemSettingsContext";

const Card = ({ title, description, children }) => (
  <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-4">
    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
      {title}
    </h3>
    {description && (
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 mb-4">
        {description}
      </p>
    )}
    {!description && <div className="mb-4" />}
    {children}
  </div>
);

const Toggle = ({ checked, onChange, label, description }) => (
  <label className="flex items-start gap-3 cursor-pointer select-none">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-0.5 w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
    />
    <span>
      <span className="block text-sm font-medium text-gray-800 dark:text-gray-200">
        {label}
      </span>
      {description && (
        <span className="block text-xs text-gray-500 dark:text-gray-400">
          {description}
        </span>
      )}
    </span>
  </label>
);

const KeyField = ({ label, value, onChange, placeholder }) => (
  <div>
    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
      {label}
    </label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete="off"
      spellCheck={false}
      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
    />
  </div>
);

const SystemManagement = () => {
  useTitle("System Management");
  const { settings, loading, updateSettings } = useSystemSettings();
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings(form);
      toast.success("System settings saved");
    } catch (err) {
      toast.error(err.message || "Failed to save system settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="px-4 pt-4 pb-8">
        <div className="max-w-3xl mx-auto text-sm text-gray-500 dark:text-gray-400">
          Loading system settings...
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-8">
      <div className="max-w-3xl mx-auto">
        <Title
          title="System Management"
          subtitle="Third-party credentials and feature toggles — changes apply app-wide without a redeploy"
        />

        <Card
          title="Map Tile Providers"
          description="High-zoom satellite tile options in the map style picker (Settings, header)."
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <KeyField
                label="Google Maps API Key"
                value={form.google_maps_api_key || ""}
                onChange={set("google_maps_api_key")}
                placeholder="your_google_maps_api_key_here"
              />
              <Toggle
                checked={!!form.google_maps_enabled}
                onChange={set("google_maps_enabled")}
                label="Enable Google Satellite"
              />
            </div>
            <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <KeyField
                label="Mapbox Access Token"
                value={form.mapbox_token || ""}
                onChange={set("mapbox_token")}
                placeholder="your_mapbox_access_token_here"
              />
              <Toggle
                checked={!!form.mapbox_enabled}
                onChange={set("mapbox_enabled")}
                label="Enable Mapbox Satellite"
              />
            </div>
          </div>
        </Card>

        <Card
          title="Weather"
          description="OpenWeatherMap integration used on the Weather page."
        >
          <div className="space-y-2">
            <KeyField
              label="OpenWeatherMap API Key"
              value={form.openweather_api_key || ""}
              onChange={set("openweather_api_key")}
              placeholder="your_openweathermap_api_key_here"
            />
            <Toggle
              checked={!!form.weather_enabled}
              onChange={set("weather_enabled")}
              label="Enable Weather"
              description="Also enables/disables the Weather menu item"
            />
          </div>
        </Card>

        <Card
          title="AI (OpenRouter)"
          description="Shared OpenRouter API key used by Chat and the AI analysis panels — each feature has its own toggle."
        >
          <div className="space-y-4">
            <KeyField
              label="OpenRouter API Key"
              value={form.openrouter_api_key || ""}
              onChange={set("openrouter_api_key")}
              placeholder="your-openrouter-api-key-here"
            />
            <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800">
              <Toggle
                checked={!!form.ai_chat_enabled}
                onChange={set("ai_chat_enabled")}
                label="Enable AI Chat"
                description="Also enables/disables the Chat menu item"
              />
              <Toggle
                checked={!!form.ai_weather_analysis_enabled}
                onChange={set("ai_weather_analysis_enabled")}
                label="Enable AI Weather Analysis"
                description="'AI Operational Analysis' panel on the Weather page"
              />
              <Toggle
                checked={!!form.ai_battery_analysis_enabled}
                onChange={set("ai_battery_analysis_enabled")}
                label="Enable AI Battery Analysis"
                description="'Battery Health Analysis' panel on the Battery page"
              />
            </div>
          </div>
        </Card>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SystemManagement;
