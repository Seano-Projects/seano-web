import {
  FaMoon,
  FaSun,
  FaRegUser,
  FaRegBell,
  FaBell,
  FaExclamationTriangle,
  FaExpand,
  FaCompress,
} from "react-icons/fa";

import { FiLogOut } from "react-icons/fi";
import SeanoLogo from "../../../assets/logo_seano.webp";
import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuthContext } from "../../../hooks/useAuthContext";
import { LanguageToggle } from "../../ui";
import useTranslation from "../../../hooks/useTranslation";
import NotificationDropdown from "./NotificationDropdown";
import AlertDropdown from "./AlertDropdown";
import { API_BASE_URL } from "../../../config";

const Header = ({ darkMode, toggleDarkMode }) => {
  const { user, logout } = useAuthContext();
  const { t, language } = useTranslation();
  const [time, setTime] = useState(new Date());
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [alertCount, setAlertCount] = useState(0);

  const userMenuRef = useRef(null);
  const notificationsRef = useRef(null);
  const alertsRef = useRef(null);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(
    () => !!document.fullscreenElement,
  );
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Get initials for avatar (same logic as Profile page)
  const getInitials = (username, email) => {
    if (username) {
      return username
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return "U";
  };

  const handleUserClick = () => {
    setIsUserMenuOpen((prev) => !prev);
    setIsNotificationsOpen(false);
    setIsAlertsOpen(false);
  };

  const handleNotificationsClick = () => {
    setIsNotificationsOpen((prev) => !prev);
    setIsUserMenuOpen(false);
    setIsAlertsOpen(false);
  };

  const handleAlertsClick = () => {
    setIsAlertsOpen((prev) => !prev);
    setIsUserMenuOpen(false);
    setIsNotificationsOpen(false);
  };

  const handleLogout = () => {
    setIsUserMenuOpen(false);
    logout();
  };

  // Fetch unread notification count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/notifications/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unread || 0);
      }
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  }, []);

  // Fetch unacknowledged alert count
  const fetchAlertCount = useCallback(async () => {
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
        const total =
          (data.critical || 0) + (data.warning || 0) + (data.info || 0);
        setAlertCount(total);
      }
    } catch (error) {
      console.error("Error fetching alert count:", error);
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    fetchAlertCount();
    // Refresh count every 30 seconds
    const interval = setInterval(() => {
      fetchUnreadCount();
      fetchAlertCount();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount, fetchAlertCount]);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Tutup menu kalau klik di luar
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target)
      ) {
        setIsNotificationsOpen(false);
      }
      if (alertsRef.current && !alertsRef.current.contains(event.target)) {
        setIsAlertsOpen(false);
      }
    };

    const handleScroll = () => {
      setIsUserMenuOpen(false);
      setIsNotificationsOpen(false);
      setIsAlertsOpen(false);
    };

    const handleEsc = (event) => {
      if (event.key === "Escape") {
        setIsUserMenuOpen(false);
        setIsNotificationsOpen(false);
        setIsAlertsOpen(false);
      }
    };

    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll);
    window.addEventListener("keydown", handleEsc);

    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("keydown", handleEsc);
    };
  }, []);

  return (
    <nav
      className="fixed top-0 left-0 w-full bg-white border-b border-gray-200 dark:bg-black dark:border-gray-700"
      style={{ zIndex: 10001 }}
    >
      <div className="px-2 py-2 lg:px-5 lg:pl-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center justify-start rtl:justify-end gap-2">
            <div className="flex gap-2 items-center">
              <img
                src={SeanoLogo}
                className="w-8"
                alt="SEANO Logo"
                loading="eager"
              />
              <span className="self-center text-xl font-semibold sm:text-2xl whitespace-nowrap dark:text-white hidden sm:block">
                SeaPortal
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 relative justify-between">
            {/* Tanggal & Waktu */}
            <div className="dark:text-white text-sm font-medium hidden md:flex md:items-center">
              {time.toLocaleTimeString(language === "id" ? "id-ID" : "en-US")} •{" "}
              {time.toLocaleDateString(language === "id" ? "id-ID" : "en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
            <div className="flex items-center gap-2">
              {/* Language Toggle */}
              <LanguageToggle className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800" />

              {/* Fullscreen Toggle */}
              <button
                aria-label={
                  isFullscreen ? "Exit fullscreen" : "Enter fullscreen"
                }
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer focus:outline-none hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-white"
                onClick={toggleFullscreen}
              >
                {isFullscreen ? (
                  <FaCompress aria-hidden="true" />
                ) : (
                  <FaExpand aria-hidden="true" />
                )}
              </button>

              {/* Dark Mode Toggle */}
              <button
                aria-label={
                  darkMode
                    ? t("header.switchToLightMode")
                    : t("header.switchToDarkMode")
                }
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer focus:outline-none hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-white"
                onClick={toggleDarkMode}
              >
                {darkMode ? (
                  <FaSun aria-hidden="true" />
                ) : (
                  <FaMoon aria-hidden="true" />
                )}
              </button>

              {/* Alerts */}
              <div ref={alertsRef} className="relative">
                <button
                  onClick={handleAlertsClick}
                  aria-label="Alerts"
                  aria-expanded={isAlertsOpen}
                  className="relative focus:outline-none rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <FaExclamationTriangle
                    className={`text-xl dark:text-white cursor-pointer duration-300 ${
                      isAlertsOpen || alertCount > 0
                        ? "text-red-600 dark:text-red-500"
                        : "text-gray-600"
                    }`}
                    aria-hidden="true"
                  />
                  {alertCount > 0 && (
                    <span className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                      {alertCount > 99 ? "99" : alertCount}
                    </span>
                  )}
                </button>
                <AlertDropdown
                  isOpen={isAlertsOpen}
                  onClose={() => setIsAlertsOpen(false)}
                  onUpdate={fetchAlertCount}
                />
              </div>

              {/* Notifications */}
              <div ref={notificationsRef} className="relative">
                <button
                  onClick={handleNotificationsClick}
                  aria-label={t("header.notifications")}
                  aria-expanded={isNotificationsOpen}
                  className="relative focus:outline-none rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  {isNotificationsOpen ? (
                    <FaBell
                      className="text-xl dark:text-white cursor-pointer duration-300"
                      aria-hidden="true"
                    />
                  ) : (
                    <FaRegBell
                      className="text-xl dark:text-white cursor-pointer duration-300"
                      aria-hidden="true"
                    />
                  )}
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                      {unreadCount > 99 ? "99" : unreadCount}
                    </span>
                  )}
                </button>
                <NotificationDropdown
                  isOpen={isNotificationsOpen}
                  onClose={() => setIsNotificationsOpen(false)}
                  onUpdate={fetchUnreadCount}
                />
              </div>

              {/* User Menu */}
              <div ref={userMenuRef} className="relative">
                <button
                  aria-label="User menu"
                  aria-expanded={isUserMenuOpen}
                  className="rounded-full transition-all duration-300 cursor-pointer overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onClick={handleUserClick}
                >
                  <div className="w-8 h-8 rounded-full bg-linear-to-br from-fourth to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                    {getInitials(user?.username, user?.email)}
                  </div>
                </button>
                {isUserMenuOpen && (
                  <div
                    className="absolute right-0 top-12 mt-2 w-48 bg-white dark:bg-black rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                    style={{ zIndex: 10002 }}
                  >
                    {/* User Info */}
                    <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                      <p className="text-sm font-semibold dark:text-white">
                        {user?.username || "User"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {user?.email || "user@example.com"}
                      </p>
                    </div>

                    <ul className="px-2 py-2 space-y-1">
                      <li>
                        <Link
                          to="/profile"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white font-medium rounded px-3 py-2 transition"
                        >
                          <FaRegUser />
                          <span>{t("header.profile")}</span>
                        </Link>
                      </li>
                    </ul>

                    <div className="border-t border-gray-200 dark:border-gray-700" />

                    <ul className="px-2 py-2">
                      <li>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 font-medium rounded px-3 py-2 transition"
                        >
                          <FiLogOut />
                          <span>{t("header.logout")}</span>
                        </button>
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Header;
