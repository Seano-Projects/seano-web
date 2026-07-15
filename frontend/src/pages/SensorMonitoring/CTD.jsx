import React, { useState } from "react";
import useTitle from "../../hooks/useTitle";
import { Title } from "../../components/ui";
import { ViewMap } from "../../components/Widgets";
import {
  CTDTable,
  DepthProfile,
  TimeSeriesChart,
  CTDSectionHeatmap,
  MultiCastChart,
  CastInfoBar,
  CTDInfoPanel,
} from "../../components/Widgets/SensorMonitoring/CTD";
import { useCTDData } from "../../hooks";
import useTranslation from "../../hooks/useTranslation";

const CTD = ({ darkMode }) => {
  const { t } = useTranslation();
  useTitle(t("pages.ctd.title"));

  const [selectedMetric, setSelectedMetric] = useState("temperature");

  // Get CTD data from WebSocket + historical REST API — realtime, unfiltered
  const { ctdData, isConnected } = useCTDData();

  return (
    <div className="w-full max-w-full overflow-x-hidden p-4">
      {/* Header with Title */}
      <div className="mb-4 flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <Title
          title={t("pages.ctd.title")}
          subtitle={t("pages.ctd.subtitle")}
          titleSuffix={<CTDInfoPanel />}
        />
      </div>

      {/* Active Cast Info Bar */}
      <CastInfoBar ctdData={ctdData} />

      {/* Cast location map */}
      <div className="mb-4 w-full h-130 rounded-xl overflow-hidden">
        <ViewMap darkMode={darkMode} />
      </div>

      {/* CTD Visualizations */}
      <div className="mb-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="min-w-0">
          <TimeSeriesChart ctdData={ctdData} />
        </div>
        <div className="min-w-0">
          <DepthProfile
            ctdData={ctdData}
            selectedParameter={selectedMetric}
            onParameterChange={setSelectedMetric}
          />
        </div>
      </div>

      {/* Multi-cast / multi-coordinate history chart */}
      <div className="mb-4">
        <MultiCastChart ctdData={ctdData} />
      </div>

      <div className="mb-4">
        <CTDSectionHeatmap ctdData={ctdData} metric={selectedMetric} />
      </div>

      {/* CTD Table Component */}
      <CTDTable ctdData={ctdData} loading={false} isConnected={isConnected} />
    </div>
  );
};

export default CTD;
