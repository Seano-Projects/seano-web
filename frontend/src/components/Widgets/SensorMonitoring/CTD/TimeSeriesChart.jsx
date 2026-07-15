import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import useTranslation from "../../../../hooks/useTranslation";

const METRIC_DEFS = [
  { key: "temperature",    tKey: "temperature",    unit: "°C",    color: "#F97316" },
  { key: "salinity",       tKey: "salinity",       unit: "PSU",   color: "#0EA5E9" },
  { key: "density",        tKey: "density",        unit: "kg/m³", color: "#22C55E" },
  { key: "conductivity",   tKey: "conductivity",   unit: "mS/cm", color: "#A855F7" },
  { key: "sound_velocity", tKey: "soundVelocity",  unit: "m/s",   color: "#EF4444" },
];

const normalize = (value, min, max) =>
  max === min ? 50 : ((value - min) / (max - min)) * 100;

const TimeSeriesChart = ({ ctdData }) => {
  const { t } = useTranslation();

  const metrics = useMemo(
    () => METRIC_DEFS.map((m) => ({ ...m, label: t(`pages.ctd.metrics.${m.tKey}`) })),
    [t],
  );

  const { profileData, ranges } = useMemo(() => {
    if (!ctdData || ctdData.length === 0) return { profileData: [], ranges: {} };

    const latestTs = ctdData.reduce(
      (max, item) => (!max || new Date(item.timestamp) > new Date(max) ? item.timestamp : max),
      null,
    );

    const batch = ctdData
      .filter(item => item.timestamp === latestTs)
      .sort((a, b) => a.depth - b.depth);

    const ranges = {};
    METRIC_DEFS.forEach(({ key }) => {
      const vals = batch.map(d => d[key]).filter(v => v !== null && v !== undefined);
      ranges[key] = { min: Math.min(...vals), max: Math.max(...vals) };
    });

    const profileData = batch.map(item => {
      const row = { depth: item.depth };
      METRIC_DEFS.forEach(({ key }) => {
        row[key] = item[key];
        row[`${key}_norm`] = normalize(item[key], ranges[key].min, ranges[key].max);
      });
      return row;
    });

    return { profileData, ranges };
  }, [ctdData]);

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0]?.payload;
    if (!d) return null;
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg min-w-44">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
          {t("pages.data.charts.depth")}: {Number(d.depth).toFixed(2)} m
        </p>
        {metrics.map(({ key, label, unit, color }) => (
          <p key={key} className="text-xs font-medium" style={{ color }}>
            {label}: {Number(d[key] ?? 0).toFixed(3)} {unit}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl p-6">
      <div className="mb-4">
        <h3 className="text-xl font-semibold text-black dark:text-white">
          {t("pages.ctd.charts.allDataTitle")}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {t("pages.ctd.charts.allDataSubtitle")}
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
        {metrics.map(({ key, label, unit, color }) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className="inline-block w-3 rounded" style={{ backgroundColor: color, height: '2px', minWidth: 12 }} />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {label} ({unit})
            </span>
          </div>
        ))}
      </div>

      <div className="h-100">
        {profileData.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 dark:text-gray-400">
              {t("common.noDataAvailable")}
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={profileData}
              layout="vertical"
              margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis
                type="number"
                domain={[0, 100]}
                stroke="#6B7280"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => `${v}%`}
                label={{
                  value: `${t("pages.ctd.charts.customSelectTitle")} (%)`,
                  position: "insideBottom",
                  offset: -12,
                  fill: "#9CA3AF",
                  fontSize: 11,
                }}
              />
              <YAxis
                type="number"
                dataKey="depth"
                reversed
                domain={[0, "dataMax"]}
                stroke="#6B7280"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                label={{
                  value: `${t("pages.data.charts.depth")} (m)`,
                  angle: -90,
                  position: "insideLeft",
                  fill: "#9CA3AF",
                  fontSize: 11,
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              {metrics.map(({ key, color }) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={`${key}_norm`}
                  stroke={color}
                  strokeWidth={1.5}
                  dot={false}
                  legendType="none"
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default TimeSeriesChart;
