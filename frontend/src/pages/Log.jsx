import React, { useState, useMemo, useEffect, useRef } from "react";
import { useLogData } from "../hooks/useLogData";
import { useAlertData } from "../hooks/useAlertData";
import useVehicleData from "../hooks/useVehicleData";
import { ColumnToggle, Title } from "../components/ui";
import { WidgetCard } from "../components/Widgets";
import {
  VehicleDropdown,
  DatePickerField,
  TimePickerField,
} from "../components/Widgets";
import { WidgetCardSkeleton } from "../components/Skeleton";
import { DataTable } from "../components/ui";
import useLoadingTimeout from "../hooks/useLoadingTimeout";
import useTitle from "../hooks/useTitle";
import {
  FiActivity,
  FiCpu,
  FiFileText,
  FiShield,
  FiAlertTriangle,
  FiTerminal,
  FiNavigation,
  FiPause,
  FiPlay,
} from "react-icons/fi";
import useTranslation from "../hooks/useTranslation";

const VEHICLE_COL_KEYS = [
  "timestamp",
  "vehicle_code",
  "battery_voltage",
  "mode",
  "location",
  "speed",
  "roll",
  "rssi",
  "armed",
  "temperature_system",
  "system_status",
];
const VEHICLE_COL_LABELS = {
  timestamp: "Time",
  vehicle_code: "Vehicle",
  battery_voltage: "Battery",
  mode: "Mode",
  location: "Location",
  speed: "Speed / Heading",
  roll: "Orientation",
  rssi: "RSSI",
  armed: "Flags",
  temperature_system: "Temp",
  system_status: "Status",
};
const VEHICLE_COL_DEFAULT = new Set([
  "timestamp",
  "vehicle_code",
  "mode",
  "location",
  "system_status",
]);
const VEHICLE_MAX = 5;

const SENSOR_COL_KEYS = ["timestamp", "vehicle_code", "sensor_code", "data"];
const SENSOR_COL_LABELS = {
  timestamp: "Time",
  vehicle_code: "Vehicle",
  sensor_code: "Sensor",
  data: "Data",
};
const SENSOR_COL_DEFAULT = new Set([
  "timestamp",
  "vehicle_code",
  "sensor_code",
  "data",
]);
const SENSOR_MAX = 4;

const COMMAND_COL_KEYS = [
  "initiated_at",
  "vehicle_code",
  "command",
  "status",
  "message",
];
const COMMAND_COL_LABELS = {
  initiated_at: "Time",
  vehicle_code: "Vehicle",
  command: "Command",
  status: "Status",
  message: "Message",
};
const COMMAND_COL_DEFAULT = new Set([
  "initiated_at",
  "vehicle_code",
  "command",
  "status",
  "message",
]);
const COMMAND_MAX = 5;

const WAYPOINT_COL_KEYS = [
  "initiated_at",
  "vehicle_code",
  "mission_name",
  "waypoint_count",
  "status",
  "message",
];
const WAYPOINT_COL_LABELS = {
  initiated_at: "Time",
  vehicle_code: "Vehicle",
  mission_name: "Mission",
  waypoint_count: "Waypoints",
  status: "Status",
  message: "Message",
};
const WAYPOINT_COL_DEFAULT = new Set([
  "initiated_at",
  "vehicle_code",
  "mission_name",
  "status",
  "message",
]);
const WAYPOINT_MAX = 5;

