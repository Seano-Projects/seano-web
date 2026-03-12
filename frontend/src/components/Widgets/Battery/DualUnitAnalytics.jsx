import React, { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import useBatteryData from "../../../hooks/useBatteryData";

const DualUnitAnalytics = ({ selectedVehicle }) => {
  const [filter, setFilter] = useState("Both");
  const { getVehicleLogs } = useBatteryData();

  // Get chart data from real battery logs
  const chartData = useMemo(() => {
    if (!selectedVehicle?.id) return [];

    const logs = getVehicleLogs(selectedVehicle.id, null, 30);

    if (logs.length === 0) return [];

    // Group logs by time (every 2 minutes) and get latest value for each battery
    const timeGroups = {};

    logs.forEach((log) => {
      const time = new Date(log.timestamp);
      const timeKey = `${String(time.getHours()).padStart(2, "0")}:${String(Math.floor(time.getMinutes() / 2) * 2).padStart(2, "0")}`;

      if (!timeGroups[timeKey]) {
        timeGroups[timeKey] = { time: timeKey };
      }

      if (log.battery_id === 1) {
        timeGroups[timeKey]["BATTERY A"] = log.percentage;
      } else if (log.battery_id === 2) {
        timeGroups[timeKey]["BATTERY B"] = log.percentage;
      }
    });

    return Object.values(timeGroups).reverse().slice(0, 20);
  }, [getVehicleLogs, selectedVehicle]);

  const filteredData = chartData.map((item) => {
    if (filter === "Unit A") {
      return { ...item, "BATTERY B": null };
    } else if (filter === "Unit B") {
      return { ...item, "BATTERY A": null };
    }
    return item;
  });

  return (
    <div className="dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-black dark:text-white">
            Grafik Penggunaan Baterai
          </h3>
        </div>
        <div className="flex gap-2">
          {["Both", "Unit A", "Unit B"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Chart - No grid, Area Chart with Shadcn styling */}
      <div className="h-[560px]" style={{ minHeight: "560px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={filteredData}
            margin={{ top: 10, right: 50, left: -15, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorBatteryA" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorBatteryB" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22D3EE" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22D3EE" stopOpacity={0} />
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
              domain={[0, 100]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgb(255, 255, 255)",
                border: "1px solid rgb(229, 231, 235)",
                borderRadius: "8px",
                color: "rgb(17, 24, 39)",
                padding: "8px 12px",
              }}
              labelStyle={{ color: "rgb(107, 114, 128)", fontSize: "12px" }}
              wrapperStyle={{
                backgroundColor: "transparent",
              }}
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
                          {entry.name}: {entry.value?.toFixed(1)}%
                        </p>
                      ))}
                    </div>
                  );
                }
                return null;
              }}
            />
            {filter !== "Unit B" && (
              <Area
                type="monotone"
                dataKey="BATTERY A"
                stroke="#3B82F6"
                strokeWidth={2}
                fill="url(#colorBatteryA)"
                fillOpacity={1}
              />
            )}
            {filter !== "Unit A" && (
              <Area
                type="monotone"
                dataKey="BATTERY B"
                stroke="#22D3EE"
                strokeWidth={2}
                fill="url(#colorBatteryB)"
                fillOpacity={1}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DualUnitAnalytics;
