import { motion, AnimatePresence } from "framer-motion";
import {
  FaCompass, FaChevronUp, FaBolt, FaTachometerAlt, FaSignal, FaTrashAlt,
} from "react-icons/fa";
import { MdMyLocation } from "react-icons/md";
import { TbRoute } from "react-icons/tb";
import { HeadingIndicator } from "react-flight-indicators";
import { VehicleDropdown } from "../Vehicle";
import useTranslation from "../../../hooks/useTranslation";

const panelCls = "bg-white dark:bg-black border border-gray-200 dark:border-gray-600";
const textCls  = "text-gray-900 dark:text-white";
const muteCls  = "text-gray-500 dark:text-gray-400";
const barTrackCls = "bg-gray-200 dark:bg-gray-700";

const VesselTelemetryPanel = ({
  isExpanded,
  onExpand,
  onCollapse,
  vehicles,
  selectedVehicle,
  onVehicleChange,
  telemetryData,
  getActiveMissions,
}) => {
  const { t } = useTranslation();

  return (
    <AnimatePresence mode="wait">
      {!isExpanded ? (
        <motion.button
          key="collapsed-vessel"
          layout
          initial={{ width: 48, height: 48, opacity: 0 }}
          animate={{ width: 48, height: 48, opacity: 1 }}
          exit={{ width: 48, height: 48, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          onClick={onExpand}
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
          className={`absolute left-4 top-7 ${panelCls} rounded-xl p-4 flex flex-col gap-4 max-h-[calc(100vh-156px)] overflow-auto custom-scrollbar shadow-lg pointer-events-auto`}
        >
          <div className="flex items-center justify-between">
            <h2 className={`text-xs font-bold ${muteCls} uppercase tracking-wider`}>
              {t("control.vesselTelemetry.title")}
            </h2>
            <button
              onClick={onCollapse}
              className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${muteCls}`}
              title={t("common.collapse")}
            >
              <FaChevronUp className="text-sm" />
            </button>
          </div>

          <div className="mb-2">
            <VehicleDropdown
              vehicles={vehicles}
              selectedVehicle={selectedVehicle}
              onVehicleChange={onVehicleChange}
              placeholder={t("control.vesselTelemetry.placeholder")}
              showPlaceholder={true}
            />
          </div>

          <div className="flex flex-col items-center">
            <HeadingIndicator size={300} heading={telemetryData.heading} showBox={false} />
          </div>

          {/* GPS Status */}
          <div className="flex items-center justify-center">
            {(() => {
              const raw = telemetryData.gps_status;
              if (raw === null || raw === undefined) {
                return <span className={`text-sm md:text-base font-semibold ${muteCls}`}>{t("control.vesselTelemetry.gpsUnknown")}</span>;
              }
              if (typeof raw === "boolean") {
                return (
                  <span className={`text-sm md:text-base font-semibold ${raw ? "text-green-500" : "text-yellow-500 dark:text-yellow-400"}`}>
                    {raw ? t("control.vesselTelemetry.gpsFix") : t("control.vesselTelemetry.gpsNoFix")}
                  </span>
                );
              }
              const numeric = typeof raw === "string" ? parseInt(raw, 10) : raw;
              const hasFix = Number.isFinite(numeric) && numeric >= 3;
              return (
                <span className={`text-sm md:text-base font-semibold ${hasFix ? "text-green-500" : "text-yellow-500 dark:text-yellow-400"}`}>
                  {hasFix ? t("control.vesselTelemetry.gpsFix") : t("control.vesselTelemetry.gpsNoFix")}
                </span>
              );
            })()}
          </div>

          {/* Speed & Altitude */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`${panelCls} rounded-lg p-3`}>
              <p className={`text-xs ${muteCls} mb-1`}>{t("control.vesselTelemetry.speed")}</p>
              <p className="text-xl font-bold text-blue-500">
                {selectedVehicle ? `${telemetryData.speed.toFixed(1)} m/s` : "N/A"}
              </p>
            </div>
            <div className={`${panelCls} rounded-lg p-3`}>
              <p className={`text-xs ${muteCls} mb-1`}>{t("control.vesselTelemetry.altitude")}</p>
              <p className="text-xl font-bold text-green-500">
                {selectedVehicle && telemetryData.altitude !== null
                  ? `${telemetryData.altitude.toFixed(1)} m`
                  : "N/A"}
              </p>
            </div>
          </div>

          {/* GPS Position */}
          <div className={`${panelCls} rounded-lg p-3`}>
            <p className={`text-xs ${muteCls} mb-1 flex items-center gap-1`}>
              <MdMyLocation className="text-sm" /> {t("control.vesselTelemetry.gpsPosition")}
            </p>
            <p className={`text-sm ${textCls}`}>
              {selectedVehicle && telemetryData.latitude && telemetryData.longitude
                ? `${telemetryData.latitude.toFixed(4)}° ${telemetryData.latitude >= 0 ? "N" : "S"}, ${Math.abs(telemetryData.longitude).toFixed(4)}° ${telemetryData.longitude >= 0 ? "E" : "W"}`
                : "N/A"}
            </p>
          </div>

          {/* Sensor readings */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className={`flex items-center gap-2 ${muteCls}`}>
                <FaSignal className="text-blue-500" /> {t("control.vesselTelemetry.rssi")}
              </span>
              <span className={textCls}>
                {selectedVehicle && telemetryData.rssi !== null ? `${telemetryData.rssi} dBm` : "N/A"}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className={`flex items-center gap-2 ${muteCls}`}>
                <FaBolt className="text-blue-500" /> {t("control.vesselTelemetry.batteryVoltage")}
              </span>
              <span className={textCls}>
                {selectedVehicle && telemetryData.battery_voltage !== null
                  ? `${telemetryData.battery_voltage.toFixed(1)} V`
                  : "N/A"}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className={`flex items-center gap-2 ${muteCls}`}>
                <FaTachometerAlt className="text-blue-500" /> {t("control.vesselTelemetry.batteryCurrent")}
              </span>
              <span className={textCls}>
                {selectedVehicle && telemetryData.battery_current !== null
                  ? `${telemetryData.battery_current.toFixed(1)} A`
                  : "N/A"}
              </span>
            </div>
          </div>

          {/* Mission Progress */}
          {selectedVehicle && (() => {
            const activeMissions = getActiveMissions();
            const vehicleMission = activeMissions.find((m) => {
              const missionVehicle = typeof m.vehicle === "string" ? m.vehicle : m.vehicle?.name || m.vehicle?.code;
              return missionVehicle === selectedVehicle?.name || missionVehicle === selectedVehicle?.code;
            });
            if (!vehicleMission) return null;
            const currentWaypoint = vehicleMission.current_waypoint || 0;
            const totalWaypoints = vehicleMission.total_waypoints || 0;
            const progress = Math.round(vehicleMission.progress || 0);
            const currentWaypointData = vehicleMission.waypoints?.[currentWaypoint];
            const waypointName = currentWaypointData?.name || `Waypoint ${currentWaypoint + 1}`;
            return (
              <>
                <div>
                  <p className={`text-xs ${muteCls} uppercase tracking-wider mb-2`}>
                    {t("control.missionControl.missionProgress")}
                  </p>
                  <div className="space-y-3">
                    <div className="rounded-lg p-3 bg-blue-500/20 border border-blue-500/50">
                      <div className="flex items-center justify-between mb-1">
                        <p className={`text-sm font-medium ${textCls}`}>{waypointName}</p>
                        <TbRoute className="w-5 h-5 text-blue-500 shrink-0" />
                      </div>
                      <p className={`text-xs ${muteCls}`}>{t("control.missionControl.activeTarget")}</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs ${muteCls}`}>{t("control.missionControl.overallProgress")}</span>
                        <span className="text-xs font-medium text-blue-500">{progress}%</span>
                      </div>
                      <div className={`w-full h-2 ${barTrackCls} rounded-full overflow-hidden`}>
                        <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                      </div>
                      <p className={`text-xs ${muteCls} mt-1`}>
                        {currentWaypoint} {t("control.missionControl.waypointsOf")} {totalWaypoints} {t("control.missionControl.waypointsLabel")}
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-colors"
                >
                  <FaTrashAlt className="text-sm" /> {t("control.missionControl.clearMission")}
                </button>
              </>
            );
          })()}
        </motion.section>
      )}
    </AnimatePresence>
  );
};

export default VesselTelemetryPanel;
