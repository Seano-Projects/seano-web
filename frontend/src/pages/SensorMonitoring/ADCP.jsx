import React, { useState, useMemo } from "react";
import { HeadingIndicator } from "react-flight-indicators";
import useTitle from "../../hooks/useTitle";
import { Title } from "../../components/ui";
import { WidgetCard } from "../../components/Widgets";
import {
  VehicleDropdown,
  DatePickerField,
  TimePickerField,
} from "../../components/Widgets";
import {
  ADCPMap,
  ADCPTable,
  BeamVelocityBars,
  CurrentRose,
  SpeedDirectionChart,
  BeamVelocityChart,
} from "../../components/Widgets/SensorMonitoring";
import { useVehicleData, useADCPData } from "../../hooks";
import useTranslation from "../../hooks/useTranslation";
import {
  FaWater, FaCompass, FaArrowDown, FaThermometerHalf,
} from "react-icons/fa";

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

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const { adcpData, isConnected } = useADCPData(selectedVehicle);

  const filteredData = useMemo(() => {
    if (!startDate && !endDate && !startTime && !endTime) return adcpData;
    return adcpData.filter((d) => {
      const dt = new Date(d.timestamp);
      if (startDate) {
        const from = new Date(startTime ? `${startDate}T${startTime}` : startDate);
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

  const latest = useMemo(() => {
    if (!filteredData.length) return null;
    return [...filteredData].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
    )[0];
  }, [filteredData]);

  const hasFilters = selectedVehicle || startDate || endDate || startTime || endTime;

  const speedColor = (v) => {
    if (v == null) return undefined;
    if (v < 0.1) return "#22c55e";
    if (v < 0.5) return "#eab308";
    return "#ef4444";
  };

  const statCards = [
    {
      title: "Kecepatan Arus",
      value: latest?.current_speed_ms != null
        ? `${Number(latest.current_speed_ms).toFixed(3)} m/s`
        : "—",
      icon: <FaWater className="text-blue-500 text-lg" />,
      iconBgColor: "bg-blue-100 dark:bg-blue-900/30",
      trendText: "Current speed terkini",
    },
    {
      title: "Arah Arus",
      value: latest?.current_direction_deg != null
        ? `${Number(latest.current_direction_deg).toFixed(1)}°`
        : "—",
      icon: <FaCompass className="text-cyan-500 text-lg" />,
      iconBgColor: "bg-cyan-100 dark:bg-cyan-900/30",
      trendText: "Arah relatif terhadap utara",
    },
    {
      title: "Kedalaman Air",
      value: latest?.water_depth_m != null
        ? `${Number(latest.water_depth_m).toFixed(1)} m`
        : "—",
      icon: <FaArrowDown className="text-indigo-500 text-lg" />,
      iconBgColor: "bg-indigo-100 dark:bg-indigo-900/30",
      trendText: "Bottom tracking depth",
    },
    {
      title: "Suhu Air",
      value: latest?.temperature_c != null
        ? `${Number(latest.temperature_c).toFixed(2)} °C`
        : "—",
      icon: <FaThermometerHalf className="text-orange-500 text-lg" />,
      iconBgColor: "bg-orange-100 dark:bg-orange-900/30",
      trendText: "Temperatur permukaan",
    },
  ];

  return (
    <div className="w-full max-w-full overflow-x-hidden p-4">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <div className="flex items-center gap-3">
          <Title title={t("pages.adcp.title")} subtitle={t("pages.adcp.subtitle")} />
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 2xl:w-auto 2xl:justify-end">
          <div className="flex w-full flex-wrap items-center gap-2 2xl:w-auto">
            <DatePickerField
              value={startDate}
              onChange={(date) => { setStartDate(date); if (endDate && date && new Date(date) > new Date(endDate)) setEndDate(""); }}
              placeholder={t("pages.adcp.startDate")}
              maxDate={endDate || new Date().toISOString().split("T")[0]}
              className="w-36"
            />
            <TimePickerField value={startTime} onChange={setStartTime} placeholder="00:00" className="w-28" />
            <span className="text-gray-500 dark:text-gray-400 text-sm">{t("pages.adcp.to")}</span>
            <DatePickerField
              value={endDate}
              onChange={setEndDate}
              placeholder={t("pages.adcp.endDate")}
              minDate={startDate || undefined}
              className="w-36"
            />
            <TimePickerField value={endTime} onChange={setEndTime} placeholder="23:59" className="w-28" />
          </div>

          <div className="w-full sm:w-48">
            <VehicleDropdown
              vehicles={vehicles}
              selectedVehicle={selectedVehicle}
              onVehicleChange={(v) => setSelectedVehicleId(v?.id)}
              placeholder={
                vehicleLoading ? t("pages.adcp.loadingVehicles")
                  : !vehicles?.length ? t("pages.adcp.noVehicles")
                  : t("pages.adcp.allVehicles")
              }
              className="text-sm"
              disabled={vehicleLoading}
            />
          </div>

          {hasFilters && (
            <button
              onClick={() => { setSelectedVehicleId(null); setStartDate(""); setEndDate(""); setStartTime(""); setEndTime(""); }}
              className="shrink-0 px-3 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 text-sm rounded-xl transition-all flex items-center gap-2 font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              {t("pages.adcp.clear")}
            </button>
          )}
        </div>
      </div>

      {/* Row 1: 4 stat cards */}
      <div className="mb-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <WidgetCard key={card.title} {...card} />
        ))}
      </div>

      {/* Row 2: Compass (heading) + Current Rose */}
      <div className="mb-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Heading compass */}
        <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl p-6 flex flex-col">
          <h3 className="text-xl font-semibold text-black dark:text-white">Heading USV</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">
            Arah hadap kendaraan · {latest?.heading_deg != null ? `${Number(latest.heading_deg).toFixed(1)}°` : "—"}
          </p>
          <div className="flex flex-col items-center gap-4 flex-1 justify-center">
            <HeadingIndicator
              size={280}
              heading={latest?.heading_deg ?? 0}
              showBox={false}
            />
            <div className="flex gap-6 text-sm">
              <div className="text-center">
                <p className="text-gray-400 text-xs">Ensemble</p>
                <p className="font-semibold text-gray-900 dark:text-white">{latest?.ensemble_no ?? "—"}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-400 text-xs">GPS</p>
                <p className={`font-semibold ${latest?.gps_ok === true ? "text-green-500" : latest?.gps_ok === false ? "text-red-500" : "text-gray-400"}`}>
                  {latest?.gps_ok === true ? "OK" : latest?.gps_ok === false ? "No Fix" : "—"}
                </p>
              </div>
              <div className="text-center">
                <p className="text-gray-400 text-xs">Posisi</p>
                <p className="font-semibold text-gray-900 dark:text-white text-xs">
                  {latest?.latitude != null ? `${Number(latest.latitude).toFixed(4)}, ${Number(latest.longitude).toFixed(4)}` : "—"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Current Rose */}
        <CurrentRose adcpData={filteredData} />
      </div>

      {/* Row 3: Speed+Direction chart | Beam velocity history */}
      <div className="mb-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SpeedDirectionChart adcpData={filteredData} />
        <BeamVelocityChart adcpData={filteredData} />
      </div>

      {/* Row 4: Map + Beam velocity bars */}
      <div className="mb-4 grid grid-cols-1 lg:grid-cols-3 gap-4 lg:items-stretch">
        <div className="lg:col-span-2">
          <ADCPMap adcpData={filteredData} />
        </div>
        <div className="flex flex-col gap-4">
          <BeamVelocityBars
            v1={latest?.v1_ms ?? null}
            v2={latest?.v2_ms ?? null}
            v3={latest?.v3_ms ?? null}
            v4={latest?.v4_ms ?? null}
          />
          <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {t("pages.adcp.latestReading")}
            </h3>
            {[
              {
                label: t("pages.adcp.heading"),
                value: latest?.heading_deg != null ? `${Number(latest.heading_deg).toFixed(1)}°` : "—",
              },
              {
                label: t("pages.adcp.ensembleNo"),
                value: latest?.ensemble_no ?? "—",
              },
              {
                label: t("pages.adcp.temperature"),
                value: latest?.temperature_c != null ? `${Number(latest.temperature_c).toFixed(2)} °C` : "—",
              },
              {
                label: "GPS",
                value: latest?.gps_ok === true ? "✓ OK" : latest?.gps_ok === false ? "✗ No Fix" : "—",
              },
              {
                label: t("pages.adcp.position"),
                value: latest?.latitude != null && latest?.longitude != null
                  ? `${Number(latest.latitude).toFixed(5)}, ${Number(latest.longitude).toFixed(5)}`
                  : "—",
              },
              {
                label: t("pages.adcp.totalRecords"),
                value: filteredData.length,
              },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center text-sm">
                <span className="text-gray-500 dark:text-gray-400">{label}</span>
                <span className="font-medium text-gray-900 dark:text-white">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 5: Table */}
      <ADCPTable adcpData={filteredData} />
    </div>
  );
};

export default ADCP;
