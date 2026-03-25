import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const MAX_POINTS = 10;

const TimeSeriesChart = ({ ctdData }) => {
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
      };
    });
  }, [ctdData]);

  return (
    <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl p-6">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-black dark:text-white">
          Time Series Overview
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Temperature, salinity, and depth over time (last 10 samples)
        </p>
      </div>

      <div className="h-100">
        {timeSeriesData.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 dark:text-gray-400">No data available</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timeSeriesData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
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
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{label}</p>
                        {payload.map((entry, index) => (
                          <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
                            {entry.name}: {entry.value?.toFixed(2)}
                          </p>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line type="monotone" dataKey="temperature" name="Temperature (C)" stroke="#F97316" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="salinity" name="Salinity (PSU)" stroke="#0EA5E9" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="depth" name="Depth (m)" stroke="#6366F1" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default TimeSeriesChart;
