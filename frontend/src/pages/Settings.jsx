import React, { useState } from "react";
import { FaSun, FaMoon } from "react-icons/fa";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import useTitle from "../hooks/useTitle";
import { Title, ConfirmModal } from "../components/ui";
import useTranslation from "../hooks/useTranslation";
import { useLanguage } from "../contexts/LanguageContext";
import { useVehicleConnection } from "../contexts/VehicleConnectionContext";
import { useSystemSettings } from "../contexts/SystemSettingsContext";

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
        <span className={`w-2 h-2 rounded-full ${status === "green" ? "bg-green-500 animate-breathe" : "bg-red-500"}`} />
      )}
      {value}
    </span>
  </div>
);

const Settings = ({ darkMode, toggleDarkMode }) => {
  const { t } = useTranslation();
  const { language, changeLanguage } = useLanguage();
  const { isConnected: wsConnected } = useVehicleConnection();
  const { settings } = useSystemSettings();
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

  const themeOptions = [
    { id: "light", icon: FaSun, label: "Light" },
    { id: "dark", icon: FaMoon, label: "Dark" },
  ];

  const mapTileOptions = [
    { id: "street", label: "Street" },
    { id: "satellite", label: "Satellite (ESRI)" },
    { id: "dark", label: "Dark" },
    { id: "mapbox-satellite", label: "Mapbox Satellite", disabled: !settings.mapbox_enabled },
    { id: "google-satellite", label: "Google Satellite", disabled: !settings.google_maps_enabled },
  ];

  const TILE_URLS = {
    street: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    "mapbox-satellite": `https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}.png?access_token=${settings.mapbox_token}`,
    "google-satellite": "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  };

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
                  type="button"
                  disabled={opt.disabled}
                  title={opt.disabled ? "Temporarily unavailable" : undefined}
                  onClick={() => {
                    if (!opt.disabled) setMapTile(opt.id);
                  }}
                  className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                    opt.disabled
                      ? "border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 opacity-50 cursor-not-allowed"
                      : mapTile === opt.id
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300"
                        : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="mt-3 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700" style={{ height: 180 }}>
              <MapContainer
                key={mapTile}
                center={[-6.2, 106.816]}
                zoom={13}
                className="w-full h-full"
                style={{ height: "100%", width: "100%" }}
                zoomControl={false}
                dragging={false}
                scrollWheelZoom={false}
                doubleClickZoom={false}
                attributionControl={false}
              >
                <TileLayer url={TILE_URLS[mapTile] || TILE_URLS.street} />
              </MapContainer>
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

    </div>
  );
};

export default Settings;
