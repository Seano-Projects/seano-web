import React, { useState, useEffect } from "react";
import {
  FaCog,
  FaInfoCircle,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";
import { API_ENDPOINTS } from "../../../config";

/**
 * VehicleLogPanel - Panel Log Kendaraan
 *
 * SUMBER DATA:
 * - Historis: GET /vehicle-logs/?vehicle_id={id}&limit=100 (API)
 * - Real-time: MQTT topic `seano/{vehicleId}/vehicle_log` (akan ditambah di masa depan)
 *
 * CARA KERJA:
 * - Fetch log kendaraan dari API saat mount/ubah vehicle
 * - Filter logs berdasarkan kategori (system, gps, power, nav, comm)
 * - Update otomatis ketika selectedVehicle berubah
 *
 * @param {object} selectedVehicle - Vehicle object (with id and code) from parent
 */
const VehicleLogPanel = ({ selectedVehicle = null }) => {
  const [activeTab, setActiveTab] = useState("system");
  const [logData, setLogData] = useState({
    system: [],
    gps: [],
    power: [],
    nav: [],
    comm: [],
  });
  const [loading, setLoading] = useState(false);

  // Fetch vehicle logs dari API
  useEffect(() => {
    if (!selectedVehicle?.id) return;

    const fetchVehicleLogs = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("access_token");
        const response = await fetch(
          API_ENDPOINTS.VEHICLE_LOGS.LIST +
            `?vehicle_id=${selectedVehicle.id}&limit=100`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (response.ok) {
          const data = await response.json();

          // Process logs into categories
          const processed = {
            system: [],
            gps: [],
            power: [],
            nav: [],
            comm: [],
          };

          data.forEach((log) => {
            let logData = {};

            try {
              if (typeof log.data === "string") {
                logData = JSON.parse(log.data);
              } else {
                logData = log.data;
              }
            } catch (e) {
              logData = {};
            }

            const logEntry = {
              id: log.id,
              timestamp: new Date(log.created_at).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              }),
              level: logData.level || "INFO",
              message: logData.message || JSON.stringify(logData),
              module: logData.module || "SYSTEM",
            };

            // Categorize by module
            const module = logEntry.module.toUpperCase();
            if (module.includes("GPS") || module.includes("NAV")) {
              processed.gps.push(logEntry);
            } else if (module.includes("POWER") || module.includes("BATTERY")) {
              processed.power.push(logEntry);
            } else if (
              module.includes("MISSION") ||
              module.includes("WAYPOINT")
            ) {
              processed.nav.push(logEntry);
            } else if (module.includes("COMM") || module.includes("RADIO")) {
              processed.comm.push(logEntry);
            } else {
              processed.system.push(logEntry);
            }
          });

          setLogData(processed);
        }
      } catch (err) {
      } finally {
        setLoading(false);
      }
    };

    fetchVehicleLogs();
  }, [selectedVehicle]);

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
            onClick={() => setActiveTab("vehicle")}
            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "vehicle"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                : "text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            Vehicle Data
          </button>
        </div>
      </div>

      {/* Log Content */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        {activeTab === "system" ? (
          <div className="p-6 space-y-3">
            {logData.system.map((log) => (
              <div
                key={log.id}
                className={`p-3 rounded-lg border ${getLogLevelColor(
                  log.level,
                )}`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getLogLevelIcon(log.level)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                        {log.timestamp}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded ${getLogLevelColor(
                          log.level,
                        )}`}
                      >
                        {log.module}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {log.message}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 text-gray-600 dark:text-gray-400 font-medium">
                      Time
                    </th>
                    <th className="text-left py-2 text-gray-600 dark:text-gray-400 font-medium">
                      Voltage
                    </th>
                    <th className="text-left py-2 text-gray-600 dark:text-gray-400 font-medium">
                      Current
                    </th>
                    <th className="text-left py-2 text-gray-600 dark:text-gray-400 font-medium">
                      Speed
                    </th>
                    <th className="text-left py-2 text-gray-600 dark:text-gray-400 font-medium">
                      Heading
                    </th>
                    <th className="text-left py-2 text-gray-600 dark:text-gray-400 font-medium">
                      Mode
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {logData.vehicle.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-b border-gray-100 dark:border-gray-800"
                    >
                      <td className="py-2 font-mono text-gray-600 dark:text-gray-400">
                        {entry.timestamp}
                      </td>
                      <td className="py-2 font-mono text-gray-900 dark:text-white">
                        {entry.battery_voltage}V
                      </td>
                      <td className="py-2 font-mono text-gray-900 dark:text-white">
                        {entry.battery_current}A
                      </td>
                      <td className="py-2 font-mono text-gray-900 dark:text-white">
                        {entry.speed} m/s
                      </td>
                      <td className="py-2 font-mono text-gray-900 dark:text-white">
                        {entry.heading}°
                      </td>
                      <td className="py-2">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            entry.mode === "AUTO"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                              : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                          }`}
                        >
                          {entry.mode}
                        </span>
                      </td>
                    </tr>
                  ))}
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
