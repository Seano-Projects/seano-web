import {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
} from "react";
import { API_BASE_URL } from "../config";

const SystemSettingsContext = createContext(null);

// Default (all-disabled) shape used until the first fetch resolves, so
// consumers never have to null-check.
const DEFAULT_SETTINGS = {
  google_maps_api_key: "",
  google_maps_enabled: false,
  mapbox_token: "",
  mapbox_enabled: false,
  openweather_api_key: "",
  weather_enabled: false,
  openrouter_api_key: "",
  ai_chat_enabled: false,
  ai_weather_analysis_enabled: false,
  ai_battery_analysis_enabled: false,
};

/**
 * SystemSettingsProvider — fetches admin-configurable third-party
 * credentials and feature toggles from the backend (System Management)
 * so they can be changed at runtime without a redeploy.
 */
export const SystemSettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/system-settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSettings({ ...DEFAULT_SETTINGS, ...data });
      }
    } catch {
      // keep defaults (all-disabled) on failure
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    window.addEventListener("userLoggedIn", fetchSettings);
    return () => window.removeEventListener("userLoggedIn", fetchSettings);
  }, [fetchSettings]);

  const updateSettings = useCallback(async (updates) => {
    const token = localStorage.getItem("access_token");
    const res = await fetch(`${API_BASE_URL}/system-settings`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to update system settings");
    }
    const data = await res.json();
    setSettings({ ...DEFAULT_SETTINGS, ...data });
    return data;
  }, []);

  const value = { settings, loading, refetch: fetchSettings, updateSettings };

  return (
    <SystemSettingsContext.Provider value={value}>
      {children}
    </SystemSettingsContext.Provider>
  );
};

export const useSystemSettings = () => {
  const context = useContext(SystemSettingsContext);
  if (!context) {
    throw new Error(
      "useSystemSettings must be used within SystemSettingsProvider",
    );
  }
  return context;
};
