import React, { useEffect, useState, useMemo, useRef } from "react";
import useVehicleData from "../../../hooks/useVehicleData";
import useMissionData from "../../../hooks/useMissionData";
import useBatteryData from "../../../hooks/useBatteryData";
import { useLogDataContext } from "../../../contexts/LogDataContext";
import { useVehicleConnectionStatus } from "../../../hooks";
import { VehicleDropdown } from "../../Widgets";
import {
  FaBatteryEmpty,
  FaBatteryQuarter,
  FaBatteryHalf,
  FaBatteryThreeQuarters,
  FaBatteryFull,
  FaMapMarkerAlt,
  FaRoute,
  FaEllipsisV,
} from "react-icons/fa";
import { FaLocationDot, FaLocationPin, FaMapLocation } from "react-icons/fa6";
import { getVehicleStatusLabel } from "../../../utils/vehicleStatus";
import useTranslation from "../../../hooks/useTranslation";

const Topbar = ({ isSidebarOpen, selectedVehicle, setSelectedVehicle }) => {
  const { t } = useTranslation();
  const [location, setLocation] = useState(t("tracking.topbar.waitingGps"));
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const mobileMenuRef = useRef(null);
  const { vehicles, loading } = useVehicleData();
  const { missionData, getActiveMissions } = useMissionData();
  const { vehicleLogs } = useLogDataContext();
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
      level === null
        ? "text-gray-400"
        : level <= 10
          ? "text-red-500"
          : level <= 30
            ? "text-orange-500"
            : level <= 60
              ? "text-yellow-500"
              : level <= 90
                ? "text-green-400"
                : "text-green-500";
    const Icon =
      level === null || level <= 10
        ? FaBatteryEmpty
        : level <= 30
          ? FaBatteryQuarter
          : level <= 60
            ? FaBatteryHalf
            : level <= 90
              ? FaBatteryThreeQuarters
              : FaBatteryFull;
    const label = level !== null ? `${Math.round(level)}%` : "-- %";
    return (
      <div
        key={unit}
        className="flex items-center gap-1"
        title={`Battery ${unit}: ${label}`}
      >
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


  // Get current active mission for selected vehicle - match by ID (vehicle field is an object from API)
  const currentMission = useMemo(() => {
    if (!selectedVehicle) return null;
    const activeMissions = getActiveMissions();
    return (
      activeMissions.find((mission) => {
        const missionVehicleId =
          mission.vehicle_id ||
          (typeof mission.vehicle === "object" ? mission.vehicle?.id : null);
        return Number(missionVehicleId) === Number(selectedVehicle.id);
      }) || null
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVehicle, missionData]);

  const currentWaypointProgress = useMemo(() => {
    if (!currentMission) return null;

    // current_waypoint from vehicle is 1-based; display as-is
    const current = Math.max(0, Number(currentMission.current_waypoint) || 0);

    if (Array.isArray(currentMission.waypoints)) {
      const totalFromArray = currentMission.waypoints.filter((waypoint) => {
        if (!waypoint) return false;
        return !(
          waypoint.type === "zone" ||
          waypoint.shape ||
          waypoint.bounds ||
          Array.isArray(waypoint.vertices)
        );
      }).length;

      return {
        current,
        total: totalFromArray,
      };
    }

    return { current, total: 0 };
  }, [currentMission]);



  // Reverse geocoding untuk mendapatkan lokasi dari koordinat
  useEffect(() => {
    if (usvStatus !== "online") {
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

  useEffect(() => {
    const handler = (e) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target)) {
        setShowMobileMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div
      className={`fixed z-9000 top-13 right-0 bg-white
                  py-2 border-b border-gray-200
                  dark:bg-black dark:border-gray-700
                  px-4 md:px-8 lg:px-12
                  ${isSidebarOpen ? "md:left-64 left-0" : "md:left-16 left-0"}`}
    >
      <div className="max-w-8xl mx-auto flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 dark:text-white text-sm min-w-0">
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`relative flex items-center gap-2 px-2.5 py-1.5 text-sm font-semibold rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-black ${
              usvStatus === "online"
                ? "text-green-600"
                : usvStatus === "idle"
                  ? "text-yellow-600"
                  : usvStatus === "offline"
                    ? "text-red-600"
                    : "text-gray-500"
            }`}
          >
            {/* Bullet with breathe */}
            <span className="relative flex w-3 h-3 items-center justify-center">
              <span
                className={`relative inline-flex rounded-full w-3 h-3 ${
                  usvStatus === "online"
                    ? "bg-green-500 animate-breathe"
                    : usvStatus === "idle"
                      ? "bg-yellow-500"
                      : usvStatus === "offline"
                        ? "bg-red-500"
                        : "bg-gray-400"
                }`}
              ></span>
            </span>

            {/* Status text with proper label */}
            {getVehicleStatusLabel(usvStatus)}
          </span>
        </div>
        <div className="flex-1 min-w-0 max-w-44 sm:max-w-64 lg:max-w-80">
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

      {/* Indikator — desktop */}
      <div className="hidden sm:flex items-center gap-2 sm:gap-4 dark:text-white text-sm shrink-0">
        <div className="flex items-center gap-1 sm:gap-2">
          <FaRoute
            size={18}
            className={currentMission ? "text-blue-500" : "text-gray-400"}
          />
          <span
            className={`font-medium ${
              currentMission
                ? "text-blue-700 dark:text-blue-300"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {currentWaypointProgress
              ? `WP ${currentWaypointProgress.current}/${currentWaypointProgress.total}`
              : "WP --/--"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {batteryUnits.map(({ unit, data }) =>
            renderBatteryIcon(data?.percentage, unit),
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <FaMapMarkerAlt className="text-red-400" />
          <span className="hidden lg:inline truncate max-w-40 xl:max-w-64">
            {location}
          </span>
        </div>
      </div>

      {/* Indikator — mobile 3-dot floating menu */}
      <div className="flex sm:hidden relative" ref={mobileMenuRef}>
        <button
          onClick={() => setShowMobileMenu((v) => !v)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors dark:text-white"
          aria-label="Show vehicle info"
        >
          <FaEllipsisV size={16} />
        </button>

        {showMobileMenu && (
          <div className="absolute right-0 top-9 w-52 bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-10001 p-3 space-y-3">
            <div className="flex items-center gap-2 dark:text-white text-sm">
              <FaRoute
                size={16}
                className={currentMission ? "text-blue-500" : "text-gray-400"}
              />
              <span
                className={`font-medium ${
                  currentMission
                    ? "text-blue-700 dark:text-blue-300"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                {currentWaypointProgress
                  ? `WP ${currentWaypointProgress.current}/${currentWaypointProgress.total}`
                  : "WP --/--"}
              </span>
            </div>

            <div className="flex items-center gap-2 dark:text-white text-sm">
              {batteryUnits.map(({ unit, data }) =>
                renderBatteryIcon(data?.percentage, unit),
              )}
            </div>

            <div className="flex items-start gap-2 dark:text-white text-sm">
              <FaMapMarkerAlt className="text-red-400 mt-0.5 shrink-0" />
              <span className="text-gray-700 dark:text-gray-300 wrap-break-word leading-tight">
                {location}
              </span>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default Topbar;
