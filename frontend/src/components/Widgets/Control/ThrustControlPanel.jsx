import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import useMapTile from "../../../hooks/useMapTile";
import usvPointIcon from "../../../assets/usv-point.webp";
import {
  FaTachometerAlt,
  FaChevronDown,
  FaExpand,
  FaCompress,
  FaLock,
  FaUnlock,
  FaCog,
  FaArrowUp,
  FaHome,
} from "react-icons/fa";
import { TbAnchor } from "react-icons/tb";
import VirtualJoystick from "../../ui/VirtualJoystick";
import SlideToConfirm from "../../ui/SlideToConfirm";
import useTranslation from "../../../hooks/useTranslation";
import { useVehicleConnectionStatus } from "../../../hooks";
import { getVehicleStatusColor } from "../../../utils/vehicleStatus";

const panelCls =
  "bg-white dark:bg-black border border-gray-200 dark:border-gray-600";
const textCls = "text-gray-900 dark:text-white";
const muteCls = "text-gray-500 dark:text-gray-400";

const MODES = [
  { id: "MANUAL", icon: FaCog },
  { id: "AUTO", icon: FaArrowUp },
  { id: "HOLD", icon: FaLock },
  { id: "LOITER", icon: TbAnchor },
  { id: "RTL", icon: FaHome },
];

const DEFAULT_POS = [-6.2, 106.816];

const SpinnerSvg = () => (
  <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
  </svg>
);

