import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FaBell,
  FaCheckCircle,
  FaExclamationCircle,
  FaExclamationTriangle,
  FaInfoCircle,
  FaTrash,
  FaCheck,
} from "react-icons/fa";
import { API_BASE_URL } from "../../../config";

const NotificationDropdown = ({ isOpen, onClose, onUpdate }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ unread: 0, total: 0 });

  // Get cleared notification IDs from localStorage
  const getClearedIds = () => {
    try {
      const cleared = localStorage.getItem("clearedNotificationIds");
      return cleared ? JSON.parse(cleared) : [];
    } catch {
      return [];
    }
  };

  // Save cleared notification IDs to localStorage
  const saveClearedIds = (ids) => {
    try {
      localStorage.setItem("clearedNotificationIds", JSON.stringify(ids));
    } catch (error) {
      console.error("Error saving cleared IDs:", error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("access_token");

      if (!token) {
        setNotifications([]);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/notifications?limit=10`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }

      const data = await response.json();

      // Filter out cleared notification IDs
      const clearedIds = getClearedIds();
      const filteredNotifications = (data.data || []).filter(
        (notif) => !clearedIds.includes(notif.id),
      );

      setNotifications(filteredNotifications);
      setStats(data.stats || { unread: 0, total: 0 });
    } catch (error) {
      console.error("Error fetching notifications:", error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem("access_token");

      const response = await fetch(
        `${API_BASE_URL}/notifications/${notificationId}/read`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.ok) {
        // Update local state
        setNotifications((prev) =>
          prev.map((notif) =>
            notif.id === notificationId ? { ...notif, read: true } : notif,
          ),
        );
        setStats((prev) => ({
          ...prev,
          unread: Math.max(0, prev.unread - 1),
        }));
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem("access_token");

      const response = await fetch(`${API_BASE_URL}/notifications/read-all`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        // Update all notifications to read
        setNotifications((prev) =>
          prev.map((notif) => ({ ...notif, read: true })),
        );
        setStats((prev) => ({ ...prev, unread: 0 }));
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const clearReadNotifications = () => {
    console.log("🗑️ Clear Read: Removing read notifications permanently");

    // Get IDs of read notifications to clear
    const readNotificationIds = notifications
      .filter((notif) => notif.read)
      .map((notif) => notif.id);

    // Save to localStorage so they stay hidden after refresh
    const existingClearedIds = getClearedIds();
    const updatedClearedIds = [
      ...new Set([...existingClearedIds, ...readNotificationIds]),
    ];
    saveClearedIds(updatedClearedIds);

    // Remove from UI
    setNotifications((prev) => prev.filter((notif) => !notif.read));

    console.log(
      "🗑️ Clear Read: Completed - cleared",
      readNotificationIds.length,
      "notifications",
    );
  };

  const getTypeIcon = (type) => {
    const iconClass = "text-lg";
    switch (type?.toLowerCase()) {
      case "success":
        return <FaCheckCircle className={`${iconClass} text-green-500`} />;
      case "error":
        return <FaExclamationCircle className={`${iconClass} text-red-500`} />;
      case "warning":
        return (
          <FaExclamationTriangle className={`${iconClass} text-yellow-500`} />
        );
      default:
        return <FaInfoCircle className={`${iconClass} text-blue-500`} />;
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
  };

  if (!isOpen) return null;

  return (
    <div
      className="absolute right-0 top-12 mt-2 w-96 bg-white dark:bg-black rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 transform origin-top"
      style={{ zIndex: 10002 }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FaBell className="text-gray-700 dark:text-white text-base" />
            <h3 className="text-gray-900 dark:text-white font-semibold text-base">
              Notifications
            </h3>
          </div>
          {stats.unread > 0 && (
            <span className="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300 px-2.5 py-1 rounded-full text-xs font-bold">
              {stats.unread}
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {notifications.length > 0 && (
        <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 flex gap-2">
          {stats.unread > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex-1 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors flex items-center justify-center gap-1.5"
            >
              <FaCheck className="text-xs" />
              Mark All Read
            </button>
          )}
          {notifications.some((n) => n.read) && (
            <button
              onClick={clearReadNotifications}
              className="flex-1 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors flex items-center justify-center gap-1.5"
            >
              <FaTrash className="text-xs" />
              Clear Read
            </button>
          )}
        </div>
      )}

      {/* Notifications List */}
      <div className="max-h-96 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Loading notifications...
            </p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <FaBell className="text-4xl text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              No new notifications
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              You're all caught up!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer group ${
                  !notification.read ? "bg-blue-50/50 dark:bg-blue-900/10" : ""
                }`}
                onClick={() =>
                  !notification.read && markAsRead(notification.id)
                }
              >
                <div className="flex gap-3">
                  <div className="shrink-0 mt-0.5">
                    {getTypeIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={`text-sm font-medium ${
                          !notification.read
                            ? "text-gray-900 dark:text-white"
                            : "text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <span className="shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-1.5"></span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {formatTimeAgo(notification.created_at)}
                      </span>
                      {notification.vehicle && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          • {notification.vehicle}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
          <Link
            to="/notification"
            onClick={onClose}
            className="block text-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            View All Notifications →
          </Link>
        </div>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #475569;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }
      `}</style>
    </div>
  );
};

export default NotificationDropdown;
