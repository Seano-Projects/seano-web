import { useEffect, useRef, useState } from "react";
import { FaColumns } from "react-icons/fa";
import { DataTable } from "../../../ui";
import DataCard from "../../DataCard";

const ALL_COLUMN_KEYS = [
  "timestamp",
  "vehicle_code",
  "sensor_code",
  "latitude",
  "longitude",
  "altitude",
  "gps_ok",
  "depth",
  "pressure",
  "temperature",
  "conductivity",
  "salinity",
  "density",
  "sound_velocity",
];

const DEFAULT_VISIBLE = new Set([
  "timestamp",
  "vehicle_code",
  "depth",
  "temperature",
  "salinity",
  "sound_velocity",
]);

const COLUMN_LABELS = {
  timestamp: "Date/Time",
  vehicle_code: "Vehicle",
  sensor_code: "Sensor",
  latitude: "Latitude",
  longitude: "Longitude",
  altitude: "Altitude (m)",
  gps_ok: "GPS OK",
  depth: "Depth (m)",
  pressure: "Pressure (M)",
  temperature: "Temperature (°C)",
  conductivity: "Conductivity (MS/CM)",
  salinity: "Salinity (PSU)",
  density: "Density (kg/m³)",
  sound_velocity: "Sound Velocity (m/s)",
};

const CTDTable = ({ ctdData, loading = false, isConnected = false }) => {
  const [visibleKeys, setVisibleKeys] = useState(DEFAULT_VISIBLE);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const MAX_COLUMNS = 6;

  const toggleColumn = (key) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size === 1) return prev; // at least 1 column
        next.delete(key);
      } else {
        if (next.size >= MAX_COLUMNS) return prev; // hard cap at 6
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

  // All columns definition
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
          {row.vehicle_code}
        </span>
      ),
    },
    {
      header: "Sensor",
      accessorKey: "sensor_code",
      sortable: true,
      cell: (row) => (
        <span className="text-sm text-gray-900 dark:text-gray-300">
          {row.sensor_code}
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
          {typeof row.latitude === "number" ? row.latitude.toFixed(7) : "-"}
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
          {typeof row.longitude === "number" ? row.longitude.toFixed(7) : "-"}
        </span>
      ),
    },
    {
      header: "Altitude (m)",
      accessorKey: "altitude",
      sortable: true,
      className: "text-right",
      cellClassName: "text-right",
      cell: (row) => (
        <span className="text-sm text-gray-900 dark:text-gray-300">
          {typeof row.altitude === "number" ? row.altitude.toFixed(2) : "-"}
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
          {row.gps_ok === true ? "Yes" : row.gps_ok === false ? "No" : "-"}
        </span>
      ),
    },
    {
      header: "Depth (m)",
      accessorKey: "depth",
      sortable: true,
      className: "text-right",
      cellClassName: "text-right",
      cell: (row) => (
        <span className="text-sm text-gray-900 dark:text-gray-300">
          {row.depth.toFixed(3)}
        </span>
      ),
    },
    {
      header: "Pressure (M)",
      accessorKey: "pressure",
      sortable: true,
      className: "text-right",
      cellClassName: "text-right",
      cell: (row) => (
        <span className="text-sm text-gray-900 dark:text-gray-300">
          {row.pressure.toFixed(3)}
        </span>
      ),
    },
    {
      header: "Temperature (°C)",
      accessorKey: "temperature",
      sortable: true,
      className: "text-right",
      cellClassName: "text-right",
      cell: (row) => (
        <span className="text-sm text-gray-900 dark:text-gray-300">
          {row.temperature.toFixed(3)}
        </span>
      ),
    },
    {
      header: "Conductivity (MS/CM)",
      accessorKey: "conductivity",
      sortable: true,
      className: "text-right",
      cellClassName: "text-right",
      cell: (row) => (
        <span className="text-sm text-gray-900 dark:text-gray-300">
          {row.conductivity.toFixed(3)}
        </span>
      ),
    },
    {
      header: "Salinity (PSU)",
      accessorKey: "salinity",
      sortable: true,
      className: "text-right",
      cellClassName: "text-right",
      cell: (row) => (
        <span className="text-sm text-gray-900 dark:text-gray-300">
          {row.salinity.toFixed(3)}
        </span>
      ),
    },
    {
      header: "Density (kg/m³)",
      accessorKey: "density",
      sortable: true,
      className: "text-right",
      cellClassName: "text-right",
      cell: (row) => (
        <span className="text-sm text-gray-900 dark:text-gray-300">
          {row.density.toFixed(3)}
        </span>
      ),
    },
    {
      header: "Sound Velocity (m/s)",
      accessorKey: "sound_velocity",
      sortable: true,
      className: "text-right",
      cellClassName: "text-right",
      cell: (row) => (
        <span className="text-sm text-gray-900 dark:text-gray-300">
          {row.sound_velocity.toFixed(3)}
        </span>
      ),
    },
  ];

  // Only pass visible columns to the table
  const columns = allColumns.filter((col) => visibleKeys.has(col.accessorKey));

  const columnToggle = (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setDropdownOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-transparent px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 transition hover:bg-gray-50 dark:hover:bg-slate-700"
      >
        <FaColumns className="text-gray-500 dark:text-gray-400" />
        Columns
        <span className={`ml-1 rounded-full px-1.5 py-0.5 text-xs font-semibold ${
          visibleKeys.size >= MAX_COLUMNS
            ? "bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300"
            : "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
        }`}>
          {visibleKeys.size}/6
        </span>
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-lg">
          <div className="border-b border-gray-200 dark:border-slate-600 px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Toggle Columns
              </span>
              <button
                type="button"
                onClick={() => setVisibleKeys(new Set(DEFAULT_VISIBLE))}
                className="text-xs text-gray-500 dark:text-gray-400 hover:underline"
              >
                Reset
              </button>
            </div>
            {visibleKeys.size >= MAX_COLUMNS && (
              <p className="mt-1 text-xs text-orange-600 dark:text-orange-400">
                Maksimum 6 kolom tercapai
              </p>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto py-1">
            {ALL_COLUMN_KEYS.map((key) => {
              const isChecked = visibleKeys.has(key);
              const isDisabled = !isChecked && visibleKeys.size >= MAX_COLUMNS;
              return (
                <label
                  key={key}
                  className={`flex items-center gap-3 px-3 py-2 text-sm ${
                    isDisabled
                      ? "cursor-not-allowed opacity-40"
                      : "cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700"
                  } text-gray-700 dark:text-gray-200`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={isDisabled}
                    onChange={() => toggleColumn(key)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
                  />
                  {COLUMN_LABELS[key]}
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <DataCard
      title="CTD Sensor Data"
      headerExtra={columnToggle}
    >
      <DataTable
        columns={columns}
        data={ctdData}
        searchPlaceholder="Search CTD data..."
        searchKeys={["vehicle_code", "sensor_code"]}
        pageSize={10}
        showPagination={true}
        emptyMessage="No CTD data available"
        loading={loading}
      />
    </DataCard>
  );
};

export default CTDTable;
