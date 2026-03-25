import React, { useState, useMemo, useEffect, useRef } from "react";
import { useLogData } from "../hooks/useLogData";
import { useAlertData } from "../hooks/useAlertData";
import useVehicleData from "../hooks/useVehicleData";
import { Title } from "../components/ui";
import { WidgetCard } from "../components/Widgets";
import {
  VehicleDropdown,
  DatePickerField,
  TimePickerField,
} from "../components/Widgets";
import { WidgetCardSkeleton } from "../components/Skeleton";
import { DataTable } from "../components/ui";
import useLoadingTimeout from "../hooks/useLoadingTimeout";
import {
  FiActivity,
  FiCpu,
  FiFileText,
  FiShield,
  FiAlertTriangle,
} from "react-icons/fi";
import useTranslation from "../hooks/useTranslation";

const Log = () => {
  const { t } = useTranslation();
  const tr = (key, params = {}) => {
    let text = t(key);
    Object.entries(params).forEach(([paramKey, value]) => {
      text = text.replace(`{{${paramKey}}}`, String(value));
    });
    return text;
  };

  const { stats, vehicleLogs, sensorLogs, rawLogs, loading } = useLogData();
  const { alerts } = useAlertData();
  const { vehicles, loading: vehicleLoading } = useVehicleData();
  const [activeTab, setActiveTab] = useState("vehicle");
  const hasInitializedVehicleSelection = useRef(false);

  // Get Anti Theft and Failsafe logs from alerts
  const antiTheftLogs = useMemo(() => {
    return alerts.filter(
      (alert) =>
        alert.alert_type?.toLowerCase() === "anti-theft" ||
        alert.type?.toLowerCase() === "anti-theft",
    );
  }, [alerts]);

  const failsafeLogs = useMemo(() => {
    return alerts.filter(
      (alert) =>
        alert.alert_type?.toLowerCase() === "failsafe" ||
        alert.type?.toLowerCase() === "failsafe",
    );
  }, [alerts]);

  // Filter states
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  useEffect(() => {
    if (vehicleLoading) return;

    if (!vehicles || vehicles.length === 0) {
      setSelectedVehicle("");
      hasInitializedVehicleSelection.current = false;
      return;
    }

    if (!hasInitializedVehicleSelection.current && !selectedVehicle) {
      setSelectedVehicle(vehicles[0]);
      hasInitializedVehicleSelection.current = true;
      return;
    }

    if (
      selectedVehicle?.id &&
      !vehicles.some((vehicle) => vehicle.id === selectedVehicle.id)
    ) {
      setSelectedVehicle(vehicles[0]);
    }
  }, [vehicleLoading, vehicles, selectedVehicle]);

  // Use loading timeout to prevent infinite skeleton loading
  const { loading: timeoutLoading } = useLoadingTimeout(loading, 5000);
  const shouldShowSkeleton =
    timeoutLoading && loading && vehicleLogs.length === 0;

  // Filter functions
  const filterLogs = (logs) => {
    let filtered = logs;

    // Filter by vehicle
    if (selectedVehicle) {
      filtered = filtered.filter(
        (log) =>
          log.vehicle?.code === selectedVehicle.code ||
          log.vehicle_id === selectedVehicle.id,
      );
    }

    // Filter by date range and time
    if (startDate || endDate || startTime || endTime) {
      filtered = filtered.filter((log) => {
        const logDate = new Date(log.created_at);

        // Combine date and time for comparison
        const startDateTime = startDate
          ? new Date(startDate + "T" + (startTime || "00:00:00"))
          : null;
        const endDateTime = endDate
          ? new Date(endDate + "T" + (endTime || "23:59:59"))
          : null;

        if (startDateTime && logDate < startDateTime) return false;
        if (endDateTime && logDate > endDateTime) return false;
        return true;
      });
    }

    return filtered;
  };

  // Apply filters to logs
  const filteredVehicleLogs = filterLogs(vehicleLogs);
  const filteredSensorLogs = filterLogs(sensorLogs);
  const filteredRawLogs = filterLogs(rawLogs);
  const filteredAntiTheftLogs = filterLogs(antiTheftLogs);
  const filteredFailsafeLogs = filterLogs(failsafeLogs);

  const widgets = [
    {
      title: t("pages.logs.widgets.vehicle"),
      value: stats.vehicle_logs.total,
      icon: (
        <FiActivity className="text-blue-600 dark:text-blue-400" size={24} />
      ),
      trendIcon:
        stats.vehicle_logs.percentage_change >= 0 ? (
          <span className="text-green-600 dark:text-green-400">↑</span>
        ) : (
          <span className="text-red-600 dark:text-red-400">↓</span>
        ),
      trendText: tr("pages.logs.widgets.vsYesterday", {
        count: Math.abs(stats.vehicle_logs.percentage_change).toFixed(1),
      }),
      iconBgColor: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      title: t("pages.logs.widgets.sensor"),
      value: stats.sensor_logs.total,
      icon: <FiCpu className="text-green-600 dark:text-green-400" size={24} />,
      trendIcon:
        stats.sensor_logs.percentage_change >= 0 ? (
          <span className="text-green-600 dark:text-green-400">↑</span>
        ) : (
          <span className="text-red-600 dark:text-red-400">↓</span>
        ),
      trendText: tr("pages.logs.widgets.vsYesterday", {
        count: Math.abs(stats.sensor_logs.percentage_change).toFixed(1),
      }),
      iconBgColor: "bg-green-100 dark:bg-green-900/30",
    },
    {
      title: t("pages.logs.widgets.raw"),
      value: stats.raw_logs.total,
      icon: (
        <FiFileText
          className="text-purple-600 dark:text-purple-400"
          size={24}
        />
      ),
      trendIcon:
        stats.raw_logs.percentage_change >= 0 ? (
          <span className="text-green-600 dark:text-green-400">↑</span>
        ) : (
          <span className="text-red-600 dark:text-red-400">↓</span>
        ),
      trendText: tr("pages.logs.widgets.vsYesterday", {
        count: Math.abs(stats.raw_logs.percentage_change).toFixed(1),
      }),
      iconBgColor: "bg-purple-100 dark:bg-purple-900/30",
    },
    {
      title: t("pages.logs.widgets.antiTheft"),
      value: antiTheftLogs.length,
      icon: (
        <FiShield className="text-orange-600 dark:text-orange-400" size={24} />
      ),
      trendIcon:
        antiTheftLogs.length > 0 ? (
          <span className="text-orange-600 dark:text-orange-400">⚠</span>
        ) : null,
      trendText:
        antiTheftLogs.length > 0
          ? tr("pages.logs.widgets.unacknowledged", {
              count: antiTheftLogs.filter((a) => !a.acknowledged).length,
            })
          : t("pages.logs.widgets.noAlerts"),
      iconBgColor: "bg-orange-100 dark:bg-orange-900/30",
    },
    {
      title: t("pages.logs.widgets.failsafe"),
      value: failsafeLogs.length,
      icon: (
        <FiAlertTriangle className="text-red-600 dark:text-red-400" size={24} />
      ),
      trendIcon:
        failsafeLogs.length > 0 ? (
          <span className="text-red-600 dark:text-red-400">⚠</span>
        ) : null,
      trendText:
        failsafeLogs.length > 0
          ? tr("pages.logs.widgets.unacknowledged", {
              count: failsafeLogs.filter((a) => !a.acknowledged).length,
            })
          : t("pages.logs.widgets.noAlerts"),
      iconBgColor: "bg-red-100 dark:bg-red-900/30",
    },
  ];

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // Vehicle Logs Columns
  const vehicleLogColumns = [
    {
      header: "Time",
      accessorKey: "timestamp",
      sortable: true,
      cell: (row) => (
        <span className="text-sm text-gray-900 dark:text-gray-300">
          {formatTimestamp(row.created_at)}
        </span>
      ),
    },
    {
      header: "Vehicle",
      accessorKey: "vehicle_code",
      sortable: true,
      cell: (row) => (
        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
          {row.vehicle?.code || "N/A"}
        </span>
      ),
    },
    {
      header: "Battery",
      accessorKey: "battery_voltage",
      sortable: true,
      cell: (row) => (
        <div className="text-sm text-gray-900 dark:text-gray-300">
          <div>{row.battery_voltage ? `${row.battery_voltage}V` : "-"}</div>
          {row.battery_current && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {row.battery_current}A
            </div>
          )}
        </div>
      ),
    },
    {
      header: "Mode",
      accessorKey: "mode",
      sortable: true,
      cell: (row) => (
        <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
          {row.mode || "N/A"}
        </span>
      ),
    },
    {
      header: "Location",
      accessorKey: "location",
      sortable: false,
      cell: (row) => (
        <div className="text-sm text-gray-900 dark:text-gray-300">
          {row.latitude && row.longitude ? (
            <>
              <div>Lat: {row.latitude.toFixed(4)}°</div>
              <div>Lon: {row.longitude.toFixed(4)}°</div>
              {row.altitude && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Alt: {row.altitude}m
                </div>
              )}
            </>
          ) : (
            "N/A"
          )}
        </div>
      ),
    },
    {
      header: "Speed / Heading",
      accessorKey: "speed",
      sortable: true,
      cell: (row) => (
        <div className="text-sm text-gray-900 dark:text-gray-300">
          {row.speed !== null && <div>{row.speed} m/s</div>}
          {row.heading !== null && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Hdg: {row.heading}°
            </div>
          )}
        </div>
      ),
    },
    {
      header: "Orientation",
      accessorKey: "roll",
      sortable: false,
      cell: (row) => (
        <div className="text-xs text-gray-900 dark:text-gray-300">
          {row.roll !== null && <div>R: {row.roll}°</div>}
          {row.pitch !== null && <div>P: {row.pitch}°</div>}
          {row.yaw !== null && <div>Y: {row.yaw}°</div>}
        </div>
      ),
    },
    {
      header: "RSSI",
      accessorKey: "rssi",
      sortable: true,
      cell: (row) => (
        <span className="text-sm text-gray-900 dark:text-gray-300">
          {row.rssi ? `${row.rssi} dBm` : "N/A"}
        </span>
      ),
    },
    {
      header: "Flags",
      accessorKey: "armed",
      sortable: false,
      cell: (row) => (
        <div className="text-xs">
          {row.armed !== null && (
            <div className={row.armed ? "text-red-500" : "text-green-500"}>
              {row.armed ? "⚠ Armed" : "✓ Safe"}
            </div>
          )}
          {row.gps_ok !== null && (
            <div className={row.gps_ok ? "text-green-500" : "text-red-500"}>
              {row.gps_ok ? "✓ GPS" : "✗ GPS"}
            </div>
          )}
        </div>
      ),
    },
    {
      header: "Temp",
      accessorKey: "temperature_system",
      sortable: true,
      cell: (row) => (
        <span className="text-sm text-gray-900 dark:text-gray-300">
          {row.temperature_system || "N/A"}
        </span>
      ),
    },
    {
      header: "Status",
      accessorKey: "system_status",
      sortable: true,
      cell: (row) => (
        <span
          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
            row.system_status === "OK"
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
          }`}
        >
          {row.system_status || "Unknown"}
        </span>
      ),
    },
  ];

  // Sensor Logs Columns
  const sensorLogColumns = [
    {
      header: "Time",
      accessorKey: "timestamp",
      sortable: true,
      cell: (row) => (
        <span className="text-sm text-gray-900 dark:text-gray-300">
          {formatTimestamp(row.created_at)}
        </span>
      ),
    },
    {
      header: "Vehicle",
      accessorKey: "vehicle_code",
      sortable: true,
      cell: (row) => (
        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
          {row.vehicle?.code || "N/A"}
        </span>
      ),
    },
    {
      header: "Sensor",
      accessorKey: "sensor_code",
      sortable: true,
      cell: (row) => (
        <span className="text-sm font-medium text-green-600 dark:text-green-400">
          {row.sensor?.code || "N/A"}
        </span>
      ),
    },
    {
      header: "Data",
      accessorKey: "data",
      sortable: false,
      cell: (row) => (
        <div className="text-xs text-gray-700 dark:text-gray-400 max-w-md overflow-x-auto">
          {row.data}
        </div>
      ),
    },
  ];

  return (
    <div className="p-4">
      {/* Header with Title and Filters */}
      <div className="flex items-center justify-between mb-4">
        <Title
          title={t("pages.logs.title")}
          subtitle={t("pages.logs.subtitle")}
        />

        {/* Filters Section */}
        <div className="flex items-center gap-3">
          {/* Date Range Filter */}
          <div className="flex items-center gap-2">
            {/* Start Date */}
            <DatePickerField
              value={startDate}
              onChange={(date) => {
                setStartDate(date);
                if (endDate && date && new Date(date) > new Date(endDate)) {
                  setEndDate("");
                }
              }}
              placeholder={t("pages.logs.startDate")}
              maxDate={endDate || new Date().toISOString().split("T")[0]}
              className="w-40"
            />

            {/* Start Time */}
            <TimePickerField
              value={startTime}
              onChange={setStartTime}
              placeholder="00:00"
              className="w-32"
            />

            {/* Separator */}
            <span className="text-gray-500 dark:text-gray-400 text-sm">
              {t("pages.logs.to")}
            </span>

            {/* End Date */}
            <DatePickerField
              value={endDate}
              onChange={setEndDate}
              placeholder={t("pages.logs.endDate")}
              minDate={startDate || undefined}
              className="w-40"
            />

            {/* End Time */}
            <TimePickerField
              value={endTime}
              onChange={setEndTime}
              placeholder="23:59"
              className="w-32"
            />
          </div>
          {/* Vehicle Filter */}
          <div className="w-52">
            <VehicleDropdown
              vehicles={vehicles}
              selectedVehicle={selectedVehicle}
              onVehicleChange={setSelectedVehicle}
              placeholder={
                vehicleLoading
                  ? t("pages.logs.loadingVehicles")
                  : !vehicles || vehicles.length === 0
                    ? t("pages.logs.noVehicles")
                    : t("pages.logs.allVehicles")
              }
              className="text-sm"
              disabled={vehicleLoading}
            />
          </div>

          {/* Clear Filters Button */}
          {(selectedVehicle ||
            startDate ||
            endDate ||
            startTime ||
            endTime) && (
            <button
              onClick={() => {
                setSelectedVehicle("");
                setStartDate("");
                setEndDate("");
                setStartTime("");
                setEndTime("");
              }}
              className="px-3 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 text-sm rounded-xl transition-all flex items-center gap-2 font-medium"
              title={t("pages.logs.clearAllFilters")}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              {t("pages.logs.clear")}
            </button>
          )}
        </div>
      </div>

      {/* Widget Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 pb-4">
        {shouldShowSkeleton
          ? Array.from({ length: 3 }).map((_, idx) => (
              <WidgetCardSkeleton key={idx} />
            ))
          : widgets.map((widget, idx) => <WidgetCard key={idx} {...widget} />)}
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-transparent border border-gray-300 dark:border-slate-600 rounded-xl my-4">
        <div className="border-b border-gray-200 dark:border-slate-600">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {["vehicle", "sensor", "raw", "antitheft", "failsafe"].map(
              (tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab
                      ? "border-blue-500 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                  }`}
                >
                  {t(`pages.logs.tabs.${tab}`)}
                </button>
              ),
            )}
          </nav>
        </div>

        {/* Vehicle Logs */}
        {activeTab === "vehicle" && (
          <div className="p-6">
            <DataTable
              columns={vehicleLogColumns}
              data={filteredVehicleLogs}
              searchPlaceholder={t("pages.logs.searchVehicle")}
              searchKeys={["vehicle_code", "system_status"]}
              pageSize={10}
              emptyMessage={t("pages.logs.emptyVehicle")}
            />
          </div>
        )}

        {/* Sensor Logs */}
        {activeTab === "sensor" && (
          <div className="p-6">
            <DataTable
              columns={sensorLogColumns}
              data={filteredSensorLogs}
              searchPlaceholder={t("pages.logs.searchSensor")}
              searchKeys={["vehicle_code", "sensor_code"]}
              pageSize={10}
              emptyMessage={t("pages.logs.emptySensor")}
            />
          </div>
        )}

        {/* Raw Logs */}
        {activeTab === "raw" && (
          <div className="p-6">
            <div className="space-y-3">
              {filteredRawLogs.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  {t("pages.logs.emptyRaw")}
                </p>
              ) : (
                filteredRawLogs.map((log) => (
                  <div
                    key={log.id}
                    className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-4 border border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        {formatTimestamp(log.created_at)}
                      </span>
                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                        {log.vehicle?.code || "N/A"}
                      </span>
                    </div>
                    <pre className="text-sm text-gray-900 dark:text-gray-300 whitespace-pre-wrap wrap-break-word">
                      {log.logs}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Anti Theft Logs */}
        {activeTab === "antitheft" && (
          <div className="p-6">
            <div className="space-y-3">
              {filteredAntiTheftLogs.length === 0 ? (
                <div className="text-center py-12">
                  <FiShield
                    className="mx-auto text-orange-500 dark:text-orange-400 mb-4"
                    size={48}
                  />
                  <p className="text-gray-500 dark:text-gray-400 font-medium mb-2">
                    {t("pages.logs.emptyAntiTheft")}
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    {t("pages.logs.normalOperation")}
                  </p>
                </div>
              ) : (
                filteredAntiTheftLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`bg-orange-50 dark:bg-orange-900/10 rounded-lg p-4 border border-orange-200 dark:border-orange-800 hover:border-orange-300 dark:hover:border-orange-700 transition-colors ${
                      log.acknowledged ? "opacity-60" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          {formatTimestamp(log.timestamp || log.created_at)}
                        </span>
                        {log.acknowledged && (
                          <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                            ✓ {t("pages.logs.acknowledged")}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
                        {log.vehicle_name || "N/A"}
                      </span>
                    </div>
                    <div className="flex items-start gap-2 mb-2">
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-semibold uppercase ${
                          log.severity === "critical"
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : log.severity === "warning"
                              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        }`}
                      >
                        {log.severity || "info"}
                      </span>
                      <span className="text-xs font-semibold text-orange-700 dark:text-orange-300">
                        {t("pages.logs.alerts.antiTheft")}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 dark:text-gray-300">
                      {log.message}
                    </p>
                    {log.location && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        {t("pages.logs.location")}: {log.location}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Failsafe Logs */}
        {activeTab === "failsafe" && (
          <div className="p-6">
            <div className="space-y-3">
              {filteredFailsafeLogs.length === 0 ? (
                <div className="text-center py-12">
                  <FiAlertTriangle
                    className="mx-auto text-red-500 dark:text-red-400 mb-4"
                    size={48}
                  />
                  <p className="text-gray-500 dark:text-gray-400 font-medium mb-2">
                    {t("pages.logs.emptyFailsafe")}
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    {t("pages.logs.normalOperation")}
                  </p>
                </div>
              ) : (
                filteredFailsafeLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`bg-red-50 dark:bg-red-900/10 rounded-lg p-4 border border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700 transition-colors ${
                      log.acknowledged ? "opacity-60" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          {formatTimestamp(log.timestamp || log.created_at)}
                        </span>
                        {log.acknowledged && (
                          <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                            ✓ {t("pages.logs.acknowledged")}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-medium text-red-600 dark:text-red-400">
                        {log.vehicle_name || "N/A"}
                      </span>
                    </div>
                    <div className="flex items-start gap-2 mb-2">
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-semibold uppercase ${
                          log.severity === "critical"
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : log.severity === "warning"
                              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        }`}
                      >
                        {log.severity || "info"}
                      </span>
                      <span className="text-xs font-semibold text-red-700 dark:text-red-300">
                        {t("pages.logs.alerts.failsafe")}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 dark:text-gray-300">
                      {log.message}
                    </p>
                    {log.location && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        {t("pages.logs.location")}: {log.location}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Log;
