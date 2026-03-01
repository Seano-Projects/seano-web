import React, { useState, useEffect, useMemo } from "react";
import {
  FaWifi,
  FaShieldAlt,
  FaLocationArrow,
  FaExclamationTriangle,
  FaArrowUp,
  FaThermometerHalf,
} from "react-icons/fa";
import { MdGpsFixed, MdGpsNotFixed } from "react-icons/md";
import useVehicleData from "../../../hooks/useVehicleData";
import { useLogData } from "../../../hooks/useLogData";
import useTranslation from "../../../hooks/useTranslation";

const VehicleStatusPanel = React.memo(({ selectedVehicle }) => {
  const { t } = useTranslation();
  const { vehicles, loading } = useVehicleData();
  const { vehicleLogs, ws } = useLogData(); // Get vehicle logs from WebSocket
  const [showTimeout, setShowTimeout] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Find latest vehicle log for selected vehicle from useLogData
  const vehicleLog = useMemo(() => {
    if (!selectedVehicle?.id || vehicleLogs.length === 0) return null;

    // Filter by vehicle ID and get the latest (first in array, newest first)
    const filtered = vehicleLogs.filter(
      (log) => (log.vehicle?.id || log.vehicle_id) == selectedVehicle.id,
    );

    return filtered.length > 0 ? filtered[0] : null;
  }, [vehicleLogs, selectedVehicle]);

  // Check if data is recent (less than 30 seconds old)
  const isDataRecent = (timestamp) => {
    if (!timestamp) return false;
    const now = new Date();
    const logTime = new Date(timestamp);
    const diffMs = now - logTime;
    return diffMs < 30000; // 30 seconds
  };

  // Check WebSocket connection status
  useEffect(() => {
    const wsConnected = ws && ws.readyState === WebSocket.OPEN;
    const hasRecentData =
      vehicleLog && isDataRecent(vehicleLog.timestamp || vehicleLog.created_at);
    setIsConnected(wsConnected && hasRecentData);
  }, [ws, vehicleLog]);

  // Monitor connection status with 15-second timeout
  useEffect(() => {
    if (!vehicleLog) return;

    const timeout = setTimeout(() => {
      setIsConnected(false);
    }, 15000);

    return () => clearTimeout(timeout);
  }, [vehicleLog]);

  // Set timeout to show default values after 5 seconds
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        setShowTimeout(true);
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, [loading]);

  const currentVehicle =
    vehicles.find((v) => v.id === selectedVehicle?.id) || {};

  const mergedData = { ...currentVehicle, ...vehicleLog };

  const vehicleStates = {
    connected:
      isConnected ||
      (vehicleLog && vehicleLog.rssi !== undefined && vehicleLog.rssi !== null)
        ? true
        : false,
    armed: mergedData.armed !== undefined ? mergedData.armed : null,
    guided: mergedData.guided !== undefined ? mergedData.guided : null,
    manual_input:
      mergedData.manual_input !== undefined ? mergedData.manual_input : null,
    mode: mergedData.mode || null,
    gps_fix:
      mergedData.gps_ok !== undefined
        ? mergedData.gps_ok
        : mergedData.gps_fix !== undefined
          ? mergedData.gps_fix
          : null,
    system_status:
      mergedData.system_status !== undefined ? mergedData.system_status : null,
  };

  const getModeColor = (mode) => {
    switch (mode?.toUpperCase()) {
      case "AUTO":
        return "text-green-600 bg-green-100 dark:bg-green-900/30";
      case "GUIDED":
        return "text-blue-600 bg-blue-100 dark:bg-blue-900/30";
      case "MANUAL":
        return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30";
      case "RTL":
        return "text-purple-600 bg-purple-100 dark:bg-purple-900/30";
      default:
        return "text-gray-600 bg-gray-100 dark:bg-gray-900/30";
    }
  };

  const getSystemStatusText = (status) => {
    if (status === null || status === undefined) {
      return { text: t("tracking.vehicleStatus.na"), color: "text-gray-600" };
    }

    // Handle both string and number status values
    const statusStr =
      typeof status === "string" ? status.toUpperCase() : String(status);

    // Match against status enum names
    if (statusStr.includes("UNKNOWN")) {
      return {
        text: t("tracking.vehicleStatus.statusUnknown"),
        color: "text-gray-600",
      };
    }
    if (statusStr.includes("BOOT")) {
      return {
        text: t("tracking.vehicleStatus.statusBoot"),
        color: "text-yellow-600",
      };
    }
    if (statusStr.includes("CALIBRATING")) {
      return {
        text: t("tracking.vehicleStatus.statusCalibrating"),
        color: "text-blue-600",
      };
    }
    if (statusStr.includes("STANDBY")) {
      return {
        text: t("tracking.vehicleStatus.statusStandby"),
        color: "text-yellow-600",
      };
    }
    if (statusStr.includes("ACTIVE")) {
      return {
        text: t("tracking.vehicleStatus.statusActive"),
        color: "text-green-600",
      };
    }
    if (statusStr.includes("CRITICAL")) {
      return {
        text: t("tracking.vehicleStatus.statusCritical"),
        color: "text-red-600",
      };
    }
    if (statusStr.includes("EMERGENCY")) {
      return {
        text: t("tracking.vehicleStatus.statusEmergency"),
        color: "text-red-800",
      };
    }

    // Fallback for numeric values
    const statusNum = typeof status === "string" ? parseInt(status) : status;
    switch (statusNum) {
      case 0:
        return {
          text: t("tracking.vehicleStatus.statusUnknown"),
          color: "text-gray-600",
        };
      case 1:
        return {
          text: t("tracking.vehicleStatus.statusBoot"),
          color: "text-yellow-600",
        };
      case 2:
        return {
          text: t("tracking.vehicleStatus.statusCalibrating"),
          color: "text-blue-600",
        };
      case 3:
        return {
          text: t("tracking.vehicleStatus.statusStandby"),
          color: "text-yellow-600",
        };
      case 4:
        return {
          text: t("tracking.vehicleStatus.statusActive"),
          color: "text-green-600",
        };
      case 5:
        return {
          text: t("tracking.vehicleStatus.statusCritical"),
          color: "text-red-600",
        };
      case 6:
        return {
          text: t("tracking.vehicleStatus.statusEmergency"),
          color: "text-red-800",
        };
      default:
        return {
          text: t("tracking.vehicleStatus.statusUnknown"),
          color: "text-gray-600",
        };
    }
  };

  const systemStatus = getSystemStatusText(vehicleStates.system_status);

  // Helper functions for formatting
  const formatCoordinate = (value) => {
    if (value === null || value === undefined)
      return t("tracking.vehicleStatus.na");
    const num = typeof value === "string" ? parseFloat(value) : value;
    return isNaN(num) ? t("tracking.vehicleStatus.na") : `${num.toFixed(8)}`;
  };

  const formatValue = (value, unit = "") => {
    if (value === null || value === undefined)
      return t("tracking.vehicleStatus.na");
    const num = typeof value === "string" ? parseFloat(value) : value;
    return isNaN(num)
      ? t("tracking.vehicleStatus.na")
      : `${num.toFixed(2)}${unit}`;
  };

  const formatTemperature = (value) => {
    if (value === null || value === undefined)
      return t("tracking.vehicleStatus.na");
    if (typeof value === "string") {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        return `${num.toFixed(2)}°C`;
      }
      return value;
    }
    return `${value.toFixed(2)}°C`;
  };

  const getRSSIColor = (rssi) => {
    if (rssi === null || rssi === undefined) return "text-gray-500";
    if (rssi >= -50) return "text-green-600";
    if (rssi >= -60) return "text-green-400";
    if (rssi >= -70) return "text-yellow-500";
    if (rssi >= -80) return "text-orange-500";
    return "text-red-500";
  };

  const getSignalBars = (rssi) => {
    if (rssi === null || rssi === undefined) return 0;
    if (rssi >= -50) return 4;
    if (rssi >= -60) return 3;
    if (rssi >= -70) return 2;
    if (rssi >= -80) return 1;
    return 0;
  };

  if (loading && !showTimeout) {
    return (
      <div className="h-full p-6 flex items-center justify-center">
        <div className="animate-pulse text-gray-500 dark:text-gray-400">
          {t("tracking.vehicleStatus.loading")}
        </div>
      </div>
    );
  }

  return (
    <div className="h-2/6 p-4 md:p-6 flex flex-col">
      {/* Header */}
      <div className="mb-4 md:mb-6">
        <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-1 md:mb-2">
          {t("tracking.vehicleStatus.title")}
        </h3>
        <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 truncate">
          {currentVehicle.name || t("tracking.vehicleStatus.noVehicle")}
        </p>
      </div>

      {/* Connection Status */}
      <div className="grid grid-cols-2 gap-2 md:gap-3 mb-4 md:mb-6 flex-shrink-0">
        <div className="p-2.5 md:p-3 rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-1">
            <FaWifi
              className={
                vehicleStates.connected === null
                  ? "text-gray-400"
                  : vehicleStates.connected
                    ? "text-green-600"
                    : "text-red-600"
              }
            />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {t("tracking.vehicleStatus.connection")}
            </span>
          </div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {vehicleStates.connected === null
              ? t("tracking.vehicleStatus.na")
              : vehicleStates.connected
                ? t("tracking.vehicleStatus.online")
                : t("tracking.vehicleStatus.offline")}
          </p>
        </div>

        <div className="p-2.5 md:p-3 rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-1">
            <FaShieldAlt
              className={
                vehicleStates.armed === true
                  ? "text-orange-600"
                  : "text-gray-400"
              }
            />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {t("tracking.vehicleStatus.armed")}
            </span>
          </div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {vehicleStates.armed === null
              ? t("tracking.vehicleStatus.na")
              : vehicleStates.armed
                ? t("tracking.vehicleStatus.armed")
                : t("tracking.vehicleStatus.disarmed")}
          </p>
        </div>
      </div>

      {/* Flight Mode & Guidance */}
      <div className="mb-4 md:mb-6 flex-shrink-0">
        <div className="flex items-center justify-between mb-2 md:mb-3">
          <span className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("tracking.vehicleStatus.flightMode")}
          </span>
          <span
            className={`px-2.5 md:px-3 py-1 text-xs font-semibold rounded-full ${getModeColor(
              vehicleStates.mode,
            )}`}
          >
            {vehicleStates.mode || t("tracking.vehicleStatus.na")}
          </span>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-2">
            {(() => {
              const gpsNum =
                typeof vehicleStates.gps_fix === "string"
                  ? parseInt(vehicleStates.gps_fix)
                  : vehicleStates.gps_fix;
              return gpsNum === null || gpsNum === 0 ? (
                <MdGpsNotFixed className="text-gray-400" />
              ) : gpsNum >= 3 ? (
                <MdGpsFixed className="text-green-600" />
              ) : (
                <MdGpsFixed className="text-yellow-600" />
              );
            })()}
            <span
              className={(() => {
                const gpsNum =
                  typeof vehicleStates.gps_fix === "string"
                    ? parseInt(vehicleStates.gps_fix)
                    : vehicleStates.gps_fix;
                return gpsNum === null || gpsNum === 0
                  ? "text-gray-500"
                  : gpsNum >= 3
                    ? "text-green-600 dark:text-green-400"
                    : "text-yellow-600 dark:text-yellow-400";
              })()}
            >
              {t("tracking.vehicleStatus.gps")}{" "}
              {(() => {
                const gpsNum =
                  typeof vehicleStates.gps_fix === "string"
                    ? parseInt(vehicleStates.gps_fix)
                    : vehicleStates.gps_fix;
                return gpsNum === null
                  ? t("tracking.vehicleStatus.na")
                  : gpsNum === 0
                    ? t("tracking.vehicleStatus.noFix")
                    : gpsNum === 1
                      ? t("tracking.vehicleStatus.deadReckoning")
                      : gpsNum === 2
                        ? t("tracking.vehicleStatus.fix2d")
                        : gpsNum === 3
                          ? t("tracking.vehicleStatus.fix3d")
                          : `${gpsNum} ${t("tracking.vehicleStatus.fix")}`;
              })()}
            </span>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="mb-4 md:mb-6 p-3 md:p-4 bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-2 mb-1.5 md:mb-2">
          <FaExclamationTriangle className={systemStatus.color} size={16} />
          <span className="text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300">
            {t("tracking.vehicleStatus.systemStatus")}
          </span>
        </div>
        <p className="text-base md:text-lg font-bold text-gray-900 dark:text-gray-100">
          {systemStatus.text}
        </p>
        {mergedData.system_status && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {t("tracking.vehicleStatus.statusCode")}
          </p>
        )}
      </div>

      {/* Position Data */}
      <div className="mb-3 md:mb-4 p-3 md:p-4 bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-2 mb-2 md:mb-3">
          <FaArrowUp className="text-purple-600" />
          <span className="text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300">
            {t("tracking.vehicleStatus.position")}
          </span>
        </div>
        <div className="space-y-1.5 md:space-y-2 text-xs md:text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">
              {t("tracking.vehicleStatus.latitude")}:
            </span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {formatCoordinate(mergedData.latitude)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">
              {t("tracking.vehicleStatus.longitude")}:
            </span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {formatCoordinate(mergedData.longitude)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">
              {t("tracking.vehicleStatus.altitude")}:
            </span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {formatValue(mergedData.altitude, " m")}
            </span>
          </div>
        </div>
      </div>

      {/* Signal & Temperature */}
      <div className="grid grid-cols-2 gap-2 md:gap-3 flex-shrink-0">
        <div className="p-2.5 md:p-3 bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-1.5 md:mb-2">
            <FaWifi className={getRSSIColor(mergedData.rssi)} />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {t("tracking.vehicleStatus.signal")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className={`w-1 h-3 rounded ${
                    i < getSignalBars(mergedData.rssi)
                      ? getRSSIColor(mergedData.rssi).replace("text-", "bg-")
                      : "bg-gray-300 dark:bg-gray-600"
                  }`}
                />
              ))}
            </div>
            <span
              className={`text-xs font-medium ${getRSSIColor(mergedData.rssi)}`}
            >
              {mergedData.rssi !== null && mergedData.rssi !== undefined
                ? `${mergedData.rssi} dBm`
                : t("tracking.vehicleStatus.na")}
            </span>
          </div>
        </div>

        <div className="p-2.5 md:p-3 bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-1.5 md:mb-2">
            <FaThermometerHalf className="text-orange-500" />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {t("tracking.vehicleStatus.temp")}
            </span>
          </div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {formatTemperature(
              mergedData.temperature_system || mergedData.temperature,
            )}
          </p>
        </div>
      </div>
    </div>
  );
});

export default VehicleStatusPanel;
