import { useState } from "react";
import useTitle from "../hooks/useTitle";
import { useAlertData } from "../hooks/useAlertData";
import { Title } from "../components/ui";
import { WidgetCard } from "../components/Widgets";
import { DataTable, ConfirmModal } from "../components/ui";
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
import useTranslation from "../hooks/useTranslation";

const Alerts = () => {
  const { t } = useTranslation();
  useTitle(t("pages.alerts.title"));

  const tr = (key, params = {}) => {
    let text = t(key);
    Object.entries(params).forEach(([paramKey, value]) => {
      text = text.replace(`{{${paramKey}}}`, String(value));
    });
    return text;
  };

  const [showClearModal, setShowClearModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

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
      toast.success(t("pages.alerts.ackSuccess"));
    } else {
      toast.error(t("pages.alerts.ackFailed"));
    }
  };

  // Handle clear all
  const handleClearAll = async () => {
    setShowClearModal(true);
  };

  const handleConfirmClearAll = async () => {
    setIsClearing(true);
    const result = await clearAllAlerts();
    setIsClearing(false);
    setShowClearModal(false);

    if (result?.success) {
      toast.success(t("pages.alerts.clearSuccess"));
      window.dispatchEvent(new Event("alert-count-refresh"));
    } else {
      const errorMessage = result?.error
        ? `${t("pages.alerts.clearFailed")}: ${result.error}`
        : t("pages.alerts.clearFailed");
      toast.error(errorMessage);
    }
  };

  // Widget data
  const widgetData = [
    {
      title: t("pages.alerts.widgets.critical"),
      value: stats.critical,
      icon: <FaExclamationCircle className="text-2xl text-red-500" />,
      iconBgColor: "bg-red-100 dark:bg-red-900/30",
      trendIcon:
        stats.critical > 0 ? (
          <FaExclamationCircle className="text-red-500" />
        ) : null,
      trendText:
        stats.critical > 0
          ? tr("pages.alerts.widgets.criticalTrend", { count: stats.critical })
          : t("pages.alerts.widgets.noCritical"),
    },
    {
      title: t("pages.alerts.widgets.warnings"),
      value: stats.warning,
      icon: <FaExclamationTriangle className="text-2xl text-yellow-500" />,
      iconBgColor: "bg-yellow-100 dark:bg-yellow-900/30",
      trendIcon:
        stats.warning > 0 ? (
          <FaExclamationTriangle className="text-yellow-500" />
        ) : null,
      trendText:
        stats.warning > 0
          ? tr("pages.alerts.widgets.warningsTrend", { count: stats.warning })
          : t("pages.alerts.widgets.noWarnings"),
    },
    {
      title: t("pages.alerts.widgets.info"),
      value: stats.info,
      icon: <FaInfoCircle className="text-2xl text-blue-500" />,
      iconBgColor: "bg-blue-100 dark:bg-blue-900/30",
      trendIcon:
        stats.info > 0 ? <FaInfoCircle className="text-blue-500" /> : null,
      trendText:
        stats.info > 0
          ? tr("pages.alerts.widgets.infoTrend", { count: stats.info })
          : t("pages.alerts.widgets.noInfo"),
    },
    {
      title: t("pages.alerts.widgets.total"),
      value: stats.total,
      icon: <FaExclamationCircle className="text-2xl text-slate-500" />,
      iconBgColor: "bg-slate-100 dark:bg-slate-900/30",
      trendIcon:
        stats.total > 0 ? (
          <FaExclamationCircle className="text-slate-500" />
        ) : null,
      trendText:
        stats.total > 0
          ? tr("pages.alerts.widgets.totalTrend", { count: stats.total })
          : t("pages.alerts.widgets.noAlerts"),
    },
  ];

  // Table columns
  const columns = [
    {
      accessorKey: "severity",
      header: t("pages.alerts.severity"),
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
      header: t("pages.alerts.vehicle"),
      sortable: true,
      cell: (row) => (
        <span className="font-medium text-gray-900 dark:text-white">
          {row.vehicle_name}
        </span>
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
          <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
            {row.message}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "timestamp",
      header: t("pages.alerts.time"),
      sortable: true,
      cell: (row) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {formatTimestamp(row.timestamp)}
        </span>
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
              onClick={() => handleAcknowledge(row.id)}
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
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Title
          title={t("pages.alerts.title")}
          subtitle={t("pages.alerts.subtitle")}
        />
        <div className="flex items-center gap-4">
          {/* Clear All Button */}
          {alerts.length > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
            >
              <FaTrash />
              {t("pages.alerts.clearAll")}
            </button>
          )}
          <ConfirmModal
            isOpen={showClearModal}
            onClose={() => setShowClearModal(false)}
            onConfirm={handleConfirmClearAll}
            title={t("common.confirm")}
            message={t("pages.alerts.confirmClearAll")}
            confirmText={t("pages.alerts.clearAll")}
            cancelText={t("common.cancel")}
            type="danger"
            isLoading={isClearing}
          />
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
    </div>
  );
};

export default Alerts;
