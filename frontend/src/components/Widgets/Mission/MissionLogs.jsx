import React, { useState, useEffect, useRef, useMemo } from "react";
import { FaShip, FaFilter } from "react-icons/fa";
import { VehicleDropdown, DatePickerField, Dropdown } from "../index";
import useMissionData from "../../../hooks/useMissionData";
import useTranslation from "../../../hooks/useTranslation";

const normalizeStatus = (status) => {
  if (!status) return "";
  const normalized = String(status).toLowerCase();

  if (["ongoing", "active", "running", "in_progress"].includes(normalized)) {
    return "Ongoing";
  }

  if (["completed", "finished", "success"].includes(normalized)) {
    return "Completed";
  }

  if (["failed", "error", "cancelled"].includes(normalized)) {
    return "Failed";
  }

  return status;
};

const MissionLogs = ({
  vehicles = [],
  selectedVessel: propSelectedVessel,
  startDate: propStartDate,
  endDate: propEndDate,
  onVesselChange,
  onStartDateChange,
  onEndDateChange,
}) => {
  const { missionData, loading, formatTimeElapsed, getEnergyStatus } =
    useMissionData();
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [currentPage, setCurrentPage] = useState(1);
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const filterPopoverRef = useRef(null);
  const itemsPerPage = 10;

  const selectedVessel =
    propSelectedVessel !== undefined ? propSelectedVessel : null;
  const startDate = propStartDate !== undefined ? propStartDate : "";
  const endDate = propEndDate !== undefined ? propEndDate : "";

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, selectedVessel, startDate, endDate]);

  // Helper to get vehicle color
  const getVehicleColor = (vehicleId) => {
    if (!vehicleId) return "gray";
    const colors = ["blue", "green", "red", "orange", "purple"];
    return colors[vehicleId % colors.length];
  };

  // Map mission data dari API ke format yang dibutuhkan UI
  const missions = missionData.map((mission) => {
    const vehicleName =
      mission.vehicle?.name || mission.vehicle_name || "Unknown";
    const createdDate = mission.created_at
      ? new Date(mission.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "";

    return {
      id: `MS-${mission.id}`,
      name: mission.name,
      created: createdDate,
      vessel: vehicleName,
      vesselColor: getVehicleColor(mission.vehicle?.id || mission.vehicle_id),
      status: normalizeStatus(mission.status),
      progress:
        normalizeStatus(mission.status) === "Completed"
          ? 100
          : Math.round(mission.progress || 0),
      energy: getEnergyStatus(mission),
      timeElapsed: formatTimeElapsed(mission.time_elapsed || 0),
      rawData: mission,
    };
  });

  const statusCounts = useMemo(() => {
    return missions.reduce(
      (acc, mission) => {
        const status = normalizeStatus(mission.status);
        if (status === "Ongoing") acc.Ongoing += 1;
        if (status === "Completed") acc.Completed += 1;
        if (status === "Failed") acc.Failed += 1;
        return acc;
      },
      {
        Ongoing: 0,
        Completed: 0,
        Failed: 0,
      },
    );
  }, [missions]);

  const statusOptions = useMemo(
    () => [
      { value: "All Status", label: t("missionComponents.logs.allStatus") },
      {
        value: "Ongoing",
        label: `${t("missionComponents.stats.ongoing")} (${statusCounts.Ongoing})`,
      },
      {
        value: "Completed",
        label: `${t("missionComponents.stats.completed")} (${statusCounts.Completed})`,
      },
      {
        value: "Failed",
        label: `${t("missionComponents.stats.failed")} (${statusCounts.Failed})`,
      },
    ],
    [statusCounts, t],
  );

  const getStatusColor = (status) => {
    switch (status) {
      case "Completed":
        return "text-green-500 border-green-500/30";
      case "Ongoing":
        return "text-blue-500 border-blue-500/30";
      case "Failed":
        return "text-red-500 border-red-500/30";
      default:
        return "text-gray-500 border-gray-500/30";
    }
  };

  const getVesselIconColor = (color) => {
    switch (color) {
      case "blue":
        return "text-blue-500";
      case "green":
        return "text-green-500";
      case "red":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  const getProgressColor = (status) => {
    switch (status) {
      case "Completed":
        return "bg-green-500";
      case "Ongoing":
        return "bg-blue-500";
      case "Failed":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const filteredMissions = missions.filter((mission) => {
    // Filter by status
    if (statusFilter !== "All Status" && mission.status !== statusFilter) {
      return false;
    }

    // Filter by vessel
    if (selectedVessel && mission.vessel !== selectedVessel.name) {
      return false;
    }

    // Filter by date range
    if (startDate || endDate) {
      const missionDate = new Date(mission.rawData.created_at);

      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (missionDate < start) {
          return false;
        }
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (missionDate > end) {
          return false;
        }
      }
    }

    return true;
  });

  const totalMissions = filteredMissions.length;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedMissions = filteredMissions.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredMissions.length / itemsPerPage);

  // Click outside tutup filter popover
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        filterPopoverRef.current &&
        !filterPopoverRef.current.contains(e.target)
      ) {
        setFilterPopoverOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const resetAllFilters = () => {
    setStatusFilter("All Status");
    onVesselChange?.(null);
    onStartDateChange?.("");
    onEndDateChange?.("");
    setFilterPopoverOpen(false);
  };

  return (
    <div className="dark:bg-black border border-gray-300 dark:border-slate-600 rounded-xl p-6">
      <div ref={filterPopoverRef}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h3 className="text-xl font-semibold text-black dark:text-white">
            {t("missionComponents.logs.title")}
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2">
              {statusOptions.slice(0, 2).map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setStatusFilter(filter.value)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === filter.value
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            {/* Action Icons */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setFilterPopoverOpen((o) => !o)}
                title={
                  filterPopoverOpen
                    ? t("missionComponents.logs.closeFilter")
                    : t("missionComponents.logs.openFilter")
                }
                className={`p-2 rounded-lg transition-colors ${filterPopoverOpen ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"}`}
              >
                <FaFilter className="text-lg" />
              </button>
            </div>
          </div>
        </div>

        {/* Panel filter di bawah header (bukan overlay) */}
        {filterPopoverOpen && (
          <div className="mb-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  {t("missionComponents.logs.status")}
                </label>
                <Dropdown
                  items={statusOptions}
                  selectedItem={
                    statusOptions.find((o) => o.value === statusFilter) || null
                  }
                  onItemChange={(item) => setStatusFilter(item.value)}
                  placeholder={t("missionComponents.logs.selectStatus")}
                  getItemKey={(item) => item.value}
                  renderItem={(item) => (
                    <span className="text-gray-900 dark:text-white">
                      {item.label}
                    </span>
                  )}
                  renderSelectedItem={(item) => (
                    <span className="font-medium text-gray-900 dark:text-white">
                      {item.label}
                    </span>
                  )}
                  className="text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  {t("missionComponents.logs.vessel")}
                </label>
                <VehicleDropdown
                  vehicles={vehicles}
                  selectedVehicle={selectedVessel}
                  onVehicleChange={(v) => onVesselChange?.(v)}
                  placeholder={t("missionComponents.logs.allVessels")}
                  className="text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  {t("missionComponents.logs.startDate")}
                </label>
                <DatePickerField
                  value={startDate}
                  onChange={(v) => onStartDateChange?.(v)}
                  placeholder="dd/mm/yyyy"
                  maxDate={endDate || undefined}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  {t("missionComponents.logs.endDate")}
                </label>
                <DatePickerField
                  value={endDate}
                  onChange={(v) => onEndDateChange?.(v)}
                  placeholder="dd/mm/yyyy"
                  minDate={startDate || undefined}
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={resetAllFilters}
                className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              >
                {t("missionComponents.logs.resetFilters")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Card List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {t("missionComponents.logs.loading")}
          </div>
        ) : paginatedMissions.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {t("missionComponents.logs.noMissions")}
          </div>
        ) : (
          <div className="overflow-y-auto max-h-150 custom-scrollbar pr-3 space-y-3">
            {paginatedMissions.map((mission, index) => (
              <div
                key={index}
                className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:border-gray-300 dark:hover:border-gray-600 transition-all"
              >
                <div className="grid grid-cols-12 gap-4 items-center">
                  {/* Mission ID & Name */}
                  <div className="col-span-12 md:col-span-3">
                    <div className="text-base font-semibold text-black dark:text-white mb-1">
                      {mission.id}: {mission.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {t("missionComponents.logs.created")} {mission.created}
                    </div>
                  </div>

                  {/* Vessel */}
                  <div className="col-span-6 md:col-span-2">
                    <div className="flex items-center gap-2">
                      <FaShip
                        className={`${getVesselIconColor(mission.vesselColor)} text-lg`}
                      />
                      <span className="text-sm font-medium text-black dark:text-white">
                        {mission.vessel}
                      </span>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="col-span-6 md:col-span-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${getStatusColor(
                        mission.status,
                      )}`}
                    >
                      <span className="w-2 h-2 rounded-full bg-current" />
                      {mission.status}
                    </span>
                  </div>

                  {/* Progress / Energy */}
                  <div className="col-span-12 md:col-span-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-black dark:text-white">
                          {mission.progress}%{" "}
                          {mission.status === "Completed"
                            ? t("missionComponents.logs.complete")
                            : mission.status === "Failed"
                              ? t("missionComponents.logs.progress")
                              : t("missionComponents.logs.complete")}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full transition-all ${getProgressColor(
                            mission.status,
                          )}`}
                          style={{ width: `${mission.progress}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {mission.energy}
                      </div>
                    </div>
                  </div>

                  {/* Time Elapsed */}
                  <div className="col-span-6 md:col-span-2">
                    <div className="text-sm font-medium text-black dark:text-white">
                      {mission.timeElapsed}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {t("missionComponents.logs.showing")}{" "}
          {totalMissions === 0 ? 0 : startIndex + 1}-
          {Math.min(endIndex, filteredMissions.length)}{" "}
          {t("missionComponents.logs.of")} {totalMissions}{" "}
          {t("missionComponents.logs.missions")}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentPage === 1
                ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {t("missionComponents.logs.previous")}
          </button>
          <button
            onClick={() =>
              setCurrentPage((prev) => Math.min(totalPages, prev + 1))
            }
            disabled={currentPage === totalPages}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentPage === totalPages
                ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {t("missionComponents.logs.next")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MissionLogs;
