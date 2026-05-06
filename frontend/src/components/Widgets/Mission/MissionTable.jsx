import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import useMissionData from "../../../hooks/useMissionData";
import useTranslation from "../../../hooks/useTranslation";
import { ColumnToggle, DataTable, ConfirmModal } from "../../ui";
import DataCard from "../DataCard";
import { FaEdit, FaEye, FaTrash } from "react-icons/fa";
import { formatDistance, formatTime } from "../../../utils/missionCalculations";

const ALL_COLUMN_KEYS = [
  "name",
  "status",
  "vehicle",
  "waypoints",
  "progress",
  "energy",
  "totalDistance",
  "estimatedTime",
  "duration",
  "created",
];

const DEFAULT_VISIBLE = new Set([
  "name",
  "status",
  "vehicle",
  "waypoints",
  "created",
]);

const COLUMN_LABEL_KEYS = {
  name: "missionComponents.table.colName",
  status: "missionComponents.table.colStatus",
  vehicle: "missionComponents.table.colVehicle",
  waypoints: "missionComponents.table.colWaypoints",
  progress: "missionComponents.table.colProgress",
  energy: "missionComponents.table.colEnergy",
  totalDistance: "missionComponents.table.colDistance",
  estimatedTime: "missionComponents.table.colEstTime",
  duration: "missionComponents.table.colDuration",
  created: "missionComponents.table.colCreated",
};

const MAX_COLUMNS = 5;

