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
      setSelectedVessel(null);
      hasInitializedVesselSelection.current = false;
      return;
    }

    if (!hasInitializedVesselSelection.current && !selectedVessel) {
      setSelectedVessel(vehicles[0]);
      hasInitializedVesselSelection.current = true;
      return;
    }

    if (
      selectedVessel?.id &&
      !vehicles.some((vehicle) => vehicle.id === selectedVessel.id)
    ) {
      setSelectedVessel(vehicles[0]);
    }
  }, [vehicles, selectedVessel]);

  return (
    <div className="p-4 space-y-4">
      {/* Header - filter dipindah ke panel di Mission Logs */}
      <div>
        <Title
          title={t("pages.missions.title")}
          subtitle={t("pages.missions.subtitle")}
        />
      </div>

      {/* Mission Stats Widget */}
      <MissionStats />

      {/* Mission Success Rate (2 col) + Mission Logs (3 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2">
          <MissionSuccessRate />
        </div>
        <div className="lg:col-span-3">
          <MissionLogs
            vehicles={vehicles || []}
            selectedVessel={null}
            startDate={startDate}
            endDate={endDate}
            onVesselChange={setSelectedVessel}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
          />
        </div>
      </div>

      {/* Mission Table - Detail View */}
      <MissionTable />
    </div>
  );
};

export default Mission;
