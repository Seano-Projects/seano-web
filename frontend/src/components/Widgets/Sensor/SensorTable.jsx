import { useState } from "react";
import { FaEdit, FaTrash, FaEye } from "react-icons/fa";
import { DataTable } from "../../ui";
import DataCard from "../DataCard";
import { SensorTableSkeleton } from "../../Skeleton";
import { usePermission } from "../../../hooks/usePermission";

const SensorTable = ({
  sensorData,
  loading = false,
  onEdit,
  onDelete,
  onView,
  onBulkDelete,
}) => {
  const { hasPermission } = usePermission();
  const [selectedIds, setSelectedIds] = useState([]);

  const transformedData = sensorData.map((sensor) => {
    const sensorTypeName = sensor.sensor_type?.name || sensor.type || "Unknown";

    return {
      id: sensor.id,
      brand: sensor.brand || "Unknown",
      model: sensor.model || "Unknown",
      displayName: `${sensor.brand} ${sensor.model}`,
      code: sensor.code || `SNS-${String(sensor.id).padStart(3, "0")}`,
      type: sensorTypeName,
      sensor_type_id: sensor.sensor_type_id || sensor.sensor_type?.id,
      description: sensor.description || "No description",
      status: sensor.is_active ? "Active" : "Inactive",
      statusRaw: sensor.is_active,
      statusColor: sensor.is_active
        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
        : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      created: sensor.created_at
        ? new Date(sensor.created_at).toLocaleDateString()
        : "Unknown",
      updated: sensor.updated_at
        ? new Date(sensor.updated_at).toLocaleDateString()
        : "Unknown",
      typeIcon: getSensorTypeIcon(sensorTypeName.toLowerCase()),
    };
  });

  function getSensorTypeIcon(type) {
    // Icons removed - return empty string
    return "";
  }

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
    // Only show checkbox column if user has permission
    ...(hasPermission("sensors.manage")
      ? [
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
        ]
      : []),
    {
      header: "Sensor",
      accessorKey: "displayName",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <span className="text-lg">{row.typeIcon}</span>
          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              {row.brand} {row.model}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Code: {row.code}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (row) => (
        <span
          className={`px-4 py-1 text-xs font-medium rounded-full ${row.statusColor}`}
        >
          {row.status}
        </span>
      ),
    },
    {
      header: "Type",
      accessorKey: "type",
      cell: (row) => (
        <span className="text-sm text-gray-900 dark:text-white capitalize">
          {row.type}
        </span>
      ),
    },
    {
      header: "Description",
      accessorKey: "description",
      cell: (row) => (
        <span className="text-sm text-gray-600 dark:text-gray-300 truncate block max-w-xs">
          {row.description}
        </span>
      ),
    },
    {
      header: "Created",
      accessorKey: "created",
      cell: (row) => (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {row.created}
        </span>
      ),
    },
    {
      header: "Last Updated",
      accessorKey: "updated",
      cell: (row) => (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {row.updated}
        </span>
      ),
    },
    {
      header: "Actions",
      accessorKey: "actions",
      className: "text-center w-40",
      cellClassName: "text-center whitespace-nowrap",
      sortable: false,
      cell: (row) => (
        <div className="flex items-center justify-center gap-3 w-full h-full">
          {onView && (
            <button
              onClick={() => onView(row)}
              className="inline-flex items-center justify-center p-2 text-white bg-gray-600 hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600 transition-all rounded-lg cursor-pointer shadow-sm hover:shadow-md"
              title="View sensor"
            >
              <FaEye size={16} />
            </button>
          )}
          {onEdit && hasPermission("sensors.manage") && (
            <button
              onClick={() => onEdit(row)}
              className="inline-flex items-center justify-center p-2 text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-all rounded-lg cursor-pointer shadow-sm hover:shadow-md"
              title="Edit sensor"
            >
              <FaEdit size={16} />
            </button>
          )}
          {onDelete && hasPermission("sensors.manage") && (
            <button
              onClick={() => onDelete(row.id, row.displayName)}
              className="inline-flex items-center justify-center p-2 text-white bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 transition-all rounded-lg cursor-pointer shadow-sm hover:shadow-md"
              title="Delete sensor"
            >
              <FaTrash size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <DataCard title="Sensor Management">
      {selectedIds.length > 0 && hasPermission("sensors.manage") && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center justify-between">
          <span className="text-sm text-gray-700 dark:text-gray-300">
            <span className="font-semibold text-fourth">
              {selectedIds.length}
            </span>{" "}
            sensor(s) selected
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
        searchPlaceholder="Search sensors by brand, model, code, or type..."
        searchKeys={["brand", "model", "displayName", "code", "type", "status"]}
        pageSize={10}
        showPagination={true}
        emptyMessage="No sensors found. Click 'Add Sensor' to create one."
        loading={loading}
        skeletonRows={5}
        SkeletonComponent={SensorTableSkeleton}
      />
    </DataCard>
  );
};

export default SensorTable;
