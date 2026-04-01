import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import useTitle from "../hooks/useTitle";
import useTranslation from "../hooks/useTranslation";
import useControlCommand from "../hooks/useControlCommand";
import useVehicleData from "../hooks/useVehicleData";
import { useLogData } from "../hooks/useLogData";
import useMissionData from "../hooks/useMissionData";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { HeadingIndicator } from "react-flight-indicators";
import { motion, AnimatePresence } from "framer-motion";
import { VehicleDropdown } from "../components/Widgets/Vehicle";
import SlideToConfirm from "../components/ui/SlideToConfirm";
import { toast } from "../components/ui";
import {
  FaCompass,
  FaBolt,
  FaTachometerAlt,
  FaPowerOff,
  FaLock,
  FaTrashAlt,
  FaHome,
  FaArrowUp,
  FaCog,
  FaSignal,
  FaSearch,
  FaChevronDown,
  FaChevronUp,
  FaVideo,
  FaVideoSlash,
} from "react-icons/fa";
import { MdMyLocation } from "react-icons/md";
import { TbAnchor, TbRoute } from "react-icons/tb";
import usvPointIcon from "../assets/usv-point.webp";

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

// Component to update map position
const MapController = ({ center, zoom }) => {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.setView(center, zoom || map.getZoom(), {
        animate: true,
        duration: 1,
      });
    }
  }, [center, zoom, map]);

  return null;
};

// Component to handle auto-centering when vehicle is selected
const AutoCenterController = ({
  selectedVehicle,
  vehiclePosition,
  isEnabled,
}) => {
  const map = useMap();
  const lastFocusedVehicleRef = useRef(null);
  const isProgrammaticMoveRef = useRef(false);

  useEffect(() => {
    if (!selectedVehicle || !vehiclePosition || !isEnabled) {
      lastFocusedVehicleRef.current = null;
      return;
    }

    const selectedVehicleId = String(selectedVehicle?.id || selectedVehicle);
    const lastFocusedId = String(lastFocusedVehicleRef.current);

    // Only auto-center if this is a new vehicle selection
    if (selectedVehicleId === lastFocusedId) {
      return;
    }

    // Update last focused vehicle
    lastFocusedVehicleRef.current = selectedVehicleId;
    isProgrammaticMoveRef.current = true;

    try {
      // Use flyTo for smooth animated transition
      map.flyTo(vehiclePosition, 15, {
        animate: true,
        duration: 1.2,
      });

      // Reset programmatic flag after animation
      setTimeout(() => {
        isProgrammaticMoveRef.current = false;
      }, 1300);
    } catch (error) {
      isProgrammaticMoveRef.current = false;
    }
  }, [selectedVehicle, vehiclePosition, isEnabled, map]);

  return null;
};

