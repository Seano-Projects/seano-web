import React, { useEffect, useRef, useState, useMemo } from "react";
import useTitle from "../../hooks/useTitle";
import { Title } from "../../components/ui";
import {
  VehicleDropdown,
  DatePickerField,
  TimePickerField,
} from "../../components/Widgets";
import {
  CurrentSpeedGauge,
  CurrentDirectionCompass,
  WaterDepthDisplay,
  SpeedTimeChart,
  TemperatureChart,
  BeamVelocityBars,
  ADCPMap,
  ADCPTable,
} from "../../components/Widgets/SensorMonitoring";
import { useVehicleData, useADCPData } from "../../hooks";
import useTranslation from "../../hooks/useTranslation";

const ADCP = () => {
  const { t } = useTranslation();
  useTitle(t("pages.adcp.title"));

  const {
    vehicles,
    loading: vehicleLoading,
    selectedVehicleId,
    setSelectedVehicleId,
  } = useVehicleData();
  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === selectedVehicleId) ?? null,
    [vehicles, selectedVehicleId],
  );
  const hasInitialized = useRef(false);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const { adcpData, isConnected } = useADCPData(selectedVehicle);

  // Filter by date/time
  const filteredData = useMemo(() => {
    if (!startDate && !endDate && !startTime && !endTime) return adcpData;
    return adcpData.filter((d) => {
      const dt = new Date(d.timestamp);
      if (startDate) {
        const from = new Date(
          startTime ? `${startDate}T${startTime}` : startDate,
        );
        if (!startTime) from.setHours(0, 0, 0, 0);
        if (dt < from) return false;
      }
      if (endDate) {
        const to = new Date(endTime ? `${endDate}T${endTime}` : endDate);
        if (!endTime) to.setHours(23, 59, 59, 999);
        if (dt > to) return false;
      }
      return true;
    });
  }, [adcpData, startDate, endDate, startTime, endTime]);

  // Latest reading
  const latest = useMemo(() => {
    if (!filteredData.length) return null;
    return [...filteredData].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
    )[0];
  }, [filteredData]);

  const hasFilters =
    selectedVehicle || startDate || endDate || startTime || endTime;

  return (
    <div className="w-full max-w-full overflow-x-hidden p-4">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <div className="flex items-center gap-3">
          <Title
            title={t("pages.adcp.title")}
            subtitle={t("pages.adcp.subtitle")}
          />
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
              isConnected
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isConnected ? "bg-green-500 animate-pulse" : "bg-gray-400"
              }`}
            />
            {isConnected ? t("pages.adcp.live") : t("pages.adcp.offline")}
          </span>
        </div>

        {/* Filters */}
        <div className="flex w-full flex-wrap items-center gap-2 2xl:w-auto 2xl:justify-end">
          <div className="flex w-full flex-wrap items-center gap-2 2xl:w-auto">
            <DatePickerField
              value={startDate}
              onChange={(date) => {
                setStartDate(date);
                if (endDate && date && new Date(date) > new Date(endDate))
                  setEndDate("");
              }}
              placeholder={t("pages.adcp.startDate")}
              maxDate={endDate || new Date().toISOString().split("T")[0]}
              className="w-36"
            />
            <TimePickerField
              value={startTime}
              onChange={setStartTime}
              placeholder="00:00"
              className="w-28"
            />
            <span className="text-gray-500 dark:text-gray-400 text-sm">
              {t("pages.adcp.to")}
            </span>
            <DatePickerField
              value={endDate}
              onChange={setEndDate}
              placeholder={t("pages.adcp.endDate")}
              minDate={startDate || undefined}
              className="w-36"
            />
            <TimePickerField
              value={endTime}
              onChange={setEndTime}
              placeholder="23:59"
              className="w-28"
            />
          </div>

          <div className="w-full sm:w-48">
            <VehicleDropdown
              vehicles={vehicles}
              selectedVehicle={selectedVehicle}
              onVehicleChange={(v) => setSelectedVehicleId(v?.id)}
              placeholder={
                vehicleLoading
                  ? t("pages.adcp.loadingVehicles")
                  : !vehicles || vehicles.length === 0
                    ? t("pages.adcp.noVehicles")
                    : t("pages.adcp.allVehicles")
              }
              className="text-sm"
              disabled={vehicleLoading}
            />
          </div>

          {hasFilters && (
            <button
              onClick={() => {
                setSelectedVehicleId(null);
                setStartDate("");
                setEndDate("");
                setStartTime("");
                setEndTime("");
              }}
              className="shrink-0 px-3 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 text-sm rounded-xl transition-all flex items-center gap-2 font-medium"
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
              {t("pages.adcp.clear")}
            </button>
          )}
        </div>
      </div>

      {/* Stats row: Speed | Compass | Depth */}
      <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <CurrentSpeedGauge value={latest?.current_speed_ms ?? null} />
        <CurrentDirectionCompass
          directionDeg={latest?.current_direction_deg ?? null}
          speedMs={latest?.current_speed_ms ?? null}
        />
        <WaterDepthDisplay depthM={latest?.water_depth_m ?? null} />
      </div>

      {/* Charts row: Speed history | Temperature history */}
      <div className="mb-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SpeedTimeChart adcpData={filteredData} />
        <TemperatureChart adcpData={filteredData} />
      </div>

      {/* Map + Side panel */}
      <div className="mb-4 grid grid-cols-1 lg:grid-cols-3 gap-4 lg:items-stretch">
        <div className="lg:col-span-2 lg:h-full">
          <ADCPMap adcpData={filteredData} />
        </div>
        <div className="flex flex-col gap-4">
          <BeamVelocityBars
            v1={latest?.v1_ms ?? null}
            v2={latest?.v2_ms ?? null}
            v3={latest?.v3_ms ?? null}
            v4={latest?.v4_ms ?? null}
          />
          {/* Quick stats */}
          <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {t("pages.adcp.latestReading")}
            </h3>
            {[
              {
                label: t("pages.adcp.heading"),
                value:
                  latest?.heading_deg != null
                    ? `${Number(latest.heading_deg).toFixed(1)}°`
                    : "—",
              },
              {
                label: t("pages.adcp.ensembleNo"),
                value: latest?.ensemble_no ?? "—",
              },
              {
                label: t("pages.adcp.temperature"),
                value:
                  latest?.temperature_c != null
                    ? `${Number(latest.temperature_c).toFixed(2)} °C`
                    : "—",
              },
              {
                label: "GPS",
                value:
                  latest?.gps_ok === true
                    ? "✓ OK"
                    : latest?.gps_ok === false
                      ? "✗ No Fix"
                      : "—",
              },
              {
                label: t("pages.adcp.position"),
                value:
                  latest?.latitude != null && latest?.longitude != null
                    ? `${Number(latest.latitude).toFixed(5)}, ${Number(latest.longitude).toFixed(5)}`
                    : "—",
              },
              {
                label: t("pages.adcp.totalRecords"),
                value: filteredData.length,
              },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex justify-between items-center text-sm"
              >
                <span className="text-gray-500 dark:text-gray-400">
                  {label}
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Data Table */}
      <ADCPTable adcpData={filteredData} />
    </div>
  );
};

export default ADCP;
