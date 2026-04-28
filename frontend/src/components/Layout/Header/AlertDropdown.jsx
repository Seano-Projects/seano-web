import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FaExclamationTriangle,
  FaExclamationCircle,
  FaInfoCircle,
  FaShieldAlt,
  FaCheckCircle,
  FaBolt,
} from "react-icons/fa";
import { API_BASE_URL } from "../../../config";
import config from "../../../config";
import { LoadingDots } from "../../ui";
import useTranslation from "../../../hooks/useTranslation";

const AlertDropdown = ({ isOpen, onClose, onUpdate }) => {
  const { t, language } = useTranslation();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    critical: 0,
    warning: 0,
    info: 0,
  });

  useEffect(() => {
    if (isOpen) {
      fetchAlerts();
    }
  }, [isOpen]);

  // Setup WebSocket for real-time alerts
  useEffect(() => {
    if (!isOpen) return;

    const token = localStorage.getItem("access_token");
    if (!token) return;

    const wsUrl = `${config.wsBaseUrl || "ws://localhost:8080"}/ws/alerts?token=${token}`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const messageType = data.message_type || data.type;

        if (messageType === "alert") {
          const newAlert = data;
          // Add new alert to the list
          setAlerts((prev) => [newAlert, ...prev.slice(0, 9)]);
          fetchStats(); // Update stats
          if (onUpdate) onUpdate();
        } else if (messageType === "alert_update") {
          setAlerts((prev) =>
            prev.map((alert) =>
              alert.id === data.id
                ? { ...alert, ...(data.updates || {}) }
                : alert,
            ),
          );
          fetchStats();
          if (onUpdate) onUpdate();
        }
      } catch (error) {
        console.error("Error parsing alert WebSocket message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("🚨 Alert WebSocket error:", error);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [isOpen, onUpdate]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("access_token");

      if (!token) {
        setAlerts([]);
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/alerts?limit=10&acknowledged=false`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch alerts");
      }

      const data = await response.json();
      setAlerts(data.data || []);
      await fetchStats();
    } catch (error) {
      console.error("Error fetching alerts:", error);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) return;

      const response = await fetch(
        `${API_BASE_URL}/alerts/stats?acknowledged=false`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setStats(data || { total: 0, critical: 0, warning: 0, info: 0 });
      }
    } catch (error) {
      console.error("Error fetching alert stats:", error);
    }
  };

  const acknowledgeAlert = async (alertId) => {
    try {
      const token = localStorage.getItem("access_token");

      const response = await fetch(
        `${API_BASE_URL}/alerts/${alertId}/acknowledge`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ acknowledged: true }),
        },
      );

      if (response.ok) {
        // Remove alert from list
        setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
        fetchStats(); // Update stats
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      console.error("Error acknowledging alert:", error);
    }
  };

  const acknowledgeAllAlerts = async () => {
    try {
      const token = localStorage.getItem("access_token");

      // Acknowledge each alert individually
      await Promise.all(
        alerts.map((alert) =>
          fetch(`${API_BASE_URL}/alerts/${alert.id}/acknowledge`, {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ acknowledged: true }),
          }),
        ),
      );

      // Clear all alerts from UI
      setAlerts([]);
      fetchStats();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error acknowledging all alerts:", error);
    }
  };

  const getSeverityIcon = (severity) => {
    const iconClass = "text-lg";
    switch (severity?.toLowerCase()) {
      case "critical":
        return <FaExclamationCircle className={`${iconClass} text-red-600`} />;
      case "warning":
        return (
          <FaExclamationTriangle className={`${iconClass} text-yellow-500`} />
        );
      case "info":
        return <FaInfoCircle className={`${iconClass} text-blue-500`} />;
      default:
        return <FaInfoCircle className={`${iconClass} text-gray-500`} />;
    }
  };

  const getAlertTypeIcon = (alertType) => {
    switch (alertType?.toLowerCase()) {
      case "anti_theft":
      case "antitheft":
        return <FaShieldAlt className="text-red-600" />;
      case "failsafe":
        return <FaBolt className="text-yellow-500" />;
      default:
        return null;
    }
  };

  const getSeverityBadge = (severity) => {
    const baseClass = "text-xs font-semibold px-2 py-0.5 rounded";
    switch (severity?.toLowerCase()) {
      case "critical":
        return `${baseClass} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`;
      case "warning":
        return `${baseClass} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200`;
      case "info":
        return `${baseClass} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`;
      default:
        return `${baseClass} bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200`;
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t("dashboard.latestAlerts.justNow");
    if (diffMins < 60)
      return `${diffMins}${t("dashboard.latestAlerts.minutesAgo")}`;
    if (diffHours < 24)
      return `${diffHours}${t("dashboard.latestAlerts.hoursAgo")}`;
    if (diffDays < 7)
      return `${diffDays}${t("dashboard.latestAlerts.daysAgo")}`;
    return date.toLocaleDateString(language === "id" ? "id-ID" : "en-US");
  };

  const getLogRoute = (alertType) => {
    const type = alertType?.toLowerCase();
    if (type === "anti_theft" || type === "antitheft") {
      return "/logs/anti-theft";
    }
    if (type === "failsafe") {
      return "/logs/failsafe";
    }
    return "/alerts";
  };

  if (!isOpen) return null;

  return (
    <div
      className="absolute right-0 top-12 mt-2 w-96 bg-white dark:bg-black rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 transform origin-top"
      style={{ zIndex: 10002, maxHeight: "80vh" }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FaExclamationTriangle className="text-red-600 text-base" />
            <h3 className="text-gray-900 dark:text-white font-semibold text-base">
              {t("pages.alerts.title")}
            </h3>
          </div>
          {alerts.length > 0 && (
            <button
              onClick={acknowledgeAllAlerts}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              {t("pages.alerts.dropdown.acknowledgeAll")}
            </button>
          )}
        </div>
        {/* Stats */}
        <div className="flex gap-4 text-xs text-gray-600 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-red-600 rounded-full"></span>
            {t("pages.alerts.widgets.critical")}: {stats.critical}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
            {t("pages.alerts.widgets.warnings")}: {stats.warning}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            {t("pages.alerts.widgets.info")}: {stats.info}
          </span>
        </div>
      </div>

      {/* Alert List */}
      <div
        className="overflow-y-auto custom-scrollbar"
        style={{ maxHeight: "400px" }}
      >
        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <LoadingDots size="md" />
          </div>
        ) : alerts.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <FaCheckCircle className="text-4xl mx-auto mb-2 text-green-500" />
            <p className="font-medium">
              {t("pages.alerts.dropdown.noActiveAlerts")}
            </p>
            <p className="text-xs mt-1">
              {t("pages.alerts.dropdown.caughtUp")}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                  alert.severity === "critical"
                    ? "bg-red-50 dark:bg-red-900/10"
                    : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1">
                    <div className="mt-0.5">
                      {getSeverityIcon(alert.severity)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getAlertTypeIcon(alert.alert_type)}
                        <span className={getSeverityBadge(alert.severity)}>
                          {alert.severity?.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {alert.vehicle_name ||
                            `${t("pages.alerts.vehicle")} #${alert.vehicle_id}`}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 dark:text-white font-medium mb-1">
                        {alert.alert_type?.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                        {alert.message}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatTimestamp(alert.created_at)}
                        </span>
                        <div className="flex gap-2">
                          <Link
                            to={getLogRoute(alert.alert_type)}
                            onClick={onClose}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {t("pages.logs.title")}
                          </Link>
                          <button
                            onClick={() => acknowledgeAlert(alert.id)}
                            className="text-xs text-green-600 dark:text-green-400 hover:underline"
                          >
                            {t("pages.alerts.acknowledge")}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {alerts.length > 0 && (
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
          <Link
            to="/alerts"
            onClick={onClose}
            className="block text-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            {t("pages.alerts.dropdown.viewAllAlerts")} {"->"}
          </Link>
        </div>
      )}
    </div>
  );
};

export default AlertDropdown;
