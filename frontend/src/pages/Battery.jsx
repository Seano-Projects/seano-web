import React, { useState, useMemo } from "react";
import useTitle from "../hooks/useTitle";
import useVehicleData from "../hooks/useVehicleData";
import useBatteryData from "../hooks/useBatteryData";
import { Title } from "../components/ui";
import { VehicleDropdown } from "../components/Widgets";
import {
  BatteryDisplay,
  DualUnitAnalytics,
  IndividualCellVoltages,
  BatteryLog,
  BatteryStatusInfo,
} from "../components/Widgets/Battery";

const Battery = () => {
  useTitle("Battery Monitoring");

  const {
    vehicles,
    selectedVehicleId,
    setSelectedVehicleId,
    loading: vehicleLoading,
  } = useVehicleData();
  const { batteryData = {} } = useBatteryData() || {};

  // Get selected vehicle object
  const selectedVehicle = useMemo(() => {
    if (!selectedVehicleId || !vehicles || vehicles.length === 0) {
      return vehicles?.[0] || null;
    }
    return (
      vehicles.find((v) => v.id === parseInt(selectedVehicleId)) ||
      vehicles[0] ||
      null
    );
  }, [selectedVehicleId, vehicles]);

  // Handle vehicle change
  const handleVehicleChange = (vehicle) => {
    if (vehicle && vehicle.id) {
      setSelectedVehicleId(vehicle.id.toString());
    } else {
      setSelectedVehicleId("");
    }
  };

  // Get battery data for selected vehicle (no dummy data)
  const vehicleBatteries = batteryData[selectedVehicle?.id] || {
    1: null,
    2: null,
  };
  const batteryA = vehicleBatteries[1] || null;
  const batteryB = vehicleBatteries[2] || null;

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Title
          title="Battery Monitoring"
          subtitle="System Batteries Monitoring"
        />
        <div className="min-w-[200px]">
          <VehicleDropdown
            vehicles={vehicles || []}
            selectedVehicle={selectedVehicle}
            onVehicleChange={handleVehicleChange}
            placeholder={
              vehicleLoading
                ? "Loading vehicles..."
                : !vehicles || vehicles.length === 0
                  ? "No vehicles available"
                  : "Select USV"
            }
            className="text-sm"
            disabled={vehicleLoading}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="grid grid-cols-1 gap-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <BatteryDisplay unit="A" battery={batteryA} index={0} />
            <BatteryDisplay unit="B" battery={batteryB} index={1} />
          </div>
          <div className="">
            <BatteryStatusInfo
              selectedVehicle={selectedVehicle}
              batteryData={batteryData}
            />
          </div>
          <div className="">
            <IndividualCellVoltages
              selectedVehicle={selectedVehicle}
              batteryData={batteryData}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6">
          <DualUnitAnalytics selectedVehicle={selectedVehicle} />
          <BatteryLog selectedVehicle={selectedVehicle} />
        </div>
      </div>
    </div>
  );
};

export default Battery;
