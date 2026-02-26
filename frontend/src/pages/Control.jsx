import { useState, useEffect } from "react";
import useTitle from "../hooks/useTitle";
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

  // Handle coordinate search
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
        toast.success("Location set successfully!");
      } else {
        toast.error(
          "Invalid coordinates! Please enter valid latitude and longitude.",
        );
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
    { id: "MANUAL", label: "Direct operator control", icon: FaCog },
    { id: "AUTO", label: "Executing Waypoints", icon: FaArrowUp },
    { id: "LOITER", label: "Station Keeping", icon: TbAnchor },
    { id: "RTL", label: "Return to Launch", icon: FaHome },
  ];

  // Handlers
  const handleDisarmConfirm = () => {
    setIsArmed(false);
    setPowerOn(false);
    setShowDisarmConfirm(false);
    // Add your disarm logic here
  };

  const handleArmConfirm = () => {
    setIsArmed(true);
    setShowArmConfirm(false);
    // Add your arm logic here
  };

  const handleModeChangeRequest = (modeId) => {
    if (activeMode !== modeId) {
      setPendingMode(modeId);
    }
  };

  const handleModeChangeConfirm = () => {
    if (pendingMode) {
      setActiveMode(pendingMode);
      setPendingMode(null);
      // Add your mode change logic here
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
              title="Vessel Telemetry"
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
                  Vessel Telemetry
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
                  placeholder="Select a vessel to control"
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
                  <p className={`text-xs ${muteCls} mb-1`}>SPEED</p>
                  <p className="text-xl font-bold text-blue-500">4.2 kn</p>
                </div>
                <div className={`${panelCls} rounded-lg p-3`}>
                  <p className={`text-xs ${muteCls} mb-1`}>HDOP</p>
                  <p className="text-xl font-bold text-green-500">0.92</p>
                </div>
              </div>

              {/* GPS Position */}
              <div className={`${panelCls} rounded-lg p-3`}>
                <p
                  className={`text-xs ${muteCls} mb-1 flex items-center gap-1`}
                >
                  <MdMyLocation className="text-sm" /> GPS POSITION
                </p>
                <p className={`text-sm ${textCls}`}>45.4215° N, 75.6972° W</p>
              </div>

              {/* Sensor readings */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className={`flex items-center gap-2 ${muteCls}`}>
                    <FaSatelliteDish className="text-blue-500" /> Satellites
                  </span>
                  <span className={textCls}>18 Fixed</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className={`flex items-center gap-2 ${muteCls}`}>
                    <FaTachometerAlt className="text-blue-500" /> Latency
                  </span>
                  <span className={textCls}>42ms</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className={`flex items-center gap-2 ${muteCls}`}>
                    <FaWind className="text-blue-500" /> Wind Spd
                  </span>
                  <span className={textCls}>12.4 km/h</span>
                </div>
              </div>
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
              title="Search Coordinates"
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
                  placeholder="Search coordinates... (e.g., -6.2088, 106.8456)"
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
              title="Thrust Control"
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
                  Thrust Control
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
                    onClick={() => setPowerOn(!powerOn)}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                      powerOn
                        ? "bg-red-600 hover:bg-red-500"
                        : "bg-red-700/70 dark:bg-red-900/50 hover:bg-red-600/80"
                    }`}
                  >
                    <FaPowerOff className="text-white text-xl" />
                  </button>
                  <button
                    type="button"
                    disabled={!isArmed}
                    className={`flex items-center justify-center gap-2 w-full py-2 rounded-lg text-white text-sm font-medium transition-all ${
                      isArmed
                        ? "bg-blue-600 hover:bg-blue-500 cursor-pointer"
                        : "bg-gray-400 dark:bg-gray-600 cursor-not-allowed opacity-50"
                    }`}
                  >
                    TEST MOTORS
                  </button>
                </div>

                {/* Right Column: Motor Sliders */}
                <div className="space-y-4">
                  <div>
                    <div
                      className={`flex justify-between text-xs mb-2 ${muteCls}`}
                    >
                      <span>LEFT MOTOR</span>
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
                      disabled={!isArmed}
                      className={`w-full h-2 rounded-lg appearance-none slider motor-slider-left ${
                        isArmed
                          ? "cursor-pointer"
                          : "cursor-not-allowed opacity-50"
                      }`}
                    />
                  </div>
                  <div>
                    <div
                      className={`flex justify-between text-xs mb-2 ${muteCls}`}
                    >
                      <span>RIGHT MOTOR</span>
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
                      disabled={!isArmed}
                      className={`w-full h-2 rounded-lg appearance-none slider motor-slider-right ${
                        isArmed
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
              title="Mission Control"
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
                  Mission Control
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
                  {isArmed ? "SYSTEM ARMED" : "SYSTEM DISARMED"}
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
                    onClick={() => setShowDisarmConfirm(true)}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium text-sm transition-colors"
                  >
                    <FaLock className="text-sm" /> DISARM SYSTEM
                  </button>
                ) : (
                  <div className="space-y-2">
                    <SlideToConfirm
                      onConfirm={handleDisarmConfirm}
                      text="Slide to disarm"
                      confirmText="Disarmed!"
                      icon={FaLock}
                      variant="danger"
                    />
                    <button
                      type="button"
                      onClick={() => setShowDisarmConfirm(false)}
                      className={`text-xs ${muteCls} hover:text-gray-700 dark:hover:text-gray-200 transition-colors`}
                    >
                      Cancel
                    </button>
                  </div>
                )
              ) : !showArmConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowArmConfirm(true)}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white font-medium text-sm transition-colors"
                >
                  <FaLock className="text-sm" /> ARM SYSTEM
                </button>
              ) : (
                <div className="space-y-2">
                  <SlideToConfirm
                    onConfirm={handleArmConfirm}
                    text="Slide to arm"
                    confirmText="Armed!"
                    icon={FaLock}
                    variant="success"
                  />
                  <button
                    type="button"
                    onClick={() => setShowArmConfirm(false)}
                    className={`text-xs ${muteCls} hover:text-gray-700 dark:hover:text-gray-200 transition-colors`}
                  >
                    Cancel
                  </button>
                </div>
              )}

              {!showDisarmConfirm && !showArmConfirm && (
                <p className={`text-xs ${muteCls}`}>
                  {isArmed
                    ? "Slide to confirm disarm action."
                    : "Slide to confirm arm action."}
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
                          text={`Slide to ${m.id}`}
                          confirmText="Changed!"
                          icon={m.icon}
                          variant="primary"
                        />
                        <button
                          type="button"
                          onClick={() => setPendingMode(null)}
                          className={`text-xs ${muteCls} hover:text-gray-700 dark:hover:text-gray-200 transition-colors w-full text-center`}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleModeChangeRequest(m.id)}
                        disabled={activeMode === m.id}
                        className={`w-full rounded-lg p-3 text-left flex items-center gap-3 transition-colors border ${
                          activeMode === m.id
                            ? "border-blue-500 bg-blue-500/10 dark:bg-blue-500/20 " +
                              textCls
                            : "border-gray-300 dark:border-gray-600 bg-transparent " +
                              muteCls +
                              " hover:border-gray-400 dark:hover:border-gray-500 cursor-pointer"
                        } ${activeMode === m.id ? "cursor-default" : ""}`}
                      >
                        <m.icon className="text-lg shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium">{m.id}</p>
                          <p className={`text-xs ${muteCls} truncate`}>
                            {m.label}
                          </p>
                        </div>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Mission Progress */}
              <div>
                <p
                  className={`text-xs ${muteCls} uppercase tracking-wider mb-2`}
                >
                  Mission Progress
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
                    <p className={`text-xs ${muteCls}`}>Active target</p>
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs ${muteCls}`}>
                        Overall Progress
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
                      1 of 3 waypoints completed
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-colors"
              >
                <FaTrashAlt className="text-sm" /> CLEAR MISSION
              </button>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Control;
