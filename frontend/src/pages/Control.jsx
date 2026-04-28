import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import axios from "axios";
import useTitle from "../hooks/useTitle";
import useTranslation from "../hooks/useTranslation";
import useControlCommand from "../hooks/useControlCommand";
import useVehicleData from "../hooks/useVehicleData";
import { useLogData } from "../hooks/useLogData";
import useMissionData from "../hooks/useMissionData";
import { API_BASE_URL } from "../config";
import { toast } from "../components/ui";
import {
  ControlMapLayer,
  VesselTelemetryPanel,
  SearchPanel,
  ThrustControlPanel,
  MissionControlPanel,
  CameraPanel,
} from "../components/Widgets/Control";

const MAP_CENTER = [45.4215, -75.6972];
const MAP_ZOOM = 14;

const normalizeStreamName = (rawValue = "") => {
  const normalized = rawValue
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(new RegExp("\\/+", "g"), "/")
    .replace(/^\/+|\/+$/g, "");
  if (!normalized) return "";
  if (normalized.startsWith("live/")) return normalized;
  return `live/${normalized}`;
};

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const buildIdentifierSet = (values) =>
  new Set(values.map(normalizeText).filter(Boolean));

const getVehicleIdentifiers = (vehicle) => {
  if (!vehicle) return new Set();
  return buildIdentifierSet([
    vehicle.code,
    vehicle.vehicle_code,
    vehicle.registration_code,
    vehicle.vehicle_name,
    vehicle.name,
  ]);
};

const getMissionIdentifiers = (mission) => {
  if (!mission) return new Set();
  const missionVehicle = mission.vehicle;
  return buildIdentifierSet([
    mission.vehicle_code,
    mission.vehicle_name,
    mission.vehicleCode,
    typeof missionVehicle === "string" ? missionVehicle : null,
    missionVehicle?.code,
    missionVehicle?.name,
  ]);
};

const isMissionForVehicle = (mission, vehicle) => {
  if (!mission || !vehicle) return false;
  const missionVehicleId =
    mission.vehicle_id || mission.vehicle?.id || mission.vehicleId;
  if (missionVehicleId != null && vehicle?.id != null) {
    if (String(missionVehicleId) === String(vehicle.id)) {
      return true;
    }
  }
  const vehicleIdentifiers = getVehicleIdentifiers(vehicle);
  const missionIdentifiers = getMissionIdentifiers(mission);
  for (const id of missionIdentifiers) {
    if (vehicleIdentifiers.has(id)) {
      return true;
    }
  }
  return false;
};

const isActiveMissionStatus = (status) => {
  const normalized = normalizeText(status);
  return ["ongoing", "active", "running", "in_progress"].includes(normalized);
};

const inferWaypointType = (waypoint) => {
  if (!waypoint) return "path";
  if (waypoint.type) return waypoint.type;
  return waypoint.shape || waypoint.bounds || Array.isArray(waypoint.vertices)
    ? "zone"
    : "path";
};

const toNumberOrNull = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toLatLng = (lat, lng) => {
  const latNum = toNumberOrNull(lat);
  const lngNum = toNumberOrNull(lng);
  if (latNum == null || lngNum == null) return null;
  if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
    return null;
  }
  return [latNum, lngNum];
};

const toRadians = (value) => (value * Math.PI) / 180;

const calculateDistanceMeters = (pointA, pointB) => {
  if (
    !Array.isArray(pointA) ||
    !Array.isArray(pointB) ||
    pointA.length < 2 ||
    pointB.length < 2
  ) {
    return null;
  }

  const [lat1, lon1] = pointA.map(Number);
  const [lat2, lon2] = pointB.map(Number);

  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lon1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lon2)
  ) {
    return null;
  }

  const earthRadius = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadius * c;
};

const getMissionSortTime = (mission) => {
  const timeValue =
    mission?.updated_at ||
    mission?.last_update_time ||
    mission?.created_at ||
    0;
  const time = new Date(timeValue).getTime();
  return Number.isFinite(time) ? time : 0;
};

