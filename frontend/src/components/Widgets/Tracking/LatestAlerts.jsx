import React, { useState, useEffect, useRef } from "react";
import { LogSkeleton } from "../../Skeleton";
import useLoadingTimeout from "../../../hooks/useLoadingTimeout";
import {
  FaExclamationTriangle,
  FaInfoCircle,
  FaCheckCircle,
  FaTimesCircle,
  FaBell,
} from "react-icons/fa";
import useTranslation from "../../../hooks/useTranslation";

/**
 * LatestAlerts - Panel Alert Terbaru
 *
 * SUMBER DATA:
 * - Mock data untuk sementara (backend endpoint belum ada)
 *
 * CARA KERJA:
 * - Tampilkan alert berdasarkan vehicle terpilih
 * - Format mirip RawDataLog dan SensorDataLog
 * - No auto-refresh, static display
 *
 * @param {object} selectedVehicle - Objek kendaraan dari parent
 */
const LatestAlerts = ({ selectedVehicle }) => {
  const { t } = useTranslation();
  const [alerts, setAlerts] = useState([]);
  const { loading } = useLoadingTimeout(true, 2000);

  // Mock alerts data (karena backend belum ada)
  useEffect(() => {
    // Set empty alerts for now
    setAlerts([]);
  }, [selectedVehicle]);

  const formatTime = (timestamp) => {
    if (!timestamp) return "--:--:--";
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getAlertIcon = (severity) => {
    switch (severity?.toLowerCase()) {
      case "critical":
      case "error":
        return FaTimesCircle;
      case "warning":
        return FaExclamationTriangle;
      case "info":
        return FaInfoCircle;
      case "success":
        return FaCheckCircle;
      default:
        return FaBell;
    }
  };

  const getAlertColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case "critical":
      case "error":
        return {
          bg: "bg-red-50 dark:bg-red-900/20",
          border: "border-red-200 dark:border-red-800",
          icon: "text-red-500",
          text: "text-red-700 dark:text-red-300",
        };
      case "warning":
        return {
          bg: "bg-yellow-50 dark:bg-yellow-900/20",
          border: "border-yellow-200 dark:border-yellow-800",
          icon: "text-yellow-500",
          text: "text-yellow-700 dark:text-yellow-300",
        };
      case "info":
        return {
          bg: "bg-blue-50 dark:bg-blue-900/20",
          border: "border-blue-200 dark:border-blue-800",
          icon: "text-blue-500",
          text: "text-blue-700 dark:text-blue-300",
        };
      case "success":
        return {
          bg: "bg-green-50 dark:bg-green-900/20",
          border: "border-green-200 dark:border-green-800",
          icon: "text-green-500",
          text: "text-green-700 dark:text-green-300",
        };
      default:
        return {
          bg: "bg-gray-50 dark:bg-gray-800/50",
          border: "border-gray-200 dark:border-gray-700",
          icon: "text-gray-500",
          text: "text-gray-700 dark:text-gray-300",
        };
    }
  };

  if (loading && alerts.length === 0) {
    return (
      <div className="p-4 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 w-36 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
        <div className="flex-1 overflow-hidden">
          <LogSkeleton lines={5} />
        </div>
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3 md:mb-4">
        <div className="flex items-center gap-2">
          <FaBell className="text-orange-500" />
          <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">
            {t("tracking.alerts.title")}
          </h3>
        </div>
        <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
          {selectedVehicle?.registration_code ||
            selectedVehicle?.name ||
            "USV 001"}
        </span>
      </div>

      {/* Alerts List */}
      <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
        {alerts.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <FaCheckCircle className="text-3xl md:text-4xl mb-2 md:mb-3 text-green-500" />
            <div className="text-xs md:text-sm font-medium">
              {t("tracking.alerts.noAlerts")}
            </div>
            <div className="text-[10px] md:text-xs">
              {t("tracking.alerts.operatingNormally")}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-[10px] md:text-xs text-gray-500 dark:text-gray-400">
          <span className="font-medium">0 alerts</span>
          <span className="hidden sm:inline">
            Last updated: {formatTime(new Date())}
          </span>
        </div>
      </div>
    </div>
  );
};

export default LatestAlerts;
