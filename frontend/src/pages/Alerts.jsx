import useTitle from "../hooks/useTitle";
import { useAlertData } from "../hooks/useAlertData";
import { Title } from "../components/ui";
import { WidgetCard } from "../components/Widgets";
import { DataTable } from "../components/ui";
import { WidgetCardSkeleton } from "../components/Skeleton";
import useLoadingTimeout from "../hooks/useLoadingTimeout";
import {
  FaExclamationTriangle,
  FaInfoCircle,
  FaExclamationCircle,
  FaCheckCircle,
  FaTrash,
} from "react-icons/fa";
import { toast } from "../components/ui";

const Alerts = () => {
  useTitle("Alerts");

  const {
    alerts = [],
    stats = { critical: 0, warning: 0, info: 0, total: 0 },
    loading = false,
    connectionStatus = "disconnected",
    acknowledgeAlert,
    clearAllAlerts,
  } = useAlertData() || {};


  const { loading: timeoutLoading } = useLoadingTimeout(loading, 5000);
  const shouldShowSkeleton = timeoutLoading && loading && alerts.length === 0;

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // Get severity badge color
  const getSeverityColor = (severity) => {
    const sev = severity?.toLowerCase() || "info";
    if (sev === "critical" || sev === "error")
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
    if (sev === "warning" || sev === "warn")
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
    return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
  };

  // Get severity icon
  const getSeverityIcon = (severity) => {
    const sev = severity?.toLowerCase() || "info";
    if (sev === "critical" || sev === "error")
      return <FaExclamationCircle className="text-red-500" />;
    if (sev === "warning" || sev === "warn")
      return <FaExclamationTriangle className="text-yellow-500" />;
    return <FaInfoCircle className="text-blue-500" />;
  };

  // Handle acknowledge
  const handleAcknowledge = async (alertId) => {
    const success = await acknowledgeAlert(alertId);
    if (success) {
      toast.success("Alert acknowledged");
    } else {
      toast.error("Failed to acknowledge alert");
    }
  };

  // Handle clear all
  const handleClearAll = async () => {
    if (window.confirm("Are you sure you want to clear all alerts?")) {
      const success = await clearAllAlerts();
      if (success) {
        toast.success("All alerts cleared");
      } else {
        toast.error("Failed to clear alerts");
      }
    }
  };

  // Widget data
  const widgetData = [
    {
      title: "Critical Alerts",
      value: stats.critical,
      icon: <FaExclamationCircle className="text-2xl text-red-500" />,
      iconBgColor: "bg-red-100 dark:bg-red-900/30",
      trendIcon:
        stats.critical > 0 ? (
          <FaExclamationCircle className="text-red-500" />
        ) : null,
      trendText:
        stats.critical > 0
          ? `${stats.critical} critical alerts`
          : "No critical alerts",
    },
    {
      title: "Warnings",
      value: stats.warning,
      icon: <FaExclamationTriangle className="text-2xl text-yellow-500" />,
      iconBgColor: "bg-yellow-100 dark:bg-yellow-900/30",
      trendIcon:
        stats.warning > 0 ? (
          <FaExclamationTriangle className="text-yellow-500" />
        ) : null,
      trendText:
        stats.warning > 0 ? `${stats.warning} warnings` : "No warnings",
    },
    {
      title: "Info",
      value: stats.info,
      icon: <FaInfoCircle className="text-2xl text-blue-500" />,
      iconBgColor: "bg-blue-100 dark:bg-blue-900/30",
      trendIcon:
        stats.info > 0 ? <FaInfoCircle className="text-blue-500" /> : null,
      trendText:
        stats.info > 0 ? `${stats.info} info alerts` : "No info alerts",
    },
    {
      title: "Total Alerts",
      value: stats.total,
      icon: <FaExclamationCircle className="text-2xl text-slate-500" />,
      iconBgColor: "bg-slate-100 dark:bg-slate-900/30",
      trendIcon:
        stats.total > 0 ? (
          <FaExclamationCircle className="text-slate-500" />
        ) : null,
      trendText: stats.total > 0 ? `${stats.total} total alerts` : "No alerts",
    },
  ];

  // Table columns
  const columns = [
    {
      accessorKey: "severity",
      header: "Severity",
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-2">
          {getSeverityIcon(row.severity)}
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(row.severity)}`}
          >
            {row.severity?.toUpperCase() || "INFO"}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "vehicle_name",
      header: "Vehicle",
      sortable: true,
      cell: (row) => (
        <span className="font-medium text-gray-900 dark:text-white">
          {row.vehicle_name}
        </span>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      sortable: true,
    },
    {
      accessorKey: "message",
      header: "Message",
      sortable: false,
      cell: (row) => (
        <div className="max-w-md">
          <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
            {row.message}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "timestamp",
      header: "Time",
      sortable: true,
      cell: (row) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {formatTimestamp(row.timestamp)}
        </span>
      ),
    },
    {
      accessorKey: "acknowledged",
      header: "Status",
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-2">
          {row.acknowledged ? (
            <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
              <FaCheckCircle />
              Acknowledged
            </span>
          ) : (
            <button
              onClick={() => handleAcknowledge(row.id)}
              className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded transition-colors"
            >
              Acknowledge
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Title title="Alerts" subtitle="Real-time alerts from USV" />
        <div className="flex items-center gap-4">
          {/* Clear All Button */}
          {alerts.length > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
            >
              <FaTrash />
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Widget Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-4">
        {shouldShowSkeleton
          ? Array.from({ length: 4 }).map((_, idx) => (
              <WidgetCardSkeleton key={idx} />
            ))
          : widgetData.map((item, idx) => <WidgetCard key={idx} {...item} />)}
      </div>

      {/* Alerts Table */}
      <div className="bg-white dark:bg-transparent border border-gray-300 dark:border-slate-600 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Alert History
        </h2>

        <DataTable
          columns={columns}
          data={alerts}
          searchPlaceholder="Search alerts..."
          searchKeys={["vehicle_name", "type", "message", "severity"]}
          pageSize={10}
          loading={loading}
          emptyMessage="No alerts found"
        />
      </div>
    </div>
  );
};

export default Alerts;
