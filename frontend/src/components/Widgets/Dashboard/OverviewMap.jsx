import React from "react";
import { FaLocationArrow } from "react-icons/fa6";
import { ViewMap } from "../Map";
import useTranslation from "../../../hooks/useTranslation";

const OverviewMap = ({ darkMode, vehicles, selectedVehicleId }) => {
  const { t } = useTranslation();
  return (
    <div className="bg-white dark:bg-transparent border border-gray-200 dark:border-slate-600 p-8 rounded-xl">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <FaLocationArrow size={30} className="text-green-500" />
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
          {t("dashboard.overviewMap.title")}
        </h1>
      </div>

      {/* Map Container */}
      <div className="relative h-[360px] md:h-[450px] overflow-hidden rounded-xl">
        <ViewMap
          vehicles={vehicles}
          selectedVehicle={selectedVehicleId}
          darkMode={darkMode}
        />
      </div>
    </div>
  );
};

export default OverviewMap;
