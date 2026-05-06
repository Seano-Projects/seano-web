import React from "react";
import useTranslation from "../../../../hooks/useTranslation";

const DIRS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

const CurrentDirectionCompass = ({ directionDeg, speedMs }) => {
  const { t } = useTranslation();
  const hasDir =
    directionDeg !== null &&
    directionDeg !== undefined &&
    Number.isFinite(Number(directionDeg));

  const deg = hasDir ? Number(directionDeg) : null;

  const cardinalLabel = (d) => {
    const idx = Math.round(d / 45) % 8;
    return DIRS[idx < 0 ? idx + 8 : idx];
  };

  // Arrow tip coords (pointing "up" = North = 0 deg, rotates clockwise)
  const cx = 80;
  const cy = 80;
  const r = 60;

  return (
    <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl p-6 flex flex-col items-center gap-3">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        {t("pages.adcp.currentDirection")}
      </p>

      <svg width="160" height="160" viewBox="0 0 160 160">
        {/* Outer ring */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#374151"
          strokeWidth="2"
        />
        <circle
          cx={cx}
          cy={cy}
          r={r + 8}
          fill="none"
          stroke="#1f2937"
          strokeWidth="1"
        />

        {/* Cardinal labels */}
        {[
          { label: "N", x: cx, y: cy - r - 14 },
          { label: "E", x: cx + r + 14, y: cy + 4 },
          { label: "S", x: cx, y: cy + r + 18 },
          { label: "W", x: cx - r - 14, y: cy + 4 },
        ].map(({ label, x, y }) => (
          <text
            key={label}
            x={x}
            y={y}
            textAnchor="middle"
            fontSize="12"
            fontWeight="bold"
            fill={label === "N" ? "#3b82f6" : "#9ca3af"}
          >
            {label}
          </text>
        ))}

        {/* Tick marks */}
        {Array.from({ length: 36 }).map((_, i) => {
          const angle = (i * 10 * Math.PI) / 180;
          const isMajor = i % 9 === 0;
          const inner = isMajor ? r - 10 : r - 5;
          const x1 = cx + inner * Math.sin(angle);
          const y1 = cy - inner * Math.cos(angle);
          const x2 = cx + r * Math.sin(angle);
          const y2 = cy - r * Math.cos(angle);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#374151"
              strokeWidth={isMajor ? 2 : 1}
            />
          );
        })}

        {/* Current direction arrow */}
        {deg !== null ? (
          <g transform={`rotate(${deg}, ${cx}, ${cy})`}>
            {/* Arrow shaft */}
            <line
              x1={cx}
              y1={cy + 30}
              x2={cx}
              y2={cy - r + 8}
              stroke="#ef4444"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Arrow head */}
            <polygon
              points={`${cx},${cy - r + 4} ${cx - 7},${cy - r + 16} ${cx + 7},${cy - r + 16}`}
              fill="#ef4444"
            />
            {/* Tail */}
            <line
              x1={cx}
              y1={cy + 30}
              x2={cx}
              y2={cy + 38}
              stroke="#6b7280"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </g>
        ) : (
          <circle cx={cx} cy={cy} r={4} fill="#6b7280" />
        )}

        {/* Center dot */}
        <circle
          cx={cx}
          cy={cy}
          r={4}
          fill={deg !== null ? "#ef4444" : "#6b7280"}
        />
      </svg>

      <div className="text-center">
        <span className="text-2xl font-bold text-gray-900 dark:text-white">
          {deg !== null ? `${deg.toFixed(1)}°` : "—"}
        </span>
        {deg !== null && (
          <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
            {cardinalLabel(deg)}
          </span>
        )}
      </div>

      {speedMs !== null &&
        speedMs !== undefined &&
        Number.isFinite(Number(speedMs)) && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {Number(speedMs).toFixed(3)} m/s
          </p>
        )}
    </div>
  );
};

export default CurrentDirectionCompass;
