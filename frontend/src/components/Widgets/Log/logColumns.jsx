import React from "react";

export const VEHICLE_COL_KEYS = [
  "timestamp", "vehicle_code", "battery_voltage", "mode", "location",
  "speed", "roll", "rssi", "armed", "temperature_system", "system_status",
];
export const VEHICLE_COL_LABELS = {
  timestamp: "Time", vehicle_code: "Vehicle", battery_voltage: "Battery",
  mode: "Mode", location: "Location", speed: "Speed / Heading",
  roll: "Orientation", rssi: "RSSI", armed: "Flags",
  temperature_system: "Temp", system_status: "Status",
};
export const VEHICLE_COL_DEFAULT = new Set([
  "timestamp", "vehicle_code", "mode", "location", "system_status",
]);
export const VEHICLE_MAX = 5;

export const SENSOR_COL_KEYS = ["timestamp", "vehicle_code", "sensor_code", "data"];
export const SENSOR_COL_LABELS = {
  timestamp: "Time", vehicle_code: "Vehicle", sensor_code: "Sensor", data: "Data",
};
export const SENSOR_COL_DEFAULT = new Set(["timestamp", "vehicle_code", "sensor_code", "data"]);
export const SENSOR_MAX = 4;

export const COMMAND_COL_KEYS = ["initiated_at", "vehicle_code", "command", "status", "message"];
export const COMMAND_COL_LABELS = {
  initiated_at: "Time", vehicle_code: "Vehicle", command: "Command", status: "Status", message: "Message",
};
export const COMMAND_COL_DEFAULT = new Set(["initiated_at", "vehicle_code", "command", "status", "message"]);
export const COMMAND_MAX = 5;

export const WAYPOINT_COL_KEYS = ["initiated_at", "vehicle_code", "mission_name", "waypoint_count", "status", "message"];
export const WAYPOINT_COL_LABELS = {
  initiated_at: "Time", vehicle_code: "Vehicle", mission_name: "Mission",
  waypoint_count: "Waypoints", status: "Status", message: "Message",
};
export const WAYPOINT_COL_DEFAULT = new Set(["initiated_at", "vehicle_code", "mission_name", "status", "message"]);
export const WAYPOINT_MAX = 5;

export const formatTimestamp = (timestamp) => {
  const d = new Date(timestamp);
  return (
    d.toLocaleString("en-GB", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    }) + "." + String(d.getMilliseconds()).padStart(3, "0")
  );
};

export const formatTimestampMs = formatTimestamp;

