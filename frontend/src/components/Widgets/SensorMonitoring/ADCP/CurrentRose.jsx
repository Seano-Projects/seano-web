import { useMemo } from "react";

const NUM_BINS = 16;
const BIN_DEG = 360 / NUM_BINS;

const SPEED_COLORS = [
  { max: 0.1, color: "#22c55e" },
  { max: 0.3, color: "#84cc16" },
  { max: 0.5, color: "#eab308" },
  { max: 0.8, color: "#f97316" },
  { max: Infinity, color: "#ef4444" },
];

const speedColor = (v) =>
  SPEED_COLORS.find((c) => v <= c.max)?.color ?? "#ef4444";

const polarToXY = (angleDeg, r, cx, cy) => {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
};

const CurrentRose = ({ adcpData }) => {
  const { bins, maxCount, rings, activeBinIdx, latestDir, latestSpd } = useMemo(() => {
    const bins = Array.from({ length: NUM_BINS }, (_, i) => ({
      angle: i * BIN_DEG,
      count: 0,
      totalSpeed: 0,
    }));

    (adcpData || []).forEach((d) => {
      const dir = d.current_direction_deg;
      const spd = d.current_speed_ms;
      if (dir == null || !Number.isFinite(dir)) return;
      const idx = Math.floor(((dir % 360) + 360) % 360 / BIN_DEG) % NUM_BINS;
      bins[idx].count++;
      if (spd != null && Number.isFinite(spd)) bins[idx].totalSpeed += spd;
    });

    const maxCount = Math.max(...bins.map((b) => b.count), 1);
    const rings = [0.25, 0.5, 0.75, 1.0];

    // Latest data point — array is newest-first, so take index 0
    const latest = (adcpData || [])
      .find((d) => d.current_direction_deg != null && Number.isFinite(d.current_direction_deg));
    const latestDir = latest?.current_direction_deg ?? null;
    const latestSpd = latest?.current_speed_ms ?? null;
    const activeBinIdx = latestDir != null
      ? Math.floor(((latestDir % 360) + 360) % 360 / BIN_DEG) % NUM_BINS
      : null;

    return { bins, maxCount, rings, activeBinIdx, latestDir, latestSpd };
  }, [adcpData]);

  const size = 340;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 - 24;

  const cardinals = [
    { label: "N", angle: 0 },
    { label: "E", angle: 90 },
    { label: "S", angle: 180 },
    { label: "W", angle: 270 },
  ];

  const totalReadings = bins.reduce((s, b) => s + b.count, 0);

  return (
    <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl p-6">
      <h3 className="text-xl font-semibold text-black dark:text-white">Current Rose</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">
        Distribusi arah arus ({totalReadings} data)
      </p>

      {totalReadings === 0 ? (
        <div className="flex items-center justify-center h-52 text-sm text-gray-400">Tidak ada data</div>
      ) : (
        <>
          <div className="flex justify-center">
            <svg width={size} height={size}>
              {/* Ring guides */}
              {rings.map((r) => (
                <circle
                  key={r}
                  cx={cx}
                  cy={cy}
                  r={maxR * r}
                  fill="none"
                  stroke="#374151"
                  strokeWidth={0.5}
                  opacity={0.4}
                />
              ))}

              {/* Axis lines */}
              {[0, 45, 90, 135].map((a) => {
                const [x1, y1] = polarToXY(a, maxR, cx, cy);
                const [x2, y2] = polarToXY(a + 180, maxR, cx, cy);
                return (
                  <line key={a} x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke="#374151" strokeWidth={0.5} opacity={0.4} />
                );
              })}

              {/* Petal bars */}
              {bins.map((bin, i) => {
                if (bin.count === 0) return null;
                const isActive = i === activeBinIdx;
                const r = (bin.count / maxCount) * maxR;
                const avgSpd = bin.count > 0 ? bin.totalSpeed / bin.count : 0;
                const fill = isActive ? "#ffffff" : speedColor(avgSpd);
                const halfBin = BIN_DEG / 2;
                const [x1, y1] = polarToXY(bin.angle - halfBin, r, cx, cy);
                const [x2, y2] = polarToXY(bin.angle + halfBin, r, cx, cy);
                return (
                  <path
                    key={i}
                    d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`}
                    fill={fill}
                    opacity={isActive ? 1 : 0.85}
                    stroke={isActive ? "#38bdf8" : "none"}
                    strokeWidth={isActive ? 1.5 : 0}
                  />
                );
              })}

              {/* Current direction needle — same direction as active petal */}
              {latestDir != null && (() => {
                const needleR = maxR * 0.72;
                const [nx, ny] = polarToXY(latestDir, needleR, cx, cy);
                const [tx, ty] = polarToXY(latestDir, needleR + 10, cx, cy);
                return (
                  <g>
                    <line
                      x1={cx} y1={cy} x2={nx} y2={ny}
                      stroke="#38bdf8" strokeWidth={2} strokeLinecap="round"
                    />
                    <polygon
                      points={`${tx},${ty} ${polarToXY(latestDir - 90, 5, nx, ny).join(",")} ${polarToXY(latestDir + 90, 5, nx, ny).join(",")}`}
                      fill="#38bdf8"
                    />
                  </g>
                );
              })()}

              {/* Center dot */}
              <circle cx={cx} cy={cy} r={3} fill="#38bdf8" />

              {/* Cardinal labels */}
              {cardinals.map(({ label, angle }) => {
                const [x, y] = polarToXY(angle, maxR + 14, cx, cy);
                return (
                  <text key={label} x={x} y={y} textAnchor="middle"
                    dominantBaseline="middle" fontSize={11} fontWeight={700}
                    fill="#9ca3af">
                    {label}
                  </text>
                );
              })}
            </svg>
          </div>

          {/* Current direction indicator */}
          {latestDir != null && (
            <div className="flex items-center justify-center gap-2 mt-3 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shrink-0" />
              <span className="text-xs font-medium text-sky-400">
                {latestDir.toFixed(1)}°
                {latestSpd != null ? ` · ${latestSpd.toFixed(2)} m/s` : ""}
                {" — arah arus terkini"}
              </span>
            </div>
          )}

          {/* Speed legend */}
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
            {[
              { label: "< 0.1", color: "#22c55e" },
              { label: "0.1–0.3", color: "#84cc16" },
              { label: "0.3–0.5", color: "#eab308" },
              { label: "0.5–0.8", color: "#f97316" },
              { label: "> 0.8", color: "#ef4444" },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                <span className="text-[11px] text-gray-500 dark:text-gray-400">{label} m/s</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default CurrentRose;
