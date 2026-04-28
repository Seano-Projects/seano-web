import React, { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import useTranslation from "../../../../hooks/useTranslation";

const MAX_POINTS = 60;

const TimeSeriesChart = ({ ctdData }) => {
  const { t } = useTranslation();

  const timeSeriesData = useMemo(() => {
    if (!ctdData || ctdData.length === 0) return [];

    const sorted = [...ctdData].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
    );

    const sliced = sorted.slice(-MAX_POINTS);

    return sliced.map((item) => {
      const time = new Date(item.timestamp);
      return {
        time: `${String(time.getHours()).padStart(2, "0")}:${String(time.getMinutes()).padStart(2, "0")}:${String(time.getSeconds()).padStart(2, "0")}`,
        temperature: item.temperature,
        salinity: item.salinity,
        depth: item.depth,
        conductivity: item.conductivity,
        density: item.density,
      };
    });
  }, [ctdData]);

  return (
    <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl p-6">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-black dark:text-white">
          {t("pages.ctd.charts.allDataTitle")}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {t("pages.ctd.charts.allDataSubtitle")}
        </p>
      </div>

      <div className="h-100">
        {timeSeriesData.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 dark:text-gray-400">
              {t("common.noDataAvailable")}
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={timeSeriesData}
              margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
            >
              <defs>
                <linearGradient id="all-temp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F97316" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="all-sal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="all-depth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time"
                stroke="#6B7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#6B7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                          {label}
                        </p>
                        {payload.map((entry, index) => (
                          <p
                            key={index}
                            className="text-sm font-medium"
                            style={{ color: entry.color }}
                          >
                            {entry.name}: {entry.value?.toFixed(2)}
                          </p>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="temperature"
                name={t("pages.data.charts.temperature") + " (C)"}
                stroke="#F97316"
                strokeWidth={2}
                fill="url(#all-temp)"
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="salinity"
                name={t("pages.data.charts.salinity") + " (PSU)"}
                stroke="#0EA5E9"
                strokeWidth={2}
                fill="url(#all-sal)"
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="depth"
                name={t("pages.data.charts.depth") + " (m)"}
                stroke="#6366F1"
                strokeWidth={2}
                fill="url(#all-depth)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default TimeSeriesChart;
