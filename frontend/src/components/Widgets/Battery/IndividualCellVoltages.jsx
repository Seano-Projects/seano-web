import React from "react";
import { FaTh } from "react-icons/fa";

const getCells = (battery) => {
  if (!battery) {
    return null;
  }

  if (
    Array.isArray(battery.cell_voltages) &&
    battery.cell_voltages.length > 0
  ) {
    return battery.cell_voltages.map((voltage, index) => ({
      cell: index + 1,
      voltage: Number(voltage),
    }));
  }

  if (battery.voltage && battery.cell_count) {
    return Array.from({ length: battery.cell_count }, (_, index) => ({
      cell: index + 1,
      voltage: battery.voltage / battery.cell_count,
    }));
  }

  return null;
};

const IndividualCellVoltages = ({ selectedVehicle, batteryData = {} }) => {
  const batteryCount = Number(selectedVehicle?.battery_count) === 1 ? 1 : 2;
  const vehicleBatteries = batteryData[selectedVehicle?.id] || {
    1: null,
    2: null,
  };

  const batteries = Array.from({ length: batteryCount }, (_, index) => {
    const batteryId = index + 1;
    const battery = vehicleBatteries[batteryId] || null;

    return {
      batteryId,
      unit: batteryId === 1 ? "A" : "B",
      colorClass: batteryId === 1 ? "text-blue-400" : "text-cyan-400",
      battery,
      cells: getCells(battery),
    };
  });

  const renderCell = (cell, unit) => {
    // Most battery cell telemetry here is in the 3.0V - 4.2V range.
    const maxVoltage = 4.2;
    const minVoltage = 3.0;
    const percentage =
      ((cell.voltage - minVoltage) / (maxVoltage - minVoltage)) * 100;
    const barColor = unit === "A" ? "bg-blue-500" : "bg-cyan-400";

    return (
      <div
        key={cell.cell}
        className="flex items-center justify-between py-2.5 border-b border-gray-200 dark:border-gray-700/50"
      >
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-15">
          Cell {cell.cell}
        </span>
        <div className="flex items-center gap-4 flex-1 ml-4">
          <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full ${barColor} transition-all duration-500`}
              style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 min-w-14.5 text-right">
            {cell.voltage.toFixed(3)}V
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <FaTh className="text-gray-500 dark:text-gray-400" />
        <h3 className="text-lg font-semibold text-black dark:text-white">
          Monitoring Cell
        </h3>
      </div>

      {!batteries.some((item) => item.cells) ? (
        <div className="text-center py-3 text-gray-500 dark:text-gray-400">
          No cell voltage data available.
        </div>
      ) : (
        <div
          className={`grid grid-cols-1 gap-8 ${batteryCount === 2 ? "lg:grid-cols-2 lg:gap-12" : "lg:grid-cols-1"}`}
        >
          {batteries.map((item) => (
            <div key={item.batteryId} className="flex flex-col">
              <h4 className={`text-sm font-medium ${item.colorClass} mb-4`}>
                BATTERY {item.unit} (
                {item.cells?.length || item.battery?.cell_count || 0} CELLS)
              </h4>
              {item.cells ? (
                <div className="overflow-y-auto max-h-60 custom-scrollbar space-y-1 pr-3">
                  {item.cells.map((cell) => renderCell(cell, item.unit))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                  No data
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default IndividualCellVoltages;
