import { useState, useMemo, useEffect, useRef, lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import useTitle from "../../../hooks/useTitle";
import useMissionData from "../../../hooks/useMissionData";
import { toast, LoadingDots } from "../../ui";
import {
  calculateTotalDistance,
  calculateEstimatedTime,
  calculateBatteryUsage,
  formatDistance,
  formatTime,
} from "../../../utils/missionCalculations";
import MissionSidebar from "./MissionSidebar";
import MissionModals from "./MissionModals";

// Lazy load MissionMap karena library Leaflet sangat berat
const MissionMap = lazy(() => import("./MissionMap"));

const MissionPlanner = ({ isSidebarOpen, darkMode }) => {
  useTitle("Missions");
  const { createMission, updateMission, missionData } = useMissionData();
  const [searchParams] = useSearchParams();

  // Main mission state
  const [homeLocation, setHomeLocation] = useState(null);
  const [isSettingHome, setIsSettingHome] = useState(false);
  const [activeMission, setActiveMission] = useState(null);
  const [showNewMissionModal, setShowNewMissionModal] = useState(false);
  const [showLoadMissionModal, setShowLoadMissionModal] = useState(false);

  // Waypoints state
  const [waypoints, setWaypoints] = useState([]);
  const [generatedPaths, setGeneratedPaths] = useState([]);
  const [planningMode, setPlanningMode] = useState("path");
  const [hasGeneratedWaypoints, setHasGeneratedWaypoints] = useState(false);

  // Edit waypoints state
  const [isEditingWaypoints, setIsEditingWaypoints] = useState(false);
  const [editingWaypoint, setEditingWaypoint] = useState(null);

  // FeatureGroup ref for programmatic layer management
  const [featureGroupRef, setFeatureGroupRef] = useState(null);
  const hasLoadedMissionRef = useRef(false);

  // Mission Parameters state
  const [missionParams, setMissionParams] = useState({
    speed: 2.5,
    delay: 0,
    loiter: 10,
    radius: 2,
    action: "waypoint",
  });

  // Calculate mission statistics in real-time
  const missionStats = useMemo(() => {
    const distanceMeters = calculateTotalDistance(waypoints, homeLocation);
    const timeMinutes = calculateEstimatedTime(
      distanceMeters,
      missionParams.speed,
    );
    const batteryPercent = calculateBatteryUsage(timeMinutes);

    return {
      distance: distanceMeters,
      distanceFormatted: formatDistance(distanceMeters),
      time: timeMinutes,
      timeFormatted: formatTime(timeMinutes),
      battery: Math.round(batteryPercent),
    };
  }, [waypoints, homeLocation, missionParams.speed]);

  // Auto-load mission from URL parameter
  useEffect(() => {
    const editMissionId = searchParams.get("edit");
    if (
      editMissionId &&
      missionData.length > 0 &&
      !hasLoadedMissionRef.current
    ) {
      const missionToEdit = missionData.find(
        (m) => m.id === parseInt(editMissionId),
      );
      if (missionToEdit) {
        hasLoadedMissionRef.current = true;
        handleSelectMission(missionToEdit);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, missionData]);

  // Helper functions
  const getActualWaypointCount = (waypointsList) => {
    return waypointsList.filter((wp) => wp.type !== "zone").length;
  };

  const isPointInPolygon = (point, vertices) => {
    const x = point.lng,
      y = point.lat;
    let inside = false;

    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
      const xi = vertices[i].lng,
        yi = vertices[i].lat;
      const xj = vertices[j].lng,
        yj = vertices[j].lat;

      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
    return inside;
  };

  // Mission handlers
  const handleNewMission = () => {
    setShowNewMissionModal(true);
  };

  const handleLoadMission = () => {
    setShowLoadMissionModal(true);
  };

  const handleCreateMission = async (missionData) => {
    try {
      const newMission = await createMission({
        name: missionData.name,
        description: missionData.description,
        status: "Draft",
        vehicle_id: null, // Will be assigned later
        waypoints: [],
        created_by: localStorage.getItem("user_id") || null,
      });

      setActiveMission({
        id: newMission.id,
        name: newMission.name,
        status: newMission.status,
        waypoints: 0,
        description: newMission.description,
      });

      setShowNewMissionModal(false);
      resetMissionState();
      toast.success("Mission created successfully!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create mission");
    }
  };

  const handleSelectMission = (mission) => {

    // Clear previous mission data first
    setGeneratedPaths([]);
    setWaypoints([]);
    setHomeLocation(null);
    setHasGeneratedWaypoints(false);

    // Convert waypoints from database format to application format
    const loadedWaypoints = Array.isArray(mission.waypoints)
      ? mission.waypoints.map((wp, index) => ({
          id: Date.now() + index,
          name: wp.name || `WP${index + 1}`,
          type: wp.type || "path",
          shape: wp.shape,
          lat: wp.lat,
          lng: wp.lng,
          altitude: wp.altitude || 0,
          speed: wp.speed || missionParams.speed,
          delay: wp.delay || missionParams.delay,
          loiter: wp.loiter || missionParams.loiter,
          radius: wp.radius || missionParams.radius,
          action: wp.action || missionParams.action,
          // Preserve zone/polygon data
          bounds: wp.bounds,
          vertices: wp.vertices,
          pattern: wp.pattern,
          coverage: wp.coverage,
          overlap: wp.overlap,
        }))
      : [];

    // Restore home location if exists
    if (mission.home_location) {
      setHomeLocation({
        lat: mission.home_location.lat,
        lng: mission.home_location.lng,
      });
    } else {
    }

    setWaypoints(loadedWaypoints);
    setHasGeneratedWaypoints(loadedWaypoints.length > 0);
    setActiveMission({
      ...mission,
      waypoints: loadedWaypoints.length,
    });
    setShowLoadMissionModal(false);

    toast.success(
      `Loaded ${loadedWaypoints.length} waypoints from "${mission.name}"`,
    );
  };

  const handleSaveMission = async () => {
    if (!activeMission || !activeMission.id) {
      toast.error("No active mission to save");
      return;
    }

    try {

      // Convert waypoints to save format, preserving zone/polygon data
      const waypointData = waypoints
        .filter((wp) => {
          // Exclude home location (if coordinates match)
          if (
            homeLocation &&
            Math.abs(wp.lat - homeLocation.lat) < 0.000001 &&
            Math.abs(wp.lng - homeLocation.lng) < 0.000001
          ) {
            return false;
          }
          return true;
        })
        .map((wp) => {
          const baseData = {
            name: wp.name,
            type: wp.type,
            lat: wp.lat,
            lng: wp.lng,
            altitude: wp.altitude,
            speed: wp.speed,
            delay: wp.delay,
            loiter: wp.loiter,
            radius: wp.radius,
            action: wp.action,
          };

          // Include zone/polygon specific data
          if (wp.type === "zone" && wp.shape) {
            return {
              ...baseData,
              shape: wp.shape,
              bounds: wp.bounds,
              vertices: wp.vertices,
              pattern: wp.pattern,
              coverage: wp.coverage,
              overlap: wp.overlap,
            };
          }

          return baseData;
        });


      const updateData = {
        waypoints: waypointData,
        status: activeMission.status || "Draft",
      };

      // Include home location if set
      if (homeLocation) {
        updateData.home_location = {
          lat: homeLocation.lat,
          lng: homeLocation.lng,
        };
      }

      await updateMission(activeMission.id, updateData);

      toast.success("Mission saved successfully!");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to save mission");
    }
  };

  const resetMissionState = () => {
    setIsSettingHome(false);
    setHasGeneratedWaypoints(false);
    setWaypoints([]);
    setGeneratedPaths([]);
    if (featureGroupRef) {
      featureGroupRef.clearLayers();
    }
  };

  // Shared props for child components
  const sharedProps = {
    // State
    homeLocation,
    setHomeLocation,
    isSettingHome,
    setIsSettingHome,
    activeMission,
    setActiveMission,
    waypoints,
    setWaypoints,
    generatedPaths,
    setGeneratedPaths,
    planningMode,
    setPlanningMode,
    hasGeneratedWaypoints,
    setHasGeneratedWaypoints,
    isEditingWaypoints,
    setIsEditingWaypoints,
    editingWaypoint,
    setEditingWaypoint,
    featureGroupRef,
    setFeatureGroupRef,
    missionParams,
    setMissionParams,

    // Mission statistics
    missionStats,

    // Modals
    showNewMissionModal,
    setShowNewMissionModal,
    showLoadMissionModal,
    setShowLoadMissionModal,

    // Handlers
    handleNewMission,
    handleLoadMission,
    handleCreateMission,
    handleSelectMission,
    handleSaveMission,

    // Helper functions
    getActualWaypointCount,
    isPointInPolygon,

    // UI props
    isSidebarOpen,
    darkMode,
  };

  return (
    <div className="-mt-4 -mr-4 h-[calc(100vh-3.5rem)] overflow-hidden">
      <MissionSidebar {...sharedProps} />

      <div className={`${isSidebarOpen ? "md:ml-68" : "ml-68"} h-full`}>
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-full bg-white dark:bg-black">
              <LoadingDots size="lg" />
            </div>
          }
        >
          <MissionMap {...sharedProps} />
        </Suspense>
      </div>

      <MissionModals {...sharedProps} />
    </div>
  );
};

export default MissionPlanner;
