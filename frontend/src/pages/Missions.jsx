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

      {/* Row 1: Mission Success Rate + Energy Consumption Trends (2 columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Mission Success Rate - Donut Chart */}
        <MissionSuccessRate />

        {/* Energy Consumption Trends */}
        <EnergyConsumptionTrends />
      </div>

      {/* Row 2: Mission Logs + Mission Details (2 columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Mission Logs */}
        <MissionLogs
          vehicles={vehicles || []}
          selectedVessel={selectedVessel}
          startDate={startDate}
          endDate={endDate}
          onVesselChange={setSelectedVessel}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
        />

        {/* Mission Table - Detail View */}
        <MissionTable />
      </div>
    </div>
  );
};

export default Mission;
