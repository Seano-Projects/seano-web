import React from "react";
import useTranslation from "../../../../hooks/useTranslation";

const BeamBar = ({ label, value, color }) => {
  const hasValue =
    value !== null && value !== undefined && Number.isFinite(Number(value));
  const v = hasValue ? Number(value) : null;

  // Normalize -1..1 m/s → 0..100% bar (center = 50%)
  const MAX_VAL = 1.0;
  const normalized = v !== null ? ((v / MAX_VAL + 1) / 2) * 100 : 50;
  const clipped = Math.max(0, Math.min(100, normalized));

  return (
    <div className="flex items-center gap-3">
      <span className="w-8 text-xs font-medium text-gray-600 dark:text-gray-400 shrink-0">
        {label}
      </span>
      <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden relative">
        {/* Center line */}
        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-gray-300 dark:bg-gray-600 z-10" />
        {/* Value bar */}
        {v !== null && (
          <div
            className="absolute top-0 bottom-0 rounded-full transition-all duration-500"
            style={{
              left: v >= 0 ? "50%" : `${clipped}%`,
              width: `${Math.abs(clipped - 50)}%`,
              backgroundColor: color,
              opacity: 0.8,
            }}
          />
        )}
      </div>
      <span className="w-20 text-xs text-right font-mono text-gray-700 dark:text-gray-300 shrink-0">
        {v !== null ? `${v.toFixed(3)} m/s` : "—"}
      </span>
    </div>
  );
};

const BeamVelocityBars = ({ v1, v2, v3, v4 }) => {
  const { t } = useTranslation();

  const beams = [
    { label: "B1", value: v1, color: "#3b82f6" },
    { label: "B2", value: v2, color: "#22c55e" },
    { label: "B3", value: v3, color: "#f97316" },
    { label: "B4", value: v4, color: "#a855f7" },
  ];

  return (
    <div className="bg-white dark:bg-transparent border border-gray-300 dark:border-slate-600 rounded-xl p-5">
      <h3 className="text-base font-semibold text-gray-900 dark:text-white">
        {t("pages.adcp.beamVelocity")}
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 mb-4">
        {t("pages.adcp.beamVelocitySubtitle")}
      </p>
      <div className="flex flex-col gap-3">
        {beams.map((b) => (
          <BeamBar
            key={b.label}
            label={b.label}
            value={b.value}
            color={b.color}
          />
        ))}
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
        {t("pages.adcp.beamNote")}
      </p>
    </div>
  );
};

export default BeamVelocityBars;
