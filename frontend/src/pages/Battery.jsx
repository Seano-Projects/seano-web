import React, { useMemo } from "react";
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
import useTranslation from "../hooks/useTranslation";

const Battery = () => {
  const { t } = useTranslation();
  useTitle(t("pages.battery.title"));

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

  const batteryCount = Number(selectedVehicle?.battery_count) === 1 ? 1 : 2;

  // Get battery data for selected vehicle (no dummy data)
  const vehicleBatteries = batteryData[selectedVehicle?.id] || {
    1: null,
    2: null,
  };
  const batteryUnits = ["A", "B"].slice(0, batteryCount);

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <Title
          title={t("pages.battery.title")}
          subtitle={t("pages.battery.subtitle")}
        />
        <div className="w-44 flex-shrink-0">
          <VehicleDropdown
            vehicles={vehicles || []}
            selectedVehicle={selectedVehicle}
            onVehicleChange={handleVehicleChange}
            placeholder={
              vehicleLoading
                ? t("pages.battery.loadingVehicles")
                : !vehicles || vehicles.length === 0
                  ? t("pages.battery.noVehicles")
                  : t("pages.battery.selectUsv")
            }
            className="text-sm"
            disabled={vehicleLoading}
          />
        </div>
      </div>

      {/* Row 1: Status + Battery + Chart */}
      {/* Mobile: stacked | md: 2-col | lg: 7-col */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3 items-stretch">
        {/* Status Info */}
        <div className="md:col-span-1 lg:col-span-2">
          <BatteryStatusInfo
            selectedVehicle={selectedVehicle}
            batteryData={batteryData}
          />
        </div>

        {/* Battery Display */}
        <div className={`md:col-span-1 lg:col-span-2 grid gap-2 ${batteryCount === 2 ? "grid-rows-2" : "grid-rows-1"}`}>
          {batteryUnits.map((unit, index) => (
            <BatteryDisplay
              key={unit}
              unit={unit}
              battery={vehicleBatteries[index + 1] || null}
              vehicleCode={selectedVehicle?.code || ""}
              index={index}
            />
          ))}
        </div>

        {/* Chart — full width on mobile/md, 3 cols on lg */}
        <div className="md:col-span-2 lg:col-span-3">
          <DualUnitAnalytics selectedVehicle={selectedVehicle} />
        </div>
      </div>

      {/* Row 2: Full-width Data Logs */}
      <div className="mt-3">
        <BatteryLog selectedVehicle={selectedVehicle} />
      </div>
    </div>
  );
};

export default Battery;
