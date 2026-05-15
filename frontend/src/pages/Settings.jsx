import React, { useState } from "react";
import { FaSun, FaMoon } from "react-icons/fa";
import useTitle from "../hooks/useTitle";
import { Title, ConfirmModal } from "../components/ui";
import useTranslation from "../hooks/useTranslation";
import { useLanguage } from "../contexts/LanguageContext";
import { useVehicleConnection } from "../contexts/VehicleConnectionContext";
import { REALTIME_MODE } from "../utils/realtimeConfig";

const Card = ({ title, children }) => (
  <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-4">
    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
      {title}
    </h3>
    {children}
  </div>
);

const InfoRow = ({ label, value, status }) => (
  <div className="flex items-center justify-between">
    <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
    <span className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
      {status && (
        <span className={`w-2 h-2 rounded-full ${status === "green" ? "bg-green-500" : "bg-red-500"}`} />
      )}
      {value}
    </span>
  </div>
);

const Settings = ({ darkMode, toggleDarkMode }) => {
  const { t } = useTranslation();
  const { language, changeLanguage } = useLanguage();
  const { isConnected: wsConnected } = useVehicleConnection();
  useTitle(t("pages.settings.title"));

  const mqttBroker = import.meta.env.VITE_MQTT_BROKER || import.meta.env.VITE_MQTT_WS_URL || null;

  const [mapTile, setMapTileState] = useState(
    () => localStorage.getItem("mapTileStyle") || "street",
  );
  const setMapTile = (style) => {
    setMapTileState(style);
    localStorage.setItem("mapTileStyle", style);
    window.dispatchEvent(new Event("storage"));
  };

  const [pendingRealtimeMode, setPendingRealtimeMode] = useState(null);
  const handleRealtimeModeChange = (mode) => {
    if (mode === REALTIME_MODE) return;
    setPendingRealtimeMode(mode);
  };
  const confirmRealtimeModeChange = () => {
    localStorage.setItem("realtimeMode", pendingRealtimeMode);
    setPendingRealtimeMode(null);
    window.location.reload();
  };

  const themeOptions = [
    { id: "light", icon: FaSun, label: "Light" },
    { id: "dark", icon: FaMoon, label: "Dark" },
  ];

  const mapTileOptions = [
    { id: "street", label: "Street" },
    { id: "satellite", label: "Satellite" },
    { id: "dark", label: "Dark" },
  ];

  const languages = [
    { id: "en", label: "English", flag: "gb" },
    { id: "id", label: "Bahasa Indonesia", flag: "id" },
  ];

  return (
    <div className="px-4 pt-4 pb-8">
      <div className="max-w-3xl mx-auto">
        <Title
          title={t("pages.settings.title")}
          subtitle={t("pages.settings.subtitle")}
        />

        {/* Appearance */}
        <Card title={t("pages.settings.appearance") || "Appearance"}>
          {/* Theme */}
          <div className="mb-5">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              {t("pages.settings.theme") || "Theme"}
            </p>
            <div className="flex gap-2">
              {themeOptions.map((opt) => {
                const isActive =
                  (opt.id === "dark" && darkMode) ||
                  (opt.id === "light" && !darkMode);
                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      if (!isActive) toggleDarkMode();
                    }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                      isActive
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300"
                        : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500"
                    }`}
                  >
                    <opt.icon className="text-sm" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Map Tile Style */}
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              {t("pages.settings.mapStyle") || "Map Style"}
            </p>
            <div className="flex gap-2 flex-wrap">
              {mapTileOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setMapTile(opt.id)}
                  className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                    mapTile === opt.id
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300"
                      : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Language */}
        <Card title={t("pages.settings.language") || "Language"}>
          <div className="flex gap-2 flex-wrap">
            {languages.map((lang) => (
              <button
                key={lang.id}
                onClick={() => changeLanguage(lang.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  language === lang.id
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300"
                    : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500"
                }`}
              >
                <span className={`fi fi-${lang.flag} text-lg`}></span>
                {lang.label}
              </button>
            ))}
          </div>
        </Card>

        {/* Realtime Mode */}
        <Card title={t("pages.settings.realtimeMode") || "Realtime Mode"}>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            {t("pages.settings.realtimeModeDesc") || "Choose how the app receives real-time data. Changing this will reload the page."}
          </p>
          <div className="flex gap-2">
            {[{ id: "mqtt", label: "MQTT (WebSocket)" }, { id: "api", label: "API Polling" }].map((opt) => (
              <button
                key={opt.id}
                onClick={() => handleRealtimeModeChange(opt.id)}
                className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  REALTIME_MODE === opt.id
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300"
                    : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Card>

        {/* System Info */}
        <Card title={t("pages.settings.systemInfo") || "System Info"}>
          <div className="space-y-3">
            <InfoRow
              label={t("pages.settings.appVersion") || "App Version"}
              value={__APP_VERSION__}
            />
            <InfoRow
              label={t("pages.settings.wsConnection") || "WebSocket"}
              value={wsConnected ? (t("pages.settings.connected") || "Connected") : (t("pages.settings.disconnected") || "Disconnected")}
              status={wsConnected ? "green" : "red"}
            />
            <InfoRow
              label={t("pages.settings.mqttBroker") || "MQTT Broker"}
              value={mqttBroker || "-"}
            />
          </div>
        </Card>
      </div>

      <ConfirmModal
        isOpen={!!pendingRealtimeMode}
        onClose={() => setPendingRealtimeMode(null)}
        onConfirm={confirmRealtimeModeChange}
        title={t("pages.settings.changeRealtimeMode") || "Change Realtime Mode"}
        message={t("pages.settings.realtimeModeConfirm") || "Changing realtime mode will reload the page. Continue?"}
        confirmText={t("pages.settings.reloadNow") || "Reload Now"}
        cancelText={t("pages.settings.cancel") || "Cancel"}
        type="warning"
      />
    </div>
  );
};

export default Settings;
