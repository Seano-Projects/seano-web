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
import DataCard from "../../DataCard";

const MAX_POINTS = 60;

const fmt = (ts) => {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
};

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{label}</p>
      {payload.map((entry, i) => (
        <p
          key={i}
          className="text-sm font-medium"
          style={{ color: entry.color }}
        >
          {entry.name}:{" "}
          {Number.isFinite(Number(entry.value))
            ? Number(entry.value).toFixed(3)
            : "—"}
        </p>
      ))}
    </div>
  );
};

export const SpeedTimeChart = ({ adcpData }) => {
  const { t } = useTranslation();

  const series = useMemo(() => {
    if (!adcpData || adcpData.length === 0) return [];
    return [...adcpData]
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .slice(-MAX_POINTS)
      .map((d) => ({ time: fmt(d.timestamp), speed: d.current_speed_ms }));
  }, [adcpData]);

  return (
    <DataCard
      title={t("pages.adcp.speedHistory")}
      headerContent={
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("pages.adcp.speedHistory")}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {t("pages.adcp.speedHistorySubtitle")}
          </p>
        </div>
      }
    >
      <div style={{ minHeight: "240px" }} className="flex-1">
        {series.length === 0 ? (
          <div className="flex items-center justify-center h-60 text-sm text-gray-500 dark:text-gray-400">
            {t("common.noDataAvailable")}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart
              data={series}
              margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="adcp-speed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time"
                stroke="#6B7280"
                className="dark:stroke-gray-500"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#6B7280"
                className="dark:stroke-gray-500"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                domain={["auto", "auto"]}
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="speed"
                name="Speed (m/s)"
                stroke="#ef4444"
                strokeWidth={2}
                fill="url(#adcp-speed)"
                fillOpacity={1}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </DataCard>
  );
};

export const TemperatureChart = ({ adcpData }) => {
  const { t } = useTranslation();

  const series = useMemo(() => {
    if (!adcpData || adcpData.length === 0) return [];
    return [...adcpData]
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .slice(-MAX_POINTS)
      .map((d) => ({ time: fmt(d.timestamp), temp: d.temperature_c }));
  }, [adcpData]);

  return (
    <DataCard
      title={t("pages.adcp.temperatureHistory")}
      headerContent={
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("pages.adcp.temperatureHistory")}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {t("pages.adcp.temperatureHistorySubtitle")}
          </p>
        </div>
      }
    >
      <div style={{ minHeight: "240px" }} className="flex-1">
        {series.length === 0 ? (
          <div className="flex items-center justify-center h-60 text-sm text-gray-500 dark:text-gray-400">
            {t("common.noDataAvailable")}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart
              data={series}
              margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="adcp-temp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time"
                stroke="#6B7280"
                className="dark:stroke-gray-500"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#6B7280"
                className="dark:stroke-gray-500"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                domain={["auto", "auto"]}
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="temp"
                name="Temp (°C)"
                stroke="#f97316"
                strokeWidth={2}
                fill="url(#adcp-temp)"
                fillOpacity={1}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </DataCard>
  );
};
