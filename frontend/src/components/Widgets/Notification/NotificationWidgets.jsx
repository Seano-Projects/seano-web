import {
  FaBell,
  FaEnvelope,
  FaExclamationCircle,
  FaExclamationTriangle,
} from "react-icons/fa";
import { WidgetCard } from "../../Widgets";
import { WidgetCardSkeleton } from "../../Skeleton";

const NotificationWidgets = ({ stats, shouldShowSkeleton, t, tr }) => {
  const widgetData = [
    {
      title: t("pages.notifications.widgets.total"),
      value: stats.total,
      icon: <FaBell className="text-2xl text-slate-500" />,
      iconBgColor: "bg-slate-100 dark:bg-slate-900/30",
      trendIcon: stats.total > 0 ? <FaBell className="text-slate-500" /> : null,
      trendText: stats.total > 0
        ? tr("pages.notifications.widgets.totalTrend", { count: stats.total })
        : t("pages.notifications.widgets.noNotifications"),
    },
    {
      title: t("pages.notifications.widgets.unread"),
      value: stats.unread,
      icon: <FaEnvelope className="text-2xl text-blue-500" />,
      iconBgColor: "bg-blue-100 dark:bg-blue-900/30",
      trendIcon: stats.unread > 0 ? <FaEnvelope className="text-blue-500" /> : null,
      trendText: stats.unread > 0
        ? tr("pages.notifications.widgets.unreadTrend", { count: stats.unread })
        : t("pages.notifications.allRead"),
    },
    {
      title: t("pages.notifications.widgets.critical"),
      value: stats.critical,
      icon: <FaExclamationCircle className="text-2xl text-red-500" />,
      iconBgColor: "bg-red-100 dark:bg-red-900/30",
      trendIcon: stats.critical > 0 ? <FaExclamationCircle className="text-red-500" /> : null,
      trendText: stats.critical > 0
        ? tr("pages.notifications.widgets.criticalTrend", { count: stats.critical })
        : t("pages.notifications.widgets.noCritical"),
    },
    {
      title: t("pages.notifications.widgets.warnings"),
      value: stats.warning,
      icon: <FaExclamationTriangle className="text-2xl text-yellow-500" />,
      iconBgColor: "bg-yellow-100 dark:bg-yellow-900/30",
      trendIcon: stats.warning > 0 ? <FaExclamationTriangle className="text-yellow-500" /> : null,
      trendText: stats.warning > 0
        ? tr("pages.notifications.widgets.warningsTrend", { count: stats.warning })
        : t("pages.notifications.widgets.noWarnings"),
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-4">
      {shouldShowSkeleton
        ? Array.from({ length: 4 }).map((_, idx) => <WidgetCardSkeleton key={idx} />)
        : widgetData.map((item, idx) => <WidgetCard key={idx} {...item} />)}
    </div>
  );
};

export default NotificationWidgets;
