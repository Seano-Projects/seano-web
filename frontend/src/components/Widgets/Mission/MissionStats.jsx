import React from "react";
import {
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
  FaList,
  FaFileAlt,
} from "react-icons/fa";
import useMissionData from "../../../hooks/useMissionData";
import useTranslation from "../../../hooks/useTranslation";

const MissionStats = () => {
  const { stats, loading } = useMissionData();
  const { t } = useTranslation();

  // Stats configuration dengan data dari API
  const statsConfig = [
    {
      label: t("missionComponents.stats.totalMissions"),
      value: stats?.total || 0,
      icon: FaList,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: t("missionComponents.stats.draft"),
      value: stats?.draft || 0,
      icon: FaFileAlt,
      color: "text-gray-500",
      bgColor: "bg-gray-500/10",
    },
    {
      label: t("missionComponents.stats.completed"),
      value: stats?.completed || 0,
      icon: FaCheckCircle,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      label: t("missionComponents.stats.ongoing"),
      value: stats?.ongoing || 0,
      icon: FaClock,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      label: t("missionComponents.stats.failed"),
      value: stats?.failed || 0,
      icon: FaTimesCircle,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
  ];

  // Format number dengan koma
  const formatNumber = (num) => {
    return num.toLocaleString("en-US");
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl p-6 animate-pulse"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-2"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
              </div>
              <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {statsConfig.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={index}
            className="dark:bg-black border border-gray-300 dark:border-gray-600 rounded-xl p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  {stat.label}
                </p>
                <p className="text-2xl font-bold text-black dark:text-white">
                  {formatNumber(stat.value)}
                </p>
              </div>
              <div className={`${stat.bgColor} ${stat.color} p-3 rounded-lg`}>
                <Icon className="text-2xl" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MissionStats;
