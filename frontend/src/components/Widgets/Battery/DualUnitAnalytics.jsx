import React, { useEffect, useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import useBatteryData from "../../../hooks/useBatteryData";
import useTranslation from "../../../hooks/useTranslation";

const formatPercentage = (value) => {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return "0";
  }

  return Number.isInteger(numeric) ? numeric.toFixed(0) : numeric.toFixed(1);
};

const formatNumber = (value, digits = 1) => {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return "0";
  }

  return numeric.toFixed(digits);
};

const DualUnitAnalytics = ({ selectedVehicle }) => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState("both");
  const { getVehicleLogs } = useBatteryData();
  const batteryCount = Number(selectedVehicle?.battery_count) === 1 ? 1 : 2;

  useEffect(() => {
    if (batteryCount === 1 && filter === "unit_b") {
      setFilter("both");
    }
  }, [batteryCount, filter]);

  // Get chart data from real battery logs
  const chartData = useMemo(() => {
    if (!selectedVehicle?.id) return [];

    const logs = getVehicleLogs(selectedVehicle.id, null, 200).filter(
      (log) => log?.timestamp,
    );

    if (logs.length === 0) return [];

    // Group by minute and keep latest sample for each battery in each minute bucket.
    const timeGroups = {};

    logs.forEach((log) => {
      const time = new Date(log.timestamp);
      if (Number.isNaN(time.getTime())) {
        return;
      }

      const timeKey = `${String(time.getHours()).padStart(2, "0")}:${String(time.getMinutes()).padStart(2, "0")}`;
      const epoch =
        new Date(
          time.getFullYear(),
          time.getMonth(),
          time.getDate(),
          time.getHours(),
          time.getMinutes(),
          0,
          0,
        ).getTime() / 1000;

      if (!timeGroups[timeKey]) {
        timeGroups[timeKey] = {
          time: timeKey,
          epoch,
          A_SOC: null,
          A_VOLT: null,
          A_CURR: null,
          B_SOC: null,
          B_VOLT: null,
          B_CURR: null,
        };
      }

      if (log.battery_id === 1) {
        timeGroups[timeKey].A_SOC = log.percentage;
        timeGroups[timeKey].A_VOLT = log.voltage;
        timeGroups[timeKey].A_CURR = log.current;
      } else if (log.battery_id === 2) {
        timeGroups[timeKey].B_SOC = log.percentage;
        timeGroups[timeKey].B_VOLT = log.voltage;
        timeGroups[timeKey].B_CURR = log.current;
      }
    });

    return Object.values(timeGroups)
      .sort((a, b) => a.epoch - b.epoch)
      .slice(-10)
      .map((item) => {
        const { epoch: _epoch, ...rest } = item;
        return rest;
      });
  }, [getVehicleLogs, selectedVehicle]);

  const average = (values) => {
    const valid = values.filter((value) => Number.isFinite(Number(value)));
    if (valid.length === 0) return null;
    return valid.reduce((sum, value) => sum + Number(value), 0) / valid.length;
  };

  const filteredData = chartData.map((item) => {
    if (filter === "unit_a" || batteryCount === 1) {
      return {
        time: item.time,
        soc: item.A_SOC,
        voltage: item.A_VOLT,
        current: item.A_CURR,
      };
    }

    if (filter === "unit_b") {
      return {
        time: item.time,
        soc: item.B_SOC,
        voltage: item.B_VOLT,
        current: item.B_CURR,
      };
    }

    return {
      time: item.time,
      soc: average([item.A_SOC, item.B_SOC]),
      voltage: average([item.A_VOLT, item.B_VOLT]),
      current: average([item.A_CURR, item.B_CURR]),
    };
  });

  const formatMetricValue = (dataKey, value) => {
    if (!Number.isFinite(Number(value))) {
      return "N/A";
    }

    switch (dataKey) {
      case "soc":
        return `${formatPercentage(value)}%`;
      case "voltage":
        return `${formatNumber(value, 1)}V`;
      case "current":
        return `${formatNumber(value, 1)}A`;
      default:
        return value;
    }
  };

  return (
    <div className="dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl pt-4 px-4 pb-2 h-full flex flex-col">
      <div className="flex flex-wrap items-start gap-2 mb-3">
        <div className="mr-auto">
          <h3 className="text-base font-semibold text-black dark:text-white">
            {t("pages.battery.widgets.analytics.title")}
          </h3>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {["both", ...["unit_a", "unit_b"].slice(0, batteryCount)].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                filter === f
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {f === "unit_a"
                ? "A"
                : f === "unit_b"
                  ? "B"
                  : t("pages.battery.widgets.filters.both")}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1" style={{ minHeight: "240px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={filteredData}
            margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorSoc" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
              <linearGradient
                id="colorVoltage"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
              </linearGradient>
              <linearGradient
                id="colorCurrent"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
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
              yAxisId="left"
              stroke="#6B7280"
              className="dark:stroke-gray-500"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              domain={[0, 100]}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#6B7280"
              className="dark:stroke-gray-500"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              domain={['auto', 'auto']}
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
                          {entry.name}: {formatMetricValue(entry.dataKey, entry.value)}
                        </p>
                      ))}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="soc"
              name={t("pages.battery.widgets.metrics.soc")}
              stroke="#3B82F6"
              strokeWidth={2}
              fill="url(#colorSoc)"
              fillOpacity={1}
            />
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="voltage"
              name={t("pages.battery.widgets.metrics.voltage")}
              stroke="#F59E0B"
              strokeWidth={2}
              fill="url(#colorVoltage)"
              fillOpacity={1}
            />
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="current"
              name={t("pages.battery.widgets.metrics.current")}
              stroke="#22D3EE"
              strokeWidth={2}
              fill="url(#colorCurrent)"
              fillOpacity={1}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DualUnitAnalytics;
