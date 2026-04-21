import { motion, AnimatePresence } from "framer-motion";
import { FaSearch, FaChevronUp } from "react-icons/fa";
import useTranslation from "../../../hooks/useTranslation";

const panelCls = "bg-white dark:bg-black border border-gray-200 dark:border-gray-600";
const textCls  = "text-gray-900 dark:text-white";
const muteCls  = "text-gray-500 dark:text-gray-400";

const SearchPanel = ({
  isExpanded,
  onExpand,
  onCollapse,
  isVesselTelemetryExpanded,
  searchQuery,
  onSearchQueryChange,
  onSearchKeyDown,
  onSearchSubmit,
}) => {
  const { t } = useTranslation();
  const leftPos = isVesselTelemetryExpanded ? "350px" : "80px";

  return (
    <AnimatePresence mode="wait">
      {!isExpanded ? (
        <motion.button
          key="collapsed-search"
          layout
          initial={{ width: 48, height: 48, opacity: 0 }}
          animate={{ width: 48, height: 48, opacity: 1, left: isVesselTelemetryExpanded ? 350 : 80 }}
          exit={{ width: 48, height: 48, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          onClick={onExpand}
          className="absolute top-7 bg-white dark:bg-black hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 p-3 rounded-full shadow-lg transition-all border border-gray-200 dark:border-gray-600 flex items-center justify-center pointer-events-auto"
          style={{ left: leftPos }}
          title={t("control.search.title")}
        >
          <FaSearch className="text-base" />
        </motion.button>
      ) : (
        <motion.section
          key="expanded-search"
          layout
          initial={{ width: 48, opacity: 0 }}
          animate={{ width: 320, opacity: 1, left: isVesselTelemetryExpanded ? 350 : 80 }}
          exit={{ width: 48, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className={`absolute top-7 ${panelCls} rounded-xl p-2 shadow-lg pointer-events-auto`}
          style={{ left: leftPos }}
        >
          <div className="flex items-center justify-end mb-2">
            <button
              onClick={onCollapse}
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
              onChange={onSearchQueryChange}
              onKeyDown={onSearchKeyDown}
              className={`w-full bg-white dark:bg-black border border-gray-200 dark:border-gray-600 rounded-lg pl-10 pr-12 py-2.5 ${textCls} placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all`}
            />
            {searchQuery && (
              <button
                onClick={onSearchSubmit}
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
  );
};

export default SearchPanel;
