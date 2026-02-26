import { useState } from "react";
import { createPortal } from "react-dom";
import {
  FaHome,
  FaPlus,
  FaSave,
  FaUpload,
  FaMapMarkerAlt,
  FaRoute,
  FaPlay,
  FaEdit,
  FaTrash,
  FaCog,
} from "react-icons/fa";
import Dropdown from "../Dropdown";
import { ConfirmModal, toast } from "../../ui";
import { useMissionUpload, useVehicleData } from "../../../hooks";
import MissionUploadModal from "./MissionUploadModal";

const MissionSidebar = ({
  isSidebarOpen,
  homeLocation,
  setHomeLocation,
  setIsSettingHome,
  activeMission,
  setActiveMission,
  waypoints,
  setWaypoints,
  setGeneratedPaths,
  planningMode,
  setPlanningMode,
  hasGeneratedWaypoints,
  setHasGeneratedWaypoints,
  isEditingWaypoints,
  setIsEditingWaypoints,
  setEditingWaypoint,
  featureGroupRef,
  missionParams,
  missionStats,
  handleNewMission,
  handleLoadMission,
  handleSaveMission,
  getActualWaypointCount,
  isPointInPolygon,
}) => {
  const [showClearModal, setShowClearModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);

  // Upload hooks
  const {
    uploadState,
    vehicleState,
    checkVehicleReadiness,
    uploadMissionToVehicle,
    resetUploadState,
  } = useMissionUpload();

  const { vehicles } = useVehicleData();

  // Get selected vehicle info
  const selectedVehicle = selectedVehicleId
    ? vehicles.find((v) => v.id === parseInt(selectedVehicleId))
    : null;

  const handleDeleteWaypoint = (waypointId) => {
    const waypointToDelete = waypoints.find((wp) => wp.id === waypointId);
    const updatedWaypoints = waypoints.filter((wp) => wp.id !== waypointId);
    setWaypoints(updatedWaypoints);

    if (waypointToDelete && waypointToDelete.type === "zone") {
      setGeneratedPaths((prev) =>
        prev.filter((path) => path.id !== waypointId),
      );
    }

    if (waypointToDelete && waypointToDelete.type === "path") {
      regeneratePathsFromWaypoints(updatedWaypoints);
    }

    if (activeMission) {
      setActiveMission((prev) => ({
        ...prev,
        waypoints: getActualWaypointCount(updatedWaypoints),
      }));
    }
  };

  const regeneratePathsFromWaypoints = (currentWaypoints) => {
    const pathWaypoints = currentWaypoints.filter((wp) => wp.type === "path");

    if (pathWaypoints.length > 1) {
      const pathCoordinates = pathWaypoints.map((wp) => [wp.lat, wp.lng]);
      setGeneratedPaths((prev) => {
        const otherPaths = prev.filter(
          (path) => path.zoneName !== "Generated Coverage",
        );
        return [
          ...otherPaths,
          {
            id: Date.now(),
            zoneName: "Generated Coverage",
            coordinates: pathCoordinates,
            color: "#018190",
          },
        ];
      });
    } else {
      setGeneratedPaths((prev) =>
        prev.filter((path) => path.zoneName !== "Generated Coverage"),
      );
    }
  };

  const handleToggleEditMode = () => {
    setIsEditingWaypoints(!isEditingWaypoints);
    setEditingWaypoint(null);
  };

  // Handle upload to vehicle button click
  const handleUploadToVehicle = () => {
    if (!activeMission) {
      toast.error("No active mission to upload");
      return;
    }

    if (!activeMission.id) {
      toast.warning("Please save the mission before uploading to vehicle");
      return;
    }

    // Pre-select vehicle if mission already has one
    if (activeMission.vehicle_id) {
      setSelectedVehicleId(activeMission.vehicle_id.toString());
      checkVehicleReadiness(activeMission.vehicle_id);
    } else {
      setSelectedVehicleId(null);
    }

    // Open modal
    setShowUploadModal(true);
  };

  // Handle vehicle selection in modal
  const handleVehicleSelect = async (vehicleId) => {
    setSelectedVehicleId(vehicleId);
    if (vehicleId) {
      await checkVehicleReadiness(parseInt(vehicleId));
    }
  };

  // Confirm upload in modal
  const handleConfirmUpload = async () => {
    if (!activeMission || !activeMission.id || !selectedVehicleId) {
      toast.error("Invalid mission or vehicle");
      return;
    }

    const vehicleId = parseInt(selectedVehicleId);

    // Prepare mission data for upload
    const missionData = {
      name: activeMission.name,
      waypoints: waypoints
        .filter((wp) => wp.type === "path")
        .map((wp) => ({
          lat: wp.lat,
          lng: wp.lng,
          altitude: wp.altitude || 0,
          speed: wp.speed || missionParams.speed,
          radius: wp.radius || missionParams.radius,
        })),
      home_location: homeLocation,
      speed: missionParams.speed,
      altitude: missionParams.altitude || 0,
      radius: missionParams.radius,
    };

    const result = await uploadMissionToVehicle(
      activeMission.id,
      vehicleId,
      missionData,
    );

    if (result.success) {
      toast.success("Mission uploaded successfully to vehicle!");
      setTimeout(() => {
        setShowUploadModal(false);
        resetUploadState();
      }, 2000);
    } else {
      toast.error(result.error || "Failed to upload mission");
    }
  };

  // Handle modal close
  const handleCloseUploadModal = () => {
    if (!uploadState.isUploading) {
      setShowUploadModal(false);
      setSelectedVehicleId(null);
      resetUploadState();
    }
  };

  const handleClearWaypoints = () => {
    setWaypoints([]);
    setGeneratedPaths([]);
    setHasGeneratedWaypoints(false);
    setIsEditingWaypoints(false);
    setEditingWaypoint(null);
    setIsSettingHome(false);

    if (featureGroupRef) {
      featureGroupRef.clearLayers();
    }

    if (activeMission) {
      setActiveMission((prev) => ({
        ...prev,
        waypoints: 0,
      }));
    }
  };

  const handleGenerateWaypoints = () => {
    if (!homeLocation) {
      toast.warning("Please set home location first!");
      return;
    }

    const zoneWaypoints = waypoints.filter((wp) => wp.type === "zone");

    if (zoneWaypoints.length === 0) {
      toast.warning("No zones found! Please create a zone first.");
      return;
    }

    const newPathWaypoints = [];

    zoneWaypoints.forEach((zone) => {
      if (zone.bounds) {
        const { north, south, east, west } = zone.bounds;
        const zoneHeight = north - south;
        const zoneWidth = east - west;

        // const spacing = Math.min(0.0006, Math.max(0.0001, zoneHeight / 8));
        const spacing = Math.min(0.001, Math.max(0.0002, zoneHeight / 6));
        const waypointSpacing = Math.min(
          0.0008,
          Math.max(0.0001, zoneWidth / 10),
        );

        let lineCount = 0;

        for (
          let currentLat = south;
          currentLat <= north;
          currentLat += spacing
        ) {
          const isEvenLine = lineCount % 2 === 0;
          const scanPoints = [];

          const scanResolution = 0.0002;
          for (let lng = west; lng <= east; lng += scanResolution) {
            const point = { lat: currentLat, lng: lng };
            let isInside = false;

            if (zone.shape === "rectangle") {
              isInside = true;
            } else if (zone.shape === "polygon" && zone.vertices) {
              isInside = isPointInPolygon(point, zone.vertices);
            }

            if (isInside) {
              scanPoints.push(point);
            }
          }

          if (scanPoints.length > 0) {
            const segments = [];
            let currentSegment = [scanPoints[0]];

            for (let i = 1; i < scanPoints.length; i++) {
              const prevPoint = scanPoints[i - 1];
              const currentPoint = scanPoints[i];
              const gap = Math.abs(currentPoint.lng - prevPoint.lng);

              if (gap <= scanResolution * 1.5) {
                currentSegment.push(currentPoint);
              } else {
                segments.push(currentSegment);
                currentSegment = [currentPoint];
              }
            }
            segments.push(currentSegment);

            segments.forEach((segment) => {
              if (segment.length > 0) {
                const startPoint = segment[0];
                const endPoint = segment[segment.length - 1];

                // Only add start and end points (edges), no intermediate points
                const pointsToAdd = [startPoint];

                // Only add end point if it's distinct enough from start point
                if (Math.abs(endPoint.lng - startPoint.lng) > 0.00001) {
                  pointsToAdd.push(endPoint);
                }

                pointsToAdd.forEach((pt) => {
                  newPathWaypoints.push({
                    id:
                      Date.now() +
                      newPathWaypoints.length +
                      Math.random() * 1000,
                    type: "path",
                    lat: currentLat,
                    lng: pt.lng,
                    altitude: 0,
                    speed: zone.speed || missionParams.speed,
                    delay: 0,
                    loiter: 0,
                    radius: missionParams.radius,
                    action: "waypoint",
                  });
                });
              }
            });
          }

          lineCount++;
        }
      }
    });

    if (newPathWaypoints.length > 0) {
      const filteredWaypoints = [];
      const minDistance = 0.00005; // Reduced min distance since we only have edge points

      let sortedWaypoints = [];

      // Always sort South to North (Bottom to Top)
      const latGroups = {};
      // Use a slightly larger epsilon for grouping to handle floating point errors
      const latSpacing = 0.0006;

      newPathWaypoints.forEach((wp) => {
        // Group by latitude roughly to handle small variations
        const latKey = Math.round(wp.lat / 0.00001) * 0.00001;
        if (!latGroups[latKey]) {
          latGroups[latKey] = [];
        }
        latGroups[latKey].push(wp);
      });

      // Sort latitudes from South (low) to North (high)
      const latKeys = Object.keys(latGroups)
        .map((k) => parseFloat(k))
        .sort((a, b) => a - b);

      sortedWaypoints = [];
      latKeys.forEach((latKey, lineIndex) => {
        const lineWaypoints = latGroups[latKey];
        const isEvenLine = lineIndex % 2 === 0;

        // Zigzag pattern:
        // Even lines: West -> East (Left -> Right)
        // Odd lines: East -> West (Right -> Left)
        if (isEvenLine) {
          lineWaypoints.sort((a, b) => a.lng - b.lng);
        } else {
          lineWaypoints.sort((a, b) => b.lng - a.lng);
        }

        sortedWaypoints.push(...lineWaypoints);
      });

      sortedWaypoints.forEach((waypoint, index) => {
        if (index === 0) {
          filteredWaypoints.push(waypoint);
        } else {
          const lastAdded = filteredWaypoints[filteredWaypoints.length - 1];
          const distance = Math.sqrt(
            Math.pow(waypoint.lat - lastAdded.lat, 2) +
              Math.pow(waypoint.lng - lastAdded.lng, 2),
          );

          if (distance >= minDistance) {
            filteredWaypoints.push(waypoint);
          }
        }
      });

      const finalWaypoints = [];
      if (homeLocation) {
        const homeWaypoint = {
          id: Date.now() + Math.random() * 1000,
          type: "path",
          lat: homeLocation.lat,
          lng: homeLocation.lng,
          altitude: 0,
          speed: missionParams.speed,
          delay: 0,
          loiter: 0,
          radius: missionParams.radius,
          action: "waypoint",
        };
        finalWaypoints.push(homeWaypoint);
      }

      finalWaypoints.push(...filteredWaypoints);

      setWaypoints((prev) => {
        const newWaypoints = [...prev, ...finalWaypoints];
        return newWaypoints;
      });

      if (finalWaypoints.length > 0) {
        const pathCoordinates = finalWaypoints.map((wp) => [wp.lat, wp.lng]);
        const newPath = {
          id: Date.now(),
          zoneName: "Generated Coverage",
          coordinates: pathCoordinates,
          color: "#018190",
        };

        setGeneratedPaths((prev) => [...prev, newPath]);
      }

      if (activeMission) {
        setActiveMission((prev) => ({
          ...prev,
          waypoints: getActualWaypointCount([...waypoints, ...finalWaypoints]),
        }));
      }

      setHasGeneratedWaypoints(true);
    }
  };

  return (
    <aside
      className={`fixed top-14 z-30 h-[calc(100vh-3.5rem)] w-72 bg-white border-r border-gray-200 dark:border-gray-700 duration-300 dark:bg-black p-4 overflow-y-auto scrollbar-hide ${
        isSidebarOpen ? "md:left-64 left-16" : "left-16"
      }`}
    >
      {/* Mission Header */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-3">
          Mission Planner
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handleNewMission}
            className="flex-1 px-3 py-2 bg-blue-600 hover:bg-white hover:text-blue-600 text-white text-sm rounded-xl transition-all flex items-center justify-center gap-2 font-semibold cursor-pointer border border-slate-300"
          >
            <FaPlus size={12} />
            New Mission
          </button>
          <button
            onClick={handleLoadMission}
            className="px-3 py-2 bg-white hover:bg-gray-50 dark:bg-black dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-xl transition-all border border-gray-200 dark:border-slate-600"
          >
            Load
          </button>
        </div>
      </div>

      {/* Mission Info */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Mission Info
        </h3>
        <div className="bg-white dark:bg-black p-4 rounded-2xl border border-gray-200 dark:border-slate-600 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Name
            </span>
            <span className="text-sm font-medium text-gray-800 dark:text-white">
              {activeMission ? activeMission.name : "--"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Status
            </span>
            {activeMission ? (
              <span
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                  isEditingWaypoints
                    ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                    : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                }`}
              >
                <FaEdit size={10} className="mr-1" />
                {isEditingWaypoints
                  ? "Editing Waypoints"
                  : activeMission.status}
              </span>
            ) : (
              <span className="text-sm font-medium text-gray-800 dark:text-white">
                --
              </span>
            )}
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Waypoints
            </span>
            <span className="text-sm font-medium text-gray-800 dark:text-white flex items-center gap-1">
              <FaMapMarkerAlt size={10} className="text-[#018190]" />
              {activeMission
                ? `${activeMission.waypoints || 0} points`
                : "-- points"}
            </span>
          </div>

          {/* Mission Statistics */}
          {activeMission && (
            <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-600">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <FaRoute size={10} className="text-[#018190]" />
                    Total Distance
                  </span>
                  <span className="text-sm font-medium text-gray-800 dark:text-white">
                    {missionStats.distanceFormatted || "-- km"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <FaPlay size={10} className="text-[#018190]" />
                    Est. Time
                  </span>
                  <span className="text-sm font-medium text-gray-800 dark:text-white">
                    {missionStats.timeFormatted || "-- min"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <FaCog size={10} className="text-[#018190]" />
                    Battery Usage
                  </span>
                  <span className="text-sm font-medium text-gray-800 dark:text-white">
                    {missionStats.battery}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Edit Mode Instructions */}
        {isEditingWaypoints && (
          <div className="mt-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <FaEdit
                className="text-orange-600 dark:text-orange-400"
                size={12}
              />
              <span className="text-xs font-semibold text-orange-700 dark:text-orange-300">
                Edit Mode Active
              </span>
            </div>
            <div className="text-xs text-orange-600 dark:text-orange-400 space-y-1">
              <div>• Drag markers to move waypoints</div>
              <div>• Click marker popup to edit parameters</div>
              <div>• Click "Finish Editing" when done</div>
            </div>
          </div>
        )}
      </div>

      {/* Home Location */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Home Location
        </h3>
        {homeLocation ? (
          <div className="bg-white dark:bg-black p-4 rounded-2xl border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FaHome
                  className="text-green-600 dark:text-green-400"
                  size={12}
                />
                <span className="text-xs font-medium text-green-600 dark:text-green-400">
                  Location Set
                </span>
              </div>
              <button
                onClick={() => {
                  setHomeLocation(null);
                  setIsSettingHome(false);
                }}
                className="text-xs px-2 py-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                title="Clear home location"
              >
                <FaTrash size={10} />
              </button>
            </div>
            <div className="text-sm font-mono text-green-800 dark:text-green-200">
              {homeLocation.lat.toFixed(6)}, {homeLocation.lng.toFixed(6)}
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-black p-4 rounded-2xl border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 mb-2">
              <FaHome className="text-red-600 dark:text-red-400" size={12} />
              <span className="text-xs font-medium text-red-600 dark:text-red-400">
                Not Set
              </span>
            </div>
            <div className="text-sm text-red-700 dark:text-red-300">
              Click <FaHome className="inline text-[#018190]" size={12} /> then
              click on map
            </div>
          </div>
        )}
      </div>

      {/* Waypoints List */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Waypoints
          </h3>
          {activeMission && (
            <div className="w-40">
              <Dropdown
                items={[
                  { id: "path", name: "Path Planning", icon: "route" },
                  { id: "zone", name: "Zone Planning", icon: "square" },
                ]}
                selectedItem={planningMode}
                onItemChange={(item) => setPlanningMode(item.id)}
                getItemKey={(item) => item.id}
                renderSelectedItem={(item) => (
                  <span className="font-medium text-sm">{item.name}</span>
                )}
                renderItem={(item, isSelected) => (
                  <>
                    <div className="flex-1">
                      <div className="text-gray-900 dark:text-white font-medium text-sm">
                        {item.name}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="text-blue-600 dark:text-white">
                        <svg
                          className="w-4 h-4"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </>
                )}
                className={`${
                  !homeLocation ||
                  hasGeneratedWaypoints ||
                  waypoints.some((wp) => wp.type === "path")
                    ? "opacity-50 pointer-events-none"
                    : ""
                }`}
              />
            </div>
          )}
        </div>
        <div className="space-y-2 max-h-50 overflow-y-auto scrollbar-hide">
          {waypoints.filter((wp) => wp.type !== "zone").length > 0 ? (
            waypoints
              .filter((wp) => wp.type !== "zone")
              .map((waypoint) => (
                <div
                  key={waypoint.id}
                  className="bg-white dark:bg-black p-3 rounded-2xl border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-800 dark:text-white flex items-center gap-2">
                      <FaRoute className="text-[#018190]" size={12} />
                      WP
                      {waypoints
                        .filter((wp) => wp.type === "path")
                        .indexOf(waypoint) + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Alt: {waypoint.altitude}m
                      </span>
                      <button
                        onClick={() => handleDeleteWaypoint(waypoint.id)}
                        className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        title="Delete waypoint"
                      >
                        <FaTrash size={10} />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs font-mono text-gray-600 dark:text-gray-300">
                    {waypoint.lat.toFixed(6)}, {waypoint.lng.toFixed(6)}
                  </div>
                  <div className="flex justify-between items-center mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>Speed: {waypoint.speed}m/s</span>
                    <span>Radius: {waypoint.radius}m</span>
                  </div>
                </div>
              ))
          ) : (
            <div className="bg-white dark:bg-black p-4 rounded-2xl border border-gray-200 dark:border-slate-600">
              <div className="text-center py-6">
                <FaMapMarkerAlt
                  className="mx-auto text-gray-400 dark:text-gray-600 mb-3"
                  size={32}
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  No waypoints added
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {!activeMission
                    ? "Create or load a mission first"
                    : !homeLocation
                      ? "Set home location first before planning"
                      : hasGeneratedWaypoints ||
                          waypoints.some((wp) => wp.type === "path")
                        ? "Waypoints generated. Drawing tools disabled. Use 'Clear All Waypoints' to restart planning."
                        : `Draw ${
                            planningMode === "path"
                              ? "polyline for route"
                              : "polygon/rectangle for area"
                          } on map`}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3 pb-6">
        {/* Generate Waypoints button */}
        {activeMission && waypoints.some((wp) => wp.type === "zone") && (
          <button
            onClick={handleGenerateWaypoints}
            disabled={
              !homeLocation ||
              hasGeneratedWaypoints ||
              waypoints.some((wp) => wp.type === "path")
            }
            className={`w-full px-3 py-2 text-sm rounded-xl transition-colors flex items-center justify-center gap-2 ${
              !homeLocation ||
              hasGeneratedWaypoints ||
              waypoints.some((wp) => wp.type === "path")
                ? "bg-gray-400 dark:bg-gray-700 text-gray-600 dark:text-gray-500 cursor-not-allowed"
                : "bg-[#018190] hover:bg-[#016570] text-white"
            }`}
          >
            <FaCog size={12} />
            {!homeLocation
              ? "Set Home Location First"
              : hasGeneratedWaypoints ||
                  waypoints.some((wp) => wp.type === "path")
                ? "Waypoints Generated"
                : "Generate Waypoints"}
          </button>
        )}

        {/* Edit Waypoints Toggle */}
        {activeMission && waypoints.some((wp) => wp.type === "path") && (
          <button
            onClick={handleToggleEditMode}
            className={`w-full px-3 py-2 text-sm rounded-xl transition-colors flex items-center justify-center gap-2 ${
              isEditingWaypoints
                ? "bg-orange-600 hover:bg-orange-700 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            <FaEdit size={12} />
            {isEditingWaypoints ? "Finish Editing" : "Edit Waypoints"}
          </button>
        )}

        {/* Clear All Waypoints */}
        {activeMission &&
          (hasGeneratedWaypoints ||
            waypoints.some((wp) => wp.type === "path")) && (
            <button
              onClick={() => setShowClearModal(true)}
              className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <FaTrash size={12} />
              Clear All Waypoints
            </button>
          )}

        <button
          disabled={!activeMission}
          onClick={handleSaveMission}
          className={`w-full px-3 py-2 text-sm rounded-xl transition-colors flex items-center justify-center gap-2 ${
            activeMission
              ? "bg-green-600 hover:bg-green-700 text-white"
              : "bg-gray-400 dark:bg-gray-700 text-gray-600 dark:text-gray-500 cursor-not-allowed"
          }`}
        >
          <FaSave size={12} />
          Save Mission
        </button>
        <button
          onClick={handleUploadToVehicle}
          disabled={!activeMission || !activeMission.id}
          className={`w-full px-3 py-2 text-sm rounded-xl transition-colors flex items-center justify-center gap-2 ${
            activeMission && activeMission.id
              ? "bg-orange-600 hover:bg-orange-700 text-white"
              : "bg-gray-400 dark:bg-gray-700 text-gray-600 dark:text-gray-500 cursor-not-allowed"
          }`}
          title={
            !activeMission
              ? "No active mission"
              : !activeMission.id
                ? "Save mission first"
                : "Upload mission to vehicle"
          }
        >
          <FaUpload size={12} />
          Upload to Vehicle
        </button>
      </div>

      {/* Clear Waypoints Confirmation Modal - Using Portal to render outside */}
      {createPortal(
        <ConfirmModal
          isOpen={showClearModal}
          onClose={() => setShowClearModal(false)}
          onConfirm={() => {
            handleClearWaypoints();
            setShowClearModal(false);
          }}
          title="Clear All Waypoints"
          message="Are you sure you want to clear all waypoints? This will allow you to start planning again."
          confirmText="Clear"
          cancelText="Cancel"
          type="danger"
        />,
        document.body,
      )}

      {/* Mission Upload Modal */}
      <MissionUploadModal
        isOpen={showUploadModal}
        onClose={handleCloseUploadModal}
        onConfirm={handleConfirmUpload}
        missionData={{
          name: activeMission?.name,
          waypoints: waypoints.filter((wp) => wp.type === "path"),
          home_location: homeLocation,
        }}
        vehicleState={vehicleState}
        uploadState={uploadState}
        vehicleInfo={selectedVehicle}
        vehicles={vehicles}
        selectedVehicleId={selectedVehicleId}
        onVehicleSelect={handleVehicleSelect}
      />
    </aside>
  );
};

export default MissionSidebar;
