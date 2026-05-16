import {
  FaCheckCircle,
  FaExclamationCircle,
  FaExclamationTriangle,
  FaInfoCircle,
} from "react-icons/fa";
import { DataTable } from "../../ui";

const getSeverityColor = (severity) => {
  const sev = severity?.toLowerCase() || "info";
  if (sev === "critical" || sev === "error")
    return "bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700";
  if (sev === "warning" || sev === "warn")
    return "bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700";
  return "bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700";
};

const getSeverityIcon = (severity) => {
  const sev = severity?.toLowerCase() || "info";
  if (sev === "critical" || sev === "error")
    return <FaExclamationCircle className="text-red-500" />;
  if (sev === "warning" || sev === "warn")
    return <FaExclamationTriangle className="text-yellow-500" />;
  return <FaInfoCircle className="text-blue-500" />;
};

const AlertsTable = ({ alerts, loading, onAcknowledge, formatTimestamp, t }) => {
  const columns = [
    {
      accessorKey: "severity",
      header: t("pages.alerts.severity"),
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-2">
          {getSeverityIcon(row.severity)}
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(row.severity)}`}>
            {row.severity?.toUpperCase() || "INFO"}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "vehicle_name",
      header: t("pages.alerts.vehicle"),
      sortable: true,
      cell: (row) => (
        <span className="font-medium text-gray-900 dark:text-white">{row.vehicle_name}</span>
      ),
    },
    {
      accessorKey: "type",
      header: t("pages.alerts.type"),
      sortable: true,
    },
    {
      accessorKey: "message",
      header: t("pages.alerts.message"),
      sortable: false,
      cell: (row) => (
        <div className="max-w-md">
          <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{row.message}</p>
        </div>
      ),
    },
    {
      accessorKey: "timestamp",
      header: t("pages.alerts.time"),
      sortable: true,
      cell: (row) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">{formatTimestamp(row.timestamp)}</span>
      ),
    },
    {
      accessorKey: "acknowledged",
      header: t("pages.alerts.status"),
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-2">
          {row.acknowledged ? (
            <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
              <FaCheckCircle />
              {t("pages.alerts.acknowledged")}
            </span>
          ) : (
            <button
              onClick={() => onAcknowledge(row.id)}
              className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded transition-colors"
            >
              {t("pages.alerts.acknowledge")}
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="bg-white dark:bg-transparent border border-gray-300 dark:border-slate-600 rounded-xl p-6 custom-scrollbar">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        {t("pages.alerts.history")}
      </h2>
      <DataTable
        columns={columns}
        data={alerts}
        searchPlaceholder={t("pages.alerts.searchPlaceholder")}
        searchKeys={["vehicle_name", "type", "message", "severity"]}
        pageSize={10}
        loading={loading}
        emptyMessage={t("pages.alerts.emptyMessage")}
      />
    </div>
  );
};

export default AlertsTable;
