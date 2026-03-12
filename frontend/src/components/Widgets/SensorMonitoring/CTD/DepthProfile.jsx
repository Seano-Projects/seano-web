import React, { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const DepthProfile = ({ ctdData }) => {
  const [selectedParameter, setSelectedParameter] = useState("temperature");

  // Process data for depth profile (sort by depth)
  const profileData = useMemo(() => {
    if (!ctdData || ctdData.length === 0) return [];

    // Sort by depth (ascending)
    const sorted = [...ctdData].sort((a, b) => a.depth - b.depth);

    return sorted.map((item) => ({
      depth: item.depth,
      temperature: item.temperature,
      salinity: item.salinity,
      density: item.density,
      conductivity: item.conductivity,
      pressure: item.pressure,
    }));
  }, [ctdData]);

  const parameters = [
    {
      key: "temperature",
      label: "Temperature (°C)",
      color: "#EF4444",
      unit: "°C",
    },
    { key: "salinity", label: "Salinity (PSU)", color: "#3B82F6", unit: "PSU" },
    {
      key: "density",
      label: "Density (kg/m³)",
      color: "#10B981",
      unit: "kg/m³",
    },
    {
      key: "conductivity",
      label: "Conductivity (MS/CM)",
      color: "#F59E0B",
      unit: "MS/CM",
    },
  ];

  const selectedParam = parameters.find((p) => p.key === selectedParameter);

  return (
    <div className="dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-black dark:text-white">
            Depth Profile
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Parameter variation with depth
          </p>
        </div>
        <div className="flex gap-2">
          {parameters.map((param) => (
            <button
              key={param.key}
              onClick={() => setSelectedParameter(param.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedParameter === param.key
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {param.label.split(" ")[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-100">
        {profileData.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 dark:text-gray-400">
              No data available
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={profileData}
              margin={{ top: 10, right: 30, left: 20, bottom: 50 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#374151"
                opacity={0.3}
              />
              <XAxis
                dataKey={selectedParameter}
                label={{
                  value: selectedParam?.label || "",
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
                dataKey="depth"
                reversed={true}
                label={{
                  value: "Depth (m)",
                  angle: -90,
                  position: "insideLeft",
                  fill: "#9CA3AF",
                  fontSize: 12,
                }}
                stroke="#6B7280"
                fontSize={12}
                tickLine={false}
                domain={[0, "auto"]}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                          Depth: {data.depth.toFixed(2)} m
                        </p>
                        <p
                          className="text-sm font-medium"
                          style={{ color: selectedParam?.color }}
                        >
                          {selectedParam?.label}:{" "}
                          {data[selectedParameter].toFixed(3)}{" "}
                          {selectedParam?.unit}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey={selectedParameter}
                stroke={selectedParam?.color}
                strokeWidth={2}
                dot={{ fill: selectedParam?.color, r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default DepthProfile;
