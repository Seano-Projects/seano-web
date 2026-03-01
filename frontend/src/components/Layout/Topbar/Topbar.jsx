import React, { useEffect, useState, useMemo } from "react";
import useVehicleData from "../../../hooks/useVehicleData";
import useMissionData from "../../../hooks/useMissionData";
import { useLogData } from "../../../hooks/useLogData";
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
import {
  determineVehicleStatus,
  getVehicleStatusLabel,
} from "../../../utils/vehicleStatus";

const Topbar = ({ isSidebarOpen, selectedVehicle, setSelectedVehicle }) => {
  const [batteryLevel, setBatteryLevel] = useState(1);
  const [location, setLocation] = useState("Waiting for GPS...");
  const { vehicles, loading } = useVehicleData();
  const { getActiveMissions } = useMissionData();
  const { vehicleLogs, ws } = useLogData();

  // Get latest vehicle log for selected vehicle
  const vehicleLog = useMemo(() => {
    if (!selectedVehicle?.id || vehicleLogs.length === 0) return null;
    const filtered = vehicleLogs.filter(
      (log) => (log.vehicle?.id || log.vehicle_id) == selectedVehicle.id,
    );
    return filtered.length > 0 ? filtered[0] : null;
  }, [vehicleLogs, selectedVehicle]);

  // Determine connection status using best practices
  const usvStatus = useMemo(() => {
    if (!selectedVehicle) return "offline";
    if (!vehicleLog?.timestamp) return "offline";

    // Use the new status determination utility with proper thresholds
    return determineVehicleStatus({
      lastDataTime: vehicleLog.timestamp,
      websocket: ws,
      currentTime: Date.now(),
    });
  }, [selectedVehicle, vehicleLog, ws]);

  // Get real RSSI from vehicle log
  const rssiLevel = useMemo(() => {
    if (vehicleLog?.rssi !== undefined && vehicleLog?.rssi !== null) {
      return vehicleLog.rssi;
    }
    return null;
  }, [vehicleLog]);

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

  useEffect(() => {
    if (navigator.getBattery) {
      navigator.getBattery().then((battery) => {
        setBatteryLevel(battery.level);
        battery.addEventListener("levelchange", () =>
          setBatteryLevel(battery.level),
        );
      });
    }
  }, []);

  const renderBatteryIcon = () => {
    if (batteryLevel <= 0.1)
      return <FaBatteryEmpty size={30} className="text-red-500" />;
    if (batteryLevel <= 0.3)
      return <FaBatteryQuarter size={30} className="text-orange-500" />;
    if (batteryLevel <= 0.6)
      return <FaBatteryHalf size={30} className="text-yellow-500" />;
    if (batteryLevel <= 0.9)
      return <FaBatteryThreeQuarters size={30} className="text-green-400" />;
    return <FaBatteryFull size={30} className="text-green-500" />;
  };

  const renderRssiIcon = () => {
    if (rssiLevel === null) {
      return (
        <FaWifi size={20} className="text-gray-400" title="No Signal Data" />
      );
    }
    if (rssiLevel >= -50)
      return (
        <FaWifi size={20} className="text-green-500" title="Excellent Signal" />
      );
    if (rssiLevel >= -60)
      return (
        <FaWifi size={20} className="text-green-400" title="Good Signal" />
      );
    if (rssiLevel >= -70)
      return (
        <FaWifi size={20} className="text-yellow-500" title="Fair Signal" />
      );
    if (rssiLevel >= -80)
      return (
        <FaWifi size={20} className="text-orange-500" title="Poor Signal" />
      );
    return (
      <FaWifi size={20} className="text-red-500" title="Very Poor Signal" />
    );
  };

  // Reverse geocoding untuk mendapatkan lokasi dari koordinat
  useEffect(() => {
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
      setLocation("Waiting for GPS...");
    }
  }, [vehicleLog]);

  return (
    <div
      className={`fixed z-30 top-15 right-0 bg-white
                  h-30 sm:h-15 py-2 px-4 border-b border-gray-200
                  dark:bg-black dark:border-gray-700
                  flex flex-col sm:flex-row space-y-3 md:space-y-0 sm:items-center sm:justify-between
                  ${isSidebarOpen ? "md:left-64 left-16" : "left-16"}`}
    >
      <div className="flex items-center gap-4 dark:text-white text-sm">
        <div className="flex items-center gap-2">
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
        <div className="min-w-50">
          <VehicleDropdown
            key={selectedVehicle?.id || "no-vehicle"}
            vehicles={vehicles}
            selectedVehicle={selectedVehicle}
            onVehicleChange={(vehicle) => {
              setSelectedVehicle(vehicle);
            }}
            placeholder={loading ? "Loading vehicles..." : "Select Vehicle"}
            className="text-sm"
            showPlaceholder={true}
          />
        </div>
      </div>

      {/* Indikator */}
      <div className="flex items-center gap-4 dark:text-white text-sm">
        <div className="flex items-center gap-2">
          <FaRoute
            size={20}
            className={currentMission ? "text-blue-500" : "text-gray-400"}
          />
          <span
            className={`font-mono font-medium ${
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
        </div>

        <div className="flex items-center gap-2">
          {renderRssiIcon()}
          <span>{rssiLevel !== null ? `${rssiLevel} dBm` : "-- dBm"}</span>
        </div>

        <div className="flex items-center gap-2">
          {renderBatteryIcon()}
          <span>{Math.round(batteryLevel * 100)}%</span>
        </div>

        <div className="flex items-center gap-2">
          <FaMapMarkerAlt className="text-red-400" />
          <span>{location}</span>
        </div>
      </div>
    </div>
  );
};

export default Topbar;
