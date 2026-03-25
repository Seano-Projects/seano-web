import React, { useEffect, useRef, useState } from "react";
import useTitle from "../../hooks/useTitle";
import { Title } from "../../components/ui";
import {
  VehicleDropdown,
  DatePickerField,
  TimePickerField,
} from "../../components/Widgets";
import {
  CTDTable,
  DepthProfile,
  TSDiagram,
  TimeSeriesChart,
  SoundSpeedProfile,
} from "../../components/Widgets/SensorMonitoring/CTD";
import { useVehicleData, useCTDData } from "../../hooks";
import useTranslation from "../../hooks/useTranslation";

const CTD = () => {
  const { t } = useTranslation();
  useTitle(t("pages.ctd.title"));

  const { vehicles, loading: vehicleLoading } = useVehicleData();
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const hasInitializedVehicleSelection = useRef(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  useEffect(() => {
    if (vehicleLoading) return;

    if (!vehicles || vehicles.length === 0) {
      setSelectedVehicle(null);
      hasInitializedVehicleSelection.current = false;
      return;
    }

    if (!hasInitializedVehicleSelection.current) {
      setSelectedVehicle(vehicles[0]);
      hasInitializedVehicleSelection.current = true;
      return;
    }

    if (
      selectedVehicle &&
      !vehicles.some((vehicle) => vehicle.id === selectedVehicle.id)
    ) {
      setSelectedVehicle(vehicles[0]);
    }
  }, [vehicleLoading, vehicles, selectedVehicle]);

  // Get CTD data from WebSocket + historical REST API
  const { ctdData, isConnected } = useCTDData(selectedVehicle);

  // Filter data by date/time
  const filteredData = ctdData.filter((data) => {
    if (startDate || endDate || startTime || endTime) {
      const dataTime = new Date(data.timestamp);

      if (startDate && startTime) {
        const startDateTime = new Date(`${startDate}T${startTime}`);
        if (dataTime < startDateTime) return false;
      } else if (startDate) {
        const startDateTime = new Date(startDate);
        if (dataTime < startDateTime) return false;
      }

      if (endDate && endTime) {
        const endDateTime = new Date(`${endDate}T${endTime}`);
        if (dataTime > endDateTime) return false;
      } else if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        if (dataTime > endDateTime) return false;
      }
    }

    return true;
  });

  return (
    <div className="p-4">
      {/* Header with Title and Filters */}
      <div className="flex items-center justify-between mb-4">
        <Title
          title={t("pages.ctd.title")}
          subtitle={t("pages.ctd.subtitle")}
        />

        {/* Filters Section */}
        <div className="flex items-center gap-3">
          {/* Date Range Filter */}
          <div className="flex items-center gap-2">
            {/* Start Date */}
            <DatePickerField
              value={startDate}
              onChange={(date) => {
                setStartDate(date);
                if (endDate && date && new Date(date) > new Date(endDate)) {
                  setEndDate("");
                }
              }}
              placeholder={t("pages.ctd.startDate")}
              maxDate={endDate || new Date().toISOString().split("T")[0]}
              className="w-40"
            />

            {/* Start Time */}
            <TimePickerField
              value={startTime}
              onChange={setStartTime}
              placeholder="00:00"
              className="w-32"
            />

            {/* Separator */}
            <span className="text-gray-500 dark:text-gray-400 text-sm">
              {t("pages.ctd.to")}
            </span>

            {/* End Date */}
            <DatePickerField
              value={endDate}
              onChange={setEndDate}
              placeholder={t("pages.ctd.endDate")}
              minDate={startDate || undefined}
              className="w-40"
            />

            {/* End Time */}
            <TimePickerField
              value={endTime}
              onChange={setEndTime}
              placeholder="23:59"
              className="w-32"
            />
          </div>

          {/* Vehicle Filter */}
          <div className="w-52">
            <VehicleDropdown
              vehicles={vehicles}
              selectedVehicle={selectedVehicle}
              onVehicleChange={setSelectedVehicle}
              placeholder={
                vehicleLoading
                  ? t("pages.ctd.loadingVehicles")
                  : !vehicles || vehicles.length === 0
                    ? t("pages.ctd.noVehicles")
                    : t("pages.ctd.allVehicles")
              }
              className="text-sm"
              disabled={vehicleLoading}
            />
          </div>

          {/* Clear Filters Button */}
          {(selectedVehicle ||
            startDate ||
            endDate ||
            startTime ||
            endTime) && (
            <button
              onClick={() => {
                setSelectedVehicle(null);
                setStartDate("");
                setEndDate("");
                setStartTime("");
                setEndTime("");
              }}
              className="px-3 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 text-sm rounded-xl transition-all flex items-center gap-2 font-medium"
              title={t("pages.ctd.clearAllFilters")}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              {t("pages.ctd.clear")}
            </button>
          )}
        </div>
      </div>

      {/* CTD Visualizations */}
      <div className="space-y-4 mb-4">
        {/* Row 1: Time Series and Depth Profile */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TimeSeriesChart ctdData={filteredData} />
          <DepthProfile ctdData={filteredData} />
        </div>

        {/* Row 2: T-S Diagram and Sound Speed Profile */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TSDiagram ctdData={filteredData} />
          <SoundSpeedProfile ctdData={filteredData} />
        </div>
      </div>

      {/* CTD Table Component */}
      <CTDTable
        ctdData={filteredData}
        loading={false}
        isConnected={isConnected}
      />
    </div>
  );
};

export default CTD;
