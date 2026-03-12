import { useState } from "react";
import { FaEdit, FaTrash, FaEye } from "react-icons/fa";
import { DataTable } from "../../ui";
import DataCard from "../DataCard";
import { SensorTypeTableSkeleton } from "../../Skeleton";

const SensorTypeTable = ({
  sensorTypeData,
  loading = false,
  onEdit,
  onDelete,
  onView,
  onBulkDelete,
}) => {
  const [selectedIds, setSelectedIds] = useState([]);

  const transformedData = sensorTypeData.map((sensorType) => {
    return {
      id: sensorType.id,
      name: sensorType.name || `Sensor Type ${sensorType.id}`,
      code: sensorType.code || `ST-${String(sensorType.id).padStart(3, "0")}`,
      description: sensorType.description || "No description",
      status: sensorType.is_active ? "Active" : "Inactive",
      statusRaw: sensorType.is_active,
      statusColor: sensorType.is_active
        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
        : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      created: sensorType.created_at
        ? new Date(sensorType.created_at).toLocaleDateString()
        : "Unknown",
      updated: sensorType.updated_at
        ? new Date(sensorType.updated_at).toLocaleDateString()
        : "Unknown",
      typeIcon: getSensorTypeIcon(sensorType.name),
    };
  });

  function getSensorTypeIcon(name) {
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
      header: "Sensor Type",
      accessorKey: "name",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <span className="text-lg">{row.typeIcon}</span>
          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              {row.name}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {row.code}
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
              title="View sensor type"
            >
              <FaEye size={16} />
            </button>
          )}
          {onEdit && (
            <button
              onClick={() => onEdit(row)}
              className="inline-flex items-center justify-center p-2 text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-all rounded-lg cursor-pointer shadow-sm hover:shadow-md"
              title="Edit sensor type"
            >
              <FaEdit size={16} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(row.id, row.name)}
              className="inline-flex items-center justify-center p-2 text-white bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 transition-all rounded-lg cursor-pointer shadow-sm hover:shadow-md"
              title="Delete sensor type"
            >
              <FaTrash size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <DataCard title="Sensor Type Management">
      {selectedIds.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center justify-between">
          <span className="text-sm text-gray-700 dark:text-gray-300">
            <span className="font-semibold text-fourth">
              {selectedIds.length}
            </span>{" "}
            sensor type(s) selected
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
        searchPlaceholder="Search sensor types by name, code, or status..."
        searchKeys={["name", "code", "status"]}
        pageSize={10}
        showPagination={true}
        emptyMessage="No sensor types found. Click 'Add Sensor Type' to create one."
        loading={loading}
        skeletonRows={5}
        SkeletonComponent={SensorTypeTableSkeleton}
      />
    </DataCard>
  );
};

export default SensorTypeTable;
