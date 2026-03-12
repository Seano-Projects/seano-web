import React, { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const SoundSpeedProfile = ({ ctdData }) => {
  // Process data for sound speed profile
  const profileData = useMemo(() => {
    if (!ctdData || ctdData.length === 0) return [];

    // Sort by depth (ascending)
    const sorted = [...ctdData].sort((a, b) => a.depth - b.depth);

    return sorted.map((item) => ({
      depth: item.depth,
      sound_velocity: item.sound_velocity,
      temperature: item.temperature,
      salinity: item.salinity,
    }));
  }, [ctdData]);

  return (
    <div className="dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl p-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-black dark:text-white">
          Sound Speed Profile
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Sound velocity variation with depth (important for underwater
          acoustics)
        </p>
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
            <AreaChart
              data={profileData}
              margin={{ top: 10, right: 30, left: 20, bottom: 50 }}
            >
              <defs>
                <linearGradient
                  id="colorSoundVelocity"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#374151"
                opacity={0.3}
              />
              <XAxis
                dataKey="sound_velocity"
                label={{
                  value: "Sound Velocity (m/s)",
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
                        <p className="text-sm font-medium text-purple-600">
                          Sound Velocity: {data.sound_velocity.toFixed(2)} m/s
                        </p>
                        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Temp: {data.temperature.toFixed(2)}°C | Salinity:{" "}
                            {data.salinity.toFixed(2)} PSU
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="sound_velocity"
                stroke="#8B5CF6"
                strokeWidth={2}
                fill="url(#colorSoundVelocity)"
                fillOpacity={1}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default SoundSpeedProfile;
