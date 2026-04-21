import { useState, useMemo, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import useTitle from "../../../hooks/useTitle";
import useMissionData from "../../../hooks/useMissionData";
import useNotify from "../../../hooks/useNotify";
import { useVehicleData } from "../../../hooks";
import { useLogData } from "../../../hooks/useLogData";
import { LoadingDots } from "../../ui";
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
  const notify = useNotify();
  const [searchParams] = useSearchParams();

  // Mission sidebar toggle (mobile/tablet)
  const [showMissionSidebar, setShowMissionSidebar] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }
    return window.innerWidth >= 1024;
  });

  // Main mission state
  const [homeLocation, setHomeLocation] = useState(null);
  const [isSettingHome, setIsSettingHome] = useState(false);
  const [activeMission, setActiveMission] = useState(null);
  const [showNewMissionModal, setShowNewMissionModal] = useState(false);
  const [showLoadMissionModal, setShowLoadMissionModal] = useState(false);

  // Selected vehicle for this mission
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);

  // Loading states
  const [isCreatingMission, setIsCreatingMission] = useState(false);
  const [isSavingMission, setIsSavingMission] = useState(false);

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
  const hasAutoSetHomeRef = useRef(false);

  // Get vehicle position for auto-home
  const { vehicles } = useVehicleData();
  const { vehicleLogs } = useLogData();

  // Auto-set home location to selected vehicle position when vehicle is selected
  // Only applies when: vehicle just selected, no home set yet (or mission just created)
  useEffect(() => {
    if (!selectedVehicleId) {
      hasAutoSetHomeRef.current = false;
      return;
    }

    // Don't override if home was manually set already
    if (homeLocation && hasAutoSetHomeRef.current) return;

    const vehicleId = parseInt(selectedVehicleId);
    const latestLog =
      vehicleLogs &&
      vehicleLogs
        .filter((l) => l.vehicle_id === vehicleId)
        .reduce((latest, l) =>
          !latest ||
          new Date(l.created_at) > new Date(latest.created_at)
            ? l
            : latest,
        null);

    const vehicle = vehicles.find((v) => v.id === vehicleId);
    const lat = latestLog?.latitude ?? vehicle?.latitude;
    const lng = latestLog?.longitude ?? vehicle?.longitude;

    if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
      setHomeLocation({ lat: parseFloat(lat), lng: parseFloat(lng) });
      hasAutoSetHomeRef.current = true;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVehicleId, vehicles, vehicleLogs]);

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

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setShowMissionSidebar(true);
      } else {
        setShowMissionSidebar(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Helper functions
  const getActualWaypointCount = useCallback((waypointsList) => {
    return waypointsList.filter((wp) => wp.type !== "zone").length;
  }, []);

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
    setIsCreatingMission(true);
    try {
      const newMission = await createMission({
        name: missionData.name,
        description: missionData.description,
        status: "Draft",
        vehicle_id: selectedVehicleId ? parseInt(selectedVehicleId) : null,
        waypoints: [],
        created_by: localStorage.getItem("user_id") || null,
      });

      setActiveMission({
        id: newMission.id,
        name: newMission.name,
        status: newMission.status,
        waypoints: 0,
        description: newMission.description,
        vehicle_id: selectedVehicleId ? parseInt(selectedVehicleId) : null,
      });

      setShowNewMissionModal(false);
      resetMissionState();

      // Show success notification with persistence
      await notify.success("Mission created successfully!", {
        title: "Mission Created",
        action: notify.ACTIONS.MISSION_CREATED,
        vehicleId: selectedVehicleId ? parseInt(selectedVehicleId) : null,
      });
    } catch (error) {
      console.error("Failed to create mission:", error);
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Failed to create mission";

      // Show error notification with persistence
      await notify.error(errorMessage, {
        title: "Mission Creation Failed",
        action: notify.ACTIONS.MISSION_CREATED,
        vehicleId: selectedVehicleId ? parseInt(selectedVehicleId) : null,
      });
    } finally {
      setIsCreatingMission(false);
    }
  };

  const handleSelectMission = async (mission) => {
    // Clear previous mission data first
    setGeneratedPaths([]);
    setWaypoints([]);
    setHomeLocation(null);
    setHasGeneratedWaypoints(false);
    hasAutoSetHomeRef.current = false;

    // Set vehicle if mission has one
    if (mission.vehicle_id) {
      setSelectedVehicleId(mission.vehicle_id.toString());
    }

    // Convert waypoints from database format to application format
    const loadedWaypoints = Array.isArray(mission.waypoints)
      ? mission.waypoints.map((wp, index) => {
          const inferredType =
            wp.type ||
            (wp.shape ||
            wp.bounds ||
            (Array.isArray(wp.vertices) && wp.vertices.length > 0)
              ? "zone"
              : "path");

          return {
            id: Date.now() + index,
            name: wp.name || `WP${index + 1}`,
            type: inferredType,
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
          };
        })
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

    // Show success notification with persistence
    await notify.success(
      `Loaded ${loadedWaypoints.length} waypoints from "${mission.name}"`,
      {
        title: "Mission Loaded",
        action: "mission_loaded",
        vehicleId: selectedVehicleId ? parseInt(selectedVehicleId) : null,
      },
    );
  };

  const handleSaveMission = async () => {
    if (!activeMission || !activeMission.id) {
      await notify.error("No active mission to save", {
        title: "Save Failed",
        persist: true,
      });
      return;
    }

    setIsSavingMission(true);
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

      // Count path waypoints (exclude zone waypoints) + home + RTH
      const pathWaypointCount = waypointData.filter(
        (wp) => wp.type !== "zone",
      ).length;
      const totalWaypoints = pathWaypointCount + (homeLocation ? 2 : 1);

      const updateData = {
        waypoints: waypointData,
        status: activeMission.status || "Draft",
        total_waypoints: totalWaypoints,
        total_distance: missionStats.distance,
        estimated_time: missionStats.time,
      };

      // Include home location if set
      if (homeLocation) {
        updateData.home_location = {
          lat: homeLocation.lat,
          lng: homeLocation.lng,
        };
      }

      await updateMission(activeMission.id, updateData);

      // Show success notification with persistence
      await notify.success("Mission saved successfully!", {
        title: "Mission Saved",
        action: notify.ACTIONS.MISSION_SAVED,
        vehicleId: selectedVehicleId ? parseInt(selectedVehicleId) : null,
      });
    } catch (error) {
      // Show error notification with persistence
      await notify.error(
        error.response?.data?.error || "Failed to save mission",
        {
          title: "Mission Save Failed",
          action: notify.ACTIONS.MISSION_SAVED,
          vehicleId: selectedVehicleId ? parseInt(selectedVehicleId) : null,
        },
      );
    } finally {
      setIsSavingMission(false);
    }
  };

  const resetMissionState = () => {
    setIsSettingHome(false);
    setHasGeneratedWaypoints(false);
    setWaypoints([]);
    setGeneratedPaths([]);
    hasAutoSetHomeRef.current = false;
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
    selectedVehicleId,
    setSelectedVehicleId,

    // Loading states
    isCreatingMission,
    isSavingMission,

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
    showMissionSidebar,
    setShowMissionSidebar,
  };

  return (
    <div className="relative -mx-4 -mt-4 h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Overlay for mobile when sidebar open */}
      {showMissionSidebar && (
        <div
          className="fixed inset-0 z-[10010] bg-black/40 lg:hidden"
          onClick={() => setShowMissionSidebar(false)}
        />
      )}

      <MissionSidebar {...sharedProps} />

      <div
        className={`h-full transition-all duration-300 ${
          showMissionSidebar ? "md:ml-72 ml-0" : "ml-0"
        }`}
      >
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-full bg-white dark:bg-black">
              <LoadingDots size="lg" />
            </div>
          }
        >
          <MissionMap {...sharedProps} />
        </Suspense>

        {!showMissionSidebar && (
          <button
            onClick={() => setShowMissionSidebar(true)}
            className="absolute left-3 top-3 z-[10020] flex items-center justify-center rounded-full border border-gray-200 bg-white p-3 shadow-lg transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-black dark:hover:bg-gray-900 lg:hidden"
            title="Open Mission Panel"
          >
            <svg
              className="h-5 w-5 text-gray-700 dark:text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        )}
      </div>

      <MissionModals {...sharedProps} />
    </div>
  );
};

export default MissionPlanner;
