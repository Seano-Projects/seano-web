import { motion, AnimatePresence } from "framer-motion";
import { FaTachometerAlt, FaChevronDown } from "react-icons/fa";
import VirtualJoystick from "../../ui/VirtualJoystick";
import useTranslation from "../../../hooks/useTranslation";

const panelCls = "bg-white dark:bg-black border border-gray-200 dark:border-gray-600";
const textCls  = "text-gray-900 dark:text-white";
const muteCls  = "text-gray-500 dark:text-gray-400";

const ThrustControlPanel = ({
  isExpanded,
  onExpand,
  onCollapse,
  isArmed,
  selectedVehicle,
  activeMode,
  thrusterThrottle,
  thrusterSteering,
  onThrottleChange,
  onSteeringChange,
  onTestMotors,
}) => {
  const { t } = useTranslation();
  const controlDisabled = !isArmed || !selectedVehicle?.code || activeMode !== "MANUAL";

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
            <h2 className={`text-sm font-bold ${textCls} uppercase tracking-wider`}>
              {t("control.thrustControl.title")}
            </h2>
            <button
              onClick={onCollapse}
              className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${muteCls}`}
              title={t("common.collapse")}
            >
              <FaChevronDown className="text-sm" />
            </button>
          </div>

          <div className="flex items-center gap-4">
            {/* Left joystick – throttle */}
            <div className="flex flex-col items-center gap-1.5">
              <VirtualJoystick
                size={130}
                axis="vertical"
                onChange={(throttle) => onThrottleChange(throttle)}
                disabled={controlDisabled}
              />
              <p className={`text-xs ${muteCls}`}>Throttle</p>
            </div>

            {/* Center: readout + test button */}
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
                  <span className={`font-mono font-semibold ${thrusterSteering !== 0 ? "text-blue-500" : muteCls}`}>
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

            {/* Right joystick – steering */}
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
