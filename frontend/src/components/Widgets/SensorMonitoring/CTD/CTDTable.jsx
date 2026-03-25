import { DataTable } from "../../../ui";
import DataCard from "../../DataCard";

const CTDTable = ({ ctdData, loading = false, isConnected = false }) => {
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

  // DataTable columns definition
  const columns = [
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

  return (
    <DataCard title="CTD Sensor Data">
      {/* Data Table */}
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
