import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useMissionData from "../../../hooks/useMissionData";
import { DataTable, ConfirmModal } from "../../ui";
import DataCard from "../DataCard";
import { FaColumns, FaEdit, FaEye, FaTrash } from "react-icons/fa";
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

const COLUMN_LABELS = {
  name: "Mission Name",
  status: "Status",
  vehicle: "Vehicle",
  waypoints: "Waypoints",
  progress: "Progress",
  energy: "Energy",
  totalDistance: "Distance",
  estimatedTime: "Est. Time",
  duration: "Duration",
  created: "Created",
};

const MAX_COLUMNS = 5;

const MissionTable = () => {
  const { missionData, loading, formatTimeElapsed, deleteMission } =
    useMissionData();
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState("All");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedMission, setSelectedMission] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState(DEFAULT_VISIBLE);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    const totalWaypoints = mission.total_waypoints || 0;

    // Progress: use total_waypoints (incl. home + RTH) when available, otherwise fallback to stored progress
    const progressValue =
      totalWaypoints > 0
        ? Math.min(100, Math.round((completedWaypoints / totalWaypoints) * 100))
        : Math.round(mission.progress || 0);
    const energyStatus = mission.energy_budget
      ? `${(mission.energy_consumed || 0).toFixed(1)}/${mission.energy_budget.toFixed(1)} kWh`
      : "N/A";

    return {
      id: mission.id,
      name: mission.name,
      status: mission.status,
      vehicle: mission.vehicle?.name || "N/A",
      waypoints: `${completedWaypoints}/${waypointCount}`,
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
      header: "Mission Name",
      accessorKey: "name",
      cell: (row) => (
        <div className="font-medium text-gray-900 dark:text-white">
          {row.name}
        </div>
      ),
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (row) => getStatusBadge(row.status),
    },
    {
      header: "Vehicle",
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
      header: "Waypoints",
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
      header: "Progress",
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
      header: "Energy",
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
      header: "Distance",
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
      header: "Est. Time",
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
      header: "Duration",
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
      header: "Created",
      accessorKey: "created",
      cell: (row) => (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {row.created}
        </span>
      ),
    },
  ];

  const actionsColumn = {
    header: "Actions",
    accessorKey: "actions",
    className: "text-center w-32",
    cellClassName: "text-center whitespace-nowrap",
    sortable: false,
    cell: (row) => (
      <div className="flex items-center justify-center gap-3 w-full h-full">
        <button
          onClick={() => handleViewClick(row)}
          className="inline-flex items-center justify-center p-2 text-white bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600 transition-all rounded-lg cursor-pointer shadow-sm hover:shadow-md"
          title="View Mission Details"
        >
          <FaEye size={16} />
        </button>
        <button
          onClick={() => handleEditClick(row)}
          className="inline-flex items-center justify-center p-2 text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-all rounded-lg cursor-pointer shadow-sm hover:shadow-md"
          title="Edit Mission"
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
    ),
  };

  const columns = [
    ...allColumns.filter((col) => visibleKeys.has(col.accessorKey)),
    actionsColumn,
  ];

  // Get unique statuses for filter buttons
  const statuses = ["All", "Draft", "Ongoing", "Completed", "Failed"];

  const columnToggle = (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setDropdownOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-transparent px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 transition hover:bg-gray-50 dark:hover:bg-slate-700"
      >
        <FaColumns className="text-gray-500 dark:text-gray-400" />
        Columns
        <span
          className={`ml-1 rounded-full px-1.5 py-0.5 text-xs font-semibold ${
            visibleKeys.size >= MAX_COLUMNS
              ? "bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300"
              : "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
          }`}
        >
          {visibleKeys.size}/{MAX_COLUMNS}
        </span>
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-lg">
          <div className="border-b border-gray-200 dark:border-slate-600 px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Toggle Columns
              </span>
              <button
                type="button"
                onClick={() => setVisibleKeys(new Set(DEFAULT_VISIBLE))}
                className="text-xs text-gray-500 dark:text-gray-400 hover:underline"
              >
                Reset
              </button>
            </div>
            {visibleKeys.size >= MAX_COLUMNS && (
              <p className="mt-1 text-xs text-orange-600 dark:text-orange-400">
                Maksimum {MAX_COLUMNS} kolom tercapai
              </p>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto py-1">
            {ALL_COLUMN_KEYS.map((key) => {
              const isChecked = visibleKeys.has(key);
              const isDisabled = !isChecked && visibleKeys.size >= MAX_COLUMNS;
              return (
                <label
                  key={key}
                  className={`flex items-center gap-3 px-3 py-2 text-sm ${
                    isDisabled
                      ? "cursor-not-allowed opacity-40"
                      : "cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700"
                  } text-gray-700 dark:text-gray-200`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={isDisabled}
                    onChange={() => toggleColumn(key)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
                  />
                  {COLUMN_LABELS[key]}
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <DataCard title="Mission Details" headerExtra={columnToggle}>
      {/* Status Filter Buttons */}
      <div className="mb-4 flex flex-wrap gap-2">
        {statuses.map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === status
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={filteredData}
        searchPlaceholder="Search missions by name, vehicle, or status..."
        searchKeys={["name", "vehicle", "status"]}
        pageSize={10}
        showPagination={true}
        emptyMessage="No missions found."
        loading={loading}
        skeletonRows={5}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Mission"
        message={
          selectedMission
            ? `Are you sure you want to delete mission "${selectedMission.name}"? This action cannot be undone.`
            : "Are you sure you want to delete this mission?"
        }
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        isLoading={isDeleting}
      />
    </DataCard>
  );
};

export default MissionTable;
