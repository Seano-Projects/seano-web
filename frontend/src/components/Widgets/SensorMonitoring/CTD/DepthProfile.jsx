import React, { useMemo } from "react";
import { FaFilter } from "react-icons/fa";
import { Dropdown } from "../../index";
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

const DepthProfile = ({
  ctdData,
  selectedParameter = "temperature",
  onParameterChange,
}) => {
  const { t } = useTranslation();

  const profileData = useMemo(() => {
    if (!ctdData || ctdData.length === 0) return [];

    // Find the most recent batch timestamp
    const latestTs = ctdData.reduce(
      (max, item) => (!max || new Date(item.timestamp) > new Date(max) ? item.timestamp : max),
      null,
    );

    // Use all readings from the latest batch, sorted shallow→deep
    return ctdData
      .filter(item => item.timestamp === latestTs)
      .sort((a, b) => a.depth - b.depth)
      .map(item => ({
        depth: item.depth,
        temperature: item.temperature,
        salinity: item.salinity,
        density: item.density,
        conductivity: item.conductivity,
        sound_velocity: item.sound_velocity,
      }));
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
            onItemChange={(item) => onParameterChange?.(item.key)}
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
            <LineChart
              data={profileData}
              layout="vertical"
              margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis
                type="number"
                dataKey={selectedParameter}
                domain={["auto", "auto"]}
                stroke="#6B7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => Number(v).toFixed(1)}
                label={{
                  value: selectedParam?.label || "",
                  position: "insideBottom",
                  offset: -4,
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
                fontSize={12}
                tickLine={false}
                axisLine={false}
                label={{
                  value: "Depth (m)",
                  angle: -90,
                  position: "insideLeft",
                  fill: "#9CA3AF",
                  fontSize: 11,
                }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                          Depth: {Number(d.depth).toFixed(2)} m
                        </p>
                        <p className="text-sm font-medium" style={{ color: selectedParam?.color }}>
                          {selectedParam?.label}: {Number(d[selectedParameter] || 0).toFixed(3)} {selectedParam?.unit}
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
                stroke={selectedParam?.color || "#0EA5E9"}
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
