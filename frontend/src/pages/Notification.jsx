import useTitle from "../hooks/useTitle";
import useNotificationData from "../hooks/useNotificationData";
import { Title } from "../components/ui";
import { WidgetCard } from "../components/Widgets";
import { DataTable } from "../components/ui";
import { WidgetCardSkeleton } from "../components/Skeleton";
import useLoadingTimeout from "../hooks/useLoadingTimeout";
import {
  FaBell,
  FaExclamationTriangle,
  FaInfoCircle,
  FaExclamationCircle,
  FaCheckCircle,
  FaEnvelope,
  FaEnvelopeOpen,
} from "react-icons/fa";
import useTranslation from "../hooks/useTranslation";

const Notification = () => {
  const { t } = useTranslation();
  useTitle(t("pages.notifications.title"));

  const tr = (key, params = {}) => {
    let text = t(key);
    Object.entries(params).forEach(([paramKey, value]) => {
      text = text.replace(`{{${paramKey}}}`, String(value));
    });
    return text;
  };

  const { notifications, loading, stats, refreshData } = useNotificationData();
  const { loading: timeoutLoading } = useLoadingTimeout(loading, 5000);
  const shouldShowSkeleton =
    timeoutLoading && loading && notifications.length === 0;

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return days > 1
        ? tr("pages.notifications.dayAgoPlural", { count: days })
        : tr("pages.notifications.dayAgo", { count: days });
    } else if (hours > 0) {
      return hours > 1
        ? tr("pages.notifications.hourAgoPlural", { count: hours })
        : tr("pages.notifications.hourAgo", { count: hours });
    } else if (minutes > 0) {
      return minutes > 1
        ? tr("pages.notifications.minuteAgoPlural", { count: minutes })
        : tr("pages.notifications.minuteAgo", { count: minutes });
    } else {
      return t("pages.notifications.justNow");
    }
  };

  // Get priority badge color
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

  // Get type icon
  const getTypeIcon = (type) => {
    const t = type?.toLowerCase() || "info";
    if (t === "critical" || t === "error")
      return <FaExclamationCircle className="text-red-500" />;
    if (t === "warning" || t === "warn")
      return <FaExclamationTriangle className="text-yellow-500" />;
    if (t === "success") return <FaCheckCircle className="text-green-500" />;
    return <FaInfoCircle className="text-blue-500" />;
  };

  // Widget data
  const widgetData = [
    {
      title: t("pages.notifications.widgets.total"),
      value: stats.total,
      icon: <FaBell className="text-2xl text-slate-500" />,
      iconBgColor: "bg-slate-100 dark:bg-slate-900/30",
      trendIcon: stats.total > 0 ? <FaBell className="text-slate-500" /> : null,
      trendText:
        stats.total > 0
          ? tr("pages.notifications.widgets.totalTrend", {
              count: stats.total,
            })
          : t("pages.notifications.widgets.noNotifications"),
    },
    {
      title: t("pages.notifications.widgets.unread"),
      value: stats.unread,
      icon: <FaEnvelope className="text-2xl text-blue-500" />,
      iconBgColor: "bg-blue-100 dark:bg-blue-900/30",
      trendIcon:
        stats.unread > 0 ? <FaEnvelope className="text-blue-500" /> : null,
      trendText:
        stats.unread > 0
          ? tr("pages.notifications.widgets.unreadTrend", {
              count: stats.unread,
            })
          : t("pages.notifications.allRead"),
    },
    {
      title: t("pages.notifications.widgets.critical"),
      value: stats.critical,
      icon: <FaExclamationCircle className="text-2xl text-red-500" />,
      iconBgColor: "bg-red-100 dark:bg-red-900/30",
      trendIcon:
        stats.critical > 0 ? (
          <FaExclamationCircle className="text-red-500" />
        ) : null,
      trendText:
        stats.critical > 0
          ? tr("pages.notifications.widgets.criticalTrend", {
              count: stats.critical,
            })
          : t("pages.notifications.widgets.noCritical"),
    },
    {
      title: t("pages.notifications.widgets.warnings"),
      value: stats.warning,
      icon: <FaExclamationTriangle className="text-2xl text-yellow-500" />,
      iconBgColor: "bg-yellow-100 dark:bg-yellow-900/30",
      trendIcon:
        stats.warning > 0 ? (
          <FaExclamationTriangle className="text-yellow-500" />
        ) : null,
      trendText:
        stats.warning > 0
          ? tr("pages.notifications.widgets.warningsTrend", {
              count: stats.warning,
            })
          : t("pages.notifications.widgets.noWarnings"),
    },
  ];

  // Table columns
  const columns = [
    {
      accessorKey: "read",
      header: t("pages.notifications.status"),
      sortable: true,
      cell: (row) => (
        <div className="flex items-center justify-center">
          {row.read ? (
            <FaEnvelopeOpen className="text-gray-400" />
          ) : (
            <FaEnvelope className="text-blue-500" />
          )}
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
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(row.type)}`}
          >
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
        <span
          className={`font-medium ${
            row.read
              ? "text-gray-600 dark:text-gray-400"
              : "text-gray-900 dark:text-white"
          }`}
        >
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
          <p
            className={`text-sm truncate ${
              row.read
                ? "text-gray-500 dark:text-gray-500"
                : "text-gray-700 dark:text-gray-300"
            }`}
          >
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
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {row.vehicle || "-"}
        </span>
      ),
    },
    {
      accessorKey: "timestamp",
      header: t("pages.notifications.time"),
      sortable: true,
      cell: (row) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {formatTimestamp(row.timestamp)}
        </span>
      ),
    },
  ];

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Title
          title={t("pages.notifications.title")}
          subtitle={t("pages.notifications.subtitle")}
        />
      </div>

      {/* Widget Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-4">
        {shouldShowSkeleton
          ? Array.from({ length: 4 }).map((_, idx) => (
              <WidgetCardSkeleton key={idx} />
            ))
          : widgetData.map((item, idx) => <WidgetCard key={idx} {...item} />)}
      </div>

      {/* Notifications Table */}
      <div className="bg-white dark:bg-transparent border border-gray-300 dark:border-slate-600 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t("pages.notifications.history")}
          </h2>
          {stats.unread > 0 && (
            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm font-medium">
              {stats.unread} {t("pages.notifications.unread")}
            </span>
          )}
        </div>

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
    </div>
  );
};

export default Notification;
