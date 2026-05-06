import React, { useEffect, useMemo, useRef, useState } from "react";
import useTranslation from "../../../../hooks/useTranslation";
import Dropdown from "../../Dropdown";

const DISTANCE_BIN_KM = 0.05; // 50 m bins
const DEPTH_BIN_M = 1; // 1 m bins
const CANVAS_HEIGHT = 260;

// Color stops: blue → cyan → green → yellow → orange → red
const COLOR_STOPS = [
  [0.0, [53, 92, 255]],
  [0.125, [35, 139, 255]],
  [0.25, [0, 199, 242]],
  [0.5, [32, 214, 111]],
  [0.625, [185, 229, 38]],
  [0.75, [246, 211, 45]],
  [0.875, [247, 154, 47]],
  [1.0, [240, 73, 52]],
];

const valueToRgb = (t) => {
  const clamp = Math.max(0, Math.min(1, t));
  for (let i = 1; i < COLOR_STOPS.length; i++) {
    if (clamp <= COLOR_STOPS[i][0]) {
      const [t0, c0] = COLOR_STOPS[i - 1];
      const [t1, c1] = COLOR_STOPS[i];
      const f = (clamp - t0) / (t1 - t0);
      return [
        Math.round(c0[0] + f * (c1[0] - c0[0])),
        Math.round(c0[1] + f * (c1[1] - c0[1])),
        Math.round(c0[2] + f * (c1[2] - c0[2])),
      ];
    }
  }
  return COLOR_STOPS[COLOR_STOPS.length - 1][1];
};

