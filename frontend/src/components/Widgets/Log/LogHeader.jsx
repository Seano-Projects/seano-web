import React from "react";
import { Title } from "../../ui";
import { VehicleDropdown } from "../../Widgets";
import { FiPause, FiPlay } from "react-icons/fi";

const LogHeader = ({
  t,
  vehicles,
  selectedVehicle,
  setSelectedVehicleId,
  vehicleLoading,
  isRealtimePaused,
  setIsRealtimePaused,
}) => (
  <div className="flex items-center justify-between mb-4">
    <Title title={t("pages.logs.title")} subtitle={t("pages.logs.subtitle")} />
    <div className="flex items-center gap-3">
      <div className="w-52">
        <VehicleDropdown
          vehicles={vehicles}
          selectedVehicle={selectedVehicle}
          onVehicleChange={(v) => setSelectedVehicleId(v?.id)}
          placeholder={
            vehicleLoading
              ? t("pages.logs.loadingVehicles")
              : !vehicles || vehicles.length === 0
                ? t("pages.logs.noVehicles")
                : t("pages.logs.allVehicles")
          }
          className="text-sm"
          disabled={vehicleLoading}
        />
      </div>
      <button
        onClick={() => setIsRealtimePaused((prev) => !prev)}
        className={`px-3 py-3 text-sm rounded-xl transition-all flex items-center gap-2 font-medium border ${
          isRealtimePaused
            ? "bg-green-100 hover:bg-green-200 text-green-700 border-green-300 dark:bg-green-900/30 dark:hover:bg-green-900/50 dark:text-green-300 dark:border-green-700"
            : "bg-amber-100 hover:bg-amber-200 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 dark:text-amber-300 dark:border-amber-700"
        }`}
        title={
          isRealtimePaused ? "Resume realtime logs" : "Pause realtime logs"
        }
      >
        {isRealtimePaused ? <FiPlay size={16} /> : <FiPause size={16} />}
        {isRealtimePaused ? "Resume Live" : "Pause Live"}
      </button>
    </div>
  </div>
);

export default LogHeader;