const MissionTable = () => {
  const { missionData, loading, formatTimeElapsed, deleteMission } =
    useMissionData();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState("All");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedMission, setSelectedMission] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState(DEFAULT_VISIBLE);

  const toggleColumn = (key) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size === 1) return prev;
        next.delete(key);
      } else {
        if (next.size >= MAX_COLUMNS) return prev;
        next.add(key);
      }
      return next;
    });
  };

  // Handle delete mission
  const handleDeleteClick = (mission) => {
    setSelectedMission(mission);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedMission) return;

    setIsDeleting(true);
    try {
      await deleteMission(selectedMission.id);
      setShowDeleteModal(false);
      setSelectedMission(null);
    } catch (error) {
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setSelectedMission(null);
  };

  // Handle edit mission
  const handleEditClick = (mission) => {
    navigate(`/mission-planner?edit=${mission.id}`);
  };

  const handleViewClick = (mission) => {
    navigate(`/missions/${mission.id}`);
  };

  // Get status badge color
  const getStatusBadge = (status) => {
    const statusClasses = {
      Completed:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      Ongoing: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      Failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      Draft: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
    };

    return (
      <span
        className={`px-4 py-1 text-xs font-medium rounded-full ${
          statusClasses[status] || statusClasses.Draft
        }`}
      >
        {status}
      </span>
    );
  };

  // Transform mission data for table
  const transformedData = missionData.map((mission) => {
    const waypointCount = mission.waypoints?.length || 0;
    const completedWaypoints = mission.completed_waypoint || 0;

    // For completed missions, freeze waypoint display at time of completion
    const displayWaypointTotal =
      mission.status === "Completed" ? completedWaypoints : waypointCount;

    // Progress: for completed use stored progress, otherwise calculate
    const progressValue =
      mission.status === "Completed"
        ? Math.round(mission.progress || 100)
        : displayWaypointTotal > 0
          ? Math.min(
              100,
              Math.round((completedWaypoints / displayWaypointTotal) * 100),
            )
          : Math.round(mission.progress || 0);
    const energyStatus = mission.energy_budget
      ? `${(mission.energy_consumed || 0).toFixed(1)}/${mission.energy_budget.toFixed(1)} kWh`
      : "N/A";

    return {
      id: mission.id,
      name: mission.name,
      status: mission.status,
      vehicle: mission.vehicle?.name || "N/A",
      waypoints: `${completedWaypoints}/${displayWaypointTotal}`,
      waypointCount,
      completedWaypoints,
      progress: `${progressValue}%`,
      progressValue,
      energy: energyStatus,
      energyConsumed: mission.energy_consumed || 0,
      energyBudget: mission.energy_budget || 0,
      duration: formatTimeElapsed(mission.time_elapsed || 0),
      timeElapsed: mission.time_elapsed || 0,
      totalDistance: mission.total_distance || 0,
      estimatedTime: mission.estimated_time || 0,
      created: new Date(mission.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      createdAt: mission.created_at,
    };
  });

  // Filter data by status
  const filteredData =
    filterStatus === "All"
      ? transformedData
      : transformedData.filter((m) => m.status === filterStatus);

  // Define all columns for DataTable
  const allColumns = [
    {
      header: t("missionComponents.table.colName"),
      accessorKey: "name",
      cell: (row) => (
        <div className="font-medium text-gray-900 dark:text-white">
          {row.name}
        </div>
      ),
    },
    {
      header: t("missionComponents.table.colStatus"),
      accessorKey: "status",
      cell: (row) => getStatusBadge(row.status),
    },
    {
      header: t("missionComponents.table.colVehicle"),
      accessorKey: "vehicle",
      cell: (row) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {typeof row.vehicle === "string"
            ? row.vehicle
            : row.vehicle?.name || row.vehicle?.code || "N/A"}
        </span>
      ),
    },
    {
      header: t("missionComponents.table.colWaypoints"),
      accessorKey: "waypoints",
      className: "text-right",
      cellClassName: "text-right",
      cell: (row) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {row.waypoints}
        </span>
      ),
    },
    {
      header: t("missionComponents.table.colProgress"),
      accessorKey: "progress",
      className: "text-right",
      cellClassName: "text-right",
      cell: (row) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {row.progress}
        </span>
      ),
    },
    {
      header: t("missionComponents.table.colEnergy"),
      accessorKey: "energy",
      className: "text-right",
      cellClassName: "text-right",
      cell: (row) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {row.energy}
        </span>
      ),
    },
    {
      header: t("missionComponents.table.colDistance"),
      accessorKey: "totalDistance",
      className: "text-right",
      cellClassName: "text-right",
      cell: (row) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {row.totalDistance > 0 ? formatDistance(row.totalDistance) : "—"}
        </span>
      ),
    },
    {
      header: t("missionComponents.table.colEstTime"),
      accessorKey: "estimatedTime",
      className: "text-right",
      cellClassName: "text-right",
      cell: (row) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {row.estimatedTime > 0 ? formatTime(row.estimatedTime) : "—"}
        </span>
      ),
    },
    {
      header: t("missionComponents.table.colDuration"),
      accessorKey: "duration",
      className: "text-right",
      cellClassName: "text-right",
      cell: (row) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {row.duration}
        </span>
      ),
    },
    {
      header: t("missionComponents.table.colCreated"),
      accessorKey: "created",
      cell: (row) => (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {row.created}
        </span>
      ),
    },
  ];

  const actionsColumn = {
    header: t("missionComponents.table.colActions"),
    accessorKey: "actions",
    className: "text-center w-32",
    cellClassName: "text-center whitespace-nowrap",
    sortable: false,
    cell: (row) => {
      const isCompleted = row.status === "Completed";
      return (
        <div className="flex items-center justify-center gap-3 w-full h-full">
          <button
            onClick={() => handleViewClick(row)}
            className="inline-flex items-center justify-center p-2 text-white bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600 transition-all rounded-lg cursor-pointer shadow-sm hover:shadow-md"
            title="View Mission Details"
          >
            <FaEye size={16} />
          </button>
          <button
            onClick={() => !isCompleted && handleEditClick(row)}
            disabled={isCompleted}
            className={`inline-flex items-center justify-center p-2 text-white transition-all rounded-lg shadow-sm ${
              isCompleted
                ? "bg-gray-400 dark:bg-gray-600 cursor-not-allowed opacity-50"
                : "bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 cursor-pointer hover:shadow-md"
            }`}
            title={
              isCompleted
                ? "Completed missions cannot be edited"
                : "Edit Mission"
            }
          >
            <FaEdit size={16} />
          </button>
          <button
            onClick={() => handleDeleteClick(row)}
            className="inline-flex items-center justify-center p-2 text-white bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 transition-all rounded-lg cursor-pointer shadow-sm hover:shadow-md"
            title="Delete Mission"
          >
            <FaTrash size={16} />
          </button>
        </div>
      );
    },
  };

  const columns = [
    ...allColumns.filter((col) => visibleKeys.has(col.accessorKey)),
    actionsColumn,
  ];

  // Get unique statuses for filter buttons
  const statuses = [
    { key: "All", label: t("missionComponents.table.all") },
    { key: "Draft", label: t("missionComponents.table.draft") },
    { key: "Ongoing", label: t("missionComponents.table.ongoing") },
    { key: "Completed", label: t("missionComponents.table.completed") },
    { key: "Failed", label: t("missionComponents.table.failed") },
  ];

  const columnToggle = (
    <ColumnToggle
      allKeys={ALL_COLUMN_KEYS}
      labels={Object.fromEntries(
        ALL_COLUMN_KEYS.map((k) => [k, t(COLUMN_LABEL_KEYS[k])]),
      )}
      visibleKeys={visibleKeys}
      onToggle={toggleColumn}
      onReset={() => setVisibleKeys(new Set(DEFAULT_VISIBLE))}
      maxColumns={MAX_COLUMNS}
      title={t("missionComponents.table.toggleColumns")}
      resetLabel={t("missionComponents.table.reset")}
      maxLabel={t("missionComponents.table.maxColumnsReached").replace(
        "{{max}}",
        MAX_COLUMNS,
      )}
    />
  );

  return (
    <DataCard
      title={t("missionComponents.table.title")}
      headerExtra={columnToggle}
    >
      {/* Status Filter Buttons */}
      <div className="mb-4 flex flex-wrap gap-2">
        {statuses.map((s) => (
          <button
            key={s.key}
            onClick={() => setFilterStatus(s.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === s.key
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={filteredData}
        searchPlaceholder={t("missionComponents.table.searchPlaceholder")}
        searchKeys={["name", "vehicle", "status"]}
        pageSize={10}
        showPagination={true}
        emptyMessage={t("missionComponents.table.noMissions")}
        loading={loading}
        skeletonRows={5}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title={t("missionComponents.table.deleteTitle")}
        message={
          selectedMission
            ? t("missionComponents.table.deleteConfirm").replace(
                "{{name}}",
                selectedMission.name,
              )
            : t("missionComponents.table.deleteConfirmGeneric")
        }
        confirmText={t("missionComponents.table.delete")}
        cancelText={t("missionComponents.table.cancel")}
        type="danger"
        isLoading={isDeleting}
      />
    </DataCard>
  );
};

export default MissionTable;
