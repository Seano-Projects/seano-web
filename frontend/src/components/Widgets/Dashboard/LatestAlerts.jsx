import React, { useState, useRef, useEffect } from "react";
import { FaBell } from "react-icons/fa6";
import { Link } from "react-router-dom";
import { useAlertData } from "../../../hooks/useAlertData";
import { HiDotsVertical } from "react-icons/hi";
import useTranslation from "../../../hooks/useTranslation";

const LatestAlerts = () => {
  const { t } = useTranslation();
  const { alerts, loading, refreshData } = useAlertData();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Get 4 latest alerts
  const latestAlerts = alerts.slice(0, 4);

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

  const getAlertClasses = (severity) => {
    const lowerSeverity = (severity || "info").toLowerCase();

    if (lowerSeverity === "critical" || lowerSeverity === "error") {
      return {
        container:
          "bg-white dark:bg-black border border-gray-200 dark:border-slate-700",
        icon: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
        title: "text-gray-900 dark:text-gray-100",
        message: "text-gray-600 dark:text-gray-300",
        timestamp: "text-gray-400 dark:text-gray-500",
        badge:
          "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700",
      };
    } else if (lowerSeverity === "warning" || lowerSeverity === "warn") {
      return {
        container:
          "bg-white dark:bg-black border border-gray-200 dark:border-slate-700",
        icon: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
        title: "text-gray-900 dark:text-gray-100",
        message: "text-gray-600 dark:text-gray-300",
        timestamp: "text-gray-400 dark:text-gray-500",
        badge:
          "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700",
      };
    } else {
      // info, success, or default
      return {
        container:
          "bg-white dark:bg-black border border-gray-200 dark:border-slate-700",
        icon: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
        title: "text-gray-900 dark:text-gray-100",
        message: "text-gray-600 dark:text-gray-300",
        timestamp: "text-gray-400 dark:text-gray-500",
        badge:
          "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700",
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
          {/* Three-dots menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((prev) => !prev)}
              className="p-1 text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-100"
              title="More options"
            >
              <HiDotsVertical size={20} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-44 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-black shadow-lg z-50 py-1 overflow-hidden">
                <Link
                  to="/alerts"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-900 transition-colors"
                >
                  <FaBell
                    size={12}
                    className="text-gray-400 dark:text-gray-500"
                  />
                  {t("dashboard.latestAlerts.viewAll")}
                </Link>
              </div>
            )}
          </div>
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
                  <div className="w-8 h-8 bg-gray-300 dark:bg-slate-600 rounded-full shrink-0 mt-1"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-300 dark:bg-slate-600 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-full mb-2"></div>
                    <div className="h-5 bg-gray-300 dark:bg-slate-600 rounded w-16"></div>
                  </div>
                </div>
              </div>
            ))}
          </>
        ) : latestAlerts.length === 0 ? (
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
          latestAlerts.map((alert) => {
            const classes = getAlertClasses(alert.severity);
            return (
              <div
                key={alert.id}
                className={`flex items-start gap-3 p-4 ${classes.container} rounded-xl transition-colors`}
              >
                <div
                  className={`${classes.icon} p-2 rounded-lg shrink-0 mt-0.5`}
                >
                  <FaBell size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3
                      className={`text-sm font-semibold ${classes.title} truncate`}
                    >
                      {alert.type || "System Alert"}
                    </h3>
                    <span className={`text-xs shrink-0 ${classes.timestamp}`}>
                      {formatTimeAgo(alert.timestamp)}
                    </span>
                  </div>
                  <p className={`text-xs ${classes.message} line-clamp-2 mb-2`}>
                    {alert.message}
                  </p>
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-block px-2 py-0.5 ${classes.badge} text-xs font-semibold rounded-full uppercase`}
                    >
                      {alert.severity}
                    </span>
                    {alert.vehicle_name && (
                      <span className="text-xs text-gray-400 dark:text-gray-500 truncate ml-2">
                        {alert.vehicle_name}
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
