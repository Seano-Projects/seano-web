import React, { useState, useMemo } from "react";
import { FaFilter } from "react-icons/fa";
import { Dropdown } from "../../index";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const MAX_POINTS = 10;

const DepthProfile = ({ ctdData }) => {
  const [selectedParameter, setSelectedParameter] = useState("temperature");

  const profileData = useMemo(() => {
    if (!ctdData || ctdData.length === 0) return [];

    const sorted = [...ctdData].sort((a, b) => a.depth - b.depth);
    const sliced = sorted.slice(-MAX_POINTS);

    return sliced.map((item) => ({
      depth: item.depth,
      temperature: item.temperature,
      salinity: item.salinity,
      density: item.density,
      conductivity: item.conductivity,
    }));
  }, [ctdData]);

  const parameters = [
    { key: "temperature", label: "Temperature (C)", color: "#F97316", unit: "C" },
    { key: "salinity", label: "Salinity (PSU)", color: "#0EA5E9", unit: "PSU" },
    { key: "density", label: "Density (kg/m3)", color: "#22C55E", unit: "kg/m3" },
    { key: "conductivity", label: "Conductivity (MS/CM)", color: "#A855F7", unit: "MS/CM" },
  ];

  const selectedParam = parameters.find((p) => p.key === selectedParameter);

  return (
    <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-black dark:text-white">
            Depth Profile
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Parameter vs depth (last 10 samples)
          </p>
        </div>
        <div className="w-56">
          <Dropdown
            items={parameters}
            selectedItem={parameters.find((p) => p.key === selectedParameter)}
            onItemChange={(item) => setSelectedParameter(item.key)}
            getItemKey={(item) => item.key}
            renderSelectedItem={(item) => (
              <div className="flex items-center gap-2 text-sm">
                <FaFilter className="text-[11px] text-gray-500 dark:text-gray-400" />
                <span className="font-medium text-gray-900 dark:text-white">{item.label}</span>
              </div>
            )}
            renderItem={(item) => (
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="font-medium text-gray-900 dark:text-white">{item.label}</span>
              </div>
            )}
          />
        </div>
      </div>

      <div className="h-100">
        {profileData.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 dark:text-gray-400">No data available</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={profileData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
              <XAxis
                dataKey="depth"
                stroke="#6B7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                label={{
                  value: "Depth (m)",
                  position: "insideBottom",
                  offset: -6,
                  fill: "#9CA3AF",
                  fontSize: 12,
                }}
              />
              <YAxis
                stroke="#6B7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                label={{
                  value: selectedParam?.label || "",
                  angle: -90,
                  position: "insideLeft",
                  fill: "#9CA3AF",
                  fontSize: 12,
                }}
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
                        <p className="text-sm font-medium" style={{ color: selectedParam?.color }}>
                          {selectedParam?.label}: {data[selectedParameter].toFixed(3)} {selectedParam?.unit}
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
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default DepthProfile;
