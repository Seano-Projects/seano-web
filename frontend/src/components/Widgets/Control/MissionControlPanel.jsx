import { motion, AnimatePresence } from "framer-motion";
import { FaCog, FaChevronUp, FaLock, FaArrowUp, FaHome } from "react-icons/fa";
import { TbAnchor } from "react-icons/tb";
import SlideToConfirm from "../../ui/SlideToConfirm";
import useTranslation from "../../../hooks/useTranslation";

const panelCls = "bg-white dark:bg-black border border-gray-200 dark:border-gray-600";
const textCls  = "text-gray-900 dark:text-white";
const muteCls  = "text-gray-500 dark:text-gray-400";

const MissionControlPanel = ({
  isExpanded,
  onExpand,
  onCollapse,
  isArmed,
  commandLoading,
  selectedVehicle,
  activeMode,
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
}) => {
  const { t } = useTranslation();

  const modes = [
    { id: "MANUAL", icon: FaCog },
    { id: "AUTO", icon: FaArrowUp },
    { id: "HOLD", icon: FaLock },
    { id: "LOITER", icon: TbAnchor },
    { id: "RTL", icon: FaHome },
  ];

  const SpinnerSvg = () => (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );

  return (
    <AnimatePresence mode="wait">
      {!isExpanded ? (
        <motion.button
          key="collapsed-mission"
          layout
          initial={{ width: 48, height: 48, opacity: 0 }}
          animate={{ width: 48, height: 48, opacity: 1 }}
          exit={{ width: 48, height: 48, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          onClick={onExpand}
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
          className={`absolute right-4 top-7 ${panelCls} rounded-xl p-4 flex flex-col gap-4 max-h-[calc(100vh-156px)] overflow-auto custom-scrollbar shadow-lg pointer-events-auto`}
        >
          <div className="flex items-center justify-between">
            <h2 className={`text-xs font-bold ${muteCls} uppercase tracking-wider`}>
              {t("control.missionControl.title")}
            </h2>
            <button
              onClick={onCollapse}
              className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${muteCls}`}
              title={t("common.collapse")}
            >
              <FaChevronUp className="text-sm" />
            </button>
          </div>

          {/* ARM / DISARM status indicator */}
          <div className="flex items-center justify-between">
            <span className={`${textCls} font-medium`}>
              {isArmed
                ? t("control.missionControl.systemArmed")
                : t("control.missionControl.systemDisarmed")}
            </span>
            <span className={`w-2.5 h-2.5 rounded-full ${isArmed ? "bg-red-500" : "bg-gray-400"}`} />
          </div>

          {/* ARM / DISARM button */}
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
                {commandLoading ? <SpinnerSvg /> : <FaLock className="text-sm" />}
                {t("control.missionControl.disarmSystem")}
              </button>
            ) : (
              <div className="space-y-2">
                <SlideToConfirm
                  onConfirm={onDisarmConfirm}
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
              {commandLoading ? <SpinnerSvg /> : <FaLock className="text-sm" />}
              {t("control.missionControl.armSystem")}
            </button>
          ) : (
            <div className="space-y-2">
              <SlideToConfirm
                onConfirm={onArmConfirm}
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
              <p className="text-xs text-red-500">{lastArmFailureMessage}</p>
              <button
                type="button"
                disabled={commandLoading || !selectedVehicle?.code}
                onClick={onForceArm}
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
                      onConfirm={onModeChangeConfirm}
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
                    onClick={() => onModeChangeRequest(m.id)}
                    disabled={activeMode === m.id || commandLoading || !selectedVehicle?.code}
                    className={`w-full rounded-lg p-3 text-left flex items-center gap-3 transition-colors border ${
                      activeMode === m.id
                        ? "border-blue-500 bg-blue-500/10 dark:bg-blue-500/20 " + textCls
                        : !selectedVehicle?.code || commandLoading
                          ? "border-gray-200 dark:border-gray-700 bg-transparent opacity-50 cursor-not-allowed " + muteCls
                          : "border-gray-300 dark:border-gray-600 bg-transparent " + muteCls + " hover:border-gray-400 dark:hover:border-gray-500 cursor-pointer"
                    } ${activeMode === m.id ? "cursor-default" : ""}`}
                  >
                    <m.icon className="text-lg shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium">{m.id}</p>
                      <p className={`text-xs ${muteCls} truncate`}>{t(`control.modes.${m.id}`)}</p>
                    </div>
                  </button>
                )}
              </div>
            ))}
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
};

export default MissionControlPanel;