const Log = () => {
  const { t } = useTranslation();
  useTitle(t("pages.logs.title"));
  const tr = (key, params = {}) => {
    let text = t(key);
    Object.entries(params).forEach(([paramKey, value]) => {
      text = text.replace(`{{${paramKey}}}`, String(value));
    });
    return text;
  };

  const [isRealtimePaused, setIsRealtimePaused] = useState(false);
  // Filter states
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const {
    vehicles,
    loading: vehicleLoading,
    selectedVehicleId,
    setSelectedVehicleId,
  } = useVehicleData();
  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === selectedVehicleId) ?? null,
    [vehicles, selectedVehicleId],
  );

  const {
    stats,
    vehicleLogs,
    sensorLogs,
    rawLogs,
    commandLogs,
    waypointLogs,
    loading,
  } = useLogData({
    enableRealtime: true,
    pauseRealtime: isRealtimePaused,
    startDate,
    endDate,
    startTime,
    endTime,
    selectedVehicleId: selectedVehicle?.id || 0,
  });
  const { alerts } = useAlertData({
    startDate,
    endDate,
    startTime,
    endTime,
  });
  const [activeTab, setActiveTab] = useState("vehicle");
  const hasInitializedVehicleSelection = useRef(false);

  const [vehicleVisibleKeys, setVehicleVisibleKeys] =
    useState(VEHICLE_COL_DEFAULT);

  const [sensorVisibleKeys, setSensorVisibleKeys] =
    useState(SENSOR_COL_DEFAULT);

  const [commandVisibleKeys, setCommandVisibleKeys] =
    useState(COMMAND_COL_DEFAULT);

  const [waypointVisibleKeys, setWaypointVisibleKeys] =
    useState(WAYPOINT_COL_DEFAULT);

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
        const logDate = new Date(
          log.created_at || log.timestamp || log.initiated_at,
        );

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

  // Filter command/waypoint logs (use initiated_at and vehicle_code directly)
  const filterActionLogs = (logs) => {
    let filtered = logs;
    if (selectedVehicle) {
      filtered = filtered.filter(
        (log) =>
          log.vehicle?.code === selectedVehicle.code ||
          log.vehicle_code === selectedVehicle.code ||
          log.vehicle_id === selectedVehicle.id,
      );
    }
    if (startDate || endDate || startTime || endTime) {
      filtered = filtered.filter((log) => {
        const logDate = new Date(log.initiated_at || log.created_at);
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

  const filteredCommandLogs = filterActionLogs(commandLogs);
  const filteredWaypointLogs = filterActionLogs(waypointLogs);
  const commandTablePageSize = Math.max(filteredCommandLogs.length, 1);
  const waypointTablePageSize = Math.max(filteredWaypointLogs.length, 1);

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
    const d = new Date(timestamp);
    return (
      d.toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }) +
      "." +
      String(d.getMilliseconds()).padStart(3, "0")
    );
  };

  const formatTimestampMs = (timestamp) => {
    const d = new Date(timestamp);
    return (
      d.toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }) +
      "." +
      String(d.getMilliseconds()).padStart(3, "0")
    );
  };

  // Vehicle Logs Columns
  const vehicleLogColumns = [
    {
      header: "Time",
      accessorKey: "timestamp",
      sortable: true,
      cell: (row) => (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {row.created_at ? formatTimestampMs(row.created_at) : "—"}
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
        <div className="flex flex-wrap gap-1">
          {row.armed !== null && (
            <span
              className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
                row.armed
                  ? "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700"
                  : "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700"
              }`}
            >
              {row.armed ? "Armed" : "Disarmed"}
            </span>
          )}
          {row.gps_ok !== null && (
            <span
              className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
                row.gps_ok
                  ? "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700"
                  : "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
              }`}
            >
              {row.gps_ok ? "GPS OK" : "GPS Lost"}
            </span>
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
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {row.created_at ? formatTimestampMs(row.created_at) : "—"}
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

  // Command Log Columns
  const commandLogColumns = [
    {
      header: t("pages.logs.columns.time"),
      accessorKey: "initiated_at",
      sortable: true,
      cell: (row) => (
        <div className="text-sm text-gray-900 dark:text-gray-300">
          <div>{formatTimestamp(row.initiated_at)}</div>
          {row.resolved_at && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {t("pages.logs.columns.resolved")}:{" "}
              {formatTimestamp(row.resolved_at)}
            </div>
          )}
        </div>
      ),
    },
    {
      header: t("pages.logs.columns.vehicle"),
      accessorKey: "vehicle_code",
      sortable: true,
      cell: (row) => (
        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
          {row.vehicle?.code || row.vehicle_code || "N/A"}
        </span>
      ),
    },
    {
      header: t("pages.logs.columns.command"),
      accessorKey: "command",
      sortable: true,
      cell: (row) => (
        <span className="text-sm font-mono font-semibold text-yellow-600 dark:text-yellow-400 uppercase">
          {row.command || "N/A"}
        </span>
      ),
    },
    {
      header: t("pages.logs.columns.status"),
      accessorKey: "status",
      sortable: true,
      cell: (row) => {
        const colorMap = {
          success:
            "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
          failed:
            "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
          timeout:
            "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
          pending:
            "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
        };
        return (
          <span
            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${colorMap[row.status] || "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"}`}
          >
            {row.status || "unknown"}
          </span>
        );
      },
    },
    {
      header: t("pages.logs.columns.message"),
      accessorKey: "message",
      sortable: false,
      cell: (row) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {row.message || "-"}
        </span>
      ),
    },
  ];

  // Waypoint Log Columns
  const waypointLogColumns = [
    {
      header: t("pages.logs.columns.time"),
      accessorKey: "initiated_at",
      sortable: true,
      cell: (row) => (
        <div className="text-sm text-gray-900 dark:text-gray-300">
          <div>{formatTimestamp(row.initiated_at)}</div>
          {row.resolved_at && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {t("pages.logs.columns.resolved")}:{" "}
              {formatTimestamp(row.resolved_at)}
            </div>
          )}
        </div>
      ),
    },
    {
      header: t("pages.logs.columns.vehicle"),
      accessorKey: "vehicle_code",
      sortable: true,
      cell: (row) => (
        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
          {row.vehicle?.code || row.vehicle_code || "N/A"}
        </span>
      ),
    },
    {
      header: t("pages.logs.columns.mission"),
      accessorKey: "mission_name",
      sortable: true,
      cell: (row) => (
        <div className="text-sm text-gray-900 dark:text-gray-300">
          <div>{row.mission_name || "-"}</div>
          {row.mission_id && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              ID: {row.mission_id}
            </div>
          )}
        </div>
      ),
    },
    {
      header: t("pages.logs.columns.waypointCount"),
      accessorKey: "waypoint_count",
      sortable: true,
      cell: (row) => (
        <span className="text-sm text-gray-900 dark:text-gray-300">
          {row.waypoint_count ?? "-"}
        </span>
      ),
    },
    {
      header: t("pages.logs.columns.status"),
      accessorKey: "status",
      sortable: true,
      cell: (row) => {
        const colorMap = {
          success:
            "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
          failed:
            "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
          timeout:
            "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
          pending:
            "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
        };
        return (
          <span
            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${colorMap[row.status] || "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"}`}
          >
            {row.status || "unknown"}
          </span>
        );
      },
    },
    {
      header: t("pages.logs.columns.message"),
      accessorKey: "message",
      sortable: false,
      cell: (row) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {row.message || "-"}
        </span>
      ),
    },
  ];

  return (
    <div
      className="p-4"
      key={`logs-root-${isRealtimePaused ? "paused" : "live"}`}
    >
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
              onVehicleChange={(v) => setSelectedVehicleId(v?.id)}
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
          {(selectedVehicleId ||
            startDate ||
            endDate ||
            startTime ||
            endTime) && (
            <button
              onClick={() => {
                setSelectedVehicleId(null);
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

          <button
            onClick={() => setIsRealtimePaused((prev) => !prev)}
            className={`px-3 py-3 text-sm rounded-xl transition-all flex items-center gap-2 font-medium border ${
              isRealtimePaused
                ? "bg-green-100 hover:bg-green-200 text-green-700 border-green-300 dark:bg-green-900/30 dark:hover:bg-green-900/50 dark:text-green-300 dark:border-green-700"
                : "bg-amber-100 hover:bg-amber-200 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 dark:text-amber-300 dark:border-amber-700"
            }`}
            title={
              isRealtimePaused ? "Resume realtime logs" : "Pause realtime logs"
            }
          >
            {isRealtimePaused ? <FiPlay size={16} /> : <FiPause size={16} />}
            {isRealtimePaused ? "Resume Live" : "Pause Live"}
          </button>
        </div>
      </div>

      {/* Widget Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 pb-4">
        {shouldShowSkeleton
          ? Array.from({ length: 3 }).map((_, idx) => (
              <WidgetCardSkeleton key={`widget-skeleton-${idx}`} />
            ))
          : widgets.map((widget, idx) => (
              <WidgetCard key={widget.title || `widget-${idx}`} {...widget} />
            ))}
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-transparent border border-gray-300 dark:border-slate-600 rounded-xl my-4">
        <div className="border-b border-gray-200 dark:border-slate-600">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {[
              "vehicle",
              "sensor",
              "raw",
              "antitheft",
              "failsafe",
              "command",
              "waypoint",
            ].map((tab) => (
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
            ))}
          </nav>
        </div>

        {/* Vehicle Logs */}
        {activeTab === "vehicle" && (
          <div
            className="p-6"
            key={`vehicle-${isRealtimePaused ? "paused" : "live"}`}
          >
            {
              <ColumnToggle
                allKeys={VEHICLE_COL_KEYS}
                labels={VEHICLE_COL_LABELS}
                visibleKeys={vehicleVisibleKeys}
                onToggle={(key) =>
                  setVehicleVisibleKeys((prev) => {
                    const next = new Set(prev);
                    if (next.has(key)) {
                      if (next.size === 1) return prev;
                      next.delete(key);
                    } else {
                      if (next.size >= VEHICLE_MAX) return prev;
                      next.add(key);
                    }
                    return next;
                  })
                }
                onReset={() =>
                  setVehicleVisibleKeys(new Set(VEHICLE_COL_DEFAULT))
                }
                maxColumns={VEHICLE_MAX}
              />
            }
            <DataTable
              key={`vehicle-table-${isRealtimePaused ? "paused" : "live"}`}
              columns={vehicleLogColumns.filter((col) =>
                vehicleVisibleKeys.has(col.accessorKey),
              )}
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
          <div
            className="p-6"
            key={`sensor-${isRealtimePaused ? "paused" : "live"}`}
          >
            {
              <ColumnToggle
                allKeys={SENSOR_COL_KEYS}
                labels={SENSOR_COL_LABELS}
                visibleKeys={sensorVisibleKeys}
                onToggle={(key) =>
                  setSensorVisibleKeys((prev) => {
                    const next = new Set(prev);
                    if (next.has(key)) {
                      if (next.size === 1) return prev;
                      next.delete(key);
                    } else {
                      if (next.size >= SENSOR_MAX) return prev;
                      next.add(key);
                    }
                    return next;
                  })
                }
                onReset={() =>
                  setSensorVisibleKeys(new Set(SENSOR_COL_DEFAULT))
                }
                maxColumns={SENSOR_MAX}
              />
            }
            <DataTable
              key={`sensor-table-${isRealtimePaused ? "paused" : "live"}`}
              columns={sensorLogColumns.filter((col) =>
                sensorVisibleKeys.has(col.accessorKey),
              )}
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
          <div
            className="p-6"
            key={`raw-${isRealtimePaused ? "paused" : "live"}`}
          >
            <div className="max-h-[65vh] overflow-y-auto pr-1 custom-scrollbar">
              <div className="space-y-3">
                {filteredRawLogs.length === 0 ? (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                    {t("pages.logs.emptyRaw")}
                  </p>
                ) : (
                  filteredRawLogs.map((log, index) => (
                    <div
                      key={
                        log._client_id ||
                        log.id ||
                        `${log.created_at || log._received_at || "raw"}-${String(
                          log.logs || "",
                        ).slice(0, 24)}-${index}`
                      }
                      className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-4 border border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500 transition-colors overflow-hidden min-w-0"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {log.created_at
                              ? formatTimestampMs(log.created_at)
                              : "—"}
                          </span>
                        </div>
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                          {log.vehicle?.code || "N/A"}
                        </span>
                      </div>
                      <pre className="text-sm text-gray-900 dark:text-gray-300 whitespace-pre-wrap break-all overflow-x-hidden">
                        {log.logs}
                      </pre>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Anti Theft Logs */}
        {activeTab === "antitheft" && (
          <div
            className="p-6"
            key={`antitheft-${isRealtimePaused ? "paused" : "live"}`}
          >
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
                filteredAntiTheftLogs.map((log, index) => (
                  <div
                    key={
                      log._client_id ||
                      log.id ||
                      `${log.timestamp || log.created_at || "antitheft"}-${
                        log.vehicle_id || log.vehicle_name || "vehicle"
                      }-${String(log.message || "").slice(0, 24)}-${index}`
                    }
                    className="bg-white dark:bg-black border border-gray-200 dark:border-slate-700 rounded-xl p-4 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {formatTimestamp(log.timestamp || log.created_at)}
                        </span>
                        {log.acknowledged && (
                          <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-700 rounded-full">
                            ✓ {t("pages.logs.acknowledged")}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                        {log.vehicle_name || "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-semibold uppercase border ${
                          log.severity === "critical"
                            ? "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700"
                            : log.severity === "warning"
                              ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700"
                              : "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700"
                        }`}
                      >
                        {log.severity || "info"}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-700 rounded-full">
                        {t("pages.logs.alerts.antiTheft")}
                      </span>
                    </div>
                    <p className="text-sm text-gray-800 dark:text-gray-200">
                      {log.message}
                    </p>
                    {log.location && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
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
          <div
            className="p-6"
            key={`failsafe-${isRealtimePaused ? "paused" : "live"}`}
          >
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
                filteredFailsafeLogs.map((log, index) => (
                  <div
                    key={
                      log._client_id ||
                      log.id ||
                      `${log.timestamp || log.created_at || "failsafe"}-${
                        log.vehicle_id || log.vehicle_name || "vehicle"
                      }-${String(log.message || "").slice(0, 24)}-${index}`
                    }
                    className="bg-white dark:bg-black border border-gray-200 dark:border-slate-700 rounded-xl p-4 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {formatTimestamp(log.timestamp || log.created_at)}
                        </span>
                        {log.acknowledged && (
                          <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-700 rounded-full">
                            ✓ {t("pages.logs.acknowledged")}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                        {log.vehicle_name || "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-semibold uppercase border ${
                          log.severity === "critical"
                            ? "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700"
                            : log.severity === "warning"
                              ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700"
                              : "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700"
                        }`}
                      >
                        {log.severity || "info"}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700 rounded-full">
                        {t("pages.logs.alerts.failsafe")}
                      </span>
                    </div>
                    <p className="text-sm text-gray-800 dark:text-gray-200">
                      {log.message}
                    </p>
                    {log.location && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                        {t("pages.logs.location")}: {log.location}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Command Logs */}
        {activeTab === "command" && (
          <div
            className="p-6"
            key={`command-${isRealtimePaused ? "paused" : "live"}`}
          >
            {
              <ColumnToggle
                allKeys={COMMAND_COL_KEYS}
                labels={COMMAND_COL_LABELS}
                visibleKeys={commandVisibleKeys}
                onToggle={(key) =>
                  setCommandVisibleKeys((prev) => {
                    const next = new Set(prev);
                    if (next.has(key)) {
                      if (next.size === 1) return prev;
                      next.delete(key);
                    } else {
                      if (next.size >= COMMAND_MAX) return prev;
                      next.add(key);
                    }
                    return next;
                  })
                }
                onReset={() =>
                  setCommandVisibleKeys(new Set(COMMAND_COL_DEFAULT))
                }
                maxColumns={COMMAND_MAX}
              />
            }
            <DataTable
              key={`command-table-${isRealtimePaused ? "paused" : "live"}-${commandTablePageSize}`}
              columns={commandLogColumns.filter((col) =>
                commandVisibleKeys.has(col.accessorKey),
              )}
              data={filteredCommandLogs}
              searchPlaceholder={t("pages.logs.searchCommand")}
              searchKeys={["vehicle_code", "command", "status"]}
              pageSize={commandTablePageSize}
              emptyMessage={t("pages.logs.emptyCommand")}
            />
          </div>
        )}

        {/* Waypoint Logs */}
        {activeTab === "waypoint" && (
          <div
            className="p-6"
            key={`waypoint-${isRealtimePaused ? "paused" : "live"}`}
          >
            {
              <ColumnToggle
                allKeys={WAYPOINT_COL_KEYS}
                labels={WAYPOINT_COL_LABELS}
                visibleKeys={waypointVisibleKeys}
                onToggle={(key) =>
                  setWaypointVisibleKeys((prev) => {
                    const next = new Set(prev);
                    if (next.has(key)) {
                      if (next.size === 1) return prev;
                      next.delete(key);
                    } else {
                      if (next.size >= WAYPOINT_MAX) return prev;
                      next.add(key);
                    }
                    return next;
                  })
                }
                onReset={() =>
                  setWaypointVisibleKeys(new Set(WAYPOINT_COL_DEFAULT))
                }
                maxColumns={WAYPOINT_MAX}
              />
            }
            <DataTable
              key={`waypoint-table-${isRealtimePaused ? "paused" : "live"}-${waypointTablePageSize}`}
              columns={waypointLogColumns.filter((col) =>
                waypointVisibleKeys.has(col.accessorKey),
              )}
              data={filteredWaypointLogs}
              searchPlaceholder={t("pages.logs.searchWaypoint")}
              searchKeys={["vehicle_code", "mission_name", "status"]}
              pageSize={waypointTablePageSize}
              emptyMessage={t("pages.logs.emptyWaypoint")}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Log;