const CTDSectionHeatmap = ({ ctdData }) => {
  const { t } = useTranslation();
  const [metric, setMetric] = useState("temperature");
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const metrics = useMemo(
    () => ({
      temperature: {
        key: "temperature",
        label: `${t("pages.data.charts.temperature")} (C)`,
        unit: "C",
      },
      salinity: {
        key: "salinity",
        label: `${t("pages.data.charts.salinity")} (PSU)`,
        unit: "PSU",
      },
      density: {
        key: "density",
        label: `${t("pages.ctd.charts.density")} (kg/m3)`,
        unit: "kg/m3",
      },
      conductivity: {
        key: "conductivity",
        label: `${t("pages.data.charts.conductivity")} (mS/cm)`,
        unit: "mS/cm",
      },
      sound_velocity: {
        key: "sound_velocity",
        label: `${t("pages.ctd.charts.soundVelocity")} (m/s)`,
        unit: "m/s",
      },
    }),
    [t],
  );

  const metricConfig = metrics[metric] || metrics.temperature;

  const dataSummary = useMemo(() => {
    if (!ctdData || ctdData.length === 0) {
      return {
        points: [],
        minValue: 0,
        maxValue: 1,
        maxDepth: 0,
        maxDistance: 0,
      };
    }

    const sorted = [...ctdData].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
    );

    // Collect valid raw points first
    const raw = [];
    for (const item of sorted) {
      const lat = Number(item.latitude);
      const lon = Number(item.longitude);
      const depth = Number(item.depth);
      const value = Number(item[metricConfig.key]);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      if (!Number.isFinite(depth) || !Number.isFinite(value)) continue;
      raw.push({ lat, lon, depth, value });
    }

    if (!raw.length) {
      return {
        points: [],
        minValue: 0,
        maxValue: 1,
        maxDepth: 0,
        maxDistance: 0,
      };
    }

    // Find geographic bounding box
    const minLon = Math.min(...raw.map((p) => p.lon));
    const maxLon = Math.max(...raw.map((p) => p.lon));
    const meanLat = raw.reduce((s, p) => s + p.lat, 0) / raw.length;

    // Project each point to x = east-west km from min longitude
    // This avoids cumulative-path blowup when data from different tracks is mixed
    const degToKm = (dLon) =>
      Math.abs(dLon) * 111.32 * Math.cos((meanLat * Math.PI) / 180);

    const totalDistanceKm = degToKm(maxLon - minLon) || 1;

    const points = raw.map((p) => ({
      distance_km: degToKm(p.lon - minLon),
      depth_m: p.depth,
      value: p.value,
    }));

    const maxDepth = Math.max(...points.map((p) => p.depth_m));
    const minValue = Math.min(...points.map((p) => p.value));
    const maxValue = Math.max(...points.map((p) => p.value));

    return {
      points,
      minValue,
      maxValue,
      maxDepth,
      maxDistance: totalDistanceKm,
    };
  }, [ctdData, metricConfig.key]);

  // Single effect: sets up draw + ResizeObserver. Re-runs when data changes
  // so containerRef.current is guaranteed to exist (canvas div only renders with data).
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const draw = () => {
      const width = container.clientWidth;
      if (width <= 0) return;

      canvas.width = width;
      canvas.height = CANVAS_HEIGHT;

      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, width, CANVAS_HEIGHT);

      const { points, minValue, maxValue, maxDepth, maxDistance } = dataSummary;
      if (!points.length || maxDistance === 0 || maxDepth === 0) return;

      const valueRange = maxValue - minValue || 1;

      // Radius: fill gap between consecutive depth levels and station spacing
      const pxPerKm = width / maxDistance;
      const pxPerM = CANVAS_HEIGHT / maxDepth;
      // Cover half the distance to the next station (horizontally) and next depth (vertically)
      const stationSpacingKm =
        maxDistance /
        Math.max(
          1,
          new Set(points.map((p) => Math.round(p.distance_km * 10))).size - 1,
        );
      const depthStepM =
        maxDepth /
        Math.max(1, new Set(points.map((p) => Math.round(p.depth_m))).size - 1);
      const radX = Math.max(8, (stationSpacingKm / 2) * pxPerKm * 1.4);
      const radY = Math.max(8, (depthStepM / 2) * pxPerM * 1.4);
      const RADIUS = Math.max(radX, radY);

      // Draw each point as a soft radial gradient blob
      for (const pt of points) {
        const x = (pt.distance_km / maxDistance) * width;
        const y = (pt.depth_m / maxDepth) * CANVAS_HEIGHT;
        const t = (pt.value - minValue) / valueRange;
        const [r, g, b] = valueToRgb(t);

        const grad = ctx.createRadialGradient(x, y, 0, x, y, RADIUS);
        grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
        grad.addColorStop(0.5, `rgba(${r},${g},${b},0.85)`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    draw();

    const observer = new ResizeObserver(draw);
    observer.observe(container);
    return () => observer.disconnect();
  }, [dataSummary]);

  const metricItems = Object.entries(metrics).map(([key, config]) => ({
    id: key,
    name: config.label,
  }));

  const fmt = (v, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : "--");

  const legendGradient =
    "linear-gradient(90deg,#355CFF 0%,#238BFF 12.5%,#00C7F2 25%,#20D66F 37.5%,#B9E526 50%,#F6D32D 62.5%,#F79A2F 75%,#F04934 100%)";

  return (
    <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-black dark:text-white">
            {t("pages.ctd.charts.sectionHeatmapTitle")}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t("pages.ctd.charts.sectionHeatmapSubtitle")}
          </p>
        </div>
        <div className="w-full lg:w-64">
          <Dropdown
            items={metricItems}
            selectedItem={{ id: metric, name: metricConfig.label }}
            onItemChange={(item) => setMetric(item.id)}
            getItemKey={(item) => item.id}
          />
        </div>
      </div>

      {dataSummary.points.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-sm text-gray-500 dark:text-gray-400">
          {t("pages.ctd.charts.sectionHeatmapNoData")}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-[auto,1fr] gap-3 items-stretch">
            <div className="flex flex-col justify-between text-xs text-gray-500 dark:text-gray-400 py-1">
              <span>0 m</span>
              <span>{fmt(dataSummary.maxDepth, 0)} m</span>
            </div>
            <div
              ref={containerRef}
              className="w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
              style={{ height: CANVAS_HEIGHT }}
            >
              <canvas
                ref={canvasRef}
                style={{
                  display: "block",
                  width: "100%",
                  height: CANVAS_HEIGHT,
                }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>0 km</span>
            <span>{fmt(dataSummary.maxDistance, 2)} km</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {fmt(dataSummary.minValue, 2)} {metricConfig.unit}
            </span>
            <div
              className="h-2 flex-1 rounded-full"
              style={{ background: legendGradient }}
            />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {fmt(dataSummary.maxValue, 2)} {metricConfig.unit}
            </span>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400">
            {t("pages.ctd.charts.sectionHeatmapBinsLabel")}:{" "}
            {Math.round(DISTANCE_BIN_KM * 1000)}m × {DEPTH_BIN_M} m
          </div>
        </div>
      )}
    </div>
  );
};

export default CTDSectionHeatmap;
