import React from "react";
import { VehicleDropdown, Dropdown, DatePickerField } from "../index";
import useTranslation from "../../../hooks/useTranslation";

const DATE_RANGE_OPTIONS = [
  { id: "all", name: "All Time" },
  { id: "today", name: "Today" },
  { id: "week", name: "This Week" },
  { id: "month", name: "This Month" },
  { id: "quarter", name: "This Quarter" },
];

const DATA_SCOPE_OPTIONS = [
  { id: "all", name: "All Data" },
  { id: "mission", name: "Mission Data" },
  { id: "telemetry", name: "Telemetry Data" },
];

const SENSOR_TYPE_OPTIONS = [
  { id: "all", name: "All Sensor Types" },
  { id: "ctd", name: "CTD" },
  { id: "adcp", name: "ADCP (Coming Soon)" },
  { id: "sbes", name: "SBES (Coming Soon)" },
  { id: "mbes", name: "MBES (Coming Soon)" },
];

const getMissionStatusColor = (status) => {
  switch (String(status || "").toLowerCase()) {
    case "ongoing":
    case "active":
      return "bg-green-500";
    case "completed":
      return "bg-blue-500";
    case "failed":
      return "bg-red-500";
    default:
      return "bg-gray-500";
  }
};

const DataFilters = ({
  vehicles = [],
  missions = [],
  filters = {},
  selectedDataType = "vehicle_logs",
  onFilterChange = () => {},
  onResetFilters = () => {},
  hasActiveFilters = false,
  totalRecords = 0,
}) => {
  const { t } = useTranslation();

  const allMissionOption = {
    id: "all",
    name: t("pages.data.filters.allMission"),
    status: "all",
  };
  const missionItems = [allMissionOption, ...missions];

  const selectedMission =
    filters.mission && filters.mission.id
      ? missionItems.find((mission) => mission.id === filters.mission.id)
      : allMissionOption;

  const dateRangeOptionsLocalized = DATE_RANGE_OPTIONS.map((item) => ({
    ...item,
    name: t(`pages.data.filters.dateRange.${item.id}`),
  }));

  const dataScopeOptionsLocalized = DATA_SCOPE_OPTIONS.map((item) => ({
    ...item,
    name: t(`pages.data.filters.dataScope.${item.id}`),
  }));

  const sensorTypeOptionsLocalized = SENSOR_TYPE_OPTIONS.map((item) => ({
    ...item,
    name: t(`pages.data.filters.sensorType.${item.id}`),
  }));

  const selectedDateRangeLocalized =
    dateRangeOptionsLocalized.find(
      (item) => item.id === (filters.dateRange || "all"),
    ) || dateRangeOptionsLocalized[0];

  const selectedDataScopeLocalized =
    dataScopeOptionsLocalized.find(
      (item) => item.id === (filters.dataScope || "all"),
    ) || dataScopeOptionsLocalized[0];

  const selectedSensorTypeLocalized =
    sensorTypeOptionsLocalized.find(
      (item) => item.id === (filters.sensorType || "all"),
    ) || sensorTypeOptionsLocalized[0];

  return (
    <div className="bg-white dark:bg-transparent border border-gray-300 dark:border-slate-600 rounded-xl p-6">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t("pages.data.filters.title")}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {totalRecords > 0
                ? t("pages.data.filters.recordsLoaded").replace(
                    "{{count}}",
                    totalRecords,
                  )
                : t("pages.data.filters.noRecordsLoaded")}
            </p>
          </div>
          <button
            onClick={onResetFilters}
            className="px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors border border-blue-200 dark:border-blue-600"
          >
            {t("pages.data.filters.resetAll")}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("pages.data.filters.vehicle")}
            </label>
            <VehicleDropdown
              vehicles={vehicles}
              selectedVehicle={filters.vehicle || null}
              onVehicleChange={(vehicle) =>
                onFilterChange("vehicle", vehicle || null)
              }
              placeholder={t("pages.data.filters.allVehicle")}
              className="text-sm"
            />
          </div>

          {selectedDataType !== "battery_logs" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("pages.data.filters.mission")}
              </label>
              <Dropdown
                items={missionItems}
                selectedItem={selectedMission}
                onItemChange={(mission) =>
                  onFilterChange(
                    "mission",
                    mission.id === "all" ? null : mission,
                  )
                }
                getItemKey={(mission) => mission.id}
                renderSelectedItem={(mission) => (
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${getMissionStatusColor(
                        mission.status,
                      )}`}
                    />
                    <span className="font-medium text-gray-900 dark:text-white">
                      {mission.name}
                    </span>
                  </div>
                )}
                renderItem={(mission) => (
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${getMissionStatusColor(
                        mission.status,
                      )}`}
                    />
                    <span className="font-medium text-gray-900 dark:text-white">
                      {mission.name}
                    </span>
                  </div>
                )}
                className="text-sm"
              />
            </div>
          )}

          {selectedDataType !== "battery_logs" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("pages.data.filters.dataScopeTitle")}
              </label>
              <Dropdown
                items={dataScopeOptionsLocalized}
                selectedItem={selectedDataScopeLocalized}
                onItemChange={(item) => onFilterChange("dataScope", item.id)}
                getItemKey={(item) => item.id}
                className="text-sm"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("pages.data.filters.dateRangeTitle")}
            </label>
            <Dropdown
              items={dateRangeOptionsLocalized}
              selectedItem={selectedDateRangeLocalized}
              onItemChange={(item) => onFilterChange("dateRange", item.id)}
              getItemKey={(item) => item.id}
              className="text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("pages.data.filters.startDate")}
            </label>
            <DatePickerField
              value={filters.startDate || ""}
              onChange={(value) => onFilterChange("startDate", value)}
              placeholder={t("pages.data.filters.startDate")}
              maxDate={filters.endDate || undefined}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("pages.data.filters.endDate")}
            </label>
            <DatePickerField
              value={filters.endDate || ""}
              onChange={(value) => onFilterChange("endDate", value)}
              placeholder={t("pages.data.filters.endDate")}
              minDate={filters.startDate || undefined}
              className="w-full"
            />
          </div>

          {selectedDataType === "sensor_logs" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("pages.data.filters.sensorTypeTitle")}
              </label>
              <Dropdown
                items={sensorTypeOptionsLocalized}
                selectedItem={selectedSensorTypeLocalized}
                onItemChange={(item) => onFilterChange("sensorType", item.id)}
                getItemKey={(item) => item.id}
                className="text-sm"
              />
            </div>
          )}
        </div>

        {hasActiveFilters && (
          <div className="pt-2 text-sm text-gray-600 dark:text-gray-400">
            {t("pages.data.filters.active")}
          </div>
        )}
      </div>
    </div>
  );
};

export default DataFilters;
