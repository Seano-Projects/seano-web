import {
  FaCheck,
  FaCheckCircle,
  FaEnvelope,
  FaEnvelopeOpen,
  FaExclamationCircle,
  FaExclamationTriangle,
  FaInfoCircle,
} from "react-icons/fa";
import { DataTable } from "../../ui";

const getPriorityColor = (type) => {
  const t = type?.toLowerCase() || "info";
  if (t === "critical" || t === "error")
    return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
  if (t === "warning" || t === "warn")
    return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
  if (t === "success")
    return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
  return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
};

const getTypeIcon = (type) => {
  const t = type?.toLowerCase() || "info";
  if (t === "critical" || t === "error")
    return <FaExclamationCircle className="text-red-500" />;
  if (t === "warning" || t === "warn")
    return <FaExclamationTriangle className="text-yellow-500" />;
  if (t === "success") return <FaCheckCircle className="text-green-500" />;
  return <FaInfoCircle className="text-blue-500" />;
};

const NotificationTable = ({ notifications, loading, markAsRead, formatTimestamp, t }) => {
  const columns = [
    {
      accessorKey: "read",
      header: t("pages.notifications.status"),
      sortable: true,
      cell: (row) => (
        <div className="flex items-center justify-center">
          {row.read ? <FaEnvelopeOpen className="text-gray-400" /> : <FaEnvelope className="text-blue-500" />}
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: t("pages.notifications.type"),
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-2">
          {getTypeIcon(row.type)}
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(row.type)}`}>
            {row.badge || row.type?.toUpperCase() || "INFO"}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "title",
      header: t("pages.notifications.titleCol"),
      sortable: true,
      cell: (row) => (
        <span className={`font-medium ${row.read ? "text-gray-600 dark:text-gray-400" : "text-gray-900 dark:text-white"}`}>
          {row.title}
        </span>
      ),
    },
    {
      accessorKey: "message",
      header: t("pages.notifications.message"),
      sortable: false,
      cell: (row) => (
        <div className="max-w-md">
          <p className={`text-sm truncate ${row.read ? "text-gray-500 dark:text-gray-500" : "text-gray-700 dark:text-gray-300"}`}>
            {row.message}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "vehicle",
      header: t("pages.notifications.vehicle"),
      sortable: true,
      cell: (row) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">{row.vehicle || "-"}</span>
      ),
    },
    {
      accessorKey: "timestamp",
      header: t("pages.notifications.time"),
      sortable: true,
      cell: (row) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">{formatTimestamp(row.timestamp)}</span>
      ),
    },
    {
      accessorKey: "action",
      header: "Action",
      sortable: false,
      cell: (row) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={row.read}
            onClick={(event) => { event.stopPropagation(); markAsRead(row.id); }}
            className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
              row.read
                ? "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500 cursor-not-allowed"
                : "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300"
            }`}
            title={row.read ? "Read" : "Mark as read"}
          >
            <FaCheck className="text-xs" />
            {row.read ? "Read" : "Check"}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="bg-white dark:bg-black border border-gray-300 dark:border-slate-600 rounded-xl p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        {t("pages.notifications.history")}
      </h2>
      <DataTable
        columns={columns}
        data={notifications}
        searchPlaceholder={t("pages.notifications.searchPlaceholder")}
        searchKeys={["title", "message", "vehicle", "type"]}
        pageSize={10}
        loading={loading}
        emptyMessage={t("pages.notifications.emptyMessage")}
      />
    </div>
  );
};

export default NotificationTable;
