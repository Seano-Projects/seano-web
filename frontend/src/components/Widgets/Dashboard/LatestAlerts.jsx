import React from "react";
import { FaBell } from "react-icons/fa6";
import { Link } from "react-router-dom";
import useNotificationData from "../../../hooks/useNotificationData";
import { MdRefresh } from "react-icons/md";
import useTranslation from "../../../hooks/useTranslation";

const LatestAlerts = () => {
  const { t } = useTranslation();
  const { getLatestAlerts, loading, refreshData } = useNotificationData();

  const alerts = getLatestAlerts(4); // Get 4 latest alerts

  // Helper function to format timestamp
  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return t("dashboard.latestAlerts.unknown");
    try {
      const now = new Date();
      const alertTime = new Date(timestamp);
      if (isNaN(alertTime.getTime()))
        return t("dashboard.latestAlerts.invalidDate");

      const diffInMinutes = Math.floor((now - alertTime) / (1000 * 60));

      if (diffInMinutes < 0) return t("dashboard.latestAlerts.justNow");
      if (diffInMinutes < 60)
        return `${diffInMinutes}${t("dashboard.latestAlerts.minutesAgo")}`;
      const hours = Math.floor(diffInMinutes / 60);
      if (hours < 24) return `${hours}${t("dashboard.latestAlerts.hoursAgo")}`;
      const days = Math.floor(hours / 24);
      return `${days}${t("dashboard.latestAlerts.daysAgo")}`;
    } catch {
      return t("dashboard.latestAlerts.unknown");
    }
  };

  const getAlertClasses = (type) => {
    switch (type) {
      case "critical":
        return {
          container:
            "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
          icon: "bg-red-500/20 text-red-500",
          title: "text-red-900 dark:text-red-100",
          message: "text-red-700 dark:text-red-300",
          timestamp: "text-red-600 dark:text-red-400",
          badge: "bg-red-500",
        };
      case "warning":
        return {
          container:
            "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800",
          icon: "bg-yellow-500/20 text-yellow-500",
          title: "text-yellow-900 dark:text-yellow-100",
          message: "text-yellow-700 dark:text-yellow-300",
          timestamp: "text-yellow-600 dark:text-yellow-400",
          badge: "bg-yellow-500",
        };
      case "info":
        return {
          container:
            "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
          icon: "bg-blue-500/20 text-blue-500",
          title: "text-blue-900 dark:text-blue-100",
          message: "text-blue-700 dark:text-blue-300",
          timestamp: "text-blue-600 dark:text-blue-400",
          badge: "bg-blue-500",
        };
      case "success":
        return {
          container:
            "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
          icon: "bg-green-500/20 text-green-500",
          title: "text-green-900 dark:text-green-100",
          message: "text-green-700 dark:text-green-300",
          timestamp: "text-green-600 dark:text-green-400",
          badge: "bg-green-500",
        };
      default:
        return {
          container:
            "bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800",
          icon: "bg-gray-500/20 text-gray-500",
          title: "text-gray-900 dark:text-gray-100",
          message: "text-gray-700 dark:text-gray-300",
          timestamp: "text-gray-600 dark:text-gray-400",
          badge: "bg-gray-500",
        };
    }
  };

  return (
    <div className="bg-white dark:bg-transparent border border-gray-200 dark:border-slate-600 p-8 rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <FaBell size={30} className="text-red-500" />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t("dashboard.latestAlerts.title")}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refreshData}
            className="text-gray-500 hover:text-blue-500 transition-colors duration-200 p-1 rounded"
            title={t("dashboard.latestAlerts.refreshAlerts")}
          >
            <MdRefresh size={14} />
          </button>
          <Link
            to="/alerts"
            className="text-blue-500 hover:text-blue-600 transition-colors duration-200 text-sm font-medium"
          >
            {t("dashboard.latestAlerts.viewAll")}
          </Link>
        </div>
      </div>

      {/* Alert Cards */}
      <div className="space-y-3">
        {loading ? (
          // Loading skeleton
          <>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-start gap-4 p-4 bg-transparent border-gray-200 dark:border-slate-600 border rounded-xl">
                  <div className="w-8 h-8 bg-gray-300 dark:bg-slate-600 rounded-full flex-shrink-0 mt-1"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-300 dark:bg-slate-600 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-full mb-2"></div>
                    <div className="h-5 bg-gray-300 dark:bg-slate-600 rounded w-16"></div>
                  </div>
                </div>
              </div>
            ))}
          </>
        ) : alerts.length === 0 ? (
          <div className="text-center py-8">
            <FaBell
              size={48}
              className="mx-auto mb-3 text-gray-400 dark:text-gray-600"
            />
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {t("dashboard.latestAlerts.noAlerts")}
            </p>
          </div>
        ) : (
          alerts.map((alert) => {
            const classes = getAlertClasses(alert.type);
            return (
              <div
                key={alert.id}
                className={`flex items-start gap-4 p-4 ${classes.container} border rounded-xl`}
              >
                <div
                  className={`${classes.icon} p-2 rounded-full flex-shrink-0 mt-1`}
                >
                  <FaBell size={16} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className={`text-sm font-semibold ${classes.title}`}>
                      {alert.title}
                    </h3>
                    <span className={`text-xs ${classes.timestamp}`}>
                      {formatTimeAgo(alert.timestamp)}
                    </span>
                  </div>
                  <p className={`text-sm ${classes.message}`}>
                    {alert.message}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span
                      className={`inline-block px-2 py-1 ${classes.badge} text-white text-xs font-medium rounded-full`}
                    >
                      {alert.badge}
                    </span>
                    {alert.vehicle && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {alert.vehicle}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default LatestAlerts;
