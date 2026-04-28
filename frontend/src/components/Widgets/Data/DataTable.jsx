import { useState, useEffect, useCallback } from "react";
import { FaTrash, FaDownload } from "react-icons/fa";
import { DataTable as BaseDataTable } from "../../ui";
import axios from "../../../utils/axiosConfig";
import { API_ENDPOINTS } from "../../../config";
import { toast, LoadingDots } from "../../ui";
import useTranslation from "../../../hooks/useTranslation";

const DataTable = ({
  hasActiveFilters,
  handleResetFilters,
  selectedDataType = "vehicle_logs",
  filters = {},
  onDataLoaded,
}) => {
  const { t } = useTranslation();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [error, setError] = useState(null);

  // Data type configurations
  const DATA_TYPE_CONFIG = {
    vehicle_logs: {
      labelKey: "pages.data.types.vehicleLogs",
      endpoint: API_ENDPOINTS.VEHICLE_LOGS,
      searchKeys: ["id", "vehicle_id", "mode"],
      searchPlaceholderKey: "pages.data.table.searchVehicle",
    },
    sensor_logs: {
      labelKey: "pages.data.types.sensorLogs",
      endpoint: API_ENDPOINTS.SENSOR_LOGS,
      searchKeys: ["id", "vehicle_id", "sensor_id"],
      searchPlaceholderKey: "pages.data.table.searchSensor",
    },
    battery_logs: {
      labelKey: "pages.data.types.batteryLogs",
      endpoint: API_ENDPOINTS.BATTERY_LOGS,
      searchKeys: ["id", "vehicle_id", "battery_id", "status"],
      searchPlaceholderKey: "pages.data.table.searchBattery",
    },
  };

  // Build query params from filters
  const buildQueryParams = useCallback((type, f) => {
    const params = new URLSearchParams();
    if (f.vehicle?.id) params.append("vehicle_id", f.vehicle.id);
    if (f.mission?.id) params.append("mission_id", f.mission.id);

    // Convert date strings to ISO 8601 (RFC3339) required by backend
    const toISO = (dateStr) => {
      if (!dateStr) return null;
      const d = new Date(dateStr);
      return isNaN(d) ? null : d.toISOString();
    };
    if (f.startDate) {
      const iso = toISO(f.startDate);
      if (iso) params.append("start_time", iso);
    }
    if (f.endDate) {
      // End date: set to end of that day
      const d = new Date(f.endDate);
      if (!isNaN(d)) {
        d.setHours(23, 59, 59, 999);
        params.append("end_time", d.toISOString());
      }
    }

    // date range shortcuts → convert to start_time
    if (f.dateRange && f.dateRange !== "all" && !f.startDate) {
      const now = new Date();
      let from;
      if (f.dateRange === "today") {
        from = new Date(now);
        from.setHours(0, 0, 0, 0);
      } else if (f.dateRange === "week") {
        from = new Date(now);
        from.setDate(from.getDate() - 7);
      } else if (f.dateRange === "month") {
        from = new Date(now);
        from.setMonth(from.getMonth() - 1);
      } else if (f.dateRange === "quarter") {
        from = new Date(now);
        from.setMonth(from.getMonth() - 3);
      }
      if (from) params.append("start_time", from.toISOString());
    }

    if (f.dataScope && f.dataScope !== "all")
      params.append("source", f.dataScope);
    if (type === "sensor_logs" && f.sensorType && f.sensorType !== "all") {
      params.append("sensor_type", f.sensorType);
    }
    params.append("limit", "500");
    return params.toString();
  }, []);

  const formatJsonPayload = (payload) => {
    if (payload === null || payload === undefined || payload === "")
      return null;

    if (typeof payload === "string") {
      const trimmed = payload.trim();
      if (!trimmed) return null;

      try {
        const parsed = JSON.parse(trimmed);
        return JSON.stringify(parsed);
      } catch {
        return trimmed;
      }
    }

    try {
      return JSON.stringify(payload);
    } catch {
      return String(payload);
    }
  };

  // Normalise API response — most endpoints return { data: [], count: N }, waypoint_logs returns plain []
  const extractData = (responseData) => {
    if (Array.isArray(responseData)) return responseData;
    if (responseData && Array.isArray(responseData.data))
      return responseData.data;
    return [];
  };

  // Fetch data based on selected type + filters
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const config = DATA_TYPE_CONFIG[selectedDataType];
      const hasEndpoint =
        selectedDataType === "battery_logs"
          ? Boolean(config?.endpoint?.LATEST)
          : Boolean(config?.endpoint?.LIST);

      if (!config || !hasEndpoint) {
        setError("Invalid data type or endpoint not configured");
        setData([]);
        return;
      }

      let fetchedData = [];

      if (selectedDataType === "battery_logs") {
        if (filters.vehicle?.id) {
          const queryString = buildQueryParams(selectedDataType, filters);
          const baseUrl = config.endpoint.BY_VEHICLE(filters.vehicle.id);
          const response = await axios.get(
            `${baseUrl}${queryString ? `?${queryString}` : ""}`,
          );
          fetchedData = extractData(response.data);
        } else {
          const latestResponse = await axios.get(config.endpoint.LATEST);
          const latestRows = extractData(latestResponse.data);
          fetchedData = latestRows.map((row) => ({
            ...row,
            id:
              row.id || `${row.vehicle_id}-${row.battery_id}-${row.timestamp}`,
          }));
        }
      } else {
        const queryString = buildQueryParams(selectedDataType, filters);
        const url = `${config.endpoint.LIST}${queryString ? "?" + queryString : ""}`;
        const response = await axios.get(url);
        fetchedData = extractData(response.data);
      }

      setData(fetchedData);
      if (onDataLoaded) onDataLoaded(fetchedData, selectedDataType);
    } catch (err) {
      setError(
        err.message ||
          `Failed to fetch ${DATA_TYPE_CONFIG[selectedDataType]?.label || "data"}`,
      );
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDataType, filters, buildQueryParams]);

  // Fetch when type or filters change — no auto-polling
  useEffect(() => {
    fetchData();
    setSelectedIds([]);
  }, [selectedDataType, filters]);

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
      t("pages.data.table.deleteBulkConfirm")
        .replace("{{count}}", selectedIds.length)
        .replace("{{type}}", t(config.labelKey).toLowerCase()),
    );

    if (!confirmBulk) return;

    try {
      await Promise.all(
        selectedIds.map((id) => axios.delete(config.endpoint.DELETE(id))),
      );

      toast.success(
        t("pages.data.table.deleteBulkSuccess")
          .replace("{{count}}", selectedIds.length)
          .replace("{{type}}", t(config.labelKey).toLowerCase()),
      );
      setSelectedIds([]);
      fetchData();
    } catch (err) {
      toast.error(
        t("pages.data.table.deleteBulkFailed").replace(
          "{{type}}",
          t(config.labelKey).toLowerCase(),
        ),
      );
    }
  };

  // Handle delete single
  const handleDelete = async (id) => {
    const config = DATA_TYPE_CONFIG[selectedDataType];
    if (
      !window.confirm(
        t("pages.data.table.deleteSingleConfirm").replace(
          "{{type}}",
          t(config.labelKey).toLowerCase().replace(/s$/, ""),
        ),
      )
    )
      return;

    try {
      await axios.delete(config.endpoint.DELETE(id));
      toast.success(
        t("pages.data.table.deleteSingleSuccess").replace(
          "{{type}}",
          t(config.labelKey).replace(/s$/, ""),
        ),
      );
      fetchData();
    } catch (err) {
      toast.error(
        t("pages.data.table.deleteSingleFailed").replace(
          "{{type}}",
          t(config.labelKey).toLowerCase().replace(/s$/, ""),
        ),
      );
    }
  };

  // Handle export single row
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
    toast.success(t("pages.data.table.exportSuccess"));
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

    let dataColumns = [];

    if (selectedDataType === "vehicle_logs") {
      dataColumns = [
        {
          header: t("pages.data.table.columns.id"),
          accessorKey: "id",
          cell: (row) => (
            <span className="font-medium text-gray-900 dark:text-white">
              #{row.id}
            </span>
          ),
        },
        {
          header: t("pages.data.table.columns.vehicle"),
          accessorKey: "vehicle_id",
          cell: (row) => (
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {row.vehicle?.name || `Vehicle ${row.vehicle_id}`}
            </span>
          ),
        },
        {
          header: t("pages.data.table.columns.mission"),
          accessorKey: "mission_id",
          cell: (row) => (
            <span className="text-xs px-2 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
              {row.mission?.name ||
                (row.mission_id ? `#${row.mission_id}` : "—")}
            </span>
          ),
        },
        {
          header: t("pages.data.table.columns.coordinates"),
          accessorKey: "latitude",
          cell: (row) => (
            <span className="text-xs text-gray-600 dark:text-gray-400 font-mono">
              {row.latitude != null && row.longitude != null
                ? `${Number(row.latitude).toFixed(6)}, ${Number(row.longitude).toFixed(6)}`
                : "—"}
            </span>
          ),
        },
        {
          header: t("pages.data.table.columns.speed"),
          accessorKey: "speed",
          cell: (row) => (
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {row.speed != null ? `${Number(row.speed).toFixed(1)} m/s` : "—"}
            </span>
          ),
        },
        {
          header: t("pages.data.table.columns.battery"),
          accessorKey: "battery_voltage",
          cell: (row) => (
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {row.battery_voltage ? `${row.battery_voltage.toFixed(1)}V` : "—"}
            </span>
          ),
        },
        {
          header: t("pages.data.table.columns.mode"),
          accessorKey: "mode",
          cell: (row) => (
            <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
              {row.mode || "—"}
            </span>
          ),
        },
        {
          header: t("pages.data.table.columns.timestamp"),
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
          header: t("pages.data.table.columns.vehicle"),
          accessorKey: "vehicle_id",
          cell: (row) => (
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {row.vehicle?.code || row.vehicle_code || `V${row.vehicle_id}`}
            </span>
          ),
        },
        {
          header: t("pages.data.table.columns.sensor"),
          accessorKey: "sensor_id",
          cell: (row) => (
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {row.sensor?.code || row.sensor_code || `S${row.sensor_id}`}
            </span>
          ),
        },
        {
          header: t("pages.data.table.columns.dataJson"),
          accessorKey: "data",
          cell: (row) => (
            <span className="text-xs text-gray-600 dark:text-gray-400 max-w-[280px] sm:max-w-[360px] md:max-w-[520px] whitespace-normal break-all font-mono inline-block">
              {formatJsonPayload(row.data) || "N/A"}
            </span>
          ),
        },
        {
          header: t("pages.data.table.columns.mission"),
          accessorKey: "mission_id",
          cell: (row) => (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {row.mission_id || "—"}
            </span>
          ),
        },
        {
          header: t("pages.data.table.columns.timestamp"),
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
    } else if (selectedDataType === "battery_logs") {
      dataColumns = [
        {
          header: t("pages.data.table.columns.batteryUnit"),
          accessorKey: "battery_id",
          cell: (row) => <span>#{row.battery_id || "—"}</span>,
        },
        {
          header: t("pages.data.table.columns.soc"),
          accessorKey: "percentage",
          cell: (row) => (
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {row.percentage != null
                ? `${Number(row.percentage).toFixed(1)}%`
                : "—"}
            </span>
          ),
        },
        {
          header: t("pages.data.table.columns.voltage"),
          accessorKey: "voltage",
          cell: (row) => (
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {row.voltage != null
                ? `${Number(row.voltage).toFixed(2)} V`
                : "—"}
            </span>
          ),
        },
        {
          header: t("pages.data.table.columns.current"),
          accessorKey: "current",
          cell: (row) => (
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {row.current != null
                ? `${Number(row.current).toFixed(2)} A`
                : "—"}
            </span>
          ),
        },
        {
          header: t("pages.data.table.columns.temperature"),
          accessorKey: "temperature",
          cell: (row) => (
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {row.temperature != null
                ? `${Number(row.temperature).toFixed(1)} C`
                : "—"}
            </span>
          ),
        },
        {
          header: t("pages.data.table.columns.timestamp"),
          accessorKey: "timestamp",
          cell: (row) => (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {row.timestamp
                ? new Date(row.timestamp).toLocaleString()
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
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {config ? t(config.labelKey) : t("pages.data.table.dataRecords")}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {data.length > 0
              ? t("pages.data.table.recordsLoaded").replace(
                  "{{count}}",
                  data.length,
                )
              : ""}
            {hasActiveFilters && ` · ${t("pages.data.table.filtersApplied")}`}
          </p>
        </div>
        <button
          onClick={fetchData}
          className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
        >
          {t("pages.data.actions.refresh")}
        </button>
      </div>

      {selectedIds.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center justify-between">
          <span className="text-sm text-gray-700 dark:text-gray-300">
            <span className="font-semibold text-fourth">
              {selectedIds.length}
            </span>{" "}
            {t("pages.data.table.itemsSelected")}
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <FaTrash size={14} />
              {t("pages.data.table.deleteSelected")}
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
            >
              {t("pages.data.table.clearSelection")}
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
            {t("pages.data.table.failedLoad")}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            {t("pages.data.table.tryAgain")}
          </button>
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <div className="inline-block min-w-full">
            <BaseDataTable
              columns={columns}
              data={data}
              searchPlaceholder={
                config?.searchPlaceholderKey
                  ? t(config.searchPlaceholderKey)
                  : t("common.search")
              }
              searchKeys={config?.searchKeys || ["id"]}
              pageSize={20}
              showPagination={true}
              emptyMessage={
                hasActiveFilters
                  ? t("pages.data.table.emptyWithFilters")
                  : t("pages.data.table.empty")
              }
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