const Control = () => {
  const { t } = useTranslation();
  useTitle(t("nav.control"));
  const {
    sendCommand,
    sendThruster,
    isLoading: commandLoading,
  } = useControlCommand();
  const { vehicles } = useVehicleData();
  const { vehicleLogs } = useLogData({
    enableStats: false,
    enableChartData: false,
    enableSensorLogs: false,
    enableRawLogs: false,
    enableCommandLogs: false,
    enableWaypointLogs: false,
    enableBatteryData: false,
  });
  const { missionData, getActiveMissions } = useMissionData();
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const hasInitializedVehicleSelection = useRef(false);
  const [activeMode, setActiveMode] = useState("MANUAL");
  const [thrusterThrottle, setThrusterThrottle] = useState(0);
  const [thrusterSteering, setThrusterSteering] = useState(0);
  const [isArmed, setIsArmed] = useState(false);
  const lastThrusterSendRef = useRef(0);
  const pendingThrusterRef = useRef(null);
  const latestThrottleRef = useRef(0);
  const latestSteeringRef = useRef(0);

  // Latest log fetched directly from API when vehicle changes (initial state)
  const [fetchedVehicleLog, setFetchedVehicleLog] = useState(null);
  useEffect(() => {
    if (!selectedVehicle?.id) {
      setFetchedVehicleLog(null);
      return;
    }
    const token = localStorage.getItem("access_token");
    axios
      .get(
        `${API_BASE_URL}/vehicle-logs?vehicle_id=${selectedVehicle.id}&limit=1`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      .then((res) => {
        const data = res.data?.data || res.data || [];
        if (Array.isArray(data) && data.length > 0) {
          setFetchedVehicleLog(data[0]);
        } else {
          setFetchedVehicleLog(null);
        }
      })
      .catch(() => setFetchedVehicleLog(null));
  }, [selectedVehicle?.id]);

  // Confirmation states
  const [showDisarmConfirm, setShowDisarmConfirm] = useState(false);
  const [showArmConfirm, setShowArmConfirm] = useState(false);
  const [pendingMode, setPendingMode] = useState(null);
  const [lastArmFailureMessage, setLastArmFailureMessage] = useState("");

  // Search coordinates state
  const [searchQuery, setSearchQuery] = useState("");
  const [mapCenter, setMapCenter] = useState(MAP_CENTER);
  const [mapZoom, setMapZoom] = useState(MAP_ZOOM);

  const currentMission = useMemo(() => {
    if (!selectedVehicle) return null;
    const matching = missionData.filter((mission) =>
      isMissionForVehicle(mission, selectedVehicle),
    );
    if (matching.length === 0) return null;
    const active = matching.filter((mission) =>
      isActiveMissionStatus(mission.status),
    );
    const candidates = active.length > 0 ? active : matching;
    return [...candidates].sort(
      (a, b) => getMissionSortTime(b) - getMissionSortTime(a),
    )[0];
  }, [missionData, selectedVehicle]);

  const missionPathData = useMemo(() => {
    if (!currentMission) {
      return { path: [], markers: [] };
    }

    const path = [];
    const markers = [];

    const homePos = toLatLng(
      currentMission?.home_location?.lat,
      currentMission?.home_location?.lng,
    );
    if (homePos) {
      path.push(homePos);
      markers.push({ position: homePos, type: "home" });
    }

    const missionWaypoints = Array.isArray(currentMission?.waypoints)
      ? currentMission.waypoints
      : [];
    const waypointCount = missionWaypoints.length;
    const completedWaypointRaw = Math.max(
      0,
      Number(currentMission?.completed_waypoint) || 0,
    );
    const progressValue = Number(currentMission?.progress) || 0;
    const completedFromProgress =
      waypointCount > 0
        ? Math.round(
            (Math.max(0, Math.min(100, progressValue)) / 100) * waypointCount,
          )
        : 0;
    const completedWaypoint = Math.max(
      completedWaypointRaw,
      completedFromProgress,
    );
    const currentWaypointRaw = Number(currentMission?.current_waypoint);
    const currentWaypoint = Number.isFinite(currentWaypointRaw)
      ? Math.max(0, currentWaypointRaw)
      : completedWaypoint;
    // Use completed count as source of truth for "next target" to avoid 0-based vs 1-based mismatch.
    const currentTargetIndex =
      completedWaypoint < waypointCount ? completedWaypoint : currentWaypoint;

    missionWaypoints.forEach((waypoint, index) => {
      if (inferWaypointType(waypoint) === "zone") return;
      const position = toLatLng(waypoint?.lat, waypoint?.lng);
      if (!position) return;
      path.push(position);
      let state = "pending";
      if (index < completedWaypoint) {
        state = "completed";
      } else if (index === currentTargetIndex) {
        state = "current";
      }
      markers.push({
        position,
        type: "waypoint",
        index,
        state,
      });
    });

    return { path, markers };
  }, [currentMission]);

  useEffect(() => {
    if (!vehicles || vehicles.length === 0) {
      setSelectedVehicle(null);
      hasInitializedVehicleSelection.current = false;
      setLastArmFailureMessage("");
      return;
    }

    if (!hasInitializedVehicleSelection.current && !selectedVehicle) {
      setSelectedVehicle(vehicles[0]);
      hasInitializedVehicleSelection.current = true;
      return;
    }

    if (
      selectedVehicle?.id &&
      !vehicles.some((vehicle) => vehicle.id === selectedVehicle.id)
    ) {
      setSelectedVehicle(vehicles[0]);
      setLastArmFailureMessage("");
    }
  }, [vehicles, selectedVehicle]);

  // Get latest vehicle log for selected vehicle
  // Priority: real-time WebSocket logs > API-fetched initial log
  const selectedVehicleLog = useMemo(() => {
    if (!selectedVehicle) return null;

    const vehicleId = selectedVehicle.id || selectedVehicle;
    const vehicleIdStr = String(vehicleId);

    let latestLog = null;
    let latestTs = 0;

    for (const log of vehicleLogs) {
      const logVehicleId = String(log.vehicle?.id || log.vehicle_id);
      if (logVehicleId !== vehicleIdStr) {
        continue;
      }

      const ts = new Date(log.created_at || log._received_at || 0).getTime();
      if (ts >= latestTs) {
        latestTs = ts;
        latestLog = log;
      }
    }

    if (latestLog) {
      return latestLog;
    }

    // Fallback: use API-fetched log as initial state
    return fetchedVehicleLog ?? null;
  }, [selectedVehicle, vehicleLogs, fetchedVehicleLog]);

  // Extract telemetry data from real-time WebSocket log
  const telemetryData = useMemo(() => {
    if (!selectedVehicleLog) {
      return {
        heading: 0,
        speed: 0,
        altitude: null,
        latitude: null,
        longitude: null,
        rssi: null,
        battery_voltage: null,
        battery_current: null,
        armed: false,
        mode: "MANUAL",
        gps_status: null,
      };
    }

    const gpsStatusRaw =
      selectedVehicleLog.gps_ok !== undefined
        ? selectedVehicleLog.gps_ok
        : selectedVehicleLog.gps_fix !== undefined
          ? selectedVehicleLog.gps_fix
          : null;

    return {
      heading: selectedVehicleLog.heading || selectedVehicleLog.yaw || 0,
      speed: selectedVehicleLog.speed || 0,
      altitude: selectedVehicleLog.altitude ?? null,
      latitude: selectedVehicleLog.latitude,
      longitude: selectedVehicleLog.longitude,
      rssi: selectedVehicleLog.rssi ?? null,
      battery_voltage: selectedVehicleLog.battery_voltage ?? null,
      battery_current: selectedVehicleLog.battery_current ?? null,
      armed: selectedVehicleLog.armed || false,
      mode:
        selectedVehicleLog.mode || selectedVehicleLog.flight_mode || "MANUAL",
      gps_status: gpsStatusRaw,
    };
  }, [selectedVehicleLog]);

  // Sync armed state and mode from real-time data
  useEffect(() => {
    if (selectedVehicleLog) {
      setIsArmed(telemetryData.armed);
      setActiveMode(telemetryData.mode);
      if (telemetryData.armed) {
        setLastArmFailureMessage("");
      }
    }
  }, [selectedVehicleLog, telemetryData.armed, telemetryData.mode]);

  // Get vehicle position for map display
  const vehiclePosition = useMemo(() => {
    if (!selectedVehicle) return null;

    // Priority: vehicle log > vehicle data
    const lat = telemetryData.latitude ?? selectedVehicle?.latitude;
    const lng = telemetryData.longitude ?? selectedVehicle?.longitude;

    // Strict validation: must be valid numbers and within valid range
    if (
      lat != null &&
      lng != null &&
      !isNaN(lat) &&
      !isNaN(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    ) {
      return [Number(lat), Number(lng)];
    }

    return null;
  }, [selectedVehicle, telemetryData]);

  const completedMissionHomePosition = useMemo(
    () =>
      toLatLng(
        currentMission?.home_location?.lat,
        currentMission?.home_location?.lng,
      ),
    [currentMission],
  );

  const isMissionCompleted = useMemo(() => {
    const status = String(currentMission?.status || "")
      .trim()
      .toLowerCase();
    return ["completed", "finished", "success"].includes(status);
  }, [currentMission?.status]);

  const isVehicleAtHomeAfterMission = useMemo(() => {
    if (
      !isMissionCompleted ||
      !vehiclePosition ||
      !completedMissionHomePosition
    ) {
      return false;
    }
    const distanceToHome = calculateDistanceMeters(
      vehiclePosition,
      completedMissionHomePosition,
    );
    // Consider mission reset when vehicle is very close to home point.
    return Number.isFinite(distanceToHome) && distanceToHome <= 10;
  }, [isMissionCompleted, vehiclePosition, completedMissionHomePosition]);

  const shouldHideCompletedMissionPath =
    isMissionCompleted && isVehicleAtHomeAfterMission;

  const missionStatusBannerText = useMemo(() => {
    if (!isMissionCompleted) return "";
    if (isVehicleAtHomeAfterMission) {
      return t("control.missionControl.rtlArrived");
    }
    return t("control.missionControl.rtlInProgress");
  }, [isMissionCompleted, isVehicleAtHomeAfterMission, t]);

  // Collapse/Expand states for menus with localStorage
  const [isVesselTelemetryExpanded, setIsVesselTelemetryExpanded] = useState(
    () => {
      const saved = localStorage.getItem("control_vesselTelemetry_expanded");
      return saved !== null ? JSON.parse(saved) : false;
    },
  );
  const [isSearchExpanded, setIsSearchExpanded] = useState(() => {
    const saved = localStorage.getItem("control_search_expanded");
    return saved !== null ? JSON.parse(saved) : false;
  });
  const [isThrustControlExpanded, setIsThrustControlExpanded] = useState(() => {
    const saved = localStorage.getItem("control_thrustControl_expanded");
    return saved !== null ? JSON.parse(saved) : false;
  });
  const [isMissionControlExpanded, setIsMissionControlExpanded] = useState(
    () => {
      const saved = localStorage.getItem("control_missionControl_expanded");
      return saved !== null ? JSON.parse(saved) : false;
    },
  );

  // Save state to localStorage when changed
  useEffect(() => {
    localStorage.setItem(
      "control_vesselTelemetry_expanded",
      JSON.stringify(isVesselTelemetryExpanded),
    );
  }, [isVesselTelemetryExpanded]);

  useEffect(() => {
    localStorage.setItem(
      "control_search_expanded",
      JSON.stringify(isSearchExpanded),
    );
  }, [isSearchExpanded]);

  useEffect(() => {
    localStorage.setItem(
      "control_thrustControl_expanded",
      JSON.stringify(isThrustControlExpanded),
    );
  }, [isThrustControlExpanded]);

  useEffect(() => {
    localStorage.setItem(
      "control_missionControl_expanded",
      JSON.stringify(isMissionControlExpanded),
    );
  }, [isMissionControlExpanded]);

  // Camera state
  const [isCameraExpanded, setIsCameraExpanded] = useState(() => {
    const saved = localStorage.getItem("control_camera_expanded");
    return saved !== null ? JSON.parse(saved) : false;
  });
  const [streamName, setStreamName] = useState("");
  const [cameraConnected, setCameraConnected] = useState(false);
  const [cameraConnecting, setCameraConnecting] = useState(false);
  const videoRef = useRef(null);
  const pcRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(
      "control_camera_expanded",
      JSON.stringify(isCameraExpanded),
    );
  }, [isCameraExpanded]);

  // Auto-fill stream name from selected vehicle
  useEffect(() => {
    if (selectedVehicle?.code) {
      setStreamName(normalizeStreamName(selectedVehicle.code));
    }
  }, [selectedVehicle]);

  // Mobile detection – only one panel open at a time on small screens
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia("(max-width: 1024px)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1024px)");
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const openPanel = useCallback(
    (panel) => {
      if (isMobile) {
        setIsVesselTelemetryExpanded(false);
        setIsSearchExpanded(false);
        setIsThrustControlExpanded(false);
        setIsMissionControlExpanded(false);
        setIsCameraExpanded(false);
      }
      switch (panel) {
        case "vessel":
          setIsVesselTelemetryExpanded(true);
          break;
        case "search":
          setIsSearchExpanded(true);
          break;
        case "thrust":
          setIsThrustControlExpanded(true);
          break;
        case "mission":
          setIsMissionControlExpanded(true);
          break;
        case "camera":
          setIsCameraExpanded(true);
          break;
      }
    },
    [isMobile],
  );

  const disconnectCamera = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraConnected(false);
    setCameraConnecting(false);
  }, []);

  const connectCamera = useCallback(
    async (name) => {
      const normalizedName = normalizeStreamName(name);
      if (!normalizedName) return;

      disconnectCamera();
      setCameraConnecting(true);
      try {
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });
        pcRef.current = pc;

        pc.ontrack = (event) => {
          if (videoRef.current && event.streams[0]) {
            videoRef.current.srcObject = event.streams[0];
          }
          setCameraConnected(true);
          setCameraConnecting(false);
        };

        pc.oniceconnectionstatechange = () => {
          if (
            pc.iceConnectionState === "disconnected" ||
            pc.iceConnectionState === "failed" ||
            pc.iceConnectionState === "closed"
          ) {
            setCameraConnected(false);
            setCameraConnecting(false);
          }
        };

        pc.addTransceiver("video", { direction: "recvonly" });
        pc.addTransceiver("audio", { direction: "recvonly" });

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // Wait for ICE gathering to complete
        const sdpOffer = await new Promise((resolve, reject) => {
          const timeout = setTimeout(
            () => reject(new Error("ICE timeout")),
            10000,
          );
          const check = () => {
            if (pc.iceGatheringState === "complete") {
              clearTimeout(timeout);
              resolve(pc.localDescription.sdp);
            }
          };
          pc.addEventListener("icegatheringstatechange", check);
          check();
        });

        const res = await fetch(`/mediamtx/${normalizedName}/whep`, {
          method: "POST",
          headers: { "Content-Type": "application/sdp" },
          body: sdpOffer,
        });

        if (!res.ok) {
          throw new Error(`Stream not found (${res.status})`);
        }

        const sdpAnswer = await res.text();
        await pc.setRemoteDescription({ type: "answer", sdp: sdpAnswer });
      } catch (err) {
        disconnectCamera();
        toast.error(`Camera: ${err.message}`);
      }
    },
    [disconnectCamera],
  );
  const handleSearchCoordinates = (e) => {
    if (e.key === "Enter" || e.type === "click") {
      const query = searchQuery.trim();
      if (!query) return;

      let lat, lng;

      if (query.includes(",")) {
        const parts = query.split(",").map((s) => s.trim());
        if (parts.length === 2) {
          lat = parseFloat(parts[0]);
          lng = parseFloat(parts[1]);
        }
      } else {
        const parts = query.split(/\s+/);
        if (parts.length === 2) {
          lat = parseFloat(parts[0]);
          lng = parseFloat(parts[1]);
        }
      }

      if (
        !isNaN(lat) &&
        !isNaN(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180
      ) {
        setMapCenter([lat, lng]);
        setMapZoom(15);
        toast.success(t("control.search.success"));
      } else {
        toast.error(t("control.search.error"));
      }
    }
  };

  // Handlers
  const handleCommandError = (result) => {
    if (result.error === "timeout") {
      toast.error(t("control.missionControl.hardwareTimeout"));
    } else if (result.error === "mqtt_disabled") {
      toast.error(t("control.missionControl.mqttDisabled"));
    } else if (result.error === "mqtt_unavailable") {
      toast.error(t("control.missionControl.mqttUnavailable"));
    } else if (result.error === "hardware_error") {
      toast.error(
        `${t("control.missionControl.hardwareError")}: ${result.message}`,
      );
    } else {
      toast.error(
        `${t("control.missionControl.commandFailed")}: ${result.message || ""}`.trim(),
      );
    }
  };

  // Shared rate-limited send for both sticks
  const scheduleThrusterSend = useCallback(() => {
    if (!selectedVehicle?.code) return;
    const now = Date.now();
    const elapsed = now - lastThrusterSendRef.current;
    if (elapsed >= 50) {
      lastThrusterSendRef.current = now;
      sendThruster(
        selectedVehicle.code,
        latestThrottleRef.current,
        latestSteeringRef.current,
      );
    } else {
      clearTimeout(pendingThrusterRef.current);
      pendingThrusterRef.current = setTimeout(() => {
        lastThrusterSendRef.current = Date.now();
        sendThruster(
          selectedVehicle.code,
          latestThrottleRef.current,
          latestSteeringRef.current,
        );
      }, 50 - elapsed);
    }
  }, [selectedVehicle, sendThruster]);

  // Left joystick – vertical axis → throttle
  const handleThrottleChange = useCallback(
    (throttle) => {
      latestThrottleRef.current = throttle;
      setThrusterThrottle(throttle);
      scheduleThrusterSend();
    },
    [scheduleThrusterSend],
  );

  // Right joystick – horizontal axis → steering
  const handleSteeringChange = useCallback(
    (steering) => {
      latestSteeringRef.current = steering;
      setThrusterSteering(steering);
      scheduleThrusterSend();
    },
    [scheduleThrusterSend],
  );

  // Test motors: 30% throttle, zero steering for 2 s then stop
  const handleTestMotors = useCallback(async () => {
    if (!selectedVehicle?.code || !isArmed) return;
    try {
      latestThrottleRef.current = 30;
      latestSteeringRef.current = 0;
      setThrusterThrottle(30);
      setThrusterSteering(0);
      await sendThruster(selectedVehicle.code, 30, 0);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      latestThrottleRef.current = 0;
      latestSteeringRef.current = 0;
      setThrusterThrottle(0);
      setThrusterSteering(0);
      await sendThruster(selectedVehicle.code, 0, 0);
      toast.success("Motor test completed");
    } catch (err) {
      toast.error(`Motor test failed: ${err.message}`);
    }
  }, [selectedVehicle, isArmed, sendThruster]);

  // Cleanup pending send on unmount
  useEffect(() => {
    return () => {
      clearTimeout(pendingThrusterRef.current);
    };
  }, []);

  const handleDisarmConfirm = async () => {
    setShowDisarmConfirm(false);
    toast.info(t("control.missionControl.sendingCommand"));
    const result = await sendCommand(selectedVehicle?.code, "DISARM");
    if (result.success) {
      if (result.queued) {
        toast.info(t("control.missionControl.commandQueued"));
        return;
      }
      setIsArmed(false);
      setLastArmFailureMessage("");
      toast.success(t("control.missionControl.disarmSuccess"));
    } else {
      handleCommandError(result);
    }
  };

  const handleArmConfirm = async () => {
    setShowArmConfirm(false);
    toast.info(t("control.missionControl.sendingCommand"));
    const result = await sendCommand(selectedVehicle?.code, "ARM");
    if (result.success) {
      if (result.queued) {
        setLastArmFailureMessage(t("control.missionControl.armPendingHint"));
        toast.info(t("control.missionControl.commandQueued"));
        return;
      }
      setIsArmed(true);
      setLastArmFailureMessage("");
      toast.success(t("control.missionControl.armSuccess"));
    } else {
      setLastArmFailureMessage(result.message || "ARM failed");
      handleCommandError(result);
    }
  };

  const handleForceArm = async () => {
    toast.info("Sending FORCE_ARM command...");
    const result = await sendCommand(selectedVehicle?.code, "FORCE_ARM");
    if (result.success) {
      if (result.queued) {
        setLastArmFailureMessage(t("control.missionControl.armPendingHint"));
        toast.info(t("control.missionControl.commandQueued"));
        return;
      }
      setIsArmed(true);
      setLastArmFailureMessage("");
      toast.success("Force arm success");
      return;
    }

    handleCommandError(result);
  };

  const handleModeChangeRequest = (modeId) => {
    if (activeMode !== modeId && !commandLoading) {
      setPendingMode(modeId);
    }
  };

  const handleModeChangeConfirm = async () => {
    if (!pendingMode) return;
    const modeToSet = pendingMode;
    setPendingMode(null);
    toast.info(t("control.missionControl.sendingCommand"));
    const result = await sendCommand(selectedVehicle?.code, modeToSet);
    if (result.success) {
      if (result.queued) {
        toast.info(t("control.missionControl.commandQueued"));
        return;
      }
      setActiveMode(modeToSet);
      toast.success(
        `${t("control.missionControl.modeChangedTo")} ${modeToSet} ${t("control.missionControl.successfully")}`.trim(),
      );
    } else {
      handleCommandError(result);
    }
  };

  return (
    <div className="relative -mx-4 -mt-6 min-h-[calc(100vh-85px)] overflow-hidden">
      <ControlMapLayer
        mapCenter={mapCenter}
        mapZoom={mapZoom}
        selectedVehicle={selectedVehicle}
        vehiclePosition={vehiclePosition}
        heading={telemetryData.heading}
        missionPath={shouldHideCompletedMissionPath ? [] : missionPathData.path}
        missionMarkers={
          shouldHideCompletedMissionPath ? [] : missionPathData.markers
        }
      />

      {/* ——— FLOATING PANELS (over map) ——— */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {missionStatusBannerText && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none">
            <div
              className={`px-4 py-2 rounded-lg border text-xs md:text-sm font-medium shadow-lg backdrop-blur-sm ${
                isVehicleAtHomeAfterMission
                  ? "bg-emerald-500/20 border-emerald-400 text-emerald-100"
                  : "bg-blue-500/20 border-blue-400 text-blue-100"
              }`}
            >
              {missionStatusBannerText}
            </div>
          </div>
        )}

        <VesselTelemetryPanel
          isExpanded={isVesselTelemetryExpanded}
          onExpand={() => openPanel("vessel")}
          onCollapse={() => setIsVesselTelemetryExpanded(false)}
          vehicles={vehicles}
          selectedVehicle={selectedVehicle}
          onVehicleChange={setSelectedVehicle}
          telemetryData={telemetryData}
          getActiveMissions={getActiveMissions}
        />

        <SearchPanel
          isExpanded={isSearchExpanded}
          onExpand={() => openPanel("search")}
          onCollapse={() => setIsSearchExpanded(false)}
          isVesselTelemetryExpanded={isVesselTelemetryExpanded}
          searchQuery={searchQuery}
          onSearchQueryChange={(e) => setSearchQuery(e.target.value)}
          onSearchKeyDown={handleSearchCoordinates}
          onSearchSubmit={handleSearchCoordinates}
        />

        <ThrustControlPanel
          isExpanded={isThrustControlExpanded}
          onExpand={() => openPanel("thrust")}
          onCollapse={() => setIsThrustControlExpanded(false)}
          isArmed={isArmed}
          selectedVehicle={selectedVehicle}
          activeMode={activeMode}
          thrusterThrottle={thrusterThrottle}
          thrusterSteering={thrusterSteering}
          onThrottleChange={handleThrottleChange}
          onSteeringChange={handleSteeringChange}
          onTestMotors={handleTestMotors}
        />

        <MissionControlPanel
          isExpanded={isMissionControlExpanded}
          onExpand={() => openPanel("mission")}
          onCollapse={() => setIsMissionControlExpanded(false)}
          isArmed={isArmed}
          commandLoading={commandLoading}
          selectedVehicle={selectedVehicle}
          activeMode={activeMode}
          showDisarmConfirm={showDisarmConfirm}
          setShowDisarmConfirm={setShowDisarmConfirm}
          showArmConfirm={showArmConfirm}
          setShowArmConfirm={setShowArmConfirm}
          pendingMode={pendingMode}
          setPendingMode={setPendingMode}
          lastArmFailureMessage={lastArmFailureMessage}
          onDisarmConfirm={handleDisarmConfirm}
          onArmConfirm={handleArmConfirm}
          onForceArm={handleForceArm}
          onModeChangeRequest={handleModeChangeRequest}
          onModeChangeConfirm={handleModeChangeConfirm}
        />

        <CameraPanel
          isExpanded={isCameraExpanded}
          onExpand={() => openPanel("camera")}
          onCollapse={() => setIsCameraExpanded(false)}
          videoRef={videoRef}
          streamName={streamName}
          onStreamNameChange={(e) => setStreamName(e.target.value)}
          onStreamNameBlur={(e) =>
            setStreamName(normalizeStreamName(e.target.value))
          }
          cameraConnected={cameraConnected}
          cameraConnecting={cameraConnecting}
          onConnect={connectCamera}
          onDisconnect={disconnectCamera}
        />
      </div>
    </div>
  );
};

export default Control;