const createShipIcon = (heading = 0) =>
  L.divIcon({
    html: `<div style="width:36px;height:36px;display:flex;align-items:center;justify-content:center;transform:rotate(${90 - heading}deg);filter:drop-shadow(0 2px 6px rgba(0,0,0,0.5));">
      <img src="${usvPointIcon}" style="width:100%;height:100%;object-fit:contain;" />
    </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    className: "usv-minimap-icon",
  });

// ── Module-level: never re-created, map won't remount ─────────────────────────
const MapSyncer = ({ position }) => {
  const map = useMap();
  const prevRef = useRef(null);
  useEffect(() => {
    if (!position) return;
    const [lat, lng] = position;
    const prev = prevRef.current;
    if (
      !prev ||
      Math.abs(lat - prev[0]) > 0.00001 ||
      Math.abs(lng - prev[1]) > 0.00001
    ) {
      map.setView(position, map.getZoom(), { animate: true, duration: 1 });
      prevRef.current = position;
    }
  }, [position, map]);
  return null;
};

const FullscreenMiniMap = ({
  vehiclePosition,
  vehicleTrail,
  vehicleHeading,
}) => {
  const { url: tileUrl } = useMapTile();
  return (
  <MapContainer
    center={vehiclePosition || DEFAULT_POS}
    zoom={16}
    className="w-full h-full"
    style={{ height: "100%", width: "100%" }}
    zoomControl={false}
    scrollWheelZoom={false}
    doubleClickZoom={false}
    attributionControl={false}
  >
    <TileLayer url={tileUrl} />
    {vehicleTrail && vehicleTrail.length > 1 && (
      <Polyline
        positions={vehicleTrail}
        color="#3b82f6"
        weight={2.5}
        opacity={0.7}
      />
    )}
    {vehiclePosition && (
      <Marker
        position={vehiclePosition}
        icon={createShipIcon(vehicleHeading ?? 0)}
      />
    )}
    <MapSyncer position={vehiclePosition} />
  </MapContainer>
  );
};
// ─────────────────────────────────────────────────────────────────────────────

const ThrustControlPanel = ({
  isExpanded,
  onExpand,
  onCollapse,
  disabled = false,
  isArmed,
  selectedVehicle,
  vehicles = [],
  onVehicleChange,
  activeMode,
  thrusterThrottle,
  thrusterSteering,
  onThrottleChange,
  onSteeringChange,
  onTestMotors,
  commandLoading,
  showDisarmConfirm,
  setShowDisarmConfirm,
  showArmConfirm,
  setShowArmConfirm,
  pendingMode,
  setPendingMode,
  lastArmFailureMessage,
  onDisarmConfirm,
  onArmConfirm,
  onForceArm,
  onModeChangeRequest,
  onModeChangeConfirm,
  vehiclePosition,
  vehicleTrail,
  vehicleHeading = 0,
}) => {
  const { t } = useTranslation();
  const { getVehicleStatus } = useVehicleConnectionStatus();
  const [isMobileFullscreen, setIsMobileFullscreen] = useState(false);
  const [vehicleDropOpen, setVehicleDropOpen] = useState(false);
  const [vehicleDropPos, setVehicleDropPos] = useState({ top: 0, left: 0 });
  const vehicleDropBtnRef = useRef(null);
  const prevModeRef = useRef(null);

  // Dispatch close event when component unmounts (e.g. navigating away from Control page)
  useEffect(() => {
    return () => {
      window.dispatchEvent(new Event("thrust-fullscreen-close"));
    };
  }, []);

  const openVehicleDrop = () => {
    if (vehicleDropBtnRef.current) {
      const r = vehicleDropBtnRef.current.getBoundingClientRect();
      setVehicleDropPos({ top: r.bottom + 4, left: r.left });
    }
    setVehicleDropOpen((o) => !o);
  };

  const controlDisabled =
    disabled || !isArmed || !selectedVehicle?.code || activeMode !== "MANUAL";
  const noVehicle = !selectedVehicle?.code;
  const confirmActive = showDisarmConfirm || showArmConfirm || !!pendingMode;

  const openFullscreen = () => {
    prevModeRef.current = activeMode;
    setIsMobileFullscreen(true);
    window.dispatchEvent(new Event("thrust-fullscreen-open"));
  };

  const closeFullscreen = () => {
    setIsMobileFullscreen(false);
    setShowDisarmConfirm?.(false);
    setShowArmConfirm?.(false);
    setPendingMode?.(null);
    window.dispatchEvent(new Event("thrust-fullscreen-close"));
  };

  // ── Mobile Fullscreen ────────────────────────────────────────────────────────
  if (isMobileFullscreen) {
    const HEADER_H = 57; // px — header fixed height
    const FOOTER_H = 36; // px — footbar fixed height

    return createPortal(
      <>
        <style>{`.usv-minimap-icon { background:none!important; border:none!important; }`}</style>

        {/* ── Main fullscreen container ─────────────────────────────────────
            z-[9000]: BELOW sidebar (z-9011) so user can open sidebar from footbar.
            inset-0: starts from top:0 so bg covers entire screen — no gap.
            Header/footbar overlap naturally from their higher z-index.        */}
        <div className="fixed inset-0 z-[9000] flex flex-col bg-white dark:bg-gray-950 text-gray-900 dark:text-white">
          {/* Spacer so topbar sits below header */}
          <div style={{ height: HEADER_H }} className="shrink-0" />

          {/* ── Top control bar */}
          <div className="shrink-0 bg-gray-50 dark:bg-black border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2 px-3 py-2">
              {/* Vehicle selector */}
              <div className="relative shrink-0">
                <button
                  ref={vehicleDropBtnRef}
                  type="button"
                  onClick={openVehicleDrop}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-800 dark:text-white text-[11px] font-medium transition-colors min-w-[80px] max-w-[130px]"
                >
                  {selectedVehicle ? (
                    <>
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${getVehicleStatusColor(getVehicleStatus(selectedVehicle.code))}`}
                      />
                      <span className="truncate">{selectedVehicle.name}</span>
                    </>
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400 truncate">
                      Select USV
                    </span>
                  )}
                  <FaChevronDown
                    className={`text-[8px] text-gray-400 shrink-0 transition-transform ${vehicleDropOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {vehicleDropOpen &&
                  createPortal(
                    <>
                      {/* Backdrop to close dropdown */}
                      <div
                        className="fixed inset-0 z-[9098]"
                        onClick={() => setVehicleDropOpen(false)}
                      />
                      <div
                        className="fixed z-[9099] w-44 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden"
                        style={{
                          top: vehicleDropPos.top,
                          left: vehicleDropPos.left,
                        }}
                      >
                        {vehicles.map((v) => {
                          const status = getVehicleStatus(v.code);
                          const isSelected = selectedVehicle?.id === v.id;
                          return (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => {
                                onVehicleChange?.(v);
                                setVehicleDropOpen(false);
                              }}
                              className={`w-full flex items-center gap-2 px-3 py-2.5 text-left text-[11px] transition-colors ${
                                isSelected
                                  ? "bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-white"
                                  : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                              }`}
                            >
                              <span
                                className={`w-2.5 h-2.5 rounded-full shrink-0 ${getVehicleStatusColor(status)}`}
                              />
                              <span className="truncate font-medium">
                                {v.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </>,
                    document.body,
                  )}
              </div>

              {/* ARM / DISARM */}
              <button
                type="button"
                disabled={commandLoading || noVehicle || disabled}
                onClick={() =>
                  isArmed ? setShowDisarmConfirm(true) : setShowArmConfirm(true)
                }
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white font-bold text-[11px] transition-colors shrink-0 ${
                  noVehicle
                    ? "bg-gray-700 cursor-not-allowed opacity-50"
                    : commandLoading
                      ? "opacity-60 cursor-not-allowed " +
                        (isArmed ? "bg-red-700" : "bg-green-700")
                      : isArmed
                        ? "bg-red-600 hover:bg-red-500 active:bg-red-700"
                        : "bg-green-600 hover:bg-green-500 active:bg-green-700"
                }`}
              >
                {commandLoading ? (
                  <SpinnerSvg />
                ) : isArmed ? (
                  <FaLock className="text-[9px]" />
                ) : (
                  <FaUnlock className="text-[9px]" />
                )}
                {isArmed ? "DISARM" : "ARM"}
              </button>

              {/* Mode pills */}
              <div className="flex-1 flex gap-1.5 overflow-x-auto scrollbar-hide">
                {MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onModeChangeRequest(m.id)}
                    disabled={
                      activeMode === m.id || commandLoading || noVehicle || disabled
                    }
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors shrink-0 ${
                      activeMode === m.id
                        ? "bg-blue-600 text-white"
                        : noVehicle || commandLoading
                          ? "bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                          : "bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700 active:bg-gray-400 dark:active:bg-gray-600"
                    }`}
                  >
                    <m.icon className="text-[9px]" />
                    {m.id}
                  </button>
                ))}
              </div>

              {/* TEST MOTORS */}
              <button
                type="button"
                onClick={onTestMotors}
                disabled={controlDisabled}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider shrink-0 transition-colors ${
                  !controlDisabled
                    ? "bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white"
                    : "bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                }`}
              >
                {t("control.thrustControl.testMotors")}
              </button>

              {/* Close */}
              <button
                onClick={closeFullscreen}
                className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors shrink-0"
                title="Exit fullscreen"
              >
                <FaCompress className="text-gray-500 dark:text-gray-400 text-sm" />
              </button>
            </div>
          </div>

          {/* ── Body */}
          <div
            className="flex-1 flex items-stretch min-h-0"
            style={{ paddingBottom: FOOTER_H }}
          >
            {/* Throttle joystick */}
            <div className="shrink-0 flex flex-col items-center justify-center gap-1 px-2 bg-gray-100 dark:bg-gray-950">
              <VirtualJoystick
                size={130}
                axis="vertical"
                onChange={(throttle) => onThrottleChange(throttle)}
                disabled={controlDisabled}
              />
              <span className="text-[9px] text-gray-500 tracking-widest uppercase">
                Throttle
              </span>
            </div>

            {/* Map center */}
            <div className="flex-1 relative min-w-0 flex items-center justify-center py-2 px-1">
              <div className="w-full h-full rounded-xl overflow-hidden">
                <FullscreenMiniMap
                  vehiclePosition={vehiclePosition}
                  vehicleTrail={vehicleTrail}
                  vehicleHeading={vehicleHeading}
                />
              </div>
              {!vehiclePosition && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="bg-gray-900/70 dark:bg-black/60 text-gray-300 dark:text-gray-400 text-xs px-3 py-1.5 rounded-full">
                    No GPS
                  </span>
                </div>
              )}
            </div>

            {/* Steering joystick */}
            <div className="shrink-0 flex flex-col items-center justify-center gap-1 px-2 bg-gray-100 dark:bg-gray-950">
              <VirtualJoystick
                size={130}
                axis="horizontal"
                onChange={(_, steering) => onSteeringChange(steering)}
                disabled={controlDisabled}
              />
              <span className="text-[9px] text-gray-500 tracking-widest uppercase">
                Steering
              </span>
            </div>
          </div>
        </div>

        {/* ── Floating confirm overlay (separate element, z-[9500] above map) ── */}
        {confirmActive && (
          <div
            className="fixed z-[9500] flex items-center justify-center bg-black/75 backdrop-blur-sm"
            style={{ top: HEADER_H, left: 0, right: 0, bottom: FOOTER_H }}
          >
            <div className="w-full max-w-xs mx-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 space-y-3 shadow-2xl">
              {showDisarmConfirm && (
                <>
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    Confirm action
                  </p>
                  <SlideToConfirm
                    onConfirm={onDisarmConfirm}
                    text={t("control.missionControl.slideToDisarm")}
                    confirmText={t("control.missionControl.disarmed")}
                    icon={FaLock}
                    variant="danger"
                  />
                  <button
                    onClick={() => setShowDisarmConfirm(false)}
                    className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 w-full text-center py-1 transition-colors"
                  >
                    {t("control.missionControl.cancel")}
                  </button>
                </>
              )}
              {showArmConfirm && (
                <>
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    Confirm action
                  </p>
                  <SlideToConfirm
                    onConfirm={onArmConfirm}
                    text={t("control.missionControl.slideToArm")}
                    confirmText={t("control.missionControl.armed")}
                    icon={FaUnlock}
                    variant="success"
                  />
                  <button
                    onClick={() => setShowArmConfirm(false)}
                    className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 w-full text-center py-1 transition-colors"
                  >
                    {t("control.missionControl.cancel")}
                  </button>
                </>
              )}
              {pendingMode &&
                !showDisarmConfirm &&
                !showArmConfirm &&
                (() => {
                  const m = MODES.find((x) => x.id === pendingMode);
                  return m ? (
                    <>
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        Change mode to{" "}
                        <span className="text-gray-900 dark:text-white font-bold">
                          {pendingMode}
                        </span>
                      </p>
                      <SlideToConfirm
                        onConfirm={onModeChangeConfirm}
                        text={`${t("control.missionControl.slideTo")} ${pendingMode}`}
                        confirmText={t("control.missionControl.changed")}
                        icon={m.icon}
                        variant="primary"
                      />
                      <button
                        onClick={() => setPendingMode(null)}
                        className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 w-full text-center py-1 transition-colors"
                      >
                        {t("control.missionControl.cancel")}
                      </button>
                    </>
                  ) : null;
                })()}
            </div>
          </div>
        )}
      </>,
      document.body,
    );
  }

  // ── Normal (non-fullscreen) render ────────────────────────────────────────
  return (
    <AnimatePresence mode="wait">
      {!isExpanded ? (
        <motion.button
          key="collapsed-thrust"
          layout
          initial={{ width: 48, height: 48, opacity: 0 }}
          animate={{ width: 48, height: 48, opacity: 1 }}
          exit={{ width: 48, height: 48, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          onClick={onExpand}
          className={`absolute left-1/2 bottom-5 -translate-x-1/2 ${panelCls} rounded-full p-3 shadow-lg pointer-events-auto flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors`}
          title={t("control.thrustControl.title")}
        >
          <FaTachometerAlt className="text-blue-500 dark:text-white text-xl" />
        </motion.button>
      ) : (
        <motion.section
          key="expanded-thrust"
          layout
          initial={{ width: 48, opacity: 0 }}
          animate={{ width: 500, opacity: 1 }}
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
            <div className="flex items-center gap-1">
              <button
                onClick={openFullscreen}
                className={`lg:hidden p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${muteCls}`}
                title="Fullscreen joystick"
              >
                <FaExpand className="text-sm" />
              </button>
              <button
                onClick={onCollapse}
                className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${muteCls}`}
                title={t("common.collapse")}
              >
                <FaChevronDown className="text-sm" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center gap-1.5">
              <VirtualJoystick
                size={130}
                axis="vertical"
                onChange={(throttle) => onThrottleChange(throttle)}
                disabled={controlDisabled}
              />
              <p className={`text-xs ${muteCls}`}>Throttle</p>
            </div>

            <div className="flex-1 flex flex-col gap-3">
              <div className="rounded-lg px-3 py-2 text-xs space-y-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <span className={muteCls}>Throttle</span>
                  <span
                    className={`font-mono font-semibold ${
                      thrusterThrottle > 0
                        ? "text-blue-500"
                        : thrusterThrottle < 0
                          ? "text-orange-500"
                          : muteCls
                    }`}
                  >
                    {thrusterThrottle > 0 ? "+" : ""}
                    {thrusterThrottle}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={muteCls}>Steering</span>
                  <span
                    className={`font-mono font-semibold ${thrusterSteering !== 0 ? "text-blue-500" : muteCls}`}
                  >
                    {thrusterSteering > 0 ? "+" : ""}
                    {thrusterSteering}%
                  </span>
                </div>
              </div>

              {activeMode !== "MANUAL" && (
                <p className="text-xs text-center text-amber-500 dark:text-amber-400">
                  Switch to MANUAL mode to control thrust
                </p>
              )}

              <button
                type="button"
                onClick={onTestMotors}
                disabled={controlDisabled}
                className={`flex items-center justify-center gap-2 w-full py-2 rounded-lg text-white text-sm font-medium transition-all ${
                  !controlDisabled
                    ? "bg-blue-600 hover:bg-blue-500 cursor-pointer"
                    : "bg-gray-400 dark:bg-gray-600 cursor-not-allowed opacity-50"
                }`}
              >
                {t("control.thrustControl.testMotors")}
              </button>
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <VirtualJoystick
                size={130}
                axis="horizontal"
                onChange={(_, steering) => onSteeringChange(steering)}
                disabled={controlDisabled}
              />
              <p className={`text-xs ${muteCls}`}>Steering</p>
            </div>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
};

export default ThrustControlPanel;
