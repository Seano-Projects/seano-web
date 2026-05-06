import React from "react";
import useTranslation from "../../../../hooks/useTranslation";

const MAX_DEPTH = 200; // max display depth in meters

const WaterDepthDisplay = ({ depthM }) => {
  const { t } = useTranslation();
  const hasValue =
    depthM !== null && depthM !== undefined && Number.isFinite(Number(depthM));
  const depth = hasValue ? Number(depthM) : null;

  const fillPct = depth !== null ? Math.min((depth / MAX_DEPTH) * 100, 100) : 0;

  return (
    <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl p-6 flex flex-col items-center gap-4">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        {t("pages.adcp.waterDepth")}
      </p>

      <div className="flex items-end gap-4">
        {/* Vertical bar */}
        <div className="relative w-8 h-32 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden border border-gray-300 dark:border-gray-600">
          <div
            className="absolute bottom-0 w-full rounded-full transition-all duration-700"
            style={{
              height: `${fillPct}%`,
              background: "linear-gradient(to top, #1d4ed8, #38bdf8)",
            }}
          />
        </div>

        {/* Value */}
        <div className="text-center">
          <div className="text-4xl font-bold text-blue-500 dark:text-blue-400">
            {depth !== null ? depth.toFixed(1) : "—"}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            meters
          </div>
        </div>
      </div>

      {depth !== null && (
        <div className="text-xs text-gray-400 dark:text-gray-500">
          {fillPct.toFixed(0)}% of {MAX_DEPTH}m scale
        </div>
      )}
    </div>
  );
};

export default WaterDepthDisplay;
