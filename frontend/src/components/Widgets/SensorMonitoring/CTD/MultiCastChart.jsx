import React, { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { FaFilter, FaClock } from "react-icons/fa";
import { Dropdown } from "../../index";

const METRICS = [
  { key: "temperature",    label: "Suhu",          unit: "°C" },
  { key: "salinity",       label: "Salinitas",     unit: "PSU" },
  { key: "density",        label: "Densitas",      unit: "kg/m³" },
  { key: "conductivity",   label: "Konduktivitas", unit: "mS/cm" },
  { key: "sound_velocity", label: "Kec. Suara",    unit: "m/s" },
];

// Colors for up to 10 casts (oldest→newest: cool→warm)
const CAST_COLORS = [
  "#64748b", "#3b82f6", "#06b6d4", "#10b981",
  "#84cc16", "#eab308", "#f97316", "#ef4444",
  "#ec4899", "#a855f7",
];

const WINDOW_OPTIONS = [
  { label: "1 menit",  ms: 60_000 },
  { label: "5 menit",  ms: 300_000 },
  { label: "10 menit", ms: 600_000 },
  { label: "30 menit", ms: 1_800_000 },
];

const MAX_CASTS = 10;
const DEPTH_BIN = 2; // metres per bin

const formatTs = (ms) => {
  const d = new Date(ms);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const formatCoord = (lat, lon) =>
  lat == null || lon == null
    ? "—"
    : `${Number(lat).toFixed(4)}°, ${Number(lon).toFixed(4)}°`;

const MultiCastChart = ({ ctdData }) => {
  const [metric, setMetric]   = useState("temperature");
  const [windowMs, setWindowMs] = useState(WINDOW_OPTIONS[1].ms); // default 5 min

  const metricMeta = METRICS.find((m) => m.key === metric) || METRICS[0];

  // ── Build profiles grouped by time window ────────────────────────────────
  const { chartData, casts } = useMemo(() => {
    if (!ctdData || ctdData.length === 0) return { chartData: [], casts: [] };

    // Group by time-window bucket
    const byBucket = new Map();
    ctdData.forEach((entry) => {
      const ms = new Date(entry.timestamp).getTime();
      if (!Number.isFinite(ms)) return;
      const bucket = Math.floor(ms / windowMs) * windowMs;
      if (!byBucket.has(bucket)) byBucket.set(bucket, []);
      byBucket.get(bucket).push(entry);
    });

    // Sort buckets, take last MAX_CASTS
    const sortedBuckets = Array.from(byBucket.keys()).sort((a, b) => a - b);
    const recentBuckets = sortedBuckets.slice(-MAX_CASTS);

    // Build cast metadata
    const casts = recentBuckets.map((bucket, idx) => {
      const entries = byBucket.get(bucket);
      const withCoord = entries.find((e) => e.latitude != null && e.longitude != null);
      return {
        key: `cast_${idx}`,
        bucket,
        label: formatTs(bucket),
        lat: withCoord?.latitude ?? null,
        lon: withCoord?.longitude ?? null,
        color: CAST_COLORS[idx % CAST_COLORS.length],
        entries,
      };
    });

    // Build depth-binned chart data
    // For each depth bin, collect the avg parameter value per cast
    const maxDepth = Math.max(
      ...ctdData.map((e) => e.depth).filter(Number.isFinite),
      0,
    );
    const numBins = Math.ceil(maxDepth / DEPTH_BIN) + 1;

    const rows = Array.from({ length: numBins }, (_, i) => {
      const depthMin = i * DEPTH_BIN;
      const depthMax = depthMin + DEPTH_BIN;
      const row = { depth: depthMin + DEPTH_BIN / 2 }; // midpoint

      casts.forEach(({ key, entries }) => {
        const vals = entries
          .filter((e) => e.depth >= depthMin && e.depth < depthMax)
          .map((e) => e[metric])
          .filter((v) => v != null && Number.isFinite(v));
        row[key] = vals.length > 0
          ? Number((vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(3))
          : null;
      });

      return row;
    });

    // Only keep rows where at least one cast has data
    const filteredRows = rows.filter((r) =>
      casts.some(({ key }) => r[key] != null),
    );

    return { chartData: filteredRows, casts };
  }, [ctdData, metric, windowMs]);

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg min-w-52">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
          Kedalaman: {Number(d.depth).toFixed(1)} m
        </p>
        {payload.map((p) => {
          const cast = casts.find((c) => c.key === p.dataKey);
          return (
            <div key={p.dataKey} className="mb-1">
              <p className="text-xs font-medium" style={{ color: p.color }}>
                {cast?.label}: {p.value} {metricMeta.unit}
              </p>
              {cast?.lat != null && (
                <p className="text-[10px] text-gray-400">
                  📍 {formatCoord(cast.lat, cast.lon)}
                </p>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-xl font-semibold text-black dark:text-white">
            Multi-Cast Profile
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Perbandingan profil kedalaman dari {casts.length} periode/koordinat berbeda
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Window selector */}
          <div className="w-40">
            <Dropdown
              items={WINDOW_OPTIONS}
              selectedItem={WINDOW_OPTIONS.find((w) => w.ms === windowMs)}
              onItemChange={(w) => setWindowMs(w.ms)}
              getItemKey={(w) => w.ms}
              renderSelectedItem={(w) => (
                <div className="flex items-center gap-2 text-sm">
                  <FaClock className="text-[11px] text-gray-500 dark:text-gray-400" />
                  <span className="font-medium text-gray-900 dark:text-white">
                    Per {w.label}
                  </span>
                </div>
              )}
              renderItem={(w) => (
                <span className="font-medium text-gray-900 dark:text-white">
                  Per {w.label}
                </span>
              )}
            />
          </div>

          {/* Metric selector */}
          <div className="w-52">
            <Dropdown
              items={METRICS}
              selectedItem={METRICS.find((m) => m.key === metric)}
              onItemChange={(m) => setMetric(m.key)}
              getItemKey={(m) => m.key}
              renderSelectedItem={(m) => (
                <div className="flex items-center gap-2 text-sm">
                  <FaFilter className="text-[11px] text-gray-500 dark:text-gray-400" />
                  <span className="font-medium text-gray-900 dark:text-white">
                    {m.label} ({m.unit})
                  </span>
                </div>
              )}
              renderItem={(m) => (
                <span className="font-medium text-gray-900 dark:text-white">
                  {m.label} ({m.unit})
                </span>
              )}
            />
          </div>
        </div>
      </div>

      {/* Cast legend */}
      {casts.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
          {casts.map(({ key, label, color }) => (
            <div key={key} className="flex items-center gap-1.5">
              <span
                className="inline-block w-4 rounded"
                style={{ backgroundColor: color, height: 2 }}
              />
              <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      <div className="h-80">
        {chartData.length === 0 || casts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Tidak ada data
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Coba ubah rentang waktu atau perbesar window
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              layout="vertical"
              margin={{ top: 8, right: 20, left: 12, bottom: 24 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis
                type="number"
                stroke="#6B7280"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                label={{
                  value: `${metricMeta.label} (${metricMeta.unit})`,
                  position: "insideBottom",
                  offset: -14,
                  fill: "#9CA3AF",
                  fontSize: 11,
                }}
              />
              <YAxis
                type="number"
                dataKey="depth"
                reversed
                domain={[0, "dataMax"]}
                stroke="#6B7280"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                label={{
                  value: "Kedalaman (m)",
                  angle: -90,
                  position: "insideLeft",
                  fill: "#9CA3AF",
                  fontSize: 11,
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              {casts.map(({ key, color }) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                  connectNulls={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {casts.length > 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 text-right">
          {casts.length} profil · window {WINDOW_OPTIONS.find((w) => w.ms === windowMs)?.label}
        </p>
      )}
    </div>
  );
};

export default MultiCastChart;
