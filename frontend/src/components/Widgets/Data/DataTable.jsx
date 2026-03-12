import { useState, useEffect } from "react";
import { FaEdit, FaTrash, FaDownload } from "react-icons/fa";
import { DataTable as BaseDataTable } from "../../ui";
import axios from "../../../utils/axiosConfig";
import { API_ENDPOINTS } from "../../../config";
import { toast, LoadingDots } from "../../ui";

const DataTable = ({
  hasActiveFilters,
  handleResetFilters,
  selectedDataType = "raw_logs",
}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [error, setError] = useState(null);

  // Data type configurations
  const DATA_TYPE_CONFIG = {
    raw_logs: {
      label: "Raw Data Logs",
      endpoint: API_ENDPOINTS.RAW_LOGS,
      searchKeys: ["id", "vehicle_id", "topic"],
      searchPlaceholder: "Search logs by ID, vehicle, or topic...",
    },
    vehicle_logs: {
      label: "Vehicle Logs",
      endpoint: API_ENDPOINTS.VEHICLE_LOGS,
      searchKeys: ["id", "vehicle_id"],
      searchPlaceholder: "Search by ID or vehicle...",
    },
    sensor_logs: {
      label: "Sensor Logs",
      endpoint: API_ENDPOINTS.SENSOR_LOGS,
      searchKeys: ["id", "vehicle_id", "sensor_id"],
      searchPlaceholder: "Search by ID, vehicle, or sensor...",
    },
    alerts: {
      label: "Alerts",
      endpoint: API_ENDPOINTS.ALERTS,
      searchKeys: ["id", "vehicle_id", "severity", "alert_type", "message"],
      searchPlaceholder: "Search by ID, vehicle, severity, or message...",
    },
  };

  // Fetch data based on selected type
  useEffect(() => {
    fetchData();
    setSelectedIds([]); // Clear selection when type changes
  }, [selectedDataType]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const config = DATA_TYPE_CONFIG[selectedDataType];
      if (!config || !config.endpoint?.LIST) {
        setError("Invalid data type or endpoint not configured");
        setData([]);
        return;
      }

      const response = await axios.get(config.endpoint.LIST);
      const fetchedData = Array.isArray(response.data) ? response.data : [];
      setData(fetchedData);
    } catch (error) {
      setError(
        error.message ||
          `Failed to fetch ${DATA_TYPE_CONFIG[selectedDataType]?.label || "data"}`,
      );
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle select all checkbox
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(data.map((row) => row.id));
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

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    const config = DATA_TYPE_CONFIG[selectedDataType];
    const confirmBulk = window.confirm(
      `Are you sure you want to delete ${selectedIds.length} ${config.label.toLowerCase()}? This action cannot be undone.`,
    );

    if (!confirmBulk) return;

    try {
      await Promise.all(
        selectedIds.map((id) => axios.delete(config.endpoint.DELETE(id))),
      );

      toast.success(
        `${selectedIds.length} ${config.label.toLowerCase()} deleted successfully!`,
      );
      setSelectedIds([]);
      fetchData();
    } catch (error) {
      toast.error(`Failed to delete some ${config.label.toLowerCase()}`);
    }
  };

  // Handle delete single
  const handleDelete = async (id) => {
    const config = DATA_TYPE_CONFIG[selectedDataType];
    if (
      !window.confirm(
        `Are you sure you want to delete this ${config.label.toLowerCase().replace(/s$/, "")}?`,
      )
    )
      return;

    try {
      await axios.delete(config.endpoint.DELETE(id));
      toast.success(`${config.label.replace(/s$/, "")} deleted successfully!`);
      fetchData();
    } catch (error) {
      toast.error(
        `Failed to delete ${config.label.toLowerCase().replace(/s$/, "")}`,
      );
    }
  };

  // Handle export
  const handleExport = (row) => {
    const dataStr = JSON.stringify(row, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedDataType}-${row.id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Data exported successfully!");
  };

  // Get columns based on data type
  const getColumns = () => {
    const checkboxColumn = {
      header: (
        <input
          type="checkbox"
          checked={selectedIds.length === data.length && data.length > 0}
          onChange={handleSelectAll}
          className="appearance-none w-4 h-4 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-fourth cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-fourth focus:ring-offset-0 hover:border-gray-400 dark:hover:border-gray-500 checked:bg-fourth checked:border-fourth dark:checked:bg-fourth dark:checked:border-fourth checked:hover:bg-blue-700 dark:checked:hover:bg-blue-700"
          style={{
            backgroundImage:
              selectedIds.length === data.length && data.length > 0
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
    };

    const actionsColumn = {
      header: "Actions",
      accessorKey: "actions",
      className: "text-center w-32",
      cellClassName: "text-center whitespace-nowrap",
      sortable: false,
      cell: (row) => (
        <div className="flex items-center justify-center gap-3 w-full h-full">
          <button
            onClick={() => handleExport(row)}
            className="inline-flex items-center justify-center p-2 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 transition-colors rounded hover:bg-green-50 dark:hover:bg-green-900/20"
            title="Export"
          >
            <FaDownload size={16} />
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            className="inline-flex items-center justify-center p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors rounded hover:bg-red-50 dark:hover:bg-red-900/20"
            title="Delete"
          >
            <FaTrash size={16} />
          </button>
        </div>
      ),
    };

    // Define data-specific columns
    let dataColumns = [];

    if (selectedDataType === "raw_logs") {
      dataColumns = [
        {
          header: "ID",
          accessorKey: "id",
          cell: (row) => (
            <span className="font-medium text-gray-900 dark:text-white">
              #{row.id}
            </span>
          ),
        },
        {
          header: "Vehicle",
          accessorKey: "vehicle_id",
          cell: (row) => (
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {row.vehicle?.name || `Vehicle ${row.vehicle_id}`}
            </span>
          ),
        },
        {
          header: "Topic",
          accessorKey: "topic",
          cell: (row) => (
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {row.topic || "N/A"}
            </span>
          ),
        },
        {
          header: "Timestamp",
          accessorKey: "created_at",
          cell: (row) => (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {row.created_at
                ? new Date(row.created_at).toLocaleString()
                : "Unknown"}
            </span>
          ),
        },
      ];
    } else if (selectedDataType === "vehicle_logs") {
      dataColumns = [
        {
          header: "ID",
          accessorKey: "id",
          cell: (row) => (
            <span className="font-medium text-gray-900 dark:text-white">
              #{row.id}
            </span>
          ),
        },
        {
          header: "Vehicle",
          accessorKey: "vehicle_id",
          cell: (row) => (
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {row.vehicle?.name || `Vehicle ${row.vehicle_id}`}
            </span>
          ),
        },
        {
          header: "Location",
          accessorKey: "latitude",
          cell: (row) => (
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {row.latitude && row.longitude
                ? `${row.latitude?.toFixed(4)}, ${row.longitude?.toFixed(4)}`
                : "N/A"}
            </span>
          ),
        },
        {
          header: "Battery",
          accessorKey: "battery_voltage",
          cell: (row) => (
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {row.battery_voltage
                ? `${row.battery_voltage.toFixed(1)}V`
                : "N/A"}
            </span>
          ),
        },
        {
          header: "Mode",
          accessorKey: "mode",
          cell: (row) => (
            <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
              {row.mode || "N/A"}
            </span>
          ),
        },
        {
          header: "Timestamp",
          accessorKey: "created_at",
          cell: (row) => (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {row.created_at
                ? new Date(row.created_at).toLocaleString()
                : "Unknown"}
            </span>
          ),
        },
      ];
    } else if (selectedDataType === "sensor_logs") {
      dataColumns = [
        {
          header: "ID",
          accessorKey: "id",
          cell: (row) => (
            <span className="font-medium text-gray-900 dark:text-white">
              #{row.id}
            </span>
          ),
        },
        {
          header: "Vehicle",
          accessorKey: "vehicle_id",
          cell: (row) => (
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {row.vehicle?.name || `Vehicle ${row.vehicle_id}`}
            </span>
          ),
        },
        {
          header: "Sensor",
          accessorKey: "sensor_id",
          cell: (row) => (
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {row.sensor?.name || `Sensor ${row.sensor_id}`}
            </span>
          ),
        },
        {
          header: "Data",
          accessorKey: "data",
          cell: (row) => (
            <span className="text-xs text-gray-600 dark:text-gray-400 max-w-xs truncate">
              {row.data || "N/A"}
            </span>
          ),
        },
        {
          header: "Timestamp",
          accessorKey: "created_at",
          cell: (row) => (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {row.created_at
                ? new Date(row.created_at).toLocaleString()
                : "Unknown"}
            </span>
          ),
        },
      ];
    } else if (selectedDataType === "alerts") {
      dataColumns = [
        {
          header: "ID",
          accessorKey: "id",
          cell: (row) => (
            <span className="font-medium text-gray-900 dark:text-white">
              #{row.id}
            </span>
          ),
        },
        {
          header: "Vehicle",
          accessorKey: "vehicle_id",
          cell: (row) => (
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {row.vehicle?.name ||
                row.vehicle_name ||
                `Vehicle ${row.vehicle_id}`}
            </span>
          ),
        },
        {
          header: "Severity",
          accessorKey: "severity",
          cell: (row) => {
            const colors = {
              critical:
                "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
              warning:
                "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300",
              info: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
            };
            return (
              <span
                className={`text-xs px-2 py-1 rounded-full ${colors[row.severity] || colors.info}`}
              >
                {row.severity || "info"}
              </span>
            );
          },
        },
        {
          header: "Type",
          accessorKey: "alert_type",
          cell: (row) => (
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {row.alert_type || "N/A"}
            </span>
          ),
        },
        {
          header: "Message",
          accessorKey: "message",
          cell: (row) => (
            <span className="text-xs text-gray-600 dark:text-gray-400 max-w-xs truncate">
              {row.message || "N/A"}
            </span>
          ),
        },
        {
          header: "Timestamp",
          accessorKey: "created_at",
          cell: (row) => (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {row.created_at
                ? new Date(row.created_at).toLocaleString()
                : "Unknown"}
            </span>
          ),
        },
      ];
    }

    return [checkboxColumn, ...dataColumns, actionsColumn];
  };

  const columns = getColumns();

  const config = DATA_TYPE_CONFIG[selectedDataType];

  return (
    <div className="bg-white dark:bg-transparent border border-gray-300 dark:border-slate-600 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {config?.label || "Data Records"}
        </h2>
      </div>

      {selectedIds.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center justify-between">
          <span className="text-sm text-gray-700 dark:text-gray-300">
            <span className="font-semibold text-fourth">
              {selectedIds.length}
            </span>{" "}
            item(s) selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleBulkDelete}
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

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingDots size="lg" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-red-500 dark:text-red-400 mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Failed to Load Data
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : (
        <BaseDataTable
          columns={columns}
          data={data}
          searchPlaceholder={config?.searchPlaceholder || "Search..."}
          searchKeys={config?.searchKeys || ["id"]}
          pageSize={10}
          showPagination={true}
          emptyMessage={`No ${config?.label.toLowerCase() || "data"} available. Data will appear here when vehicles send information.`}
        />
      )}
    </div>
  );
};

export default DataTable;
