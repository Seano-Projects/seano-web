import {
  FaEdit,
  FaTrash,
  FaBatteryFull,
  FaBatteryThreeQuarters,
  FaBatteryHalf,
  FaBatteryQuarter,
  FaBatteryEmpty,
} from "react-icons/fa";
import { useState } from "react";
import { DataTable } from "../../ui";
import DataCard from "../DataCard";
import { VehicleTableSkeleton } from "../../Skeleton";
import { useVehicleConnectionStatus } from "../../../hooks";

const VehicleTable = ({
  vehicleData,
  loading = false,
  onEdit,
  onDelete,
  onBulkDelete,
  wsConnected = false,
}) => {
  const [selectedIds, setSelectedIds] = useState([]);
  const { getVehicleStatus } = useVehicleConnectionStatus();

  // Transform vehicle data with MQTT LWT realtime status
  const transformedData = vehicleData.map((veh) => {
    // Get MQTT LWT realtime status
    const mqttStatus = veh.code ? getVehicleStatus(veh.code) : "unknown";

    // Map status to display format - prioritize MQTT LWT
    let displayStatus = "Offline";
    if (mqttStatus === "online") displayStatus = "Online";
    else if (mqttStatus === "offline") displayStatus = "Offline";
    else if (veh.status === "on_mission") displayStatus = "Deployed";
    else if (veh.status === "idle") displayStatus = "Online";
    else if (veh.status === "maintenance") displayStatus = "Maintenance";
    else if (veh.status === "offline") displayStatus = "Offline";

    return {
      id: veh.id,
      name: veh.name || `Vehicle ${veh.id}`,
      description: veh.description || "",
      code: veh.code || `USV-${String(veh.id).padStart(3, "0")}`,
      status: displayStatus,
      statusRaw: veh.status,
      position:
        veh.latitude && veh.longitude
          ? `${veh.latitude.toFixed(4)}, ${veh.longitude.toFixed(4)}`
          : veh.position || "Unknown",
      battery: veh.battery_level
        ? `${veh.battery_level}%`
        : veh.battery || "0%",
      batteryLevel: veh.battery_level || 0,
      signal: veh.rssi ? `${veh.rssi} dBm` : "N/A",
      rssi: veh.rssi || null,
      temperature: veh.temperature
        ? typeof veh.temperature === "number"
          ? `${veh.temperature}°C`
          : veh.temperature.includes("°")
            ? veh.temperature
            : `${veh.temperature}°C`
        : "0°C",
      lastSeen: veh.last_seen
        ? new Date(veh.last_seen).toLocaleString()
        : veh.lastSeen || "Unknown",
      user_id: veh.user_id,
      points_id: veh.points_id,
      created_at: veh.created_at,
      updated_at: veh.updated_at,
    };
  });

  // Get battery icon based on level
  const getBatteryIcon = (level) => {
    if (level >= 80) return <FaBatteryFull className="text-green-500" />;
    if (level >= 60)
      return <FaBatteryThreeQuarters className="text-yellow-500" />;
    if (level >= 40) return <FaBatteryHalf className="text-orange-500" />;
    if (level >= 20) return <FaBatteryQuarter className="text-red-500" />;
    return <FaBatteryEmpty className="text-red-600" />;
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const statusClasses = {
      Online:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      Deployed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      Maintenance:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      Offline: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
    };

    return (
      <span
        className={`px-4 py-1 text-xs font-medium rounded-full ${
          statusClasses[status] || statusClasses.Offline
        }`}
      >
        {status}
      </span>
    );
  };

  // Handle select all checkbox
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(transformedData.map((row) => row.id));
    } else {
      setSelectedIds([]);
    }
  };

  // Handle individual checkbox
  const handleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  // Define columns for DataTable
  const columns = [
    {
      header: (
        <input
          type="checkbox"
          checked={
            selectedIds.length === transformedData.length &&
            transformedData.length > 0
          }
          onChange={handleSelectAll}
          className="appearance-none w-4 h-4 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-fourth cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-fourth focus:ring-offset-0 hover:border-gray-400 dark:hover:border-gray-500 checked:bg-fourth checked:border-fourth dark:checked:bg-fourth dark:checked:border-fourth checked:hover:bg-blue-700 dark:checked:hover:bg-blue-700"
          style={{
            backgroundImage:
              selectedIds.length === transformedData.length &&
              transformedData.length > 0
                ? "url(\"data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e\")"
                : "none",
            backgroundSize: "100% 100%",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
      ),
      accessorKey: "checkbox",
      className: "w-12 text-center",
      cellClassName: "text-center",
      sortable: false,
      cell: (row) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(row.id)}
          onChange={() => handleSelectOne(row.id)}
          onClick={(e) => e.stopPropagation()}
          className="appearance-none w-4 h-4 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-fourth cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-fourth focus:ring-offset-0 hover:border-gray-400 dark:hover:border-gray-500 checked:bg-fourth checked:border-fourth dark:checked:bg-fourth dark:checked:border-fourth checked:hover:bg-blue-700 dark:checked:hover:bg-blue-700"
          style={{
            backgroundImage: selectedIds.includes(row.id)
              ? "url(\"data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e\")"
              : "none",
            backgroundSize: "100% 100%",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
      ),
    },
    {
      header: "Vehicle",
      accessorKey: "name",
      cell: (row) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">
            {row.name}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {row.code}
          </div>
        </div>
      ),
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (row) => getStatusBadge(row.status),
    },
    {
      header: "Position",
      accessorKey: "position",
      cell: (row) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {row.position}
        </span>
      ),
    },
    {
      header: "Battery",
      accessorKey: "battery",
      cell: (row) => (
        <div className="flex items-center gap-2">
          {getBatteryIcon(row.batteryLevel)}
          <span className="text-sm">{row.battery}</span>
        </div>
      ),
    },
    {
      header: "Signal",
      accessorKey: "signal",
      cell: (row) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {row.signal}
        </span>
      ),
    },
    {
      header: "Temperature",
      accessorKey: "temperature",
      cell: (row) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {row.temperature}
        </span>
      ),
    },
    {
      header: "Last Seen",
      accessorKey: "lastSeen",
      cell: (row) => (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {row.lastSeen}
        </span>
      ),
    },
    {
      header: "Actions",
      accessorKey: "actions",
      className: "text-center w-32",
      cellClassName: "text-center whitespace-nowrap",
      sortable: false,
      cell: (row) => (
        <div className="flex items-center justify-center gap-3 w-full h-full">
          <button
            onClick={() => onEdit(row)}
            className="inline-flex items-center justify-center p-2 text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-all rounded-lg cursor-pointer shadow-sm hover:shadow-md"
            title="Edit vehicle"
          >
            <FaEdit size={16} />
          </button>
          <button
            onClick={() => onDelete(row.id, row.name)}
            className="inline-flex items-center justify-center p-2 text-white bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 transition-all rounded-lg cursor-pointer shadow-sm hover:shadow-md"
            title="Delete vehicle"
          >
            <FaTrash size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <DataCard title="Vehicle List">
      {selectedIds.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center justify-between">
          <span className="text-sm text-gray-700 dark:text-gray-300">
            <span className="font-semibold text-fourth">
              {selectedIds.length}
            </span>{" "}
            vehicle(s) selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (onBulkDelete) {
                  onBulkDelete(selectedIds);
                  setSelectedIds([]);
                }
              }}
              className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <FaTrash size={14} />
              Delete Selected
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}
      <DataTable
        columns={columns}
        data={transformedData}
        searchPlaceholder="Search vehicles by name, code, or status..."
        searchKeys={["name", "code", "status", "position"]}
        pageSize={10}
        showPagination={true}
        emptyMessage="No vehicles found. Click 'Add Vehicle' to create one."
        loading={loading}
        skeletonRows={5}
        SkeletonComponent={VehicleTableSkeleton}
      />
    </DataCard>
  );
};

export default VehicleTable;
