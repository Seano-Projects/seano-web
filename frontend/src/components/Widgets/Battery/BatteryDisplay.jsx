import React from "react";

const formatPercentage = (value) => {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return "0";
  }

  return Number.isInteger(numeric) ? numeric.toFixed(0) : numeric.toFixed(1);
};

const BatteryDisplay = ({ unit, battery, index, compact = false }) => {
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

  const iconW = compact ? "w-14" : "w-32";
  const iconH = compact ? "h-24" : "h-56";
  const termW = compact ? "w-5" : "w-8";
  const termH = compact ? "h-2" : "h-3";
  const pctSize = compact ? "text-base" : "text-2xl";
  const padding = compact ? "p-3" : "p-6";

  return (
    <div className={`dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl ${padding} h-full flex flex-col`}>
      {/* Unit Label */}
      <div className="flex items-center justify-between mb-3">
        <h3 className={`${compact ? "text-sm" : "text-lg"} font-semibold dark:text-white text-black`}>
          BAT {unit}
        </h3>
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium border bg-transparent ${getStatusColor()}`}
        >
          {statusDisplay}
        </span>
      </div>

      {/* Battery Icon */}
      <div className="flex-1 flex items-center justify-center mb-3">
        <div className={`relative ${iconW} ${iconH}`}>
          {/* Battery Container */}
          <div className="absolute inset-0 bg-gray-200 dark:bg-gray-800 rounded-lg border-2 border-gray-300 dark:border-gray-700 overflow-hidden p-1.5">
            {/* Battery Fill */}
            <div
              className={`absolute ${getBarColor()} rounded-lg transition-all duration-1000`}
              style={{
                bottom: "0.3rem",
                left: "0.3rem",
                right: "0.3rem",
                height: `calc(${Math.max(0, Math.min(100, percentage))}% - 0.6rem)`,
                minHeight: percentage > 0 ? "0.4rem" : "0",
              }}
            />
            {/* Percentage Text */}
            <div className="relative z-10 w-full h-full flex items-center justify-center">
              <span className={`${pctSize} font-bold text-white`}>
                {formatPercentage(percentage)}%
              </span>
            </div>
          </div>
          {/* Battery Terminal */}
          <div className={`absolute -top-1.5 left-1/2 transform -translate-x-1/2 ${termW} ${termH} bg-gray-300 dark:bg-gray-700 rounded-t`} />
        </div>
      </div>

      {/* SOC Bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-600 dark:text-gray-400">SOC</span>
          <span className={`text-xs font-semibold ${getBatteryColor()}`}>
            {voltage.toFixed(1)}V
          </span>
        </div>
        <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
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
