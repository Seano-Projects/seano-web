import React, { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { dashboardLink, menuGroups, linksbottom } from "../../../constant";
import LinkItem from "./LinkItem";
import MenuGroup from "./MenuGroup";
import { useAlertData } from "../../../hooks/useAlertData";
import useNotificationData from "../../../hooks/useNotificationData";

const Sidebar = ({ isSidebarOpen }) => {
  const location = useLocation();
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
    // Update badge source data immediately on navigation.
    if (typeof refreshNotifications === "function") {
      refreshNotifications();
    }
    if (typeof refreshAlerts === "function") {
      refreshAlerts();
    }
  }, [location.pathname, refreshAlerts, refreshNotifications]);

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
      className={`fixed top-0 left-0 z-40 h-screen pt-18 bg-white border-r border-gray-200 dark:bg-black dark:border-gray-700 transition-transform duration-300 ${
        isSidebarOpen ? "translate-x-0 w-64" : "w-16"
      }`}
      aria-label="Sidebar"
    >
      <div className="h-full flex flex-col relative">
        {/* Scrollable Content Area */}
        <div
          className="flex-1 px-3 pt-2 overflow-y-auto scrollbar-hide"
          style={{ paddingBottom: "120px" }}
        >
          {/* Dashboard - Root Level */}
          <div className="mb-6">
            <ul className="space-y-2 font-semibold">
              <LinkItem isSidebarOpen={isSidebarOpen} {...dashboardLink} />
            </ul>
          </div>

          {/* Menu Groups */}
          <div className="space-y-1 font-semibold">
            {menuGroupsWithBadges.map((group, index) => (
              <MenuGroup
                key={index}
                title={group.title}
                items={group.items}
                isSidebarOpen={isSidebarOpen}
                adminOnly={group.adminOnly}
                userOnly={group.userOnly}
                requiredPermission={group.requiredPermission}
              />
            ))}
          </div>
        </div>

        {/* Fixed Bottom Menu */}
        <div
          className={`absolute left-0 bottom-0 w-full border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-black z-40 text-gray-700 dark:text-white ${
            isSidebarOpen ? "p-4" : "py-4 px-2"
          }`}
        >
          <ul className="space-y-2 font-semibold">
            {linksbottom.map((Link, index) => (
              <LinkItem isSidebarOpen={isSidebarOpen} key={index} {...Link} />
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
