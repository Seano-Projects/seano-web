import React from "react";
import useTranslation from "../../../../hooks/useTranslation";

const CurrentSpeedGauge = ({ value }) => {
  const { t } = useTranslation();
  const hasValue =
    value !== null && value !== undefined && Number.isFinite(value);
  const speed = hasValue ? Number(value) : null;

  // Color scale: 0-0.1 green, 0.1-0.5 yellow, >0.5 red
  const getColor = (v) => {
    if (v === null) return "#6b7280";
    if (v < 0.1) return "#22c55e";
    if (v < 0.5) return "#f59e0b";
    return "#ef4444";
  };

  const color = getColor(speed);

  return (
    <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl p-6 flex flex-col items-center justify-center gap-3">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        {t("pages.adcp.currentSpeed")}
      </p>
      <div className="text-6xl font-bold" style={{ color }}>
        {speed !== null ? speed.toFixed(3) : "—"}
      </div>
      <p className="text-base text-gray-500 dark:text-gray-400">m/s</p>
    </div>
  );
};

export default CurrentSpeedGauge;
