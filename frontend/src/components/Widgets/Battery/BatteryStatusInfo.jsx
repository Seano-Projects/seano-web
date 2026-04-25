import React, { useEffect, useState } from "react";
import {
  FaBatteryFull,
  FaBolt,
  FaInfoCircle,
} from "react-icons/fa";
import useTranslation from "../../../hooks/useTranslation";

const formatPercentage = (value) => {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return "0";
  }

  return Number.isInteger(numeric) ? numeric.toFixed(0) : numeric.toFixed(1);
};

const BatteryStatusInfo = ({ selectedVehicle, batteryData = {} }) => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState("all");
  const nominalCapacity =
    Number(selectedVehicle?.battery_total_capacity_ah) > 0
      ? Number(selectedVehicle.battery_total_capacity_ah)
      : 20;
  const batteryCount = Number(selectedVehicle?.battery_count) === 1 ? 1 : 2;
  const vehicleBatteries = batteryData[selectedVehicle?.id] || {
    1: null,
    2: null,
  };
  const activeBatteries = Array.from({ length: batteryCount }, (_, index) => {
    const batteryId = index + 1;
    return vehicleBatteries[batteryId] || null;
  });

  useEffect(() => {
    if (batteryCount === 1 && filter === "battery_b") {
      setFilter("all");
    }
  }, [batteryCount, filter]);

  // Calculate stats based on filter
  const getCombinedStats = () => {
    const selectedBatteryIndex =
      filter === "battery_a" ? 0 : filter === "battery_b" ? 1 : null;

    const batteriesForStats =
      selectedBatteryIndex === null
        ? activeBatteries
        : [activeBatteries[selectedBatteryIndex] || null];

    const hasAnyData = batteriesForStats.some((battery) => battery !== null);
    if (!hasAnyData) {
      return null;
    }

    const denominator = selectedBatteryIndex === null ? batteryCount : 1;

    const sumMetric = (picker) =>
      batteriesForStats.reduce(
        (sum, battery) => sum + (battery ? picker(battery) : 0),
        0,
      );

    const avgPercentage =
      sumMetric((battery) => battery.percentage || 0) / denominator;
    const avgVoltage =
      sumMetric((battery) => battery.voltage || 0) / denominator;
    const avgCurrent =
      sumMetric((battery) => battery.current || 0) / denominator;
    const avgTemp =
      sumMetric((battery) => battery.temperature || 0) / denominator;

    const allCellVoltages = batteriesForStats.flatMap((battery) =>
      battery && Array.isArray(battery.cell_voltages)
        ? battery.cell_voltages
        : [],
    );

    const deltaVoltage =
      allCellVoltages.length > 1
        ? Math.max(...allCellVoltages) - Math.min(...allCellVoltages)
        : 0;

    return {
      soc: avgPercentage,
      batteryVoltage: avgVoltage || 0,
      chargeCurrent: avgCurrent || 0,
      powerTubeTemp: avgTemp || 0,
      deltaVoltage,
      remainingCapacity: (avgPercentage / 100) * nominalCapacity,
      nominalCapacity,
      cycleCount: 0,
      deviceUptime: 0,
    };
  };

  const stats = getCombinedStats();

  // Get status color based on SOC
  const getStatusColor = () => {
    if (!stats) return "text-gray-500";
    if (stats.soc >= 80) return "text-green-500";
    if (stats.soc >= 50) return "text-yellow-500";
    if (stats.soc >= 20) return "text-orange-500";
    return "text-red-500";
  };

  if (!stats) {
    return (
      <div className="dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl p-4 h-full">
        <div className="flex items-center gap-2 mb-3">
          <FaInfoCircle className="text-gray-500 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-black dark:text-white">
            {t("pages.battery.widgets.statusInfo.title")}
          </h3>
        </div>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          {t("pages.battery.widgets.statusInfo.noData")}
        </div>
      </div>
    );
  }

  return (
    <div className="dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl p-4 h-full">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex items-center gap-2 mr-auto">
          <FaInfoCircle className="text-gray-500 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-black dark:text-white">
            {t("pages.battery.widgets.statusInfo.title")}
          </h3>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {["all", ...["battery_a", "battery_b"].slice(0, batteryCount)].map(
            (f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  filter === f
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {f === "battery_a"
                  ? "A"
                  : f === "battery_b"
                    ? "B"
                    : t("pages.battery.widgets.filters.all")}
              </button>
            ),
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
        {/* SOC */}
        <div className="bg-white dark:bg-black rounded-lg p-4 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <FaBatteryFull className="text-blue-500" />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              SOC
            </span>
          </div>
          <div className={`text-2xl font-bold ${getStatusColor()}`}>
            {formatPercentage(stats.soc)}%
          </div>
        </div>

        {/* Battery Voltage */}
        <div className="bg-white dark:bg-black rounded-lg p-4 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <FaBolt className="text-yellow-500" />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              {t("pages.battery.widgets.metrics.voltage")}
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.batteryVoltage.toFixed(1)}V
          </div>
        </div>

        {/* Charge Current */}
        <div className="bg-white dark:bg-black rounded-lg p-4 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <FaBolt className="text-blue-500" />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              {t("pages.battery.widgets.metrics.current")}
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.chargeCurrent.toFixed(1)}A
          </div>
        </div>

        {/* Capacity */}
        <div className="bg-white dark:bg-black rounded-lg p-4 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              {t("pages.battery.widgets.metrics.capacity")}
            </span>
          </div>
          <div className="text-xl font-semibold text-gray-900 dark:text-white">
            {stats.remainingCapacity.toFixed(1)}/{stats.nominalCapacity.toFixed(1)}Ah
          </div>
        </div>
      </div>

    </div>
  );
};

export default BatteryStatusInfo;
