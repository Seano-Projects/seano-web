import React, { useState, useMemo } from "react";
import { FaFilter } from "react-icons/fa";
import { Dropdown } from "../../index";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import useTranslation from "../../../../hooks/useTranslation";

const MAX_POINTS = 60;

const DepthProfile = ({ ctdData }) => {
  const { t } = useTranslation();
  const [selectedParameter, setSelectedParameter] = useState("temperature");

  const profileData = useMemo(() => {
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
      label: t("pages.data.charts.temperature") + " (C)",
      color: "#F97316",
      unit: "C",
    },
    {
      key: "salinity",
      label: t("pages.data.charts.salinity") + " (PSU)",
      color: "#0EA5E9",
      unit: "PSU",
    },
    {
      key: "density",
      label: t("pages.ctd.charts.density") + " (kg/m3)",
      color: "#22C55E",
      unit: "kg/m3",
    },
    {
      key: "conductivity",
      label: t("pages.data.charts.conductivity") + " (MS/CM)",
      color: "#A855F7",
      unit: "MS/CM",
    },
    {
      key: "sound_velocity",
      label: t("pages.ctd.charts.soundVelocity") + " (m/s)",
      color: "#EF4444",
      unit: "m/s",
    },
  ];

  const selectedParam = parameters.find((p) => p.key === selectedParameter);

  return (
    <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-black dark:text-white">
            {t("pages.ctd.charts.customSelectTitle")}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t("pages.ctd.charts.customSelectSubtitle")}
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
                <span className="font-medium text-gray-900 dark:text-white">
                  {item.label}
                </span>
              </div>
            )}
            renderItem={(item) => (
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="font-medium text-gray-900 dark:text-white">
                  {item.label}
                </span>
              </div>
            )}
          />
        </div>
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
            <AreaChart
              data={profileData}
              margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
            >
              <defs>
                <linearGradient
                  id="custom-selected"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={selectedParam?.color || "#0EA5E9"}
                    stopOpacity={0.28}
                  />
                  <stop
                    offset="95%"
                    stopColor={selectedParam?.color || "#0EA5E9"}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
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
                          {t("pages.data.table.columns.timestamp")}: {data.time}
                        </p>
                        <p
                          className="text-sm font-medium"
                          style={{ color: selectedParam?.color }}
                        >
                          {selectedParam?.label}:{" "}
                          {Number(data[selectedParameter] || 0).toFixed(3)}{" "}
                          {selectedParam?.unit}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey={selectedParameter}
                stroke={selectedParam?.color}
                strokeWidth={2}
                fill="url(#custom-selected)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default DepthProfile;
