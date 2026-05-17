import useTitle from "../hooks/useTitle";
import { ViewMap, Gyroscope3D } from "../components/Widgets";
import {
  VehicleStatusPanel,
  TelemetryPanel,
  VehicleLogChart,
  SensorDataChart,
  BatteryMonitoring,
  RawDataLog,
  SensorDataLog,
  LatestAlerts,
} from "../components/Widgets/Tracking";

const Tracking = ({ darkMode, selectedVehicle }) => {
  useTitle("Tracking");

  return (
    <div className="w-full grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pb-5">
      <div className="col-span-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6 xl:grid-cols-10">
        {/* Left Side - Vehicle Status Panel */}
        <div className="h-[360px] md:h-[660px] order-2 lg:order-1 lg:grid-cols-2 xl:col-span-2 w-full bg-white border-1 border-gray-200 dark:bg-black dark:border-1 dark:border-gray-700 rounded-2xl">
          <VehicleStatusPanel selectedVehicle={selectedVehicle} />
        </div>
        {/* Center - Map */}
        <div className="z-0 h-[360px] md:h-[660px] col-span-1 order-1 lg:order-2 md:col-span-2 lg:col-span-6 bg-white border-1 border-gray-200 dark:bg-black dark:border-1 dark:border-gray-700 rounded-2xl overflow-hidden">
          <ViewMap darkMode={darkMode} selectedVehicle={selectedVehicle} />
        </div>
        {/* Right Side - Telemetry Panel */}
        <div className="h-[360px] md:h-[660px] order-2 lg:order-3 lg:grid-cols-2 xl:col-span-2 w-full bg-white border-1 border-gray-200 dark:bg-black dark:border-1 dark:border-gray-700 rounded-2xl">
          <TelemetryPanel selectedVehicle={selectedVehicle} />
        </div>
      </div>
      {/* TEMPORARILY COMMENTED TO ISOLATE ERROR
      <div className="col-span-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6 xl:grid-cols-4">
        <div className="h-[700px] col-span-3 xl:col-span-2 bg-white border-1 border-gray-200 dark:bg-black dark:border-1 dark:border-gray-700 rounded-2xl">
          <SensorDataChart selectedVehicle={selectedVehicle} />
        </div>
        <div className="h-[700px] col-span-3 xl:col-span-2 bg-white border-1 border-gray-200 dark:bg-black dark:border-1 dark:border-gray-700 rounded-2xl">
          <VehicleLogChart selectedVehicle={selectedVehicle} />
        </div>
      </div>
      */}
      {/* TEMPORARILY COMMENTED TO ISOLATE ERROR
      <div className="col-span-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6 xl:grid-cols-6">
        <div className="h-[400px] col-span-3 xl:col-span-3 bg-white border-1 border-gray-200 dark:bg-black dark:border-1 dark:border-gray-700 rounded-2xl">
          <BatteryMonitoring selectedVehicle={selectedVehicle} />
        </div>
        <div className="h-[400px] col-span-3 xl:col-span-3 bg-white border-1 border-gray-200 dark:bg-black dark:border-1 dark:border-gray-700 rounded-2xl">
          <LatestAlerts selectedVehicle={selectedVehicle} />
        </div>
      </div>
      */}
      <div className="col-span-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6 xl:grid-cols-4">
        {/* Raw Data Log */}
        <div className="h-80 col-span-3 xl:col-span-2 bg-white border-1 border-gray-200 dark:bg-black dark:border-1 dark:border-gray-700 rounded-2xl">
          <RawDataLog selectedVehicle={selectedVehicle} />
        </div>
        {/* Sensor Data Log */}
        <div className="h-80 col-span-3 xl:col-span-2 bg-white border-1 border-gray-200 dark:bg-black dark:border-1 dark:border-gray-700 rounded-2xl">
          <SensorDataLog selectedVehicle={selectedVehicle} />
        </div>
      </div>
    </div>
  );
};

export default Tracking;
