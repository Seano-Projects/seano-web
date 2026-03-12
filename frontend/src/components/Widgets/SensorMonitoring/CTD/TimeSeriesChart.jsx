import React, { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const TimeSeriesChart = ({ ctdData }) => {
  const [selectedParameters, setSelectedParameters] = useState([
    "temperature",
    "salinity",
  ]);

  // Process data for time series
  const timeSeriesData = useMemo(() => {
    if (!ctdData || ctdData.length === 0) return [];

    // Sort by timestamp
    const sorted = [...ctdData].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
    );

    return sorted.map((item) => {
      const time = new Date(item.timestamp);
      return {
        time: `${String(time.getHours()).padStart(2, "0")}:${String(time.getMinutes()).padStart(2, "0")}:${String(time.getSeconds()).padStart(2, "0")}`,
        fullTime: item.timestamp,
        temperature: item.temperature,
        salinity: item.salinity,
        density: item.density,
        conductivity: item.conductivity,
        depth: item.depth,
        sound_velocity: item.sound_velocity,
      };
    });
  }, [ctdData]);

  const parameters = [
    {
      key: "temperature",
      label: "Temperature",
      color: "#EF4444",
      unit: "°C",
    },
    { key: "salinity", label: "Salinity", color: "#3B82F6", unit: "PSU" },
    {
      key: "density",
      label: "Density",
      color: "#10B981",
      unit: "kg/m³",
    },
    {
      key: "conductivity",
      label: "Conductivity",
      color: "#F59E0B",
      unit: "MS/CM",
    },
    { key: "depth", label: "Depth", color: "#8B5CF6", unit: "m" },
    {
      key: "sound_velocity",
      label: "Sound Velocity",
      color: "#EC4899",
      unit: "m/s",
    },
  ];

  const toggleParameter = (paramKey) => {
    setSelectedParameters((prev) => {
      if (prev.includes(paramKey)) {
        // Don't allow removing all parameters
        if (prev.length === 1) return prev;
        return prev.filter((p) => p !== paramKey);
      } else {
        return [...prev, paramKey];
      }
    });
  };

  return (
    <div className="dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-black dark:text-white">
            Time Series Data
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Parameter variations over time
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {parameters.map((param) => (
            <button
              key={param.key}
              onClick={() => toggleParameter(param.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedParameters.includes(param.key)
                  ? "text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
              style={
                selectedParameters.includes(param.key)
                  ? { backgroundColor: param.color }
                  : {}
              }
            >
              {param.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-100">
        {timeSeriesData.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 dark:text-gray-400">
              No data available
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={timeSeriesData}
              margin={{ top: 10, right: 30, left: 20, bottom: 50 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#374151"
                opacity={0.3}
              />
              <XAxis
                dataKey="time"
                label={{
                  value: "Time",
                  position: "insideBottom",
                  offset: -10,
                  fill: "#9CA3AF",
                  fontSize: 12,
                }}
                stroke="#6B7280"
                fontSize={12}
                tickLine={false}
              />
              <YAxis
                stroke="#6B7280"
                fontSize={12}
                tickLine={false}
                label={{
                  value: "Value",
                  angle: -90,
                  position: "insideLeft",
                  fill: "#9CA3AF",
                  fontSize: 12,
                }}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                          {label}
                        </p>
                        {payload.map((entry, index) => {
                          const param = parameters.find(
                            (p) => p.key === entry.dataKey,
                          );
                          return (
                            <p
                              key={index}
                              className="text-sm font-medium"
                              style={{ color: entry.color }}
                            >
                              {param?.label}: {entry.value.toFixed(3)}{" "}
                              {param?.unit}
                            </p>
                          );
                        })}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                wrapperStyle={{
                  paddingTop: "20px",
                }}
                iconType="line"
              />
              {selectedParameters.map((paramKey) => {
                const param = parameters.find((p) => p.key === paramKey);
                return (
                  <Line
                    key={paramKey}
                    type="monotone"
                    dataKey={paramKey}
                    name={param?.label}
                    stroke={param?.color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default TimeSeriesChart;
