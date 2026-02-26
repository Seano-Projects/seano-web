import React, { useEffect, useState, useRef } from "react";
import { LogSkeleton } from "../../Skeleton";
import useLoadingTimeout from "../../../hooks/useLoadingTimeout";
import { useLogData } from "../../../hooks/useLogData";

/**
 * RawDataLog - Log Data Mentah
 *
 * SUMBER DATA:
 * - Historis: GET /raw-logs/?vehicle_id={id}&limit=50 (API)
 * - Real-time: WebSocket `/ws/logs` untuk update real-time
 *
 * CARA KERJA:
 * - Ambil data dari useLogData hook (shared dengan halaman Log)
 * - Filter log berdasarkan selectedVehicle
 * - Tampilkan indicator "Live" ketika WebSocket terhubung
 * - Handle format JSON dan plain text
 * - Maksimal 50 log, paling baru di atas
 *
 * @param {object} selectedVehicle - Objek kendaraan dari parent (halaman Tracking)
 */
const RawDataLog = ({ selectedVehicle }) => {
  const { rawLogs, ws } = useLogData(); // Ambil dari useLogData
  const [hasNewData, setHasNewData] = useState(false);
  const { loading } = useLoadingTimeout(true, 2000);
  const updateTimeoutRef = useRef(null);
  const prevLogsLengthRef = useRef(0);

  // Monitor perubahan rawLogs untuk menampilkan animasi "new data"
  useEffect(() => {
    if (rawLogs.length > prevLogsLengthRef.current) {
      setHasNewData(true);
      if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = setTimeout(() => {
        setHasNewData(false);
      }, 2000);
    }
    prevLogsLengthRef.current = rawLogs.length;
  }, [rawLogs]);

  // Debug: Check raw log structure
  if (rawLogs.length > 0) {
  }

  // Filter logs by selected vehicle (handle both number and string IDs)
  const filteredLogs = selectedVehicle?.id
    ? rawLogs.filter((log) => {
        const logVehicleId = log.vehicle?.id || log.vehicle_id;
        const match = logVehicleId == selectedVehicle.id;
        return match;
      })
    : rawLogs;

  if (filteredLogs.length > 0) {
  }

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getLogLevel = (logText) => {
    if (
      logText.toLowerCase().includes("error") ||
      logText.toLowerCase().includes("failed")
    ) {
      return "ERROR";
    } else if (
      logText.toLowerCase().includes("warning") ||
      logText.toLowerCase().includes("low")
    ) {
      return "WARN";
    } else if (
      logText.toLowerCase().includes("connected") ||
      logText.toLowerCase().includes("acquired")
    ) {
      return "INFO";
    }
    return "DEBUG";
  };

  const getLogLevelStyle = (level) => {
    switch (level) {
      case "ERROR":
        return "text-red-500 bg-red-50 dark:bg-red-900/20";
      case "WARN":
        return "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20";
      case "INFO":
        return "text-blue-600 bg-blue-50 dark:bg-blue-900/20";
      default:
        return "text-gray-600 bg-gray-50 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  const isConnected = ws && ws.readyState === WebSocket.OPEN;

  if (loading && filteredLogs.length === 0) {
    return (
      <div className="p-4 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
        <div className="flex-1 overflow-hidden">
          <LogSkeleton lines={8} />
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3 md:mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">
            Raw Data Log
          </h3>
          {isConnected && (
            <div className="flex items-center gap-1">
              <div
                className={`w-2 h-2 rounded-full ${
                  hasNewData ? "bg-green-500 animate-pulse" : "bg-green-500"
                }`}
              ></div>
              <span className="text-xs text-green-600 dark:text-green-400">
                Live
              </span>
            </div>
          )}
        </div>
        <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
          {selectedVehicle?.name || selectedVehicle?.code || "All Vehicles"}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5 md:space-y-2 font-mono custom-scrollbar">
        {filteredLogs.map((log, index) => {
          const level = getLogLevel(log.logs);
          return (
            <div
              key={log.id || index}
              className={`p-2 md:p-2.5 rounded-md border-l-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                level === "ERROR"
                  ? "border-red-500"
                  : level === "WARN"
                    ? "border-yellow-500"
                    : level === "INFO"
                      ? "border-blue-500"
                      : "border-gray-400"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                  {formatTime(log.created_at)}
                </span>
                <span
                  className={`px-1.5 md:px-2 py-0.5 rounded text-[9px] md:text-xs font-semibold flex-shrink-0 ${getLogLevelStyle(
                    level,
                  )}`}
                >
                  {level}
                </span>
              </div>
              <div className="text-gray-700 dark:text-gray-300 break-words text-[10px] md:text-xs leading-relaxed">
                {log.logs}
              </div>
            </div>
          );
        })}

        {filteredLogs.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 font-openSans dark:text-gray-400 py-12 md:py-20">
            <div className="text-3xl md:text-4xl mb-2">📋</div>
            <p className="text-sm md:text-base">No logs available</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Waiting for data...
            </p>
          </div>
        )}
      </div>

      <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-[10px] md:text-xs text-gray-500 dark:text-gray-400">
          <span className="font-medium">
            {filteredLogs.length}{" "}
            {filteredLogs.length === 1 ? "entry" : "entries"}
          </span>
          <span className="hidden sm:inline">
            Last updated: {formatTime(new Date().toISOString())}
          </span>
        </div>
      </div>
    </div>
  );
};

export default RawDataLog;
