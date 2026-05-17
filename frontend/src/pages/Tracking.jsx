import { memo, useState } from "react";
import useTitle from "../hooks/useTitle";
import useTranslation from "../hooks/useTranslation";
import { ViewMap } from "../components/Widgets";
import { FaShip, FaChevronLeft } from "react-icons/fa";
import {
  VehicleStatusPanel,
  TelemetryPanel,
  BatteryMonitoring,
  RawDataLog,
  SensorDataLog,
  LatestAlerts,
} from "../components/Widgets/Tracking";

const Tracking = memo(
  ({ darkMode, selectedVehicle }) => {
    const { t } = useTranslation();
    useTitle(t("nav.tracking"));
    const [isStatusExpanded, setIsStatusExpanded] = useState(false);

    return (
      <div className="w-full flex flex-col gap-3 md:gap-4 pb-5">
        {/* Row 1 - Full width map with floating panels */}
        <div className="relative w-full h-[36rem] lg:h-[40rem] rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
          <ViewMap darkMode={darkMode} selectedVehicle={selectedVehicle} />

          {/* Floating Vehicle Status Panel - collapsible, top left */}
          <div className="hidden lg:block absolute top-3 left-3 z-[1000] pointer-events-auto">
            {!isStatusExpanded ? (
              <button
                onClick={() => setIsStatusExpanded(true)}
                className="w-12 h-12 rounded-full bg-white dark:bg-black border border-gray-200 dark:border-gray-600 shadow-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                title={t("tracking.vehicleStatus.title")}
              >
                <FaShip className="text-blue-500 text-lg" />
              </button>
            ) : (
              <div className="w-72 max-h-[calc(100%-1.5rem)] overflow-y-auto rounded-2xl bg-white dark:bg-black backdrop-blur-md border border-gray-200 dark:border-gray-700 shadow-lg">
                <button
                  onClick={() => setIsStatusExpanded(false)}
                  className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                >
                  <FaChevronLeft className="text-gray-500 text-xs" />
                </button>
                <VehicleStatusPanel selectedVehicle={selectedVehicle} />
              </div>
            )}
          </div>

          {/* Floating Telemetry (Compass) - bottom right, no card */}
          <div className="hidden lg:flex absolute bottom-3 right-3 z-[1000] flex-col items-center gap-1 pointer-events-none">
            <TelemetryPanel selectedVehicle={selectedVehicle} />
          </div>
        </div>

        {/* Mobile: Vehicle Status & Telemetry below map */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 lg:hidden">
          <div className="bg-white border border-gray-200 dark:bg-black dark:border-gray-700 rounded-2xl overflow-hidden">
            <VehicleStatusPanel selectedVehicle={selectedVehicle} />
          </div>
          <div className="bg-white border border-gray-200 dark:bg-black dark:border-gray-700 rounded-2xl overflow-hidden">
            <TelemetryPanel selectedVehicle={selectedVehicle} />
          </div>
        </div>

        {/* Row 2 - Battery & Alerts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <div className="bg-white border border-gray-200 dark:bg-black dark:border-gray-700 rounded-2xl overflow-hidden">
            <BatteryMonitoring selectedVehicle={selectedVehicle} />
          </div>
          <div className="min-h-80 h-90 md:h-100 bg-white border border-gray-200 dark:bg-black dark:border-gray-700 rounded-2xl overflow-hidden">
            <LatestAlerts selectedVehicle={selectedVehicle} />
          </div>
        </div>

        {/* Row 3 - Data Logs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <div className="min-h-70 h-72 md:h-80 bg-white border border-gray-200 dark:bg-black dark:border-gray-700 rounded-2xl overflow-hidden">
            <RawDataLog selectedVehicle={selectedVehicle} />
          </div>
          <div className="min-h-70 h-72 md:h-80 bg-white border border-gray-200 dark:bg-black dark:border-gray-700 rounded-2xl overflow-hidden">
            <SensorDataLog selectedVehicle={selectedVehicle} />
          </div>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.darkMode === nextProps.darkMode &&
      prevProps.selectedVehicle === nextProps.selectedVehicle
    );
  },
);

Tracking.displayName = "Tracking";

export default Tracking;
