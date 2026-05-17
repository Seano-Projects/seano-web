import React from "react";

const SystemHealth = ({ selectedVehicle, batteryData = {} }) => {
  const vehicleBatteries = batteryData[selectedVehicle?.id] || { 1: null, 2: null };
  const batteryA = vehicleBatteries[1];
  const batteryB = vehicleBatteries[2];

  // Calculate SOH (State of Health) - average of both batteries
  const calculateSOH = () => {
    const batteries = [batteryA, batteryB].filter((b) => b !== null);
    if (batteries.length === 0) return 96.5;

    // SOH calculation based on voltage and percentage
    const avgVoltage =
      batteries.reduce((sum, b) => sum + (b.voltage || 0), 0) / batteries.length;
    const avgPercentage =
      batteries.reduce((sum, b) => sum + (b.percentage || 0), 0) / batteries.length;

    // Normalize to 0-100% (assuming 12V is optimal, 10V is degraded)
    const voltageHealth = Math.max(0, Math.min(100, ((avgVoltage - 10) / 2) * 100));
    const percentageHealth = avgPercentage;

    // Weighted average (70% voltage, 30% percentage)
    return (voltageHealth * 0.7 + percentageHealth * 0.3);
  };

  const soh = calculateSOH();
  const status = soh >= 90 ? "Optimal" : soh >= 70 ? "Good" : soh >= 50 ? "Fair" : "Poor";
  const statusColor =
    soh >= 90 ? "text-green-500" : soh >= 70 ? "text-yellow-500" : "text-orange-500";

  return (
    <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl p-6 h-full flex flex-col">
      <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">SYSTEM HEALTH (SOH)</h3>
      <div className="text-5xl font-bold text-black dark:text-white mb-2">{soh.toFixed(1)}%</div>
      <div className={`text-sm font-medium ${statusColor} mb-1`}>{status}</div>
      <p className="text-xs text-gray-500 dark:text-gray-500 mt-auto">Combined units average.</p>
    </div>
  );
};

export default SystemHealth;
