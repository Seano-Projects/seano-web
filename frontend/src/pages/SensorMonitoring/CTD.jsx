import React, { useState } from "react";
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

const CTD = () => {
  useTitle("CTD Monitoring");

  const { vehicles, loading: vehicleLoading } = useVehicleData();
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  // Get CTD data from WebSocket
  const { ctdData, isConnected } = useCTDData(selectedVehicle?.code);

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
        <Title title="CTD Monitoring" subtitle="Real-time CTD Sensor Data" />

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
              placeholder="Start Date"
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
            <span className="text-gray-500 dark:text-gray-400 text-sm">to</span>

            {/* End Date */}
            <DatePickerField
              value={endDate}
              onChange={setEndDate}
              placeholder="End Date"
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
                  ? "Loading vehicles..."
                  : !vehicles || vehicles.length === 0
                    ? "No vehicles available"
                    : "All Vehicles"
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
              title="Clear all filters"
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
              Clear
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
