import React from "react";

const formatPercentage = (value) => {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return "0";
  }

  return Number.isInteger(numeric) ? numeric.toFixed(0) : numeric.toFixed(1);
};

const BatteryDisplay = ({ unit, battery, index }) => {
  const percentage = battery?.percentage || 0;
  const voltage = battery?.voltage || 0;
  const status = battery?.status || "N/A";

  // Determine status color and text
  const getStatusColor = () => {
    const statusLower = status.toLowerCase();
    if (statusLower === "charging") return "text-blue-500";
    if (statusLower === "active") return "text-green-500";
    if (statusLower === "discharging") return "text-red-500";
    return "text-gray-500";
  };

  const getBatteryColor = () => {
    if (unit === "A") return "text-blue-400";
    return "text-cyan-400";
  };

  const getBarColor = () => {
    if (unit === "A") return "bg-blue-500";
    return "bg-cyan-400";
  };

  const statusDisplay =
    status === "N/A" ? "N/A" : status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <div className="dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl p-6">
      {/* Unit Label */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold dark:text-white text-black">
          BATTERY {unit}
        </h3>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium border bg-transparent ${getStatusColor()}`}
        >
          {statusDisplay}
        </span>
      </div>

      {/* Battery Icon */}
      <div className="relative flex items-center justify-center mb-6">
        <div className="relative w-32 h-56">
          {/* Battery Container */}
          <div className="absolute inset-0 bg-gray-200 dark:bg-gray-800 rounded-lg border-2 border-gray-300 dark:border-gray-700 overflow-hidden p-2">
            {/* Battery Fill*/}
            <div
              className={`absolute ${getBarColor()} rounded-lg transition-all duration-1000`}
              style={{
                bottom: "0.4rem",
                left: "0.4rem",
                right: "0.4rem",
                height: `calc(${Math.max(0, Math.min(100, percentage))}% - 0.8rem)`,
                minHeight: percentage > 0 ? "0.5rem" : "0",
              }}
            />
            {/* Percentage Text */}
            <div className="relative z-10 w-full h-full flex items-center justify-center">
              <span className="text-2xl font-bold text-white">
                {formatPercentage(percentage)}%
              </span>
            </div>
          </div>
          {/* Battery Terminal */}
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-8 h-3 bg-gray-300 dark:bg-gray-700 rounded-t" />
        </div>
      </div>

      {/* SOC Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">SOC</span>
          <span className={`text-sm font-semibold ${getBatteryColor()}`}>
            {voltage.toFixed(1)}V
          </span>
        </div>
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full ${getBarColor()} transition-all duration-1000`}
            style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default BatteryDisplay;
