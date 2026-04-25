import React, { useState, useMemo } from "react";
import { FaDownload } from "react-icons/fa";
import useBatteryData from "../../../hooks/useBatteryData";
import useTranslation from "../../../hooks/useTranslation";

const formatPercentage = (value) => {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return "0";
  }

  return Number.isInteger(numeric) ? numeric.toFixed(0) : numeric.toFixed(1);
};

const BatteryLog = ({ selectedVehicle }) => {
  const { t, language } = useTranslation();
  const { getVehicleLogs } = useBatteryData();
  const [filterBattery] = useState(null); // null = all, 1 = A, 2 = B

  // Get real-time logs from WebSocket
  const logs = useMemo(() => {
    if (!selectedVehicle?.id) return [];

    const rawLogs = getVehicleLogs(selectedVehicle.id, filterBattery, 50);

    return rawLogs.map((log) => ({
      timestamp: new Date(log.timestamp).toLocaleTimeString(
        language === "id" ? "id-ID" : "en-US",
        {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }),
      unit: log.battery_id === 1 ? "A" : "B",
      status: log.status
        ? log.status.charAt(0).toUpperCase() + log.status.slice(1)
        : t("pages.battery.widgets.log.unknownStatus"),
      level: `${formatPercentage(log.percentage)}%`,
      statusType: log.status?.toLowerCase() || "unknown",
    }));
  }, [selectedVehicle, getVehicleLogs, filterBattery, language, t]);

  const getStatusColor = (statusType) => {
    const normalized = statusType?.toLowerCase();

    if (normalized === "charging" || normalized === "full")
      return "bg-blue-500";
    if (normalized === "discharging" || normalized === "normal")
      return "bg-green-500";
    if (normalized === "high") return "bg-green-500";
    if (normalized === "medium" || normalized === "warning")
      return "bg-yellow-500";
    if (normalized === "low" || normalized === "critical")
      return "bg-red-500";
    return "bg-gray-500";
  };

  const exportCSV = () => {
    const headers = [
      t("pages.battery.widgets.log.columns.timestamp"),
      t("pages.battery.widgets.log.columns.unit"),
      t("pages.battery.widgets.log.columns.status"),
      t("pages.battery.widgets.log.columns.level"),
    ];
    const rows = logs.map((log) => [
      log.timestamp,
      log.unit,
      log.status,
      log.level,
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
          {t("pages.battery.widgets.log.title")}
        </h3>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <FaDownload />
          {t("pages.battery.widgets.log.exportCsv")}
        </button>
      </div>

      <div className="relative overflow-x-auto">
        <div className="overflow-y-auto max-h-96 custom-scrollbar">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-gray-300 dark:border-gray-700 bg-white dark:bg-black">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t("pages.battery.widgets.log.columns.timestamp")}
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t("pages.battery.widgets.log.columns.unit")}
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t("pages.battery.widgets.log.columns.status")}
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t("pages.battery.widgets.log.columns.level")}
                </th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td
                    colSpan="4"
                    className="py-8 text-center text-gray-500 dark:text-gray-400"
                  >
                    {t("pages.battery.widgets.log.noLogs")}
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
