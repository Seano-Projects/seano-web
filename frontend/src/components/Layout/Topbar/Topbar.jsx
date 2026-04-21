import React, { useEffect, useState, useMemo } from "react";
import useVehicleData from "../../../hooks/useVehicleData";
import useMissionData from "../../../hooks/useMissionData";
import useBatteryData from "../../../hooks/useBatteryData";
import { useLogData, useVehicleConnectionStatus } from "../../../hooks";
import { VehicleDropdown } from "../../Widgets";
import {
  FaBatteryEmpty,
  FaBatteryQuarter,
  FaBatteryHalf,
  FaBatteryThreeQuarters,
  FaBatteryFull,
  FaMapMarkerAlt,
  FaWifi,
  FaRoute,
} from "react-icons/fa";
import { FaLocationDot, FaLocationPin, FaMapLocation } from "react-icons/fa6";
import { getVehicleStatusLabel } from "../../../utils/vehicleStatus";
import useTranslation from "../../../hooks/useTranslation";

const Topbar = ({ isSidebarOpen, selectedVehicle, setSelectedVehicle }) => {
  const { t } = useTranslation();
  const [location, setLocation] = useState(t("tracking.topbar.waitingGps"));
  const { vehicles, loading } = useVehicleData();
  const { getActiveMissions } = useMissionData();
  const { vehicleLogs, ws } = useLogData();
  const { getVehicleStatus } = useVehicleConnectionStatus();
  const { batteryData = {} } = useBatteryData() || {};

  // USV battery units for selected vehicle
  const batteryCount = Number(selectedVehicle?.battery_count) === 1 ? 1 : 2;
  const vehicleBatteries = batteryData[selectedVehicle?.id] || {};
  const batteryUnits = Array.from({ length: batteryCount }, (_, i) => ({
    unit: String.fromCharCode(65 + i), // A, B
    data: vehicleBatteries[i + 1] || null,
  }));

  const renderBatteryIcon = (pct, unit) => {
    const level = pct ?? null;
    const color =
      level === null ? "text-gray-400"
      : level <= 10 ? "text-red-500"
      : level <= 30 ? "text-orange-500"
      : level <= 60 ? "text-yellow-500"
      : level <= 90 ? "text-green-400"
      : "text-green-500";
    const Icon =
      level === null || level <= 10 ? FaBatteryEmpty
      : level <= 30 ? FaBatteryQuarter
      : level <= 60 ? FaBatteryHalf
      : level <= 90 ? FaBatteryThreeQuarters
      : FaBatteryFull;
    const label = level !== null ? `${Math.round(level)}%` : "-- %";
    return (
      <div key={unit} className="flex items-center gap-1" title={`Battery ${unit}: ${label}`}>
        <Icon size={22} className={color} />
        <span className="hidden sm:inline text-xs font-medium">{label}</span>
      </div>
    );
  };

  // Get latest vehicle log for selected vehicle
  const vehicleLog = useMemo(() => {
    if (!selectedVehicle?.id || vehicleLogs.length === 0) return null;
    const filtered = vehicleLogs.filter(
      (log) => (log.vehicle?.id || log.vehicle_id) == selectedVehicle.id,
    );
    return filtered.length > 0 ? filtered[0] : null;
  }, [vehicleLogs, selectedVehicle]);

  // Determine connection status using MQTT LWT (realtime from broker)
  // Pure MQTT Last Will and Testament - no time-based detection
  const usvStatus = useMemo(() => {
    if (!selectedVehicle || !selectedVehicle.code) return "offline";
    return getVehicleStatus(selectedVehicle.code) || "offline";
  }, [selectedVehicle, getVehicleStatus]);

  // Get real RSSI from vehicle log (only when online)
  const rssiLevel = useMemo(() => {
    if (usvStatus !== 'online') return null;
    if (vehicleLog?.rssi !== undefined && vehicleLog?.rssi !== null) {
      return vehicleLog.rssi;
    }
    return null;
  }, [vehicleLog, usvStatus]);

  // Get current active mission for selected vehicle
  const getCurrentMission = () => {
    if (!selectedVehicle) return null;

    const activeMissions = getActiveMissions();
    return activeMissions.find(
      (mission) =>
        mission.vehicle === selectedVehicle.registration_code ||
        mission.vehicle === selectedVehicle.vehicle_name ||
        mission.vehicle === selectedVehicle.name,
    );
  };

  const currentMission = getCurrentMission();

  const renderRssiIcon = () => {
    if (rssiLevel === null) {
      return (
        <FaWifi
          size={20}
          className="text-gray-400"
          title={t("tracking.topbar.signal.noData")}
        />
      );
    }
    if (rssiLevel >= -50)
      return (
        <FaWifi
          size={20}
          className="text-green-500"
          title={t("tracking.topbar.signal.excellent")}
        />
      );
    if (rssiLevel >= -60)
      return (
        <FaWifi
          size={20}
          className="text-green-400"
          title={t("tracking.topbar.signal.good")}
        />
      );
    if (rssiLevel >= -70)
      return (
        <FaWifi
          size={20}
          className="text-yellow-500"
          title={t("tracking.topbar.signal.fair")}
        />
      );
    if (rssiLevel >= -80)
      return (
        <FaWifi
          size={20}
          className="text-orange-500"
          title={t("tracking.topbar.signal.poor")}
        />
      );
    return (
      <FaWifi
        size={20}
        className="text-red-500"
        title={t("tracking.topbar.signal.veryPoor")}
      />
    );
  };

  // Reverse geocoding untuk mendapatkan lokasi dari koordinat
  useEffect(() => {
    if (usvStatus !== 'online') {
      setLocation(t("tracking.topbar.waitingGps"));
      return;
    }
    if (vehicleLog?.latitude && vehicleLog?.longitude) {
      const lat = vehicleLog.latitude;
      const lon = vehicleLog.longitude;

      // Use Nominatim reverse geocoding
      fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`,
      )
        .then((res) => res.json())
        .then((data) => {
          if (data.address) {
            const city =
              data.address.city ||
              data.address.town ||
              data.address.village ||
              data.address.county;
            const state = data.address.state;
            const country = data.address.country;

            if (city && country) {
              setLocation(`${city}, ${country}`);
            } else if (state && country) {
              setLocation(`${state}, ${country}`);
            } else if (country) {
              setLocation(country);
            } else {
              setLocation(`${lat.toFixed(4)}, ${lon.toFixed(4)}`);
            }
          } else {
            setLocation(`${lat.toFixed(4)}, ${lon.toFixed(4)}`);
          }
        })
        .catch(() => {
          setLocation(`${lat.toFixed(4)}, ${lon.toFixed(4)}`);
        });
    } else {
      setLocation(t("tracking.topbar.waitingGps"));
    }
  }, [vehicleLog, t, usvStatus]);

  return (
    <div
      className={`fixed z-30 top-13 right-0 bg-white
                  py-2 px-3 border-b border-gray-200
                  dark:bg-black dark:border-gray-700
                  flex items-center justify-between gap-2
                  ${isSidebarOpen ? "md:left-64 left-16" : "left-16"}`}
    >
      <div className="flex items-center gap-2 dark:text-white text-sm min-w-0">
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`relative flex items-center gap-2 px-2.5 py-1.5 text-sm font-semibold rounded-full ${
              usvStatus === "online"
                ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                : usvStatus === "idle"
                  ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400"
                  : usvStatus === "offline"
                    ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                    : "bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
            }`}
          >
            {/* Bullet with pulse */}
            <span className="relative flex w-3 h-3">
              <span
                className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  usvStatus === "online" ? "animate-ping" : ""
                } ${
                  usvStatus === "online"
                    ? "bg-green-400"
                    : usvStatus === "idle"
                      ? "bg-yellow-400"
                      : usvStatus === "offline"
                        ? "bg-red-400"
                        : "bg-gray-400"
                }`}
              ></span>
              <span
                className={`relative inline-flex rounded-full w-3 h-3 ${
                  usvStatus === "online"
                    ? "bg-green-500"
                    : usvStatus === "idle"
                      ? "bg-yellow-500"
                      : usvStatus === "offline"
                        ? "bg-red-500"
                        : "bg-gray-500"
                }`}
              ></span>
            </span>

            {/* Status text with proper label */}
            {getVehicleStatusLabel(usvStatus)}
          </span>
        </div>
        <div className="w-36 sm:w-44 lg:min-w-50">
          <VehicleDropdown
            key={selectedVehicle?.id || "no-vehicle"}
            vehicles={vehicles}
            selectedVehicle={selectedVehicle}
            onVehicleChange={(vehicle) => {
              setSelectedVehicle(vehicle);
            }}
            placeholder={
              loading
                ? t("tracking.topbar.loadingVehicles")
                : t("tracking.topbar.selectVehicle")
            }
            className="text-sm"
            showPlaceholder={true}
          />
        </div>
      </div>

      {/* Indikator */}
      <div className="flex items-center gap-2 sm:gap-4 dark:text-white text-sm shrink-0">
        <div className="flex items-center gap-1 sm:gap-2">
          <FaRoute
            size={18}
            className={currentMission ? "text-blue-500" : "text-gray-400"}
          />
          <span
            className={`font-medium hidden xs:inline ${
              currentMission
                ? "text-blue-700 dark:text-blue-300"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {currentMission
              ? `WP ${currentMission.current_waypoint || 0}/${
                  currentMission.waypoints || 0
                }`
              : "WP -- / --"}
          </span>
          <span
            className={`font-medium inline xs:hidden ${
              currentMission
                ? "text-blue-700 dark:text-blue-300"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {currentMission
              ? `${currentMission.current_waypoint || 0}/${currentMission.waypoints || 0}`
              : "--/--"}
          </span>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {renderRssiIcon()}
          <span className="hidden sm:inline">
            {rssiLevel !== null ? `${rssiLevel} dBm` : "-- dBm"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {batteryUnits.map(({ unit, data }) =>
            renderBatteryIcon(data?.percentage, unit)
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <FaMapMarkerAlt className="text-red-400" />
          <span className="hidden lg:inline truncate max-w-40 xl:max-w-64">
            {location}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Topbar;
