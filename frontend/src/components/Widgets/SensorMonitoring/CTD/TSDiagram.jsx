import React, { useMemo } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
} from "recharts";

const TSDiagram = ({ ctdData }) => {
  // Process data for T-S diagram
  const tsData = useMemo(() => {
    if (!ctdData || ctdData.length === 0) return [];

    return ctdData.map((item) => ({
      temperature: item.temperature,
      salinity: item.salinity,
      depth: item.depth,
      density: item.density,
    }));
  }, [ctdData]);

  // Get color based on depth
  const getColorByDepth = (depth) => {
    const maxDepth = Math.max(...tsData.map((d) => d.depth));
    const ratio = depth / maxDepth;

    if (ratio < 0.33) return "#3B82F6"; // Shallow - Blue
    if (ratio < 0.67) return "#10B981"; // Mid - Green
    return "#EF4444"; // Deep - Red
  };

  return (
    <div className="dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl p-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-black dark:text-white">
          T-S Diagram
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Temperature-Salinity relationship colored by depth
        </p>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span className="text-xs text-gray-600 dark:text-gray-400">
            Shallow
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-xs text-gray-600 dark:text-gray-400">
            Mid-depth
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-xs text-gray-600 dark:text-gray-400">Deep</span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-100">
        {tsData.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 dark:text-gray-400">
              No data available
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 30, left: 20, bottom: 50 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#374151"
                opacity={0.3}
              />
              <XAxis
                type="number"
                dataKey="salinity"
                name="Salinity"
                label={{
                  value: "Salinity (PSU)",
                  position: "insideBottom",
                  offset: -10,
                  fill: "#9CA3AF",
                  fontSize: 12,
                }}
                stroke="#6B7280"
                fontSize={12}
                tickLine={false}
                domain={["auto", "auto"]}
              />
              <YAxis
                type="number"
                dataKey="temperature"
                name="Temperature"
                label={{
                  value: "Temperature (°C)",
                  angle: -90,
                  position: "insideLeft",
                  fill: "#9CA3AF",
                  fontSize: 12,
                }}
                stroke="#6B7280"
                fontSize={12}
                tickLine={false}
                domain={["auto", "auto"]}
              />
              <ZAxis type="number" dataKey="depth" range={[50, 200]} />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                          Depth: {data.depth.toFixed(2)} m
                        </p>
                        <p className="text-sm font-medium text-blue-600">
                          Salinity: {data.salinity.toFixed(3)} PSU
                        </p>
                        <p className="text-sm font-medium text-red-600">
                          Temperature: {data.temperature.toFixed(3)} °C
                        </p>
                        <p className="text-sm font-medium text-green-600">
                          Density: {data.density.toFixed(3)} kg/m³
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Scatter
                name="T-S Data"
                data={tsData}
                fill="#8884d8"
                shape={(props) => {
                  const { cx, cy, payload } = props;
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={5}
                      fill={getColorByDepth(payload.depth)}
                      stroke="#fff"
                      strokeWidth={1}
                      opacity={0.8}
                    />
                  );
                }}
              />
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default TSDiagram;