const statusColorMap = {
  success: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  timeout: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  pending: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

export const getVehicleLogColumns = () => [
  {
    header: "Time", accessorKey: "timestamp", sortable: true,
    cell: (row) => (
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {row.created_at ? formatTimestampMs(row.created_at) : "—"}
      </span>
    ),
  },
  {
    header: "Vehicle", accessorKey: "vehicle_code", sortable: true,
    cell: (row) => (
      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
        {row.vehicle?.code || "N/A"}
      </span>
    ),
  },
  {
    header: "Battery", accessorKey: "battery_voltage", sortable: true,
    cell: (row) => (
      <div className="text-sm text-gray-900 dark:text-gray-300">
        <div>{row.battery_voltage ? `${row.battery_voltage}V` : "-"}</div>
        {row.battery_current && (
          <div className="text-xs text-gray-500 dark:text-gray-400">{row.battery_current}A</div>
        )}
      </div>
    ),
  },
  {
    header: "Mode", accessorKey: "mode", sortable: true,
    cell: (row) => (
      <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
        {row.mode || "N/A"}
      </span>
    ),
  },
  {
    header: "Location", accessorKey: "location", sortable: false,
    cell: (row) => (
      <div className="text-sm text-gray-900 dark:text-gray-300">
        {row.latitude && row.longitude ? (
          <>
            <div>Lat: {row.latitude.toFixed(4)}°</div>
            <div>Lon: {row.longitude.toFixed(4)}°</div>
            {row.altitude && (
              <div className="text-xs text-gray-500 dark:text-gray-400">Alt: {row.altitude}m</div>
            )}
          </>
        ) : "N/A"}
      </div>
    ),
  },
  {
    header: "Speed / Heading", accessorKey: "speed", sortable: true,
    cell: (row) => (
      <div className="text-sm text-gray-900 dark:text-gray-300">
        {row.speed !== null && <div>{row.speed} m/s</div>}
        {row.heading !== null && (
          <div className="text-xs text-gray-500 dark:text-gray-400">Hdg: {row.heading}°</div>
        )}
      </div>
    ),
  },
  {
    header: "Orientation", accessorKey: "roll", sortable: false,
    cell: (row) => (
      <div className="text-xs text-gray-900 dark:text-gray-300">
        {row.roll !== null && <div>R: {row.roll}°</div>}
        {row.pitch !== null && <div>P: {row.pitch}°</div>}
        {row.yaw !== null && <div>Y: {row.yaw}°</div>}
      </div>
    ),
  },
  {
    header: "RSSI", accessorKey: "rssi", sortable: true,
    cell: (row) => (
      <span className="text-sm text-gray-900 dark:text-gray-300">
        {row.rssi ? `${row.rssi} dBm` : "N/A"}
      </span>
    ),
  },
  {
    header: "Flags", accessorKey: "armed", sortable: false,
    cell: (row) => (
      <div className="flex flex-wrap gap-1">
        {row.armed !== null && (
          <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
            row.armed
              ? "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700"
              : "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700"
          }`}>
            {row.armed ? "Armed" : "Disarmed"}
          </span>
        )}
        {row.gps_ok !== null && (
          <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
            row.gps_ok
              ? "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700"
              : "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
          }`}>
            {row.gps_ok ? "GPS OK" : "GPS Lost"}
          </span>
        )}
      </div>
    ),
  },
  {
    header: "Temp", accessorKey: "temperature_system", sortable: true,
    cell: (row) => (
      <span className="text-sm text-gray-900 dark:text-gray-300">
        {row.temperature_system || "N/A"}
      </span>
    ),
  },
  {
    header: "Status", accessorKey: "system_status", sortable: true,
    cell: (row) => (
      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
        row.system_status === "OK"
          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
          : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
      }`}>
        {row.system_status || "Unknown"}
      </span>
    ),
  },
];

export const getSensorLogColumns = () => [
  {
    header: "Time", accessorKey: "timestamp", sortable: true,
    cell: (row) => (
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {row.created_at ? formatTimestampMs(row.created_at) : "—"}
      </span>
    ),
  },
  {
    header: "Vehicle", accessorKey: "vehicle_code", sortable: true,
    cell: (row) => (
      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
        {row.vehicle?.code || "N/A"}
      </span>
    ),
  },
  {
    header: "Sensor", accessorKey: "sensor_code", sortable: true,
    cell: (row) => (
      <span className="text-sm font-medium text-green-600 dark:text-green-400">
        {row.sensor?.code || "N/A"}
      </span>
    ),
  },
  {
    header: "Data", accessorKey: "data", sortable: false,
    cell: (row) => (
      <div className="text-xs text-gray-700 dark:text-gray-400 max-w-md overflow-x-auto">
        {row.data}
      </div>
    ),
  },
];

export const getCommandLogColumns = (t) => [
  {
    header: t("pages.logs.columns.time"), accessorKey: "initiated_at", sortable: true,
    cell: (row) => (
      <div className="text-sm text-gray-900 dark:text-gray-300">
        <div>{formatTimestamp(row.initiated_at)}</div>
        {row.resolved_at && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {t("pages.logs.columns.resolved")}: {formatTimestamp(row.resolved_at)}
          </div>
        )}
      </div>
    ),
  },
  {
    header: t("pages.logs.columns.vehicle"), accessorKey: "vehicle_code", sortable: true,
    cell: (row) => (
      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
        {row.vehicle?.code || row.vehicle_code || "N/A"}
      </span>
    ),
  },
  {
    header: t("pages.logs.columns.command"), accessorKey: "command", sortable: true,
    cell: (row) => (
      <span className="text-sm font-mono font-semibold text-yellow-600 dark:text-yellow-400 uppercase">
        {row.command || "N/A"}
      </span>
    ),
  },
  {
    header: t("pages.logs.columns.status"), accessorKey: "status", sortable: true,
    cell: (row) => (
      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColorMap[row.status] || "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"}`}>
        {row.status || "unknown"}
      </span>
    ),
  },
  {
    header: t("pages.logs.columns.message"), accessorKey: "message", sortable: false,
    cell: (row) => (
      <span className="text-sm text-gray-600 dark:text-gray-400">{row.message || "-"}</span>
    ),
  },
];

export const getWaypointLogColumns = (t) => [
  {
    header: t("pages.logs.columns.time"), accessorKey: "initiated_at", sortable: true,
    cell: (row) => (
      <div className="text-sm text-gray-900 dark:text-gray-300">
        <div>{formatTimestamp(row.initiated_at)}</div>
        {row.resolved_at && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {t("pages.logs.columns.resolved")}: {formatTimestamp(row.resolved_at)}
          </div>
        )}
      </div>
    ),
  },
  {
    header: t("pages.logs.columns.vehicle"), accessorKey: "vehicle_code", sortable: true,
    cell: (row) => (
      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
        {row.vehicle?.code || row.vehicle_code || "N/A"}
      </span>
    ),
  },
  {
    header: t("pages.logs.columns.mission"), accessorKey: "mission_name", sortable: true,
    cell: (row) => (
      <div className="text-sm text-gray-900 dark:text-gray-300">
        <div>{row.mission_name || "-"}</div>
        {row.mission_id && (
          <div className="text-xs text-gray-500 dark:text-gray-400">ID: {row.mission_id}</div>
        )}
      </div>
    ),
  },
  {
    header: t("pages.logs.columns.waypointCount"), accessorKey: "waypoint_count", sortable: true,
    cell: (row) => (
      <span className="text-sm text-gray-900 dark:text-gray-300">{row.waypoint_count ?? "-"}</span>
    ),
  },
  {
    header: t("pages.logs.columns.status"), accessorKey: "status", sortable: true,
    cell: (row) => (
      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColorMap[row.status] || "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"}`}>
        {row.status || "unknown"}
      </span>
    ),
  },
  {
    header: t("pages.logs.columns.message"), accessorKey: "message", sortable: false,
    cell: (row) => (
      <span className="text-sm text-gray-600 dark:text-gray-400">{row.message || "-"}</span>
    ),
  },
];
