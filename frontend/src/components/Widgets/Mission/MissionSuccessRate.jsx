import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import useMissionData from "../../../hooks/useMissionData";
import useTranslation from "../../../hooks/useTranslation";

const MissionSuccessRate = () => {
  const { t } = useTranslation();
  const { stats, loading } = useMissionData();

  // Calculate from real data
  const completed = stats?.completed || 0;
  const ongoing = stats?.ongoing || 0;
  const failed = stats?.failed || 0;
  const draft = stats?.total - (completed + ongoing + failed) || 0;
  const total = stats?.total || 0;

  // Success rate calculation: (completed / total) * 100
  const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const data = [
    {
      name: t("dashboard.missionSuccessRate.completed"),
      value: completed,
      color: "#3B82F6",
    },
    {
      name: t("dashboard.missionSuccessRate.ongoing"),
      value: ongoing,
      color: "#F97316",
    },
    {
      name: t("dashboard.missionSuccessRate.failed"),
      value: failed,
      color: "#EF4444",
    },
  ];

  const getStatusLabel = (rate) => {
    if (rate >= 85) return t("dashboard.missionSuccessRate.optimal");
    if (rate >= 70) return t("dashboard.missionSuccessRate.good");
    if (rate >= 50) return t("dashboard.missionSuccessRate.fair");
    return t("dashboard.missionSuccessRate.poor");
  };

  return (
    <div className="dark:bg-black border border-gray-300 dark:border-slate-600 rounded-xl p-6">
      <h3 className="text-xl font-semibold text-black dark:text-white mb-6">
        {t("dashboard.missionSuccessRate.title")}
      </h3>

      <div className="flex flex-col items-center justify-center">
        {/* Donut Chart - diameter diperbesar, ring dipertipis */}
        <div className="relative w-80 h-80 mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={110}
                outerRadius={130}
                startAngle={90}
                endAngle={-270}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          {/* Center Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-5xl font-bold text-black dark:text-white">
              {successRate}%
            </div>
            <div className="text-sm text-gray-400 mt-1">
              {getStatusLabel(successRate)}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-3 w-full">
          {data.map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {item.name}
                </span>
              </div>
              <span className="text-sm font-semibold text-black dark:text-white">
                {item.value.toLocaleString()}
              </span>
            </div>
          ))}
          {/* Draft missions row */}
          {draft > 0 && (
            <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-3">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t("dashboard.missionSuccessRate.draft")}
                </span>
              </div>
              <span className="text-sm font-semibold text-black dark:text-white">
                {draft.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MissionSuccessRate;
