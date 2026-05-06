import { useState } from "react";
import { ColumnToggle, DataTable } from "../../../ui";
import DataCard from "../../DataCard";

const ALL_COLUMN_KEYS = [
  "timestamp",
  "vehicle_code",
  "sensor_code",
  "latitude",
  "longitude",
  "gps_ok",
  "current_speed_ms",
  "current_direction_deg",
  "water_depth_m",
  "temperature_c",
  "heading_deg",
  "ensemble_no",
  "v1_ms",
  "v2_ms",
  "v3_ms",
  "v4_ms",
];

const DEFAULT_VISIBLE = new Set([
  "timestamp",
  "vehicle_code",
  "current_speed_ms",
  "current_direction_deg",
  "water_depth_m",
  "temperature_c",
]);

const COLUMN_LABELS = {
  timestamp: "Date/Time",
  vehicle_code: "Vehicle",
  sensor_code: "Sensor",
  latitude: "Latitude",
  longitude: "Longitude",
  gps_ok: "GPS OK",
  current_speed_ms: "Speed (m/s)",
  current_direction_deg: "Direction (°)",
  water_depth_m: "Depth (m)",
  temperature_c: "Temperature (°C)",
  heading_deg: "Heading (°)",
  ensemble_no: "Ensemble No.",
  v1_ms: "V1 (m/s)",
  v2_ms: "V2 (m/s)",
  v3_ms: "V3 (m/s)",
  v4_ms: "V4 (m/s)",
};

const MAX_COLUMNS = 6;

const fmt = (v, decimals = 3) =>
  v !== null && v !== undefined && Number.isFinite(Number(v))
    ? Number(v).toFixed(decimals)
    : "—";

