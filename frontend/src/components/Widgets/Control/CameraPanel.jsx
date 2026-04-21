import { motion, AnimatePresence } from "framer-motion";
import { FaVideo, FaVideoSlash, FaChevronDown } from "react-icons/fa";
import useTranslation from "../../../hooks/useTranslation";

const panelCls = "bg-white dark:bg-black border border-gray-200 dark:border-gray-600";
const textCls  = "text-gray-900 dark:text-white";
const muteCls  = "text-gray-500 dark:text-gray-400";

const CameraPanel = ({
  isExpanded,
  onExpand,
  onCollapse,
  videoRef,
  streamName,
  onStreamNameChange,
  onStreamNameBlur,
  cameraConnected,
  cameraConnecting,
  onConnect,
  onDisconnect,
}) => {
  const { t } = useTranslation();

  return (
    <AnimatePresence mode="wait">
      {!isExpanded ? (
        <motion.button
          key="collapsed-camera"
          layout
          initial={{ width: 48, height: 48, opacity: 0 }}
          animate={{ width: 48, height: 48, opacity: 1 }}
          exit={{ width: 48, height: 48, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          onClick={onExpand}
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
          <div className="flex items-center justify-between">
            <h2 className={`text-xs font-bold ${muteCls} uppercase tracking-wider`}>
              {t("control.camera.title")}
            </h2>
            <button
              onClick={onCollapse}
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
              onChange={onStreamNameChange}
              onBlur={onStreamNameBlur}
              placeholder={t("control.camera.streamPlaceholder")}
              className={`flex-1 text-xs rounded-lg px-3 py-2 border bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 ${textCls} placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-blue-500`}
            />
            <button
              type="button"
              onClick={cameraConnected ? onDisconnect : () => onConnect(streamName)}
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
  );
};

export default CameraPanel;
