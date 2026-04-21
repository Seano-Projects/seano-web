import React, { useEffect, useMemo, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { dashboardLink, menuGroups } from "../../../constant";
import LinkItem from "./LinkItem";
import MenuGroup from "./MenuGroup";
import { useAlertData } from "../../../hooks/useAlertData";
import useNotificationData from "../../../hooks/useNotificationData";
import { useAuthContext } from "../../../hooks/useAuthContext";
import { FaRegUser, FaChevronUp, FaChevronDown } from "react-icons/fa";
import { FiLogOut } from "react-icons/fi";
import useTranslation from "../../../hooks/useTranslation";
import QuickSearch from "./QuickSearch";

const Sidebar = ({ isSidebarOpen, onHoverChange }) => {
  const location = useLocation();
  const { user, logout } = useAuthContext();
  const { t } = useTranslation();
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Sidebar is visually open if pinned open OR hovered while collapsed
  const isExpanded = isSidebarOpen || isHovered;

  const handleHover = (val) => {
    setIsHovered(val);
    onHoverChange?.(val);
  };

  const getInitials = (username, email) => {
    if (username) {
      return username
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) return email[0].toUpperCase();
    return "U";
  };
  const { alerts = [], refreshData: refreshAlerts } = useAlertData() || {};
  const { stats: notificationStats = {}, refreshData: refreshNotifications } =
    useNotificationData() || {};

  const isAlertsPage = location.pathname.startsWith("/alerts");
  const isNotificationPage = location.pathname.startsWith("/notification");

  const rawUnreadAlertCount = useMemo(
    () => alerts.filter((alert) => !alert.acknowledged).length,
    [alerts],
  );
  const rawUnreadNotificationCount = Number(notificationStats.unread || 0);

  // Instantly clear badge while user is on target page.
  const unreadAlertCount = isAlertsPage ? 0 : rawUnreadAlertCount;
  const unreadNotificationCount = isNotificationPage
    ? 0
    : rawUnreadNotificationCount;

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (typeof refreshNotifications === "function") {
        refreshNotifications();
      }
    }, 30000);

    return () => clearInterval(intervalId);
    // refreshNotifications reference can change, but interval recreation is acceptable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Close account dropdown and refresh badge data on navigation.
    setIsAccountOpen(false);
    if (typeof refreshNotifications === "function") {
      refreshNotifications();
    }
    if (typeof refreshAlerts === "function") {
      refreshAlerts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const menuGroupsWithBadges = useMemo(
    () =>
      menuGroups.map((group) => ({
        ...group,
        items: (group.items || []).map((item) => {
          if (item.href === "/alerts" && unreadAlertCount > 0) {
            return {
              ...item,
              badge: {
                text: unreadAlertCount > 99 ? "99+" : String(unreadAlertCount),
                color: "bg-red-100 text-red-800",
                darkColor: "dark:bg-red-900/30 dark:text-red-300",
              },
            };
          }

          if (item.href === "/notification" && unreadNotificationCount > 0) {
            return {
              ...item,
              badge: {
                text:
                  unreadNotificationCount > 99
                    ? "99+"
                    : String(unreadNotificationCount),
                color: "bg-blue-100 text-blue-800",
                darkColor: "dark:bg-blue-900/30 dark:text-blue-300",
              },
            };
          }

          return item;
        }),
      })),
    [unreadAlertCount, unreadNotificationCount],
  );

  return (
    <aside
      className={`fixed top-0 left-0 z-40 h-screen pt-18 bg-white border-r border-gray-200 dark:bg-black dark:border-gray-700 overflow-hidden transition-all duration-300 ease-in-out ${
        isExpanded ? "w-64" : "w-16"
      }`}
      aria-label="Sidebar"
      onMouseEnter={() => !isSidebarOpen && handleHover(true)}
      onMouseLeave={() => handleHover(false)}
    >
      <div className="h-full flex flex-col relative">
        {/* Scrollable Content Area */}
        <div
          className="flex-1 px-3 pt-2 overflow-y-auto scrollbar-hide"
          style={{ paddingBottom: "120px" }}
        >
          {/* Quick Search */}
          <div className="mb-3">
            <QuickSearch isSidebarOpen={isExpanded} />
          </div>

          {/* Dashboard - Root Level */}
          <div className="mb-3">
            <ul className="space-y-2 font-semibold">
              <LinkItem isSidebarOpen={isExpanded} {...dashboardLink} />
            </ul>
          </div>

          {/* Menu Groups */}
          <div className="space-y-1 font-semibold">
            {menuGroupsWithBadges.map((group, index) => (
              <MenuGroup
                key={index}
                title={group.title}
                icon={group.icon}
                items={group.items}
                isSidebarOpen={isExpanded}
                adminOnly={group.adminOnly}
                userOnly={group.userOnly}
                requiredPermission={group.requiredPermission}
              />
            ))}
          </div>
        </div>

        {/* Fixed Bottom Account Section */}
        <div
          className={`absolute left-0 bottom-9 w-full border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-black z-40`}
        >
          {/* Account Settings Toggle */}
          <button
            onClick={() => setIsAccountOpen((prev) => !prev)}
            className={`w-full flex items-center transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 ${
              isExpanded ? "px-4 py-3 gap-3" : "px-0 py-3 justify-center"
            }`}
            aria-expanded={isAccountOpen}
            aria-label="Account settings"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-fourth to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {getInitials(user?.username, user?.email)}
            </div>
            <div className={`flex-1 min-w-0 text-left overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-w-full opacity-100' : 'max-w-0 opacity-0'}`}>
              <p className="text-xs font-semibold text-gray-800 dark:text-white truncate leading-tight whitespace-nowrap">
                {user?.username || "User"}
              </p>
              <p className="text-[10px] text-gray-400 truncate leading-tight whitespace-nowrap">
                {user?.email || ""}
              </p>
            </div>
            <span className={`shrink-0 transition-all duration-300 ease-in-out ${isExpanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
              {isAccountOpen ? (
                <FaChevronDown className="text-gray-400 text-xs" />
              ) : (
                <FaChevronUp className="text-gray-400 text-xs" />
              )}
            </span>
          </button>

          {/* Expandable Account Menu */}
          {isAccountOpen && (
            <div className="border-t border-gray-200 dark:border-gray-700">
              <ul className={`py-1 space-y-0.5 ${isExpanded ? "px-2" : "px-1"}`}>
                <li>
                  <Link
                    to="/profile"
                    onClick={() => setIsAccountOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                      !isExpanded ? "justify-center px-2" : ""
                    }`}
                    title={!isExpanded ? t("nav.profile") : undefined}
                  >
                    <FaRegUser className="shrink-0 text-base" aria-hidden="true" />
                    <span className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out ${isExpanded ? 'max-w-full opacity-100' : 'max-w-0 opacity-0'}`}>{t("nav.profile")}</span>
                  </Link>
                </li>
                <li>
                  <button
                    onClick={() => { setIsAccountOpen(false); logout(); }}
                    className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ${
                      !isExpanded ? "justify-center px-2" : ""
                    }`}
                    title={!isExpanded ? t("nav.logout") : undefined}
                  >
                    <FiLogOut className="shrink-0 text-base" aria-hidden="true" />
                    <span className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out ${isExpanded ? 'max-w-full opacity-100' : 'max-w-0 opacity-0'}`}>{t("nav.logout")}</span>
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
