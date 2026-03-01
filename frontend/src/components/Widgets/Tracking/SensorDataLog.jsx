import React, { useState, useEffect, useRef } from "react";
import { LogSkeleton } from "../../Skeleton";
import useLoadingTimeout from "../../../hooks/useLoadingTimeout";
import { Dropdown } from "../index";
import { useLogData } from "../../../hooks/useLogData";
import useTranslation from "../../../hooks/useTranslation";

/**
 * SensorDataLog - Log Data Sensor
 *
 * SUMBER DATA:
 * - Historis: GET /sensor-logs/?vehicle_id={id}&limit=50 (API)
 * - Real-time: WebSocket `/ws/logs` untuk update real-time
 *
 * CARA KERJA:
 * - Ambil data dari useLogData hook (shared dengan halaman Log)
 * - Filter log berdasarkan selectedVehicle dan sensor type
 * - Tampilkan indicator "Live" ketika WebSocket terhubung
 * - Support filter berdasarkan tipe sensor (GPS, Environmental, Accelerometer, dll)
 * - Handle format JSON dan plain text
 * - Maksimal 50 log, paling baru di atas
 *
 * @param {object} selectedVehicle - Objek kendaraan dari parent (halaman Tracking)
 */
const SensorDataLog = ({ selectedVehicle }) => {
  const { t } = useTranslation();
  const { sensorLogs, ws } = useLogData(); // Ambil dari useLogData
  const [hasNewData, setHasNewData] = useState(false);
  const [selectedSensor, setSelectedSensor] = useState("all");
  const { loading } = useLoadingTimeout(true, 2000);
  const updateTimeoutRef = useRef(null);
  const prevLogsLengthRef = useRef(0);

  // Monitor perubahan sensorLogs untuk menampilkan animasi "new data"
  useEffect(() => {
    if (sensorLogs.length > prevLogsLengthRef.current) {
      setHasNewData(true);
      if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = setTimeout(() => {
        setHasNewData(false);
      }, 2000);
    }
    prevLogsLengthRef.current = sensorLogs.length;
  }, [sensorLogs]);

  // Filter logs by selected vehicle first (handle both number and string IDs)
  const vehicleFilteredLogs = selectedVehicle?.id
    ? sensorLogs.filter((log) => {
        const logVehicleId = log.vehicle?.id || log.vehicle_id;
        const match = logVehicleId == selectedVehicle.id;
        return match;
      })
    : sensorLogs;

  // Get sensor type name from log (handle different data structures)
  const getSensorTypeName = (log) => {
    return log.sensor?.sensor_type?.name || log.sensor_type || "Unknown";
  };

  // Then filter by sensor type
  const filteredLogs =
    selectedSensor === "all"
      ? vehicleFilteredLogs
      : vehicleFilteredLogs.filter(
          (log) => getSensorTypeName(log) === selectedSensor,
        );

  // Get unique sensor types from vehicle-filtered logs
  const sensorTypes = [
    "all",
    ...new Set(
      vehicleFilteredLogs.map((log) => getSensorTypeName(log)).filter(Boolean),
    ),
  ];

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatSensorData = (data) => {
    if (!data || typeof data !== "object") return '{"error": "Invalid data"}';
    // Display inline, not pretty-print
    return JSON.stringify(data);
  };

  const getSensorColor = (sensorType) => {
    switch (sensorType) {
      case "Environmental":
        return "text-green-600 dark:text-green-400";
      case "Accelerometer":
        return "text-blue-600 dark:text-blue-400";
      case "Gyroscope":
        return "text-purple-600 dark:text-purple-400";
      case "Depth":
        return "text-cyan-600 dark:text-cyan-400";
      case "GPS":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  const isConnected = ws && ws.readyState === WebSocket.OPEN;

  if (loading && filteredLogs.length === 0) {
    return (
      <div className="p-4 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 w-36 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          <div className="flex items-center space-x-2">
            <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <LogSkeleton lines={7} />
        </div>
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-4 h-full flex flex-col">
      <div className="flex flex-col gap-2 mb-3 md:mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">
              {t("tracking.sensorLog.title")}
            </h3>
            {isConnected && (
              <div className="flex items-center gap-1">
                <div
                  className={`w-2 h-2 rounded-full ${
                    hasNewData ? "bg-blue-500 animate-pulse" : "bg-blue-500"
                  }`}
                ></div>
                <span className="text-xs text-blue-600 dark:text-blue-400">
                  {t("tracking.sensorLog.live")}
                </span>
              </div>
            )}
          </div>
          <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate ml-2">
            {selectedVehicle?.name ||
              selectedVehicle?.code ||
              t("tracking.sensorLog.allVehicles")}
          </span>
        </div>
        <div className="w-full sm:w-auto sm:self-start">
          <Dropdown
            items={sensorTypes.map((type) => ({
              id: type,
              name: type === "all" ? t("tracking.sensorLog.allSensors") : type,
              label: type === "all" ? t("tracking.sensorLog.allSensors") : type,
            }))}
            selectedItem={selectedSensor}
            onItemChange={setSelectedSensor}
            placeholder={t("tracking.sensorLog.selectSensor")}
            className="text-xs"
          />
        </div>
      </div>
      {/* 
      {error && (
        <div className="mb-3 p-2 bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded text-sm text-yellow-800 dark:text-yellow-200">
          {error} - Showing mock data
        </div>
      )} */}

      <div className="flex-1 overflow-y-auto space-y-1.5 md:space-y-2 font-mono custom-scrollbar">
        {filteredLogs.map((log, index) => {
          const sensorTypeName = getSensorTypeName(log);
          let dataToShow = log.data;
          // If data is string (from WebSocket), parse it
          if (typeof log.data === "string") {
            try {
              dataToShow = JSON.parse(log.data);
            } catch {
              dataToShow = log.data;
            }
          }

          return (
            <div
              key={log.id || index}
              className={`p-2 md:p-3 rounded-md border-l-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                sensorTypeName === "Environmental"
                  ? "border-green-500"
                  : sensorTypeName === "Accelerometer"
                    ? "border-blue-500"
                    : sensorTypeName === "Gyroscope"
                      ? "border-purple-500"
                      : sensorTypeName === "Depth"
                        ? "border-cyan-500"
                        : sensorTypeName === "GPS"
                          ? "border-red-500"
                          : "border-gray-400"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1.5 mb-1.5 md:mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400">
                    {formatTime(log.created_at)}
                  </span>
                  <span
                    className={`px-1.5 md:px-2 py-0.5 rounded text-[9px] md:text-xs font-semibold ${getSensorColor(
                      sensorTypeName,
                    )} bg-opacity-20`}
                  >
                    {sensorTypeName}
                  </span>
                </div>
                <span className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400">
                  {log.sensor?.code || "N/A"}
                </span>
              </div>
              <div className="text-gray-700 dark:text-gray-300 break-words text-[10px] md:text-xs leading-relaxed bg-gray-50 dark:bg-gray-800 p-1.5 md:p-2 rounded overflow-x-auto">
                {formatSensorData(dataToShow)}
              </div>
            </div>
          );
        })}

        {filteredLogs.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400 py-12 md:py-20 font-openSans">
            <div className="text-3xl md:text-4xl mb-2">📡</div>
            <p className="text-sm md:text-base">
              {t("tracking.sensorLog.noLogs")}
            </p>
            {selectedSensor !== "all" && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {t("tracking.sensorLog.forSensors")} {selectedSensor}{" "}
                {t("tracking.sensorLog.sensors")}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-[10px] md:text-xs text-gray-500 dark:text-gray-400">
          <span className="font-medium">
            {filteredLogs.length} {t("tracking.sensorLog.of")}{" "}
            {vehicleFilteredLogs.length}{" "}
            {filteredLogs.length === 1
              ? t("tracking.sensorLog.entry")
              : t("tracking.sensorLog.entries")}
            {selectedSensor !== "all" && ` (${selectedSensor})`}
          </span>
          <span className="hidden sm:inline">
            {t("tracking.sensorLog.lastUpdated")}:{" "}
            {formatTime(new Date().toISOString())}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SensorDataLog;
