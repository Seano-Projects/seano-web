import React, { useState, useEffect } from "react";
import {
  FaBatteryFull,
  FaBatteryThreeQuarters,
  FaBatteryHalf,
  FaBatteryQuarter,
  FaBatteryEmpty,
  FaThermometerHalf,
  FaBolt,
  FaExclamationTriangle,
  FaCheckCircle,
} from "react-icons/fa";
import { useLogData } from "../../../hooks/useLogData";

const BatteryMonitoring = React.memo(({ selectedVehicle = null }) => {
  const { batteryData, ws } = useLogData();
  const [showTimeout, setShowTimeout] = useState(false);

  // Set timeout to show default values after 5 seconds
  useEffect(() => {
    const timeout = setTimeout(() => {
      setShowTimeout(true);
    }, 2000);

    return () => clearTimeout(timeout);
  }, []);


  // Get battery data for selected vehicle
  const vehicleBatteries = batteryData[selectedVehicle?.id] || {
    1: null,
    2: null,
  };

  // Ensure we always have exactly 2 batteries for display
  const displayBatteries = [
    vehicleBatteries[1] || {
      battery_id: 1,
      percentage: null,
      voltage: null,
      current: null,
      temperature: null,
      status: null,
    },
    vehicleBatteries[2] || {
      battery_id: 2,
      percentage: null,
      voltage: null,
      current: null,
      temperature: null,
      status: null,
    },
  ];

  // Calculate summary
  const validBatteries = displayBatteries.filter((b) => b.percentage !== null);
  const summary = {
    totalCapacity: 0, // Would come from battery specs if available
    averagePercentage:
      validBatteries.length > 0
        ? validBatteries.reduce((sum, b) => sum + b.percentage, 0) /
          validBatteries.length
        : 0,
  };

  // Get most recent battery timestamp for "Last Sync"
  const lastSyncTime =
    validBatteries.length > 0
      ? validBatteries
          .map((b) => b.timestamp)
          .filter((t) => t)
          .sort((a, b) => new Date(b) - new Date(a))[0]
      : null;

  const getBatteryIcon = (percentage) => {
    if (percentage === null || percentage === undefined) return FaBatteryEmpty;
    if (percentage >= 75) return FaBatteryFull;
    if (percentage >= 50) return FaBatteryThreeQuarters;
    if (percentage >= 25) return FaBatteryHalf;
    if (percentage >= 10) return FaBatteryQuarter;
    return FaBatteryEmpty;
  };

  const getBatteryColor = (percentage) => {
    if (percentage === null || percentage === undefined) return "text-gray-500";
    if (percentage >= 50) return "text-green-500";
    if (percentage >= 25) return "text-yellow-500";
    if (percentage >= 10) return "text-orange-500";
    return "text-red-500";
  };

  const getBatteryFillColor = (percentage) => {
    if (percentage === null || percentage === undefined) return "bg-gray-300";
    if (percentage >= 50) return "bg-green-500";
    if (percentage >= 25) return "bg-yellow-500";
    if (percentage >= 10) return "bg-orange-500";
    return "bg-red-500";
  };

  const getHealthStatus = (battery) => {
    // Show good status if we have battery data (percentage exists)
    if (battery.percentage === null || battery.percentage === undefined) {
      return {
        text: "N/A",
        color: "text-gray-500",
        icon: FaExclamationTriangle,
      };
    }
    // If battery percentage is available, consider it healthy
    return { text: "Good", color: "text-green-500", icon: FaCheckCircle };
  };

  const getStatusText = (status) => {
    if (status === null || status === undefined) return "N/A";

    // Capitalize first letter
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const isConnected = ws && ws.readyState === WebSocket.OPEN;

  // Check if we have recent battery data (within last 30 seconds)
  const hasRecentData =
    lastSyncTime && Date.now() - new Date(lastSyncTime).getTime() < 30000;
  const showConnected = isConnected || hasRecentData;

  if (!showTimeout && !isConnected) {
    return (
      <div className="h-full p-6 flex items-center justify-center">
        <div className="animate-pulse text-gray-500 dark:text-gray-400">
          Connecting to battery monitoring...
        </div>
      </div>
    );
  }

  // Helper function to render a single battery
  const renderBattery = (battery, index) => {
    const BatteryIcon = getBatteryIcon(battery.percentage);
    const healthStatus = getHealthStatus(battery);
    const HealthIcon = healthStatus.icon;
    const batteryPercentage =
      battery.percentage !== null ? battery.percentage : 0;

    return (
      <div key={index} className="flex flex-col items-center">
        {/* Battery Label */}
        <div className="mb-1.5 md:mb-2">
          <span className="text-[10px] md:text-xs font-medium text-gray-600 dark:text-gray-400">
            Battery {index + 1}
          </span>
        </div>

        {/* Battery Container */}
        <div className="relative">
          <div className="w-24 md:w-30 h-44 md:h-56 bg-gray-200 dark:bg-gray-700 rounded-lg border-2 border-gray-300 dark:border-gray-600 relative overflow-hidden">
            {/* Battery Fill */}
            <div
              className={`absolute bottom-0 left-0 right-0 transition-all duration-1000 ease-out ${getBatteryFillColor(
                battery.percentage,
              )}`}
              style={{ height: `${batteryPercentage}%` }}
            >
              {/* Liquid Effect */}
              <div className="absolute inset-0 opacity-20">
                <div className="w-full h-1 bg-white rounded-full animate-pulse" />
              </div>
            </div>

            {/* Battery Terminal */}
            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 md:w-4 h-1.5 md:h-2 bg-gray-400 dark:bg-gray-500 rounded-t" />

            {/* Percentage Text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs md:text-sm font-bold text-white drop-shadow-lg">
                {battery.percentage !== null ? `${battery.percentage}%` : "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* Battery Status */}
        <div className="mt-1.5 md:mt-2 text-center">
          <div className="flex items-center justify-center gap-1 mb-0.5 md:mb-1">
            <BatteryIcon
              className={`text-xs md:text-sm ${getBatteryColor(battery.percentage)}`}
            />
            <HealthIcon
              className={`text-[10px] md:text-xs ${healthStatus.color}`}
            />
          </div>
          <div className="text-[10px] md:text-xs text-gray-600 dark:text-gray-400">
            {getStatusText(battery.status)}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full p-3 md:p-4 flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3 md:mb-4">
        <div className="flex items-center gap-2">
          <FaBatteryFull className="text-base md:text-lg text-orange-500" />
          <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">
            Battery Monitoring
          </h3>
        </div>
        <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
          {selectedVehicle?.registration_code ||
            selectedVehicle?.name ||
            "USV 001"}
        </span>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-3 md:gap-4 items-center">
        {/* Left Side - Battery Tanks */}
        <div className="lg:col-span-2 flex items-center justify-center order-2 lg:order-1">
          <div className="flex gap-4 md:gap-6">
            {displayBatteries.map((battery, index) =>
              renderBattery(battery, index),
            )}
          </div>
        </div>

        {/* Right Side - Battery Stats */}
        <div className="lg:col-span-3 flex flex-col space-y-3 md:space-y-5 order-1 lg:order-2">
          {/* Individual Battery Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
            {displayBatteries.map((battery, index) => (
              <div
                key={index}
                className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 md:p-3"
              >
                <div className="text-[10px] md:text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 md:mb-2">
                  Battery {index + 1}
                </div>
                <div className="space-y-1 md:space-y-1.5 text-[10px] md:text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Status:
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {getStatusText(battery.status) || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Current:
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {battery.current !== null && battery.current !== undefined
                        ? `${battery.current.toFixed(1)}A`
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Voltage:
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {battery.voltage !== null && battery.voltage !== undefined
                        ? `${battery.voltage.toFixed(1)}V`
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Temp:
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {battery.temperature !== null &&
                      battery.temperature !== undefined
                        ? `${battery.temperature.toFixed(1)}°C`
                        : "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* System Summary */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 md:p-3 border border-blue-200 dark:border-blue-800">
            <div className="text-xs md:text-sm font-semibold text-blue-700 dark:text-blue-300 mb-1.5 md:mb-2">
              System Summary
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-4 text-[10px] md:text-xs">
              <div className="flex justify-between">
                <span className="text-blue-600 dark:text-blue-400">
                  Total Capacity:
                </span>
                <span className="font-medium text-blue-700 dark:text-blue-300">
                  {summary.totalCapacity.toFixed(1)}Ah
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-600 dark:text-blue-400">
                  Average Percentage:
                </span>
                <span className="font-medium text-blue-700 dark:text-blue-300">
                  {Math.round(summary.averagePercentage)}%
                </span>
              </div>
            </div>
          </div>

          {/* Last Sync */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 md:p-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    showConnected ? "bg-green-500 animate-pulse" : "bg-gray-400"
                  }`}
                ></div>
                <span className="text-[10px] md:text-xs font-medium text-gray-700 dark:text-gray-300">
                  Last Sync
                </span>
              </div>
              <div className="text-[10px] md:text-xs font-medium text-gray-600 dark:text-gray-400 sm:ml-auto">
                {lastSyncTime
                  ? new Date(lastSyncTime).toLocaleString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: true,
                    })
                  : "Waiting for data..."}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default BatteryMonitoring;
