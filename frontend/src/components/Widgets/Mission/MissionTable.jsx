import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import useMissionData from "../../../hooks/useMissionData";
import { DataTable, ConfirmModal } from "../../ui";
import DataCard from "../DataCard";
import { FaEdit, FaTrash } from "react-icons/fa";

const MissionTable = () => {
  const { missionData, loading, formatTimeElapsed, deleteMission } =
    useMissionData();
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState("All");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedMission, setSelectedMission] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
      progress: `${Math.round(mission.progress || 0)}%`,
      progressValue: mission.progress || 0,
      energy: energyStatus,
      energyConsumed: mission.energy_consumed || 0,
      energyBudget: mission.energy_budget || 0,
      duration: formatTimeElapsed(mission.time_elapsed || 0),
      timeElapsed: mission.time_elapsed || 0,
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

  // Define columns for DataTable
  const columns = [
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
          {row.vehicle}
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
    {
      header: "Actions",
      accessorKey: "actions",
      className: "text-center w-32",
      cellClassName: "text-center whitespace-nowrap",
      sortable: false,
      cell: (row) => (
        <div className="flex items-center justify-center gap-3 w-full h-full">
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
    },
  ];

  // Get unique statuses for filter buttons
  const statuses = ["All", "Draft", "Ongoing", "Completed", "Failed"];

  return (
    <DataCard title="Mission Details">
      {/* Status Filter Buttons */}
      <div className="mb-4 flex gap-2">
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
