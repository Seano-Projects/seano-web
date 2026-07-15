import { useState, useEffect, useCallback } from "react";
import { FaTrash } from "react-icons/fa";
import { DataTable as BaseDataTable, Modal } from "../../ui";
import axios from "../../../utils/axiosConfig";
import { API_ENDPOINTS } from "../../../config";
import { toast } from "../../ui";
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
  const [viewJsonData, setViewJsonData] = useState(null);

  // Data type configurations
  const DATA_TYPE_CONFIG = {
    vehicle_logs: {
      labelKey: "pages.data.types.vehicleLogs",
      endpoint: API_ENDPOINTS.VEHICLE_LOGS,
      searchKeys: ["vehicle_id", "mode"],
      searchPlaceholderKey: "pages.data.table.searchVehicle",
    },
    sensor_logs: {
      labelKey: "pages.data.types.sensorLogs",
      endpoint: API_ENDPOINTS.SENSOR_LOGS,
      searchKeys: ["vehicle_id", "sensor_id"],
      searchPlaceholderKey: "pages.data.table.searchSensor",
    },
    battery_logs: {
      labelKey: "pages.data.types.batteryLogs",
      endpoint: API_ENDPOINTS.BATTERY_LOGS,
      searchKeys: ["vehicle_id", "battery_id", "status"],
      searchPlaceholderKey: "pages.data.table.searchBattery",
    },
    waypoint_logs: {
      labelKey: "pages.data.types.waypointLogs",
      endpoint: API_ENDPOINTS.WAYPOINT_LOGS,
      searchKeys: ["vehicle_id", "mission_name", "status"],
      searchPlaceholderKey: "pages.data.table.searchWaypoint",
    },
    command_logs: {
      labelKey: "pages.data.types.commandLogs",
      endpoint: API_ENDPOINTS.COMMAND_LOGS,
      searchKeys: ["vehicle_id", "command", "status"],
      searchPlaceholderKey: "pages.data.table.searchCommand",
    },
    thruster_logs: {
      labelKey: "pages.data.types.thrusterLogs",
      endpoint: API_ENDPOINTS.THRUSTER_LOGS,
      searchKeys: ["vehicle_code", "event"],
      searchPlaceholderKey: "pages.data.table.searchThruster",
    },
    latency_logs: {
      labelKey: "pages.data.types.latencyLogs",
      endpoint: API_ENDPOINTS.LATENCY_LOGS,
      searchKeys: ["log_type", "log_id", "vehicle_id"],
      searchPlaceholderKey: "pages.data.table.searchCommand",
    },
  };

  // Build query params from filters
  const buildQueryParams = useCallback((type, f) => {
    const params = new URLSearchParams();
    if (f.vehicle?.id) params.append("vehicle_id", f.vehicle.id);
    if (f.mission?.id) params.append("mission_id", f.mission.id);

    if (f.dateRange === "custom") {
      // Custom range — use the explicit Start/End Date (+ time) fields.
      if (f.startDate) {
        const time = f.startTime || "00:00:00";
        const d = new Date(`${f.startDate}T${time}`);
        if (!isNaN(d)) params.append("start_time", d.toISOString());
      }
      if (f.endDate) {
        const time = f.endTime ? `${f.endTime}:59` : "23:59:59";
        const d = new Date(`${f.endDate}T${time}`);
        if (!isNaN(d)) params.append("end_time", d.toISOString());
      }
    } else if (f.dateRange && f.dateRange !== "all") {
      // Preset range shortcuts → convert to start_time
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
    // "all" → no time restriction, every record for the other filters shows up.

    if (f.dataScope && f.dataScope !== "all")
      params.append("source", f.dataScope);
    if (type === "sensor_logs" && f.sensor?.id) {
      params.append("sensor_id", f.sensor.id);
    }
    if (type === "latency_logs") {
      // The backend matches log_type exactly (never empty) — always send one.
      params.append("log_type", f.logType || "vehicle");
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
        setError("This data type is not available.");
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
          // No vehicle selected — return empty data with a prompt
          setData([]);
          setError(null);
          if (onDataLoaded) onDataLoaded([], selectedDataType);
          return;
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
          `Couldn't load ${DATA_TYPE_CONFIG[selectedDataType]?.label || "data"}. Please try again.`,
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
      className: "text-center w-24",
      cellClassName: "text-center whitespace-nowrap",
      sortable: false,
      cell: (row) => (
        <div className="flex items-center justify-center w-full h-full">
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
      ];
    } else if (selectedDataType === "sensor_logs") {
      dataColumns = [
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
          cell: (row) => {
            const jsonStr = formatJsonPayload(row.data);
            if (!jsonStr)
              return (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  N/A
                </span>
              );
            return (
              <div className="flex items-center gap-2 max-w-70 sm:max-w-90 md:max-w-130">
                <span className="text-xs text-gray-600 dark:text-gray-400 font-mono truncate">
                  {jsonStr}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewJsonData(jsonStr);
                  }}
                  className="shrink-0 text-xs px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
                >
                  {t("pages.data.table.view") || "View"}
                </button>
              </div>
            );
          },
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
      ];
    } else if (selectedDataType === "battery_logs") {
      dataColumns = [
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
      ];
    } else if (selectedDataType === "waypoint_logs") {
      dataColumns = [
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
        {
          header: t("pages.data.table.columns.vehicle"),
          accessorKey: "vehicle_code",
          cell: (row) => (
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {row.vehicle?.code || row.vehicle_code || `V${row.vehicle_id}`}
            </span>
          ),
        },
        {
          header: t("pages.data.table.columns.mission"),
          accessorKey: "mission_name",
          cell: (row) => (
            <span className="text-xs px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
              {row.mission_name ||
                (row.mission_id ? `#${row.mission_id}` : "—")}
            </span>
          ),
        },
        {
          header: "Waypoint Count",
          accessorKey: "waypoint_count",
          cell: (row) => (
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {row.waypoint_count || "—"}
            </span>
          ),
        },
        {
          header: t("pages.data.table.columns.status"),
          accessorKey: "status",
          cell: (row) => {
            const statusColor =
              row.status === "success"
                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                : row.status === "failed"
                  ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                  : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300";
            return (
              <span className={`text-xs px-2 py-1 rounded-full ${statusColor}`}>
                {row.status || "—"}
              </span>
            );
          },
        },
        {
          header: t("pages.data.table.columns.message"),
          accessorKey: "message",
          cell: (row) => (
            <span className="text-xs text-gray-600 dark:text-gray-400 max-w-xs truncate">
              {row.message || "—"}
            </span>
          ),
        },
      ];
    } else if (selectedDataType === "command_logs") {
      dataColumns = [
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
        {
          header: t("pages.data.table.columns.vehicle"),
          accessorKey: "vehicle_code",
          cell: (row) => (
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {row.vehicle?.code || row.vehicle_code || `V${row.vehicle_id}`}
            </span>
          ),
        },
        {
          header: "Command",
          accessorKey: "command",
          cell: (row) => (
            <span className="text-xs px-2 py-1 rounded-full bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300">
              {row.command || "—"}
            </span>
          ),
        },
        {
          header: t("pages.data.table.columns.status"),
          accessorKey: "status",
          cell: (row) => {
            const statusColor =
              row.status === "success"
                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                : row.status === "failed"
                  ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                  : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300";
            return (
              <span className={`text-xs px-2 py-1 rounded-full ${statusColor}`}>
                {row.status || "—"}
              </span>
            );
          },
        },
        {
          header: t("pages.data.table.columns.message"),
          accessorKey: "message",
          cell: (row) => (
            <span className="text-xs text-gray-600 dark:text-gray-400 max-w-xs truncate">
              {row.message || "—"}
            </span>
          ),
        },
        {
          header: "Initiated",
          accessorKey: "initiated_at",
          cell: (row) => (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {row.initiated_at
                ? new Date(row.initiated_at).toLocaleTimeString()
                : "—"}
            </span>
          ),
        },
      ];
    } else if (selectedDataType === "thruster_logs") {
      dataColumns = [
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
        {
          header: t("pages.data.table.columns.vehicle"),
          accessorKey: "vehicle_code",
          cell: (row) => (
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {row.vehicle?.code || row.vehicle_code || `V${row.vehicle_id}`}
            </span>
          ),
        },
        {
          header: t("pages.data.table.columns.event"),
          accessorKey: "event",
          cell: (row) => (
            <span
              className={`text-xs px-2 py-1 rounded-full font-medium ${
                row.event === "OVERRIDE"
                  ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
                  : "bg-gray-100 dark:bg-gray-700/30 text-gray-700 dark:text-gray-300"
              }`}
            >
              {row.event || "—"}
            </span>
          ),
        },
        {
          header: t("pages.data.table.columns.throttle"),
          accessorKey: "throttle_pct",
          cell: (row) => (
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {row.throttle_pct != null ? `${row.throttle_pct}%` : "—"}
            </span>
          ),
        },
        {
          header: t("pages.data.table.columns.steering"),
          accessorKey: "steering_pct",
          cell: (row) => (
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {row.steering_pct != null ? `${row.steering_pct}%` : "—"}
            </span>
          ),
        },
        {
          header: "Initiated",
          accessorKey: "initiated_at",
          cell: (row) => (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {row.initiated_at
                ? new Date(row.initiated_at).toLocaleTimeString()
                : "—"}
            </span>
          ),
        },
      ];
    } else if (selectedDataType === "latency_logs") {
      dataColumns = [
        {
          header: "Created At",
          accessorKey: "created_at",
          cell: (row) => (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {row.created_at ? new Date(row.created_at).toLocaleString() : "—"}
            </span>
          ),
        },
        {
          header: "Log Type",
          accessorKey: "log_type",
          cell: (row) => (
            <span
              className={`text-xs px-2 py-1 rounded-full font-medium ${
                row.log_type === "vehicle"
                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                  : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
              }`}
            >
              {row.log_type || "—"}
            </span>
          ),
        },
        {
          header: "Vehicle ID",
          accessorKey: "vehicle_id",
          cell: (row) => (
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {row.vehicle_id || "—"}
            </span>
          ),
        },
        {
          header: "Log ID",
          accessorKey: "log_id",
          cell: (row) => (
            <span className="text-xs font-mono text-gray-600 dark:text-gray-400">
              #{row.log_id}
            </span>
          ),
        },
        {
          // vehicle/sensor logs originate on the USV (usv_timestamp is when the
          // device captured the reading); thruster/command/waypoint logs
          // originate from the web/backend instead, so there's no USV-side
          // timestamp — initiated_at is the meaningful "origin" time there.
          header:
            filters.logType === "vehicle" || filters.logType === "sensor"
              ? "USV Timestamp"
              : "Initiated At",
          accessorKey: "origin_timestamp",
          cell: (row) => {
            const value = row.usv_timestamp ?? row.initiated_at;
            return (
              <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                {value
                  ? new Date(value).toLocaleTimeString([], {
                      hour12: false,
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      fractionalSecondDigits: 3,
                    })
                  : "—"}
              </span>
            );
          },
        },
        {
          header: "WS Received At",
          accessorKey: "ws_received_at",
          cell: (row) => (
            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              {row.ws_received_at
                ? new Date(row.ws_received_at).toLocaleTimeString([], {
                    hour12: false,
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    fractionalSecondDigits: 3,
                  })
                : "—"}
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
        <div className="animate-pulse space-y-2 py-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-10 bg-gray-100 dark:bg-gray-800 rounded-lg"
            />
          ))}
        </div>
      ) : selectedDataType === "battery_logs" && !filters.vehicle?.id ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            {t("pages.data.table.selectVehicleForBattery") ||
              "Please select a vehicle to view battery logs"}
          </p>
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

      <Modal
        isOpen={!!viewJsonData}
        onClose={() => setViewJsonData(null)}
        title={t("pages.data.table.columns.dataJson")}
        size="lg"
      >
        <pre className="text-xs font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-all max-h-[60vh] overflow-y-auto bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
          {viewJsonData
            ? (() => {
                try {
                  return JSON.stringify(JSON.parse(viewJsonData), null, 2);
                } catch {
                  return viewJsonData;
                }
              })()
            : ""}
        </pre>
      </Modal>
    </div>
  );
};

export default DataTable;
