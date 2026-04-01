import React, { useState, useMemo } from "react";
import { FaDownload } from "react-icons/fa";
import useBatteryData from "../../../hooks/useBatteryData";

const formatPercentage = (value) => {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return "0";
  }

  return Number.isInteger(numeric) ? numeric.toFixed(0) : numeric.toFixed(1);
};

const BatteryLog = ({ selectedVehicle }) => {
  const { getVehicleLogs } = useBatteryData();
  const [filterBattery, setFilterBattery] = useState(null); // null = all, 1 = A, 2 = B

  // Detect anomaly based on battery data
  const detectAnomaly = (log) => {
    if (log.percentage < 20) return "Critical Low";
    if (log.temperature > 40) return "High Temperature";
    if (log.current && Math.abs(log.current) > 10) return "High Current";
    if (log.voltage < 10) return "Low Voltage";
    return "None";
  };

  // Get real-time logs from WebSocket
  const logs = useMemo(() => {
    if (!selectedVehicle?.id) return [];

    const rawLogs = getVehicleLogs(selectedVehicle.id, filterBattery, 50);

    return rawLogs.map((log) => ({
      timestamp: new Date(log.timestamp).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }),
      unit: log.battery_id === 1 ? "A" : "B",
      status: log.status
        ? log.status.charAt(0).toUpperCase() + log.status.slice(1)
        : "Unknown",
      level: `${formatPercentage(log.percentage)}%`,
      anomaly: detectAnomaly(log),
      statusType: log.status?.toLowerCase() || "unknown",
    }));
  }, [selectedVehicle, getVehicleLogs, filterBattery]);

  const getStatusColor = (statusType) => {
    if (statusType === "charging" || statusType === "full")
      return "bg-blue-500";
    if (statusType === "discharging" || statusType === "normal")
      return "bg-green-500";
    if (statusType === "low") return "bg-red-500";
    return "bg-gray-500";
  };

  const exportCSV = () => {
    const headers = ["TIMESTAMP", "UNIT", "STATUS", "LEVEL", "ANOMALY"];
    const rows = logs.map((log) => [
      log.timestamp,
      log.unit,
      log.status,
      log.level,
      log.anomaly,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `battery_logs_${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-black dark:text-white">
          Data Logs
        </h3>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <FaDownload />
          Export CSV
        </button>
      </div>

      <div className="relative overflow-x-auto">
        <div className="overflow-y-auto max-h-96 custom-scrollbar">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-gray-300 dark:border-gray-700 bg-white dark:bg-black">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                  TIMESTAMP
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                  UNIT
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                  STATUS
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                  LEVEL
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                  ANOMALY
                </th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="py-8 text-center text-gray-500 dark:text-gray-400"
                  >
                    No logs available.
                  </td>
                </tr>
              ) : (
                logs.map((log, index) => (
                  <tr
                    key={index}
                    className="border-b border-gray-200 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                      {log.timestamp}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                      {log.unit}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${getStatusColor(log.statusType)}`}
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {log.status}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                      {log.level}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-sm ${
                          log.anomaly === "None"
                            ? "text-gray-500 dark:text-gray-400"
                            : "text-red-500 font-medium"
                        }`}
                      >
                        {log.anomaly}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BatteryLog;
