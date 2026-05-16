import {
  FaExclamationCircle,
  FaExclamationTriangle,
  FaInfoCircle,
} from "react-icons/fa";
import { WidgetCard } from "../../Widgets";
import { WidgetCardSkeleton } from "../../Skeleton";

const AlertsWidgets = ({ stats, shouldShowSkeleton, t, tr }) => {
  const widgetData = [
    {
      title: t("pages.alerts.widgets.critical"),
      value: stats.critical,
      icon: <FaExclamationCircle className="text-2xl text-red-500" />,
      iconBgColor: "bg-red-100 dark:bg-red-900/30",
      trendIcon: stats.critical > 0 ? <FaExclamationCircle className="text-red-500" /> : null,
      trendText: stats.critical > 0
        ? tr("pages.alerts.widgets.criticalTrend", { count: stats.critical })
        : t("pages.alerts.widgets.noCritical"),
    },
    {
      title: t("pages.alerts.widgets.warnings"),
      value: stats.warning,
      icon: <FaExclamationTriangle className="text-2xl text-yellow-500" />,
      iconBgColor: "bg-yellow-100 dark:bg-yellow-900/30",
      trendIcon: stats.warning > 0 ? <FaExclamationTriangle className="text-yellow-500" /> : null,
      trendText: stats.warning > 0
        ? tr("pages.alerts.widgets.warningsTrend", { count: stats.warning })
        : t("pages.alerts.widgets.noWarnings"),
    },
    {
      title: t("pages.alerts.widgets.info"),
      value: stats.info,
      icon: <FaInfoCircle className="text-2xl text-blue-500" />,
      iconBgColor: "bg-blue-100 dark:bg-blue-900/30",
      trendIcon: stats.info > 0 ? <FaInfoCircle className="text-blue-500" /> : null,
      trendText: stats.info > 0
        ? tr("pages.alerts.widgets.infoTrend", { count: stats.info })
        : t("pages.alerts.widgets.noInfo"),
    },
    {
      title: t("pages.alerts.widgets.total"),
      value: stats.total,
      icon: <FaExclamationCircle className="text-2xl text-slate-500" />,
      iconBgColor: "bg-slate-100 dark:bg-slate-900/30",
      trendIcon: stats.total > 0 ? <FaExclamationCircle className="text-slate-500" /> : null,
      trendText: stats.total > 0
        ? tr("pages.alerts.widgets.totalTrend", { count: stats.total })
        : t("pages.alerts.widgets.noAlerts"),
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

export default AlertsWidgets;
