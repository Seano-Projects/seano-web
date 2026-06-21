import { useState, useEffect, useRef } from "react";
import useTitle from "../hooks/useTitle";
import { Title } from "../components/ui";
import {
  MissionSuccessRate,
  MissionLogs,
  MissionStats,
  MissionTable,
} from "../components/Widgets/Mission";
import useVehicleData from "../hooks/useVehicleData";
import useTranslation from "../hooks/useTranslation";

const Mission = () => {
  const { t } = useTranslation();
  useTitle(t("pages.missions.title"));
  const [selectedVessel, setSelectedVessel] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const { vehicles } = useVehicleData();
  const hasInitializedVesselSelection = useRef(false);

  useEffect(() => {
    if (!vehicles || vehicles.length === 0) {
      hasInitializedVesselSelection.current = false;
      return;
    }

    if (
      selectedVessel?.id &&
      !vehicles.some((vehicle) => vehicle.id === selectedVessel.id)
    ) {
      setSelectedVessel(null);
    }
  }, [vehicles, selectedVessel]);

  return (
    <div className="p-4 space-y-4 overflow-x-hidden">
      {/* Header - filter dipindah ke panel di Mission Logs */}
      <div>
        <Title
          title={t("pages.missions.title")}
          subtitle={t("pages.missions.subtitle")}
        />
      </div>

      {/* Mission Stats Widget */}
      <MissionStats />

      {/* Row 1: Mission Success Rate + Mission History (2 columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:h-160 lg:grid-rows-1">
        <MissionSuccessRate />

        <MissionLogs
          vehicles={vehicles || []}
          selectedVessel={selectedVessel}
          startDate={startDate}
          endDate={endDate}
          onVesselChange={setSelectedVessel}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
        />
      </div>

      {/* Mission Table - Detail View */}
      <MissionTable />
    </div>
  );
};

export default Mission;
