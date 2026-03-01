import { useState, useEffect, useRef, useCallback } from "react";
import useTitle from "../hooks/useTitle";
import useTranslation from "../hooks/useTranslation";
import useControlCommand from "../hooks/useControlCommand";
import useVehicleData from "../hooks/useVehicleData";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { HeadingIndicator } from "react-flight-indicators";
import { motion, AnimatePresence } from "framer-motion";
import { VehicleDropdown } from "../components/Widgets/Vehicle";
import SlideToConfirm from "../components/ui/SlideToConfirm";
import { toast } from "../components/ui";
import {
  FaCompass,
  FaSatelliteDish,
  FaWind,
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

const MAP_CENTER = [45.4215, -75.6972];
const MAP_ZOOM = 14;

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

const Control = () => {
  useTitle("Control");
  const { t } = useTranslation();
  const { sendCommand, isLoading: commandLoading } = useControlCommand();
  const { vehicles } = useVehicleData();
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [activeMode, setActiveMode] = useState("MANUAL");
  const [leftMotor, setLeftMotor] = useState(72);
  const [rightMotor, setRightMotor] = useState(68);
  const [powerOn, setPowerOn] = useState(false);
  const [isArmed, setIsArmed] = useState(true);
  const heading = 184; // Mock heading value

  // Confirmation states
  const [showDisarmConfirm, setShowDisarmConfirm] = useState(false);
  const [showArmConfirm, setShowArmConfirm] = useState(false);
  const [pendingMode, setPendingMode] = useState(null);

  // Search coordinates state
  const [searchQuery, setSearchQuery] = useState("");
  const [mapCenter, setMapCenter] = useState(MAP_CENTER);
  const [mapZoom, setMapZoom] = useState(MAP_ZOOM);

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
      setStreamName(selectedVehicle.code.toLowerCase().replace(/\s+/g, "-"));
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
      if (!name) return;
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

        const res = await fetch(`/mediamtx/${name}/whep`, {
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

      // Parse different coordinate formats
      // Format 1: lat, lng or lat,lng
      // Format 2: lat lng
      // Format 3: decimal degrees

      let lat, lng;

      // Try comma-separated format first
      if (query.includes(",")) {
        const parts = query.split(",").map((s) => s.trim());
        if (parts.length === 2) {
          lat = parseFloat(parts[0]);
          lng = parseFloat(parts[1]);
        }
      }
      // Try space-separated format
      else {
        const parts = query.split(/\s+/);
        if (parts.length === 2) {
          lat = parseFloat(parts[0]);
          lng = parseFloat(parts[1]);
        }
      }

      // Validate coordinates
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

  const handleDisarmConfirm = async () => {
    setShowDisarmConfirm(false);
    toast.info(t("control.missionControl.sendingCommand"));
    const result = await sendCommand(selectedVehicle?.code, "disarm");
    if (result.success) {
      setIsArmed(false);
      setPowerOn(false);
      toast.success(t("control.missionControl.disarmSuccess"));
    } else {
      handleCommandError(result);
    }
  };

  const handleArmConfirm = async () => {
    setShowArmConfirm(false);
    toast.info(t("control.missionControl.sendingCommand"));
    const result = await sendCommand(selectedVehicle?.code, "arm");
    if (result.success) {
      setIsArmed(true);
      toast.success(t("control.missionControl.armSuccess"));
    } else {
      handleCommandError(result);
    }
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
    const result = await sendCommand(
      selectedVehicle?.code,
      "set_mode",
      modeToSet,
    );
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
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            noWrap
          />
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
              className={`absolute left-4 top-4 ${panelCls} rounded-full p-3 shadow-lg pointer-events-auto flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors`}
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
              className={`absolute left-4 top-4 ${panelCls} rounded-xl p-4 flex flex-col gap-4 max-h-[calc(100vh-120px)] overflow-auto custom-scrollbar shadow-lg pointer-events-auto`}
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
                  title="Collapse"
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
                  heading={heading}
                  showBox={false}
                />
              </div>

              {/* Speed & HDOP */}
              <div className="grid grid-cols-2 gap-3">
                <div className={`${panelCls} rounded-lg p-3`}>
                  <p className={`text-xs ${muteCls} mb-1`}>
                    {t("control.vesselTelemetry.speed")}
                  </p>
                  <p className="text-xl font-bold text-blue-500">4.2 kn</p>
                </div>
                <div className={`${panelCls} rounded-lg p-3`}>
                  <p className={`text-xs ${muteCls} mb-1`}>
                    {t("control.vesselTelemetry.hdop")}
                  </p>
                  <p className="text-xl font-bold text-green-500">0.92</p>
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
                <p className={`text-sm ${textCls}`}>45.4215° N, 75.6972° W</p>
              </div>

              {/* Sensor readings */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className={`flex items-center gap-2 ${muteCls}`}>
                    <FaSatelliteDish className="text-blue-500" />{" "}
                    {t("control.vesselTelemetry.satellites")}
                  </span>
                  <span className={textCls}>18 Fixed</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className={`flex items-center gap-2 ${muteCls}`}>
                    <FaTachometerAlt className="text-blue-500" />{" "}
                    {t("control.vesselTelemetry.latency")}
                  </span>
                  <span className={textCls}>42ms</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className={`flex items-center gap-2 ${muteCls}`}>
                    <FaWind className="text-blue-500" />{" "}
                    {t("control.vesselTelemetry.windSpd")}
                  </span>
                  <span className={textCls}>12.4 km/h</span>
                </div>
              </div>

              {/* Mission Progress */}
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
                        01 Entrance Buoy
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
                      <span className={`text-xs font-medium text-blue-500`}>
                        33%
                      </span>
                    </div>
                    <div
                      className={`w-full h-2 ${barTrackCls} rounded-full overflow-hidden`}
                    >
                      <div
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{ width: "33%" }}
                      />
                    </div>
                    <p className={`text-xs ${muteCls} mt-1`}>
                      1 {t("control.missionControl.waypointsOf")} 3{" "}
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
              className="absolute top-4 bg-white dark:bg-black hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 p-3 rounded-full shadow-lg transition-all border border-gray-200 dark:border-gray-600 flex items-center justify-center pointer-events-auto"
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
              className={`absolute top-4 ${panelCls} rounded-xl p-2 shadow-lg pointer-events-auto`}
              style={{
                left: isVesselTelemetryExpanded ? "350px" : "80px",
              }}
            >
              <div className="flex items-center justify-end mb-2">
                <button
                  onClick={() => setIsSearchExpanded(false)}
                  className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${muteCls}`}
                  title="Collapse"
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
                    title="Search"
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
                  title="Collapse"
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
                      onChange={(e) => setLeftMotor(Number(e.target.value))}
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
                      onChange={(e) => setRightMotor(Number(e.target.value))}
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
              className={`absolute right-4 top-4 ${panelCls} rounded-full p-3 shadow-lg pointer-events-auto flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors`}
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
              className={`absolute right-4 top-4 ${panelCls} rounded-xl p-4 flex flex-col gap-4 max-h-[calc(100vh-120px)] overflow-auto custom-scrollbar shadow-lg pointer-events-auto`}
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
                  title="Collapse"
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
                  title="Collapse"
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
                {cameraConnected && (
                  <span className="absolute top-2 left-2 flex items-center gap-1 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    LIVE
                  </span>
                )}
              </div>

              {/* Stream name + connect */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={streamName}
                  onChange={(e) => setStreamName(e.target.value)}
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
