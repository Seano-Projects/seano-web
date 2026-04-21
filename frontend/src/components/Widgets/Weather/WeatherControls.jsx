import React from "react";
import { FaSync, FaSatelliteDish, FaLocationArrow, FaMapMarkerAlt } from "react-icons/fa";
import { VehicleDropdown } from "../index";
import useTranslation from "../../../hooks/useTranslation";

const WeatherControls = ({
  vehicles,
  selectedVehicle,
  vehicleLoading,
  onVehicleChange,
  coordsSource,
  geoLoading,
  geoError,
  lastRefreshTime,
  weatherLoading,
  activeCoords,
  onRefresh,
}) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      {/* Left: dropdown + source badge */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-44">
          <VehicleDropdown
            vehicles={vehicles}
            selectedVehicle={selectedVehicle}
            onVehicleChange={onVehicleChange}
            placeholder={vehicleLoading ? t("tracking.topbar.loadingVehicles") : t("tracking.topbar.selectVehicle")}
            className="text-sm"
            showPlaceholder={true}
          />
        </div>
        {coordsSource === "usv" && (
          <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
            <FaSatelliteDish size={10} /> {t("weather.sourceUsv")}
          </span>
        )}
        {coordsSource === "browser" && (
          <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
            <FaLocationArrow size={10} /> {t("weather.sourceBrowser")}
          </span>
        )}
        {!coordsSource && !geoLoading && (
          <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
            <FaMapMarkerAlt size={10} /> {geoError ? t("weather.locationError") : t("weather.sourceNone")}
          </span>
        )}
        {geoLoading && (
          <span className="text-xs text-gray-500 dark:text-gray-400 animate-pulse">{t("weather.locatingBrowser")}</span>
        )}
      </div>

      {/* Right: updated time + refresh */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {lastRefreshTime && (
          <span className="hidden sm:inline text-xs text-gray-400 dark:text-gray-500">
            {t("weather.lastUpdated")}: {lastRefreshTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
        <button
          onClick={onRefresh}
          disabled={weatherLoading || !activeCoords}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-40 transition-colors"
        >
          <FaSync size={10} className={weatherLoading ? "animate-spin" : ""} />
          {t("weather.refresh")}
        </button>
      </div>
    </div>
  );
};

export default WeatherControls;
