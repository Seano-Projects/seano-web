import React, { useState, useMemo } from "react";
import {
  FaCog,
  FaInfoCircle,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle,
  FaWifi,
} from "react-icons/fa";
import { useLogData } from "../../../hooks/useLogData";

const VehicleLogPanel = ({ selectedVehicle = null }) => {
  const [activeTab, setActiveTab] = useState("system");

  const { vehicleLogs, loading, wsConnected } = useLogData({
    enableVehicleLogs: true,
    enableRealtime: true,
    enableStats: false,
    enableChartData: false,
    enableSensorLogs: false,
    enableRawLogs: false,
    enableCommandLogs: false,
    enableWaypointLogs: false,
    enableBatteryData: false,
    selectedVehicleId: selectedVehicle?.id ?? 0,
  });

  const logData = useMemo(() => {
    const processed = { system: [], gps: [], power: [], nav: [], comm: [] };

    vehicleLogs.forEach((log) => {
      let parsed = {};
      try {
        parsed = typeof log.data === "string" ? JSON.parse(log.data) : (log.data || {});
      } catch {
        parsed = {};
      }

      const entry = {
        id: log.id || log._client_id,
        timestamp: new Date(log.created_at || log.timestamp).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        level: parsed.level || "INFO",
        message: parsed.message || JSON.stringify(parsed),
        module: parsed.module || "SYSTEM",
        _source: log._source,
      };

      const mod = entry.module.toUpperCase();
      if (mod.includes("GPS") || mod.includes("NAV")) processed.gps.push(entry);
      else if (mod.includes("POWER") || mod.includes("BATTERY")) processed.power.push(entry);
      else if (mod.includes("MISSION") || mod.includes("WAYPOINT")) processed.nav.push(entry);
      else if (mod.includes("COMM") || mod.includes("RADIO")) processed.comm.push(entry);
      else processed.system.push(entry);
    });

    return processed;
  }, [vehicleLogs]);

  const currentLogs = logData[activeTab] || [];

  const getLogLevelIcon = (level) => {
    switch (level) {
      case "INFO":
        return <FaInfoCircle className="text-blue-500" />;
      case "WARNING":
        return <FaExclamationTriangle className="text-yellow-500" />;
      case "ERROR":
        return <FaTimesCircle className="text-red-500" />;
      case "SUCCESS":
        return <FaCheckCircle className="text-green-500" />;
      default:
        return <FaInfoCircle className="text-gray-500" />;
    }
  };

  const getLogLevelColor = (level) => {
    switch (level) {
      case "INFO":
        return "text-blue-600 bg-blue-50 dark:bg-blue-900/20";
      case "WARNING":
        return "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20";
      case "ERROR":
        return "text-red-600 bg-red-50 dark:bg-red-900/20";
      case "SUCCESS":
        return "text-green-600 bg-green-50 dark:bg-green-900/20";
      default:
        return "text-gray-600 bg-gray-50 dark:bg-gray-900/20";
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header with Tabs */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <FaCog className="text-gray-600 text-xl" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Vehicle Logs
          </h3>
          <span
            className={`ml-auto flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
              wsConnected
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500"
            }`}
          >
            <FaWifi className="text-[10px]" />
            {wsConnected ? "Live" : "Offline"}
          </span>
        </div>

        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab("system")}
            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "system"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                : "text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            System Logs
          </button>
          <button
            onClick={() => setActiveTab("telemetry")}
            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "telemetry"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                : "text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            Telemetry
          </button>
        </div>
      </div>

      {/* Log Content */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        {loading && vehicleLogs.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-sm text-gray-400 dark:text-gray-600">
            Loading…
          </div>
        ) : activeTab === "system" ? (
          <div className="p-6 space-y-3">
            {logData.system.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-600 text-center py-8">
                No system logs
              </p>
            ) : (
              logData.system.map((log) => (
                <div
                  key={log.id}
                  className={`p-3 rounded-lg border ${getLogLevelColor(log.level)}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{getLogLevelIcon(log.level)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {log.timestamp}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded ${getLogLevelColor(log.level)}`}
                        >
                          {log.module}
                        </span>
                        {log._source === "ws" && (
                          <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                            LIVE
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {log.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="p-4">
            <div className="w-full max-w-full overflow-x-auto">
              <table className="w-full min-w-max text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 pr-4 text-gray-600 dark:text-gray-400 font-medium whitespace-nowrap">Time</th>
                    <th className="text-left py-2 pr-4 text-gray-600 dark:text-gray-400 font-medium whitespace-nowrap">Voltage</th>
                    <th className="text-left py-2 pr-4 text-gray-600 dark:text-gray-400 font-medium whitespace-nowrap">Current</th>
                    <th className="text-left py-2 pr-4 text-gray-600 dark:text-gray-400 font-medium whitespace-nowrap">Speed</th>
                    <th className="text-left py-2 pr-4 text-gray-600 dark:text-gray-400 font-medium whitespace-nowrap">Heading</th>
                    <th className="text-left py-2 pr-4 text-gray-600 dark:text-gray-400 font-medium whitespace-nowrap">Mode</th>
                    <th className="text-left py-2 text-gray-600 dark:text-gray-400 font-medium whitespace-nowrap">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicleLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-sm text-gray-400 dark:text-gray-600">
                        No telemetry data
                      </td>
                    </tr>
                  ) : (
                    vehicleLogs.map((entry) => (
                      <tr
                        key={entry._client_id || entry.id}
                        className="border-b border-gray-100 dark:border-gray-800"
                      >
                        <td className="py-2 pr-4 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {new Date(entry.created_at || entry.timestamp).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </td>
                        <td className="py-2 pr-4 text-gray-900 dark:text-white">
                          {entry.battery_voltage != null ? `${entry.battery_voltage}V` : "—"}
                        </td>
                        <td className="py-2 pr-4 text-gray-900 dark:text-white">
                          {entry.battery_current != null ? `${entry.battery_current}A` : "—"}
                        </td>
                        <td className="py-2 pr-4 text-gray-900 dark:text-white">
                          {entry.speed != null ? `${entry.speed} m/s` : "—"}
                        </td>
                        <td className="py-2 pr-4 text-gray-900 dark:text-white">
                          {entry.heading != null ? `${entry.heading}°` : "—"}
                        </td>
                        <td className="py-2 pr-4">
                          {entry.mode ? (
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                entry.mode === "AUTO"
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                  : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                              }`}
                            >
                              {entry.mode}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="py-2">
                          <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${
                            entry._source === "ws"
                              ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500"
                          }`}>
                            {entry._source === "ws" ? "WS" : "REST"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VehicleLogPanel;