const ADCPTable = ({ adcpData, loading = false }) => {
  const [visibleKeys, setVisibleKeys] = useState(DEFAULT_VISIBLE);

  const MAX_COLUMNS = 6;

  const toggleColumn = (key) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size === 1) return prev;
        next.delete(key);
      } else {
        if (next.size >= MAX_COLUMNS) return prev;
        next.add(key);
      }
      return next;
    });
  };

  const formatDateTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString("id-ID", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    });
  };

  const allColumns = [
    {
      header: "Date/Time",
      accessorKey: "timestamp",
      sortable: true,
      cell: (row) => (
        <span className="text-sm text-gray-900 dark:text-gray-300 whitespace-nowrap">
          {formatDateTime(row.timestamp)}
        </span>
      ),
    },
    {
      header: "Vehicle",
      accessorKey: "vehicle_code",
      sortable: true,
      cell: (row) => (
        <span className="text-sm text-gray-900 dark:text-gray-300">
          {row.vehicle_code ?? "—"}
        </span>
      ),
    },
    {
      header: "Sensor",
      accessorKey: "sensor_code",
      sortable: true,
      cell: (row) => (
        <span className="text-sm text-gray-900 dark:text-gray-300">
          {row.sensor_code ?? "—"}
        </span>
      ),
    },
    {
      header: "Latitude",
      accessorKey: "latitude",
      sortable: true,
      className: "text-right",
      cellClassName: "text-right",
      cell: (row) => (
        <span className="text-sm text-gray-900 dark:text-gray-300">
          {fmt(row.latitude, 7)}
        </span>
      ),
    },
    {
      header: "Longitude",
      accessorKey: "longitude",
      sortable: true,
      className: "text-right",
      cellClassName: "text-right",
      cell: (row) => (
        <span className="text-sm text-gray-900 dark:text-gray-300">
          {fmt(row.longitude, 7)}
        </span>
      ),
    },
    {
      header: "GPS OK",
      accessorKey: "gps_ok",
      sortable: true,
      cell: (row) => (
        <span
          className={`text-sm font-medium ${
            row.gps_ok === true
              ? "text-green-600 dark:text-green-400"
              : row.gps_ok === false
                ? "text-red-600 dark:text-red-400"
                : "text-gray-500 dark:text-gray-400"
          }`}
        >
          {row.gps_ok === true ? "Yes" : row.gps_ok === false ? "No" : "—"}
        </span>
      ),
    },
    {
      header: "Speed (m/s)",
      accessorKey: "current_speed_ms",
      sortable: true,
      className: "text-right",
      cellClassName: "text-right",
      cell: (row) => (
        <span className="text-sm text-red-600 dark:text-red-400">
          {fmt(row.current_speed_ms, 3)}
        </span>
      ),
    },
    {
      header: "Direction (°)",
      accessorKey: "current_direction_deg",
      sortable: true,
      className: "text-right",
      cellClassName: "text-right",
      cell: (row) => (
        <span className="text-sm text-gray-900 dark:text-gray-300">
          {fmt(row.current_direction_deg, 1)}
        </span>
      ),
    },
    {
      header: "Depth (m)",
      accessorKey: "water_depth_m",
      sortable: true,
      className: "text-right",
      cellClassName: "text-right",
      cell: (row) => (
        <span className="text-sm text-blue-600 dark:text-blue-400">
          {fmt(row.water_depth_m, 1)}
        </span>
      ),
    },
    {
      header: "Temperature (°C)",
      accessorKey: "temperature_c",
      sortable: true,
      className: "text-right",
      cellClassName: "text-right",
      cell: (row) => (
        <span className="text-sm text-orange-600 dark:text-orange-400">
          {fmt(row.temperature_c, 2)}
        </span>
      ),
    },
    {
      header: "Heading (°)",
      accessorKey: "heading_deg",
      sortable: true,
      className: "text-right",
      cellClassName: "text-right",
      cell: (row) => (
        <span className="text-sm text-gray-900 dark:text-gray-300">
          {fmt(row.heading_deg, 1)}
        </span>
      ),
    },
    {
      header: "Ensemble No.",
      accessorKey: "ensemble_no",
      sortable: true,
      className: "text-right",
      cellClassName: "text-right",
      cell: (row) => (
        <span className="text-sm text-gray-900 dark:text-gray-300">
          {row.ensemble_no ?? "—"}
        </span>
      ),
    },
    {
      header: "V1 (m/s)",
      accessorKey: "v1_ms",
      sortable: true,
      className: "text-right",
      cellClassName: "text-right",
      cell: (row) => (
        <span className="text-sm text-gray-900 dark:text-gray-300">
          {fmt(row.v1_ms, 3)}
        </span>
      ),
    },
    {
      header: "V2 (m/s)",
      accessorKey: "v2_ms",
      sortable: true,
      className: "text-right",
      cellClassName: "text-right",
      cell: (row) => (
        <span className="text-sm text-gray-900 dark:text-gray-300">
          {fmt(row.v2_ms, 3)}
        </span>
      ),
    },
    {
      header: "V3 (m/s)",
      accessorKey: "v3_ms",
      sortable: true,
      className: "text-right",
      cellClassName: "text-right",
      cell: (row) => (
        <span className="text-sm text-gray-900 dark:text-gray-300">
          {fmt(row.v3_ms, 3)}
        </span>
      ),
    },
    {
      header: "V4 (m/s)",
      accessorKey: "v4_ms",
      sortable: true,
      className: "text-right",
      cellClassName: "text-right",
      cell: (row) => (
        <span className="text-sm text-gray-900 dark:text-gray-300">
          {fmt(row.v4_ms, 3)}
        </span>
      ),
    },
  ];

  const columns = allColumns.filter((col) => visibleKeys.has(col.accessorKey));

  const columnToggle = (
    <ColumnToggle
      allKeys={ALL_COLUMN_KEYS}
      labels={COLUMN_LABELS}
      visibleKeys={visibleKeys}
      onToggle={toggleColumn}
      onReset={() => setVisibleKeys(new Set(DEFAULT_VISIBLE))}
      maxColumns={MAX_COLUMNS}
    />
  );

  return (
    <DataCard title="ADCP Sensor Data" headerExtra={columnToggle}>
      <DataTable
        columns={columns}
        data={adcpData}
        searchPlaceholder="Search ADCP data..."
        searchKeys={["vehicle_code", "sensor_code"]}
        pageSize={10}
        showPagination={true}
        emptyMessage="No ADCP data available"
        loading={loading}
      />
    </DataCard>
  );
};

export default ADCPTable;
