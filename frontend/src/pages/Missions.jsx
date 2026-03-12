import React, { useState } from "react";
import useTitle from "../hooks/useTitle";
import { Title } from "../components/ui";
import {
  EnergyConsumptionTrends,
  MissionSuccessRate,
  MissionLogs,
  MissionStats,
  MissionTable,
} from "../components/Widgets/Mission";
import useVehicleData from "../hooks/useVehicleData";

const Mission = () => {
  useTitle("Mission List");
  const [selectedVessel, setSelectedVessel] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const { vehicles } = useVehicleData();

  return (
    <div className="p-4 space-y-4">
      {/* Header - filter dipindah ke panel di Mission Logs */}
      <div>
        <Title title="Missions" subtitle="Mission monitoring and analytics" />
      </div>

      {/* Mission Stats Widget */}
      <MissionStats />

      {/* Mission Success Rate - Donut Chart */}
      <MissionSuccessRate />

      {/* Energy Consumption Trends */}
      <EnergyConsumptionTrends />

      {/* Bottom Section - Mission Logs */}
      <div>
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
      <div>
        <MissionTable />
      </div>
    </div>
  );
};

export default Mission;
