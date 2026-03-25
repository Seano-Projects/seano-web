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

const SoundSpeedProfile = ({ ctdData }) => {
  const profileData = useMemo(() => {
    if (!ctdData || ctdData.length === 0) return [];

    const sorted = [...ctdData].sort((a, b) => a.depth - b.depth);
    const sliced = sorted.slice(-MAX_POINTS);

    return sliced.map((item) => ({
      depth: item.depth,
      sound_velocity: item.sound_velocity,
      temperature: item.temperature,
      salinity: item.salinity,
    }));
  }, [ctdData]);

  return (
    <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl p-6">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-black dark:text-white">
          Sound Speed Profile
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Sound velocity vs depth (last 10 samples)
        </p>
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
                  value: "Sound Velocity (m/s)",
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
                        <p className="text-sm font-medium text-indigo-500">
                          Sound Velocity: {data.sound_velocity.toFixed(2)} m/s
                        </p>
                        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Temp: {data.temperature.toFixed(2)} C | Salinity: {data.salinity.toFixed(2)} PSU
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey="sound_velocity"
                stroke="#6366F1"
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

export default SoundSpeedProfile;