const Control = () => {
  const { t } = useTranslation();
  useTitle(t("nav.control"));
  const { sendCommand, isLoading: commandLoading } = useControlCommand();
  const { vehicles } = useVehicleData();
  const { vehicleLogs } = useLogData();
  const { missionData, getActiveMissions } = useMissionData();
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const hasInitializedVehicleSelection = useRef(false);
  const [activeMode, setActiveMode] = useState("MANUAL");
  const [leftMotor, setLeftMotor] = useState(0);
  const [rightMotor, setRightMotor] = useState(0);
  const [powerOn, setPowerOn] = useState(false);
  const [isArmed, setIsArmed] = useState(false);
  const motorDebounceRef = useRef(null);

  // Confirmation states
  const [showDisarmConfirm, setShowDisarmConfirm] = useState(false);
  const [showArmConfirm, setShowArmConfirm] = useState(false);
  const [pendingMode, setPendingMode] = useState(null);
  const [lastArmFailureMessage, setLastArmFailureMessage] = useState("");

  // Search coordinates state
  const [searchQuery, setSearchQuery] = useState("");
  const [mapCenter, setMapCenter] = useState(MAP_CENTER);
  const [mapZoom, setMapZoom] = useState(MAP_ZOOM);

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
  const selectedVehicleLog = useMemo(() => {
    if (!selectedVehicle) return null;

    const vehicleId = selectedVehicle.id || selectedVehicle;
    const vehicleIdStr = String(vehicleId);

    // Find the latest log for this vehicle
    const logs = vehicleLogs.filter((log) => {
      const logVehicleId = String(log.vehicle?.id || log.vehicle_id);
      return logVehicleId === vehicleIdStr;
    });

    if (logs.length === 0) return null;

    // Sort by created_at and return the latest
    return logs.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )[0];
  }, [selectedVehicle, vehicleLogs]);

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
      };
    }

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
    };
  }, [selectedVehicleLog]);

  // Sync armed state and mode from real-time data
  useEffect(() => {
    if (selectedVehicleLog) {
      setIsArmed(telemetryData.armed);
      setActiveMode(telemetryData.mode);
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

  // Create vehicle icon using usv-point.webp
  const vehicleIcon = useMemo(() => {
    if (!selectedVehicle || !vehiclePosition) return null;

    const heading = telemetryData.heading;
    const size = 48;

    return L.divIcon({
      html: `
        <div style="
          width: ${size}px;
          height: ${size}px;
          display: flex;
          align-items: center;
          justify-content: center;
          transform: rotate(${heading}deg);
          filter: drop-shadow(0 2px 8px rgba(0,0,0,0.3));
        ">
          <img 
            src="${usvPointIcon}" 
            alt="USV" 
            style="width: 100%; height: 100%; object-fit: contain;"
          />
        </div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      className: "boat-marker-icon",
    });
  }, [selectedVehicle, selectedVehicleLog, vehiclePosition]);

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

  // Update slider background dynamically
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "motor-slider-styles";
    style.textContent = `
      .motor-slider-left {
        background: linear-gradient(to right, #3b82f6 0%, #3b82f6 ${leftMotor}%, #e5e7eb ${leftMotor}%, #e5e7eb 100%) !important;
      }
      .dark .motor-slider-left {
        background: linear-gradient(to right, #3b82f6 0%, #3b82f6 ${leftMotor}%, #374151 ${leftMotor}%, #374151 100%) !important;
      }
      .motor-slider-right {
        background: linear-gradient(to right, #3b82f6 0%, #3b82f6 ${rightMotor}%, #e5e7eb ${rightMotor}%, #e5e7eb 100%) !important;
      }
      .dark .motor-slider-right {
        background: linear-gradient(to right, #3b82f6 0%, #3b82f6 ${rightMotor}%, #374151 ${rightMotor}%, #374151 100%) !important;
      }
    `;
    const existingStyle = document.getElementById("motor-slider-styles");
    if (existingStyle) {
      existingStyle.remove();
    }
    document.head.appendChild(style);
    return () => {
      const styleEl = document.getElementById("motor-slider-styles");
      if (styleEl) styleEl.remove();
    };
  }, [leftMotor, rightMotor]);

  const panelCls =
    "bg-white dark:bg-black border border-gray-200 dark:border-gray-600";
  const textCls = "text-gray-900 dark:text-white";
  const muteCls = "text-gray-500 dark:text-gray-400";
  const barTrackCls = "bg-gray-200 dark:bg-gray-700";

  const modes = [
    { id: "MANUAL", icon: FaCog },
    { id: "AUTO", icon: FaArrowUp },
    { id: "HOLD", icon: FaLock },
    { id: "LOITER", icon: TbAnchor },
    { id: "RTL", icon: FaHome },
  ];

  // Handlers
  const handleCommandError = (result) => {
    if (result.error === "timeout") {
      toast.error(t("control.missionControl.hardwareTimeout"));
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

  // Motor control with debounce
  const sendMotorCommand = useCallback(
    async (left, right) => {
      if (!selectedVehicle?.code) return;

      try {
        const result = await sendCommand(selectedVehicle.code, "set_thrust", {
          left_motor: left,
          right_motor: right,
        });

        if (!result.success) {
          handleCommandError(result);
        }
      } catch (err) {
        toast.error(`Motor control error: ${err.message}`);
      }
    },
    [selectedVehicle, sendCommand],
  );

  // Debounced motor control (send command 500ms after user stops sliding)
  const handleMotorChange = useCallback(
    (motor, value) => {
      // Update local state immediately for smooth UI
      if (motor === "left") {
        setLeftMotor(value);
      } else {
        setRightMotor(value);
      }

      // Clear previous debounce
      if (motorDebounceRef.current) {
        clearTimeout(motorDebounceRef.current);
      }

      // Debounce: send command after 500ms of no changes
      motorDebounceRef.current = setTimeout(() => {
        const left = motor === "left" ? value : leftMotor;
        const right = motor === "right" ? value : rightMotor;
        sendMotorCommand(left, right);
      }, 500);
    },
    [leftMotor, rightMotor, sendMotorCommand],
  );

  // Test motors (send command immediately, no debounce)
  const handleTestMotors = useCallback(async () => {
    if (!selectedVehicle?.code || !isArmed) return;

    try {
      // Test sequence: ramp up to 30%, hold 2s, ramp down
      const testSequence = [
        { left: 30, right: 30, duration: 2000 },
        { left: 0, right: 0, duration: 0 },
      ];

      for (const step of testSequence) {
        setLeftMotor(step.left);
        setRightMotor(step.right);
        await sendMotorCommand(step.left, step.right);
        if (step.duration > 0) {
          await new Promise((resolve) => setTimeout(resolve, step.duration));
        }
      }

      toast.success("Motor test completed");
    } catch (err) {
      toast.error(`Motor test failed: ${err.message}`);
    }
  }, [selectedVehicle, isArmed, sendMotorCommand]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (motorDebounceRef.current) {
        clearTimeout(motorDebounceRef.current);
      }
    };
  }, []);

  const handleDisarmConfirm = async () => {
    setShowDisarmConfirm(false);
    toast.info(t("control.missionControl.sendingCommand"));
    const result = await sendCommand(selectedVehicle?.code, "DISARM");
    if (result.success) {
      setIsArmed(false);
      setPowerOn(false);
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
      setActiveMode(modeToSet);
      toast.success(
        `${t("control.missionControl.modeChangedTo")} ${modeToSet} ${t("control.missionControl.successfully")}`.trim(),
      );
    } else {
      handleCommandError(result);
    }
  };

  return (
    <div className="relative -mx-4 -mt-6 min-h-[calc(100vh-56px)] overflow-hidden">
      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .slider:focus {
          outline: none;
        }
        .slider:focus::-webkit-slider-thumb {
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
        }
        .slider:focus::-moz-range-thumb {
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
        }
      `}</style>
      {/* ——— MAP (full area, behind everything) ——— */}
      <div className="absolute inset-0 z-0">
        <MapContainer
          center={MAP_CENTER}
          zoom={MAP_ZOOM}
          className="h-full w-full"
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom
          worldCopyJump={false}
          maxBounds={[
            [-85, -180],
            [85, 180],
          ]}
          maxBoundsViscosity={1.0}
          minZoom={3}
          maxZoom={16}
          zoomControl={false}
        >
          <MapController center={mapCenter} zoom={mapZoom} />
          <AutoCenterController
            selectedVehicle={selectedVehicle}
            vehiclePosition={vehiclePosition}
            isEnabled={true}
          />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            noWrap
          />

          {/* Vehicle Marker */}
          {vehiclePosition && vehicleIcon && selectedVehicle && (
            <Marker
              key={`vehicle-${selectedVehicle.id}`}
              position={vehiclePosition}
              icon={vehicleIcon}
            />
          )}
        </MapContainer>
      </div>

      {/* ——— FLOATING MENUS (over map) ——— */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {/* ——— LEFT: Vessel Telemetry ——— */}
        <AnimatePresence mode="wait">
          {!isVesselTelemetryExpanded ? (
            <motion.button
              key="collapsed-vessel"
              layout
              initial={{ width: 48, height: 48, opacity: 0 }}
              animate={{ width: 48, height: 48, opacity: 1 }}
              exit={{ width: 48, height: 48, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              onClick={() => setIsVesselTelemetryExpanded(true)}
              className={`absolute left-4 top-7 ${panelCls} rounded-full p-3 shadow-lg pointer-events-auto flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors`}
              title={t("control.vesselTelemetry.title")}
            >
              <FaCompass className="text-blue-500 dark:text-white text-xl" />
            </motion.button>
          ) : (
            <motion.section
              key="expanded-vessel"
              layout
              initial={{ width: 48, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 48, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className={`absolute left-4 top-7 ${panelCls} rounded-xl p-4 flex flex-col gap-4 max-h-[calc(100vh-120px)] overflow-auto custom-scrollbar shadow-lg pointer-events-auto`}
            >
              <div className="flex items-center justify-between">
                <h2
                  className={`text-xs font-bold ${muteCls} uppercase tracking-wider`}
                >
                  {t("control.vesselTelemetry.title")}
                </h2>
                <button
                  onClick={() => setIsVesselTelemetryExpanded(false)}
                  className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${muteCls}`}
                  title={t("common.collapse")}
                >
                  <FaChevronUp className="text-sm" />
                </button>
              </div>

              {/* Vehicle Dropdown */}
              <div className="mb-2">
                <VehicleDropdown
                  vehicles={vehicles}
                  selectedVehicle={selectedVehicle}
                  onVehicleChange={(vehicle) => setSelectedVehicle(vehicle)}
                  placeholder={t("control.vesselTelemetry.placeholder")}
                  showPlaceholder={true}
                />
              </div>

              {/* Compass / Heading Indicator */}
              <div className="flex flex-col items-center">
                <HeadingIndicator
                  size={300}
                  heading={telemetryData.heading}
                  showBox={false}
                />
              </div>

              {/* Speed & HDOP */}
              <div className="grid grid-cols-2 gap-3">
                <div className={`${panelCls} rounded-lg p-3`}>
                  <p className={`text-xs ${muteCls} mb-1`}>
                    {t("control.vesselTelemetry.speed")}
                  </p>
                  <p className="text-xl font-bold text-blue-500">
                    {selectedVehicle
                      ? `${telemetryData.speed.toFixed(1)} kn`
                      : "N/A"}
                  </p>
                </div>
                <div className={`${panelCls} rounded-lg p-3`}>
                  <p className={`text-xs ${muteCls} mb-1`}>
                    {t("control.vesselTelemetry.altitude")}
                  </p>
                  <p className="text-xl font-bold text-green-500">
                    {selectedVehicle && telemetryData.altitude !== null
                      ? `${telemetryData.altitude.toFixed(1)} m`
                      : "N/A"}
                  </p>
                </div>
              </div>

              {/* GPS Position */}
              <div className={`${panelCls} rounded-lg p-3`}>
                <p
                  className={`text-xs ${muteCls} mb-1 flex items-center gap-1`}
                >
                  <MdMyLocation className="text-sm" />{" "}
                  {t("control.vesselTelemetry.gpsPosition")}
                </p>
                <p className={`text-sm ${textCls}`}>
                  {selectedVehicle &&
                  telemetryData.latitude &&
                  telemetryData.longitude
                    ? `${telemetryData.latitude.toFixed(4)}° ${telemetryData.latitude >= 0 ? "N" : "S"}, ${Math.abs(telemetryData.longitude).toFixed(4)}° ${telemetryData.longitude >= 0 ? "E" : "W"}`
                    : "N/A"}
                </p>
              </div>

              {/* Sensor readings */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className={`flex items-center gap-2 ${muteCls}`}>
                    <FaSignal className="text-blue-500" />{" "}
                    {t("control.vesselTelemetry.rssi")}
                  </span>
                  <span className={textCls}>
                    {selectedVehicle && telemetryData.rssi !== null
                      ? `${telemetryData.rssi} dBm`
                      : "N/A"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className={`flex items-center gap-2 ${muteCls}`}>
                    <FaBolt className="text-blue-500" />{" "}
                    {t("control.vesselTelemetry.batteryVoltage")}
                  </span>
                  <span className={textCls}>
                    {selectedVehicle && telemetryData.battery_voltage !== null
                      ? `${telemetryData.battery_voltage.toFixed(1)} V`
                      : "N/A"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className={`flex items-center gap-2 ${muteCls}`}>
                    <FaTachometerAlt className="text-blue-500" />{" "}
                    {t("control.vesselTelemetry.batteryCurrent")}
                  </span>
                  <span className={textCls}>
                    {selectedVehicle && telemetryData.battery_current !== null
                      ? `${telemetryData.battery_current.toFixed(1)} A`
                      : "N/A"}
                  </span>
                </div>
              </div>

              {/* Mission Progress - Only show if vehicle selected and has active mission */}
              {selectedVehicle &&
                (() => {
                  const activeMissions = getActiveMissions();
                  const vehicleMission = activeMissions.find((m) => {
                    // Check if mission is for this vehicle
                    const missionVehicle =
                      typeof m.vehicle === "string"
                        ? m.vehicle
                        : m.vehicle?.name || m.vehicle?.code;
                    return (
                      missionVehicle === selectedVehicle?.name ||
                      missionVehicle === selectedVehicle?.code
                    );
                  });

                  if (!vehicleMission) return null;

                  const currentWaypoint = vehicleMission.current_waypoint || 0;
                  const totalWaypoints = vehicleMission.total_waypoints || 0;
                  const progress = Math.round(vehicleMission.progress || 0);
                  const currentWaypointData =
                    vehicleMission.waypoints?.[currentWaypoint];
                  const waypointName =
                    currentWaypointData?.name ||
                    `Waypoint ${currentWaypoint + 1}`;

                  return (
                    <>
                      <div>
                        <p
                          className={`text-xs ${muteCls} uppercase tracking-wider mb-2`}
                        >
                          {t("control.missionControl.missionProgress")}
                        </p>
                        <div className="space-y-3">
                          {/* Current Waypoint */}
                          <div
                            className={`rounded-lg p-3 bg-blue-500/20 border border-blue-500/50`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <p className={`text-sm font-medium ${textCls}`}>
                                {waypointName}
                              </p>
                              <span className="text-blue-500 shrink-0">
                                <TbRoute className="w-5 h-5" />
                              </span>
                            </div>
                            <p className={`text-xs ${muteCls}`}>
                              {t("control.missionControl.activeTarget")}
                            </p>
                          </div>

                          {/* Progress Bar */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className={`text-xs ${muteCls}`}>
                                {t("control.missionControl.overallProgress")}
                              </span>
                              <span
                                className={`text-xs font-medium text-blue-500`}
                              >
                                {progress}%
                              </span>
                            </div>
                            <div
                              className={`w-full h-2 ${barTrackCls} rounded-full overflow-hidden`}
                            >
                              <div
                                className="h-full bg-blue-500 transition-all duration-300"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <p className={`text-xs ${muteCls} mt-1`}>
                              {currentWaypoint}{" "}
                              {t("control.missionControl.waypointsOf")}{" "}
                              {totalWaypoints}{" "}
                              {t("control.missionControl.waypointsLabel")}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Clear Mission */}
                      <button
                        type="button"
                        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-colors"
                      >
                        <FaTrashAlt className="text-sm" />{" "}
                        {t("control.missionControl.clearMission")}
                      </button>
                    </>
                  );
                })()}
            </motion.section>
          )}
        </AnimatePresence>

        {/* ——— Search Coordinates (separate floating section, right of Vessel Telemetry) ——— */}
        <AnimatePresence mode="wait">
          {!isSearchExpanded ? (
            <motion.button
              key="collapsed-search"
              layout
              initial={{ width: 48, height: 48, opacity: 0 }}
              animate={{
                width: 48,
                height: 48,
                opacity: 1,
                left: isVesselTelemetryExpanded ? 350 : 80,
              }}
              exit={{ width: 48, height: 48, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              onClick={() => setIsSearchExpanded(true)}
              className="absolute top-7 bg-white dark:bg-black hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 p-3 rounded-full shadow-lg transition-all border border-gray-200 dark:border-gray-600 flex items-center justify-center pointer-events-auto"
              style={{
                left: isVesselTelemetryExpanded ? "350px" : "80px",
              }}
              title={t("control.search.title")}
            >
              <FaSearch className="text-base" />
            </motion.button>
          ) : (
            <motion.section
              key="expanded-search"
              layout
              initial={{ width: 48, opacity: 0 }}
              animate={{
                width: 320,
                opacity: 1,
                left: isVesselTelemetryExpanded ? 350 : 80,
              }}
              exit={{ width: 48, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className={`absolute top-7 ${panelCls} rounded-xl p-2 shadow-lg pointer-events-auto`}
              style={{
                left: isVesselTelemetryExpanded ? "350px" : "80px",
              }}
            >
              <div className="flex items-center justify-end mb-2">
                <button
                  onClick={() => setIsSearchExpanded(false)}
                  className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${muteCls}`}
                  title={t("common.collapse")}
                >
                  <FaChevronUp className="text-xs" />
                </button>
              </div>
              <div className="relative flex items-center">
                <FaSearch className="absolute left-3 text-gray-400 dark:text-gray-500 z-10" />
                <input
                  type="text"
                  placeholder={t("control.search.placeholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchCoordinates}
                  className={`w-full bg-white dark:bg-black border border-gray-200 dark:border-gray-600 rounded-lg pl-10 pr-12 py-2.5 ${textCls} placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all`}
                />
                {searchQuery && (
                  <button
                    onClick={handleSearchCoordinates}
                    className="absolute right-2 p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
                    title={t("common.search")}
                  >
                    <FaSearch className="text-sm" />
                  </button>
                )}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ——— Thrust Control (separate floating section, center bottom, 2 columns) ——— */}
        <AnimatePresence mode="wait">
          {!isThrustControlExpanded ? (
            <motion.button
              key="collapsed-thrust"
              layout
              initial={{ width: 48, height: 48, opacity: 0 }}
              animate={{ width: 48, height: 48, opacity: 1 }}
              exit={{ width: 48, height: 48, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              onClick={() => setIsThrustControlExpanded(true)}
              className={`absolute left-1/2 bottom-5 -translate-x-1/2 ${panelCls} rounded-full p-3 shadow-lg pointer-events-auto flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors`}
              title={t("control.thrustControl.title")}
            >
              <FaPowerOff className="text-red-500 text-xl" />
            </motion.button>
          ) : (
            <motion.section
              key="expanded-thrust"
              layout
              initial={{ width: 48, opacity: 0 }}
              animate={{ width: 600, opacity: 1 }}
              exit={{ width: 48, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className={`absolute left-1/2 bottom-5 -translate-x-1/2 ${panelCls} rounded-xl p-4 shadow-lg pointer-events-auto`}
            >
              <div className="flex items-center justify-between mb-4">
                <h2
                  className={`text-sm font-bold ${textCls} uppercase tracking-wider`}
                >
                  {t("control.thrustControl.title")}
                </h2>
                <button
                  onClick={() => setIsThrustControlExpanded(false)}
                  className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${muteCls}`}
                  title={t("common.collapse")}
                >
                  <FaChevronDown className="text-sm" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-6">
                {/* Left Column: Power & Test Motor */}
                <div className="flex flex-col items-center gap-3">
                  <FaArrowUp className={`${muteCls} text-lg`} />
                  <button
                    type="button"
                    onClick={() =>
                      selectedVehicle?.code && setPowerOn(!powerOn)
                    }
                    disabled={!selectedVehicle?.code}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                      !selectedVehicle?.code
                        ? "bg-gray-400 dark:bg-gray-600 cursor-not-allowed opacity-50"
                        : powerOn
                          ? "bg-red-600 hover:bg-red-500"
                          : "bg-red-700/70 dark:bg-red-900/50 hover:bg-red-600/80"
                    }`}
                  >
                    <FaPowerOff className="text-white text-xl" />
                  </button>
                  <button
                    type="button"
                    onClick={handleTestMotors}
                    disabled={!isArmed || !selectedVehicle?.code}
                    className={`flex items-center justify-center gap-2 w-full py-2 rounded-lg text-white text-sm font-medium transition-all ${
                      isArmed && selectedVehicle?.code
                        ? "bg-blue-600 hover:bg-blue-500 cursor-pointer"
                        : "bg-gray-400 dark:bg-gray-600 cursor-not-allowed opacity-50"
                    }`}
                  >
                    {t("control.thrustControl.testMotors")}
                  </button>
                </div>

                {/* Right Column: Motor Sliders */}
                <div className="space-y-4">
                  <div>
                    <div
                      className={`flex justify-between text-xs mb-2 ${muteCls}`}
                    >
                      <span>{t("control.thrustControl.leftMotor")}</span>
                      <span className="text-blue-500 font-medium">
                        {leftMotor}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={leftMotor}
                      onChange={(e) =>
                        handleMotorChange("left", Number(e.target.value))
                      }
                      disabled={!isArmed || !selectedVehicle?.code}
                      className={`w-full h-2 rounded-lg appearance-none slider motor-slider-left ${
                        isArmed && selectedVehicle?.code
                          ? "cursor-pointer"
                          : "cursor-not-allowed opacity-50"
                      }`}
                    />
                  </div>
                  <div>
                    <div
                      className={`flex justify-between text-xs mb-2 ${muteCls}`}
                    >
                      <span>{t("control.thrustControl.rightMotor")}</span>
                      <span className="text-blue-500 font-medium">
                        {rightMotor}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={rightMotor}
                      onChange={(e) =>
                        handleMotorChange("right", Number(e.target.value))
                      }
                      disabled={!isArmed || !selectedVehicle?.code}
                      className={`w-full h-2 rounded-lg appearance-none slider motor-slider-right ${
                        isArmed && selectedVehicle?.code
                          ? "cursor-pointer"
                          : "cursor-not-allowed opacity-50"
                      }`}
                    />
                  </div>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ——— RIGHT: Mission Control ——— */}
        <AnimatePresence mode="wait">
          {!isMissionControlExpanded ? (
            <motion.button
              key="collapsed-mission"
              layout
              initial={{ width: 48, height: 48, opacity: 0 }}
              animate={{ width: 48, height: 48, opacity: 1 }}
              exit={{ width: 48, height: 48, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              onClick={() => setIsMissionControlExpanded(true)}
              className={`absolute right-4 top-7 ${panelCls} rounded-full p-3 shadow-lg pointer-events-auto flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors`}
              title={t("control.missionControl.title")}
            >
              <FaCog className="text-blue-500 dark:text-white text-xl" />
            </motion.button>
          ) : (
            <motion.section
              key="expanded-mission"
              layout
              initial={{ width: 48, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 48, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className={`absolute right-4 top-7 ${panelCls} rounded-xl p-4 flex flex-col gap-4 max-h-[calc(100vh-120px)] overflow-auto custom-scrollbar shadow-lg pointer-events-auto`}
            >
              <div className="flex items-center justify-between">
                <h2
                  className={`text-xs font-bold ${muteCls} uppercase tracking-wider`}
                >
                  {t("control.missionControl.title")}
                </h2>
                <button
                  onClick={() => setIsMissionControlExpanded(false)}
                  className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${muteCls}`}
                  title={t("common.collapse")}
                >
                  <FaChevronUp className="text-sm" />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className={`${textCls} font-medium`}>
                  {isArmed
                    ? t("control.missionControl.systemArmed")
                    : t("control.missionControl.systemDisarmed")}
                </span>
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isArmed ? "bg-red-500" : "bg-gray-400"
                  }`}
                />
              </div>

              {isArmed ? (
                !showDisarmConfirm ? (
                  <button
                    type="button"
                    disabled={commandLoading || !selectedVehicle?.code}
                    onClick={() => setShowDisarmConfirm(true)}
                    className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-white font-medium text-sm transition-colors ${
                      !selectedVehicle?.code
                        ? "bg-gray-400 dark:bg-gray-600 cursor-not-allowed opacity-50"
                        : commandLoading
                          ? "bg-red-400 cursor-not-allowed opacity-60"
                          : "bg-red-600 hover:bg-red-500"
                    }`}
                  >
                    {commandLoading ? (
                      <svg
                        className="animate-spin w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8z"
                        />
                      </svg>
                    ) : (
                      <FaLock className="text-sm" />
                    )}
                    {t("control.missionControl.disarmSystem")}
                  </button>
                ) : (
                  <div className="space-y-2">
                    <SlideToConfirm
                      onConfirm={handleDisarmConfirm}
                      text={t("control.missionControl.slideToDisarm")}
                      confirmText={t("control.missionControl.disarmed")}
                      icon={FaLock}
                      variant="danger"
                    />
                    <button
                      type="button"
                      onClick={() => setShowDisarmConfirm(false)}
                      className={`text-xs ${muteCls} hover:text-gray-700 dark:hover:text-gray-200 transition-colors`}
                    >
                      {t("control.missionControl.cancel")}
                    </button>
                  </div>
                )
              ) : !showArmConfirm ? (
                <button
                  type="button"
                  disabled={commandLoading || !selectedVehicle?.code}
                  onClick={() => setShowArmConfirm(true)}
                  className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-white font-medium text-sm transition-colors ${
                    !selectedVehicle?.code
                      ? "bg-gray-400 dark:bg-gray-600 cursor-not-allowed opacity-50"
                      : commandLoading
                        ? "bg-green-400 cursor-not-allowed opacity-60"
                        : "bg-green-600 hover:bg-green-500"
                  }`}
                >
                  {commandLoading ? (
                    <svg
                      className="animate-spin w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8z"
                      />
                    </svg>
                  ) : (
                    <FaLock className="text-sm" />
                  )}
                  {t("control.missionControl.armSystem")}
                </button>
              ) : (
                <div className="space-y-2">
                  <SlideToConfirm
                    onConfirm={handleArmConfirm}
                    text={t("control.missionControl.slideToArm")}
                    confirmText={t("control.missionControl.armed")}
                    icon={FaLock}
                    variant="success"
                  />
                  <button
                    type="button"
                    onClick={() => setShowArmConfirm(false)}
                    className={`text-xs ${muteCls} hover:text-gray-700 dark:hover:text-gray-200 transition-colors`}
                  >
                    {t("control.missionControl.cancel")}
                  </button>
                </div>
              )}

              {!showDisarmConfirm && !showArmConfirm && (
                <p className={`text-xs ${muteCls}`}>
                  {!selectedVehicle?.code
                    ? t("control.missionControl.noVehicleSelected")
                    : isArmed
                      ? t("control.missionControl.confirmDisarm")
                      : t("control.missionControl.confirmArm")}
                </p>
              )}

              {!isArmed && !showArmConfirm && lastArmFailureMessage && (
                <div className="space-y-2">
                  <p className="text-xs text-red-500">
                    {lastArmFailureMessage}
                  </p>
                  <button
                    type="button"
                    disabled={commandLoading || !selectedVehicle?.code}
                    onClick={handleForceArm}
                    className={`w-full rounded-lg py-2 text-sm font-medium transition-colors ${
                      !selectedVehicle?.code || commandLoading
                        ? "bg-gray-400 dark:bg-gray-600 text-white cursor-not-allowed opacity-60"
                        : "bg-amber-500 hover:bg-amber-400 text-black"
                    }`}
                  >
                    FORCE ARM
                  </button>
                </div>
              )}

              {/* Control modes */}
              <div className="space-y-2">
                {modes.map((m) => (
                  <div key={m.id}>
                    {pendingMode === m.id ? (
                      <div className="space-y-2">
                        <SlideToConfirm
                          onConfirm={handleModeChangeConfirm}
                          text={`${t("control.missionControl.slideTo")} ${m.id}`}
                          confirmText={t("control.missionControl.changed")}
                          icon={m.icon}
                          variant="primary"
                        />
                        <button
                          type="button"
                          onClick={() => setPendingMode(null)}
                          className={`text-xs ${muteCls} hover:text-gray-700 dark:hover:text-gray-200 transition-colors w-full text-center`}
                        >
                          {t("control.missionControl.cancel")}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleModeChangeRequest(m.id)}
                        disabled={
                          activeMode === m.id ||
                          commandLoading ||
                          !selectedVehicle?.code
                        }
                        className={`w-full rounded-lg p-3 text-left flex items-center gap-3 transition-colors border ${
                          activeMode === m.id
                            ? "border-blue-500 bg-blue-500/10 dark:bg-blue-500/20 " +
                              textCls
                            : !selectedVehicle?.code || commandLoading
                              ? "border-gray-200 dark:border-gray-700 bg-transparent opacity-50 cursor-not-allowed " +
                                muteCls
                              : "border-gray-300 dark:border-gray-600 bg-transparent " +
                                muteCls +
                                " hover:border-gray-400 dark:hover:border-gray-500 cursor-pointer"
                        } ${activeMode === m.id ? "cursor-default" : ""}`}
                      >
                        <m.icon className="text-lg shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium">{m.id}</p>
                          <p className={`text-xs ${muteCls} truncate`}>
                            {t(`control.modes.${m.id}`)}
                          </p>
                        </div>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Mission Progress & Clear Mission moved to Vessel Telemetry panel */}
            </motion.section>
          )}
        </AnimatePresence>

        {/* ——— BOTTOM-RIGHT: Camera Feed (WebRTC) ——— */}
        <AnimatePresence mode="wait">
          {!isCameraExpanded ? (
            <motion.button
              key="collapsed-camera"
              layout
              initial={{ width: 48, height: 48, opacity: 0 }}
              animate={{ width: 48, height: 48, opacity: 1 }}
              exit={{ width: 48, height: 48, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              onClick={() => setIsCameraExpanded(true)}
              className={`absolute right-4 bottom-4 ${panelCls} rounded-full p-3 shadow-lg pointer-events-auto flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors`}
              title={t("control.camera.title")}
            >
              <FaVideo className="text-blue-500 dark:text-white text-xl" />
            </motion.button>
          ) : (
            <motion.section
              key="expanded-camera"
              layout
              initial={{ width: 48, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 48, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className={`absolute right-4 bottom-4 ${panelCls} rounded-xl p-4 flex flex-col gap-3 shadow-lg pointer-events-auto`}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2
                  className={`text-xs font-bold ${muteCls} uppercase tracking-wider`}
                >
                  {t("control.camera.title")}
                </h2>
                <button
                  onClick={() => setIsCameraExpanded(false)}
                  className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${muteCls}`}
                  title={t("common.collapse")}
                >
                  <FaChevronDown className="text-sm" />
                </button>
              </div>

              {/* Video area */}
              <div
                className="relative w-full bg-black rounded-lg overflow-hidden"
                style={{ aspectRatio: "16/9" }}
              >
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                {!cameraConnected && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <FaVideoSlash className={`text-3xl ${muteCls}`} />
                    <p className={`text-xs ${muteCls}`}>
                      {cameraConnecting
                        ? t("control.camera.connecting")
                        : t("control.camera.noStream")}
                    </p>
                  </div>
                )}
              </div>

              {/* Stream name + connect */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={streamName}
                  onChange={(e) => setStreamName(e.target.value)}
                  onBlur={(e) =>
                    setStreamName(normalizeStreamName(e.target.value))
                  }
                  placeholder={t("control.camera.streamPlaceholder")}
                  className={`flex-1 text-xs rounded-lg px-3 py-2 border bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 ${textCls} placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-blue-500`}
                />
                <button
                  type="button"
                  onClick={
                    cameraConnected
                      ? disconnectCamera
                      : () => connectCamera(streamName)
                  }
                  disabled={!streamName || cameraConnecting}
                  className={`text-xs px-3 py-2 rounded-lg font-medium text-white transition-colors whitespace-nowrap ${
                    cameraConnected
                      ? "bg-red-600 hover:bg-red-500"
                      : !streamName || cameraConnecting
                        ? "bg-gray-400 dark:bg-gray-600 cursor-not-allowed opacity-50"
                        : "bg-blue-600 hover:bg-blue-500"
                  }`}
                >
                  {cameraConnecting
                    ? t("control.camera.connecting")
                    : cameraConnected
                      ? t("control.camera.disconnect")
                      : t("control.camera.connect")}
                </button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Control;
