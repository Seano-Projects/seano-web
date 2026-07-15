import React, { useEffect, useMemo, useRef, useState } from "react";
import useTranslation from "../../../../hooks/useTranslation";
import DataCard from "../../DataCard";

const DISTANCE_BIN_KM = 0.05;
const DEPTH_BIN_M = 2;
const PLOT_HEIGHT = 400;
const PLOT_MIN_WIDTH = 640;
const CONTOUR_LEVELS = 6;

const METRIC_DEFINITIONS = {
  temperature: {
    key: "temperature",
    label: "Temperature (C)",
    unit: "C",
    legendLabel: "Cool to warm water",
    colormap: [
      "#1f3c88",
      "#225ea8",
      "#1d91c0",
      "#41b6c4",
      "#7fcdbb",
      "#c7e9b4",
      "#fddc6c",
      "#f07c4a",
      "#c83e4d",
    ],
  },
  salinity: {
    key: "salinity",
    label: "Salinity (PSU)",
    unit: "PSU",
    legendLabel: "Fresh to saline water",
    colormap: [
      "#102a43",
      "#1f5f8b",
      "#2c7fb8",
      "#41b6c4",
      "#7fcdbb",
      "#b8e186",
      "#f6d55c",
      "#f29e4c",
      "#d1495b",
    ],
  },
  density: {
    key: "density",
    label: "Density (kg/m3)",
    unit: "kg/m3",
    legendLabel: "Light to dense water",
    colormap: [
      "#13293d",
      "#1f4e79",
      "#2a6f97",
      "#3f88c5",
      "#58a4b0",
      "#78c091",
      "#d9d44a",
      "#f4a259",
      "#d95d39",
    ],
  },
  conductivity: {
    key: "conductivity",
    label: "Conductivity (mS/cm)",
    unit: "mS/cm",
    legendLabel: "Low to high conductivity",
    colormap: [
      "#0b2545",
      "#134074",
      "#2c7da0",
      "#468faf",
      "#61a5c2",
      "#89c2d9",
      "#d9ed92",
      "#f9c74f",
      "#f3722c",
    ],
  },
  sound_velocity: {
    key: "sound_velocity",
    label: "Sound Velocity (m/s)",
    unit: "m/s",
    legendLabel: "Slow to fast propagation",
    colormap: [
      "#1d3557",
      "#2874a6",
      "#2a9d8f",
      "#52b788",
      "#95d5b2",
      "#d8f3dc",
      "#f9c74f",
      "#f9844a",
      "#e63946",
    ],
  },
};

const METRICS_FOR_TOOLTIP = [
  { key: "temperature", label: "Temperature", unit: "C", digits: 2 },
  { key: "salinity", label: "Salinity", unit: "PSU", digits: 2 },
  { key: "conductivity", label: "Conductivity", unit: "mS/cm", digits: 2 },
  { key: "density", label: "Density", unit: "kg/m3", digits: 2 },
];

const SENSOR_THRESHOLDS = {
  temperature: { min: -2, max: 40, spike: 2.2 },
  salinity: { min: 0, max: 45, spike: 2.5 },
  conductivity: { min: 0, max: 80, spike: 5 },
  density: { min: 990, max: 1050, spike: 3.5 },
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const formatNumber = (value, digits = 2) =>
  Number.isFinite(value) ? value.toFixed(digits) : "--";

const formatDistanceLabel = (value) => {
  if (!Number.isFinite(value)) return "-- km";
  if (value < 0.1) return `${value.toFixed(3)} km`;
  if (value < 1) return `${value.toFixed(2)} km`;
  return `${value.toFixed(1)} km`;
};

const hexToRgb = (hex) => {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};

const interpolateColor = (colors, t) => {
  const safe = clamp(t, 0, 1);
  const scaled = safe * (colors.length - 1);
  const index = Math.floor(scaled);
  const nextIndex = Math.min(colors.length - 1, index + 1);
  const mix = scaled - index;
  const start = hexToRgb(colors[index]);
  const end = hexToRgb(colors[nextIndex]);
  return [
    Math.round(start[0] + (end[0] - start[0]) * mix),
    Math.round(start[1] + (end[1] - start[1]) * mix),
    Math.round(start[2] + (end[2] - start[2]) * mix),
  ];
};

const haversineKm = (lat1, lon1, lat2, lon2) => {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const buildDisplayGrid = ({ values, counts, tooltipData, xBins, yBins }) => {
  const displayValues = new Float32Array(values);
  const displayCounts = new Uint16Array(counts);
  const displayTooltipData = [...tooltipData];
  const imputedMask = new Uint8Array(values.length);

  const getIndex = (x, y) => y * xBins + x;

  for (let y = 0; y < yBins; y += 1) {
    for (let x = 0; x < xBins; x += 1) {
      const index = getIndex(x, y);
      if (counts[index] > 0) {
        continue;
      }

      const leftIndex = x > 0 ? getIndex(x - 1, y) : -1;
      const rightIndex = x < xBins - 1 ? getIndex(x + 1, y) : -1;
      const upIndex = y > 0 ? getIndex(x, y - 1) : -1;
      const downIndex = y < yBins - 1 ? getIndex(x, y + 1) : -1;

      const horizontalReady =
        leftIndex >= 0 &&
        rightIndex >= 0 &&
        counts[leftIndex] > 0 &&
        counts[rightIndex] > 0;
      const verticalReady =
        upIndex >= 0 &&
        downIndex >= 0 &&
        counts[upIndex] > 0 &&
        counts[downIndex] > 0;

      if (!horizontalReady && !verticalReady) {
        continue;
      }

      const sourceIndices = [
        ...(horizontalReady ? [leftIndex, rightIndex] : []),
        ...(verticalReady ? [upIndex, downIndex] : []),
      ];

      const meanValue =
        sourceIndices.reduce(
          (sum, sourceIndex) => sum + values[sourceIndex],
          0,
        ) / sourceIndices.length;

      const sourceTooltip = sourceIndices
        .map((sourceIndex) => tooltipData[sourceIndex])
        .filter(Boolean);

      displayValues[index] = meanValue;
      displayCounts[index] = 1;
      imputedMask[index] = 1;

      if (sourceTooltip.length) {
        const averagedTooltip = {
          interpolated: true,
          value:
            sourceTooltip.reduce((sum, item) => sum + item.value, 0) /
            sourceTooltip.length,
          temperature:
            sourceTooltip.reduce((sum, item) => sum + item.temperature, 0) /
            sourceTooltip.length,
          salinity:
            sourceTooltip.reduce((sum, item) => sum + item.salinity, 0) /
            sourceTooltip.length,
          conductivity:
            sourceTooltip.reduce((sum, item) => sum + item.conductivity, 0) /
            sourceTooltip.length,
          density:
            sourceTooltip.reduce((sum, item) => sum + item.density, 0) /
            sourceTooltip.length,
          sound_velocity:
            sourceTooltip.reduce((sum, item) => sum + item.sound_velocity, 0) /
            sourceTooltip.length,
          sample: null,
        };
        displayTooltipData[index] = averagedTooltip;
      }
    }
  }

  return { displayValues, displayCounts, displayTooltipData, imputedMask };
};

const computeContourSegments = ({
  values,
  counts,
  xBins,
  yBins,
  maxDistance,
  maxDepth,
  minValue,
  maxValue,
}) => {
  const segments = [];
  const usableLevels = [];
  const range = maxValue - minValue;
  if (!Number.isFinite(range) || range <= 0) {
    return { segments, levels: usableLevels };
  }

  for (let i = 1; i <= CONTOUR_LEVELS; i += 1) {
    usableLevels.push(minValue + (range * i) / (CONTOUR_LEVELS + 1));
  }

  const interpolatePoint = (xA, yA, valueA, xB, yB, valueB, threshold) => {
    const delta = valueB - valueA;
    const ratio = Math.abs(delta) < 1e-9 ? 0.5 : (threshold - valueA) / delta;
    return {
      x:
        ((xA + (xB - xA) * ratio) / Math.max(1, xBins - 1)) *
        Math.max(maxDistance, DISTANCE_BIN_KM),
      y:
        ((yA + (yB - yA) * ratio) / Math.max(1, yBins - 1)) *
        Math.max(maxDepth, DEPTH_BIN_M),
    };
  };

  for (const level of usableLevels) {
    for (let y = 0; y < yBins - 1; y += 1) {
      for (let x = 0; x < xBins - 1; x += 1) {
        const topLeftIndex = y * xBins + x;
        const topRightIndex = topLeftIndex + 1;
        const bottomLeftIndex = topLeftIndex + xBins;
        const bottomRightIndex = bottomLeftIndex + 1;

        if (
          counts[topLeftIndex] === 0 ||
          counts[topRightIndex] === 0 ||
          counts[bottomLeftIndex] === 0 ||
          counts[bottomRightIndex] === 0
        ) {
          continue;
        }

        const topLeft = values[topLeftIndex];
        const topRight = values[topRightIndex];
        const bottomLeft = values[bottomLeftIndex];
        const bottomRight = values[bottomRightIndex];
        const intersections = [];

        if (topLeft >= level !== topRight >= level) {
          intersections.push(
            interpolatePoint(x, y, topLeft, x + 1, y, topRight, level),
          );
        }
        if (topRight >= level !== bottomRight >= level) {
          intersections.push(
            interpolatePoint(
              x + 1,
              y,
              topRight,
              x + 1,
              y + 1,
              bottomRight,
              level,
            ),
          );
        }
        if (bottomRight >= level !== bottomLeft >= level) {
          intersections.push(
            interpolatePoint(
              x + 1,
              y + 1,
              bottomRight,
              x,
              y + 1,
              bottomLeft,
              level,
            ),
          );
        }
        if (bottomLeft >= level !== topLeft >= level) {
          intersections.push(
            interpolatePoint(x, y + 1, bottomLeft, x, y, topLeft, level),
          );
        }

        if (intersections.length === 2) {
          segments.push({
            level,
            from: intersections[0],
            to: intersections[1],
          });
        } else if (intersections.length === 4) {
          segments.push({
            level,
            from: intersections[0],
            to: intersections[1],
          });
          segments.push({
            level,
            from: intersections[2],
            to: intersections[3],
          });
        }
      }
    }
  }

  return { segments, levels: usableLevels };
};

const mean = (values) => {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const getLayerStrengthKey = (delta, gradient) => {
  if (!Number.isFinite(delta) || !Number.isFinite(gradient))
    return "strengthInsufficient";
  const magnitude = Math.abs(delta) + Math.abs(gradient) * 4;
  if (magnitude >= 5) return "strengthStrong";
  if (magnitude >= 2.5) return "strengthModerate";
  return "strengthWeak";
};

const CTDSectionHeatmap = ({
  ctdData,
  metric: controlledMetric = "temperature",
}) => {
  const { t } = useTranslation();
  const [tooltip, setTooltip] = useState(null);
  const [activeColumn, setActiveColumn] = useState(null);
  const containerRef = useRef(null);
  const heatmapCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);

  const activeMetric =
    METRIC_DEFINITIONS[controlledMetric] || METRIC_DEFINITIONS.temperature;

  const preparedData = useMemo(() => {
    if (!ctdData?.length) {
      return null;
    }

    const sorted = [...ctdData].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
    );

    let cumulativeDistance = 0;
    let previousPoint = null;
    const samples = [];

    for (const item of sorted) {
      const rawLat = item.latitude;
      const rawLon = item.longitude;
      const lat = rawLat != null ? Number(rawLat) : null;
      const lon = rawLon != null ? Number(rawLon) : null;
      const hasValidGps =
        Number.isFinite(lat) && Number.isFinite(lon) &&
        (lat !== 0 || lon !== 0);
      const depth = Number(item.depth);
      const metricValue = Number(item[activeMetric.key]);

      if (
        !Number.isFinite(depth) ||
        !Number.isFinite(metricValue)
      ) {
        continue;
      }

      if (hasValidGps && previousPoint?.hasValidGps) {
        const stepKm = haversineKm(
          previousPoint.lat,
          previousPoint.lon,
          lat,
          lon,
        );
        if (Number.isFinite(stepKm) && stepKm < 5) {
          cumulativeDistance += stepKm;
        }
      }

      samples.push({
        lat,
        lon,
        hasValidGps,
        depth_m: depth,
        distance_km: cumulativeDistance,
        timestamp: item.timestamp,
        temperature: Number(item.temperature),
        salinity: Number(item.salinity),
        conductivity: Number(item.conductivity),
        density: Number(item.density),
        sound_velocity: Number(item.sound_velocity),
        value: metricValue,
      });

      previousPoint = { lat, lon, hasValidGps };
    }

    if (!samples.length) {
      return null;
    }

    const maxDepth = Math.max(...samples.map((sample) => sample.depth_m));
    const maxDistance = Math.max(
      ...samples.map((sample) => sample.distance_km),
    );
    const xBins = Math.max(2, Math.ceil(maxDistance / DISTANCE_BIN_KM) + 1);
    const yBins = Math.max(2, Math.ceil(maxDepth / DEPTH_BIN_M) + 1);
    const totalCells = xBins * yBins;

    const counts = new Uint16Array(totalCells);
    const metricSums = new Float32Array(totalCells);
    const temperatureSums = new Float32Array(totalCells);
    const salinitySums = new Float32Array(totalCells);
    const conductivitySums = new Float32Array(totalCells);
    const densitySums = new Float32Array(totalCells);
    const soundVelocitySums = new Float32Array(totalCells);
    const latestSampleIndexByCell = new Int32Array(totalCells).fill(-1);
    const columnCounts = new Uint16Array(xBins);

    samples.forEach((sample, sampleIndex) => {
      const x = clamp(
        Math.floor(sample.distance_km / DISTANCE_BIN_KM),
        0,
        xBins - 1,
      );
      const y = clamp(Math.floor(sample.depth_m / DEPTH_BIN_M), 0, yBins - 1);
      const index = y * xBins + x;

      counts[index] += 1;
      columnCounts[x] += 1;
      metricSums[index] += sample.value;
      temperatureSums[index] += Number.isFinite(sample.temperature)
        ? sample.temperature
        : 0;
      salinitySums[index] += Number.isFinite(sample.salinity)
        ? sample.salinity
        : 0;
      conductivitySums[index] += Number.isFinite(sample.conductivity)
        ? sample.conductivity
        : 0;
      densitySums[index] += Number.isFinite(sample.density)
        ? sample.density
        : 0;
      soundVelocitySums[index] += Number.isFinite(sample.sound_velocity)
        ? sample.sound_velocity
        : 0;
      latestSampleIndexByCell[index] = sampleIndex;
    });

    const averageValues = new Float32Array(totalCells);
    const temperatureAverageValues = new Float32Array(totalCells);
    const salinityAverageValues = new Float32Array(totalCells);
    const tooltipData = new Array(totalCells).fill(null);
    const validValues = [];

    for (let index = 0; index < totalCells; index += 1) {
      if (counts[index] === 0) {
        continue;
      }

      averageValues[index] = metricSums[index] / counts[index];
      temperatureAverageValues[index] = temperatureSums[index] / counts[index];
      salinityAverageValues[index] = salinitySums[index] / counts[index];
      validValues.push(averageValues[index]);

      tooltipData[index] = {
        value: averageValues[index],
        temperature: temperatureAverageValues[index],
        salinity: salinityAverageValues[index],
        conductivity: conductivitySums[index] / counts[index],
        density: densitySums[index] / counts[index],
        sound_velocity: soundVelocitySums[index] / counts[index],
        sample: samples[latestSampleIndexByCell[index]],
      };
    }

    if (!validValues.length) {
      return null;
    }

    const minValue = Math.min(...validValues);
    const maxValue = Math.max(...validValues);
    const dataCoverage = validValues.length / totalCells;

    let strongestGradient = null;
    const thermoclinePointsRaw = [];

    for (let x = 0; x < xBins; x += 1) {
      let columnGradient = null;

      for (let y = 1; y < yBins; y += 1) {
        const currentIndex = y * xBins + x;
        const aboveIndex = currentIndex - xBins;
        if (counts[currentIndex] === 0 || counts[aboveIndex] === 0) {
          continue;
        }

        const activeGradient =
          (averageValues[currentIndex] - averageValues[aboveIndex]) /
          DEPTH_BIN_M;

        if (
          !strongestGradient ||
          Math.abs(activeGradient) > Math.abs(strongestGradient.gradient)
        ) {
          strongestGradient = {
            gradient: activeGradient,
            depth: y * DEPTH_BIN_M,
            distance: x * DISTANCE_BIN_KM,
          };
        }

        const temperatureGradient =
          (temperatureAverageValues[currentIndex] -
            temperatureAverageValues[aboveIndex]) /
          DEPTH_BIN_M;

        if (
          !columnGradient ||
          Math.abs(temperatureGradient) > Math.abs(columnGradient.gradient)
        ) {
          columnGradient = {
            gradient: temperatureGradient,
            depth: y * DEPTH_BIN_M,
            distance: x * DISTANCE_BIN_KM,
          };
        }
      }

      if (columnGradient) {
        thermoclinePointsRaw.push(columnGradient);
      }
    }

    const thermoclinePoints = thermoclinePointsRaw.map((point, index) => {
      const windowPoints = thermoclinePointsRaw.slice(
        Math.max(0, index - 1),
        Math.min(thermoclinePointsRaw.length, index + 2),
      );
      return {
        ...point,
        depth: mean(windowPoints.map((item) => item.depth)) ?? point.depth,
        gradient:
          mean(windowPoints.map((item) => item.gradient)) ?? point.gradient,
      };
    });

    const thermocline = thermoclinePoints.length
      ? {
          meanDepth: mean(thermoclinePoints.map((point) => point.depth)),
          maxGradient:
            thermoclinePoints.reduce((max, point) => {
              if (!max || Math.abs(point.gradient) > Math.abs(max.gradient)) {
                return point;
              }
              return max;
            }, null) || null,
          strength:
            mean(thermoclinePoints.map((point) => Math.abs(point.gradient))) ??
            null,
          points: thermoclinePoints,
        }
      : null;

    let latestColumnIndex = 0;
    for (let x = xBins - 1; x >= 0; x -= 1) {
      if (columnCounts[x] > 0) {
        latestColumnIndex = x;
        break;
      }
    }
    const effectiveXBins = Math.max(2, latestColumnIndex + 1);
    const effectiveMaxDistance = Math.max(
      latestColumnIndex * DISTANCE_BIN_KM,
      DISTANCE_BIN_KM,
    );

    const buildColumnProfile = (columnIndex) => {
      const points = [];
      for (let y = 0; y < yBins; y += 1) {
        const index = y * xBins + columnIndex;
        if (counts[index] === 0 || !tooltipData[index]) {
          continue;
        }
        points.push({
          depth: y * DEPTH_BIN_M,
          value: averageValues[index],
          ...tooltipData[index],
        });
      }
      return points;
    };

    const surfaceTemperature = mean(
      samples
        .filter((sample) => sample.depth_m <= 5)
        .map((sample) => sample.temperature),
    );
    const bottomTemperature = mean(
      samples
        .filter((sample) => sample.depth_m >= Math.max(5, maxDepth - 5))
        .map((sample) => sample.temperature),
    );
    const surfaceSalinity = mean(
      samples
        .filter((sample) => sample.depth_m <= 5)
        .map((sample) => sample.salinity),
    );
    const bottomSalinity = mean(
      samples
        .filter((sample) => sample.depth_m >= Math.max(5, maxDepth - 5))
        .map((sample) => sample.salinity),
    );

    const temperatureDelta =
      Number.isFinite(surfaceTemperature) && Number.isFinite(bottomTemperature)
        ? bottomTemperature - surfaceTemperature
        : null;
    const salinityDelta =
      Number.isFinite(surfaceSalinity) && Number.isFinite(bottomSalinity)
        ? bottomSalinity - surfaceSalinity
        : null;

    const anomalyMessages = [];
    samples.forEach((sample, index) => {
      for (const [key, config] of Object.entries(SENSOR_THRESHOLDS)) {
        const value = Number(sample[key]);
        if (!Number.isFinite(value)) {
          continue;
        }

        if (value < config.min || value > config.max) {
          anomalyMessages.push(
            `${key} out of range near ${formatNumber(sample.distance_km, 2)} km / ${formatNumber(sample.depth_m, 0)} m`,
          );
          break;
        }

        const previous = samples[index - 1];
        if (!previous) continue;
        const previousValue = Number(previous[key]);
        if (
          Number.isFinite(previousValue) &&
          Math.abs(value - previousValue) > config.spike &&
          Math.abs(sample.depth_m - previous.depth_m) <= 2
        ) {
          anomalyMessages.push(
            `${key} spike around ${formatNumber(sample.depth_m, 0)} m depth`,
          );
          break;
        }
      }
    });

    const displayGrid = buildDisplayGrid({
      values: averageValues,
      counts,
      tooltipData,
      xBins,
      yBins,
    });

    const contourResult = computeContourSegments({
      values: displayGrid.displayValues,
      counts: displayGrid.displayCounts,
      xBins,
      yBins,
      maxDistance,
      maxDepth,
      minValue,
      maxValue,
    });

    return {
      samples,
      counts,
      averageValues,
      tooltipData,
      displayValues: displayGrid.displayValues,
      displayCounts: displayGrid.displayCounts,
      displayTooltipData: displayGrid.displayTooltipData,
      imputedMask: displayGrid.imputedMask,
      minValue,
      maxValue,
      maxDepth,
      maxDistance,
      effectiveXBins,
      effectiveMaxDistance,
      xBins,
      yBins,
      dataCoverage,
      strongestGradient,
      contourSegments: contourResult.segments,
      contourLevels: contourResult.levels,
      thermocline,
      latestColumnIndex,
      buildColumnProfile,
      temperatureDelta,
      salinityDelta,
      surfaceTemperature,
      bottomTemperature,
      surfaceSalinity,
      bottomSalinity,
      anomalyMessages: [...new Set(anomalyMessages)].slice(0, 3),
      isStationaryProfile: effectiveMaxDistance < DISTANCE_BIN_KM,
      hasGpsData: samples.some(s => s.hasValidGps),
    };
  }, [ctdData, activeMetric]);

  useEffect(() => {
    if (!preparedData) {
      setActiveColumn(null);
      return;
    }

    setActiveColumn((current) =>
      Number.isInteger(current) ? current : preparedData.latestColumnIndex,
    );
  }, [preparedData]);

  useEffect(() => {
    const heatmapCanvas = heatmapCanvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    const container = containerRef.current;
    if (!preparedData || !heatmapCanvas || !overlayCanvas || !container) {
      return undefined;
    }

    const render = () => {
      const width = Math.max(container.clientWidth, PLOT_MIN_WIDTH);
      const height = PLOT_HEIGHT;
      heatmapCanvas.width = width;
      heatmapCanvas.height = height;
      overlayCanvas.width = width;
      overlayCanvas.height = height;

      const heatmapCtx = heatmapCanvas.getContext("2d");
      const overlayCtx = overlayCanvas.getContext("2d");
      const {
        displayValues,
        displayCounts,
        minValue,
        maxValue,
        xBins,
        yBins,
        maxDepth,
        contourSegments,
        thermocline,
        effectiveXBins,
        effectiveMaxDistance,
      } = preparedData;

      const cellWidth = width / effectiveXBins;
      const cellHeight = height / yBins;
      const valueRange = Math.max(1e-6, maxValue - minValue);

      heatmapCtx.clearRect(0, 0, width, height);
      overlayCtx.clearRect(0, 0, width, height);

      heatmapCtx.fillStyle = "rgba(248, 250, 252, 0.96)";
      heatmapCtx.fillRect(0, 0, width, height);

      for (let y = 0; y < yBins; y += 1) {
        for (let x = 0; x < effectiveXBins; x += 1) {
          const index = y * xBins + x;
          const left = x * cellWidth;
          const top = y * cellHeight;

          if (displayCounts[index] === 0) {
            heatmapCtx.fillStyle = "rgba(226, 232, 240, 0.82)";
            heatmapCtx.fillRect(
              left,
              top,
              Math.ceil(cellWidth) + 1,
              Math.ceil(cellHeight) + 1,
            );
            continue;
          }

          const ratio = clamp(
            (displayValues[index] - minValue) / valueRange,
            0,
            1,
          );
          const [r, g, b] = interpolateColor(activeMetric.colormap, ratio);
          heatmapCtx.fillStyle = `rgb(${r} ${g} ${b})`;
          heatmapCtx.fillRect(
            left,
            top,
            Math.ceil(cellWidth) + 1,
            Math.ceil(cellHeight) + 1,
          );
        }
      }

      if (thermocline?.meanDepth) {
        const bandTop =
          (clamp(thermocline.meanDepth - 1.5, 0, maxDepth) /
            Math.max(maxDepth, DEPTH_BIN_M)) *
          height;
        const bandBottom =
          (clamp(thermocline.meanDepth + 1.5, 0, maxDepth) /
            Math.max(maxDepth, DEPTH_BIN_M)) *
          height;
        overlayCtx.fillStyle = "rgba(37, 99, 235, 0.08)";
        overlayCtx.fillRect(
          0,
          bandTop,
          width,
          Math.max(6, bandBottom - bandTop),
        );
      }

      overlayCtx.strokeStyle = "rgba(15, 23, 42, 0.22)";
      overlayCtx.lineWidth = 1;
      overlayCtx.setLineDash([4, 4]);
      contourSegments.forEach((segment) => {
        overlayCtx.beginPath();
        overlayCtx.moveTo(
          (segment.from.x / Math.max(effectiveMaxDistance, DISTANCE_BIN_KM)) * width,
          (segment.from.y / Math.max(maxDepth, DEPTH_BIN_M)) * height,
        );
        overlayCtx.lineTo(
          (segment.to.x / Math.max(effectiveMaxDistance, DISTANCE_BIN_KM)) * width,
          (segment.to.y / Math.max(maxDepth, DEPTH_BIN_M)) * height,
        );
        overlayCtx.stroke();
      });
      overlayCtx.setLineDash([]);

      overlayCtx.strokeStyle = "rgba(148, 163, 184, 0.32)";
      overlayCtx.lineWidth = 1;
      for (let i = 1; i < 5; i += 1) {
        const y = (height / 5) * i;
        overlayCtx.beginPath();
        overlayCtx.moveTo(0, y);
        overlayCtx.lineTo(width, y);
        overlayCtx.stroke();
      }
      for (let i = 1; i < 6; i += 1) {
        const x = (width / 6) * i;
        overlayCtx.beginPath();
        overlayCtx.moveTo(x, 0);
        overlayCtx.lineTo(x, height);
        overlayCtx.stroke();
      }

      const highlightedColumn = Number.isInteger(activeColumn)
        ? activeColumn
        : preparedData.latestColumnIndex;
      const highlightLeft = highlightedColumn * cellWidth;
      overlayCtx.fillStyle = "rgba(37, 99, 235, 0.09)";
      overlayCtx.fillRect(highlightLeft, 0, Math.max(2, cellWidth), height);
      overlayCtx.strokeStyle = "rgba(37, 99, 235, 0.45)";
      overlayCtx.lineWidth = 1.4;
      overlayCtx.beginPath();
      overlayCtx.moveTo(highlightLeft, 0);
      overlayCtx.lineTo(highlightLeft, height);
      overlayCtx.stroke();
    };

    render();
    const observer = new ResizeObserver(render);
    observer.observe(container);
    return () => observer.disconnect();
  }, [preparedData, activeMetric, activeColumn]);

  const axisTicks = useMemo(() => {
    if (!preparedData) return { x: [], y: [] };

    const x = Array.from({ length: 6 }, (_, index) => {
      const ratio = index / 5;
      return {
        label: formatDistanceLabel(preparedData.effectiveMaxDistance * ratio),
        ratio,
      };
    });
    const y = Array.from({ length: 5 }, (_, index) => {
      const ratio = index / 4;
      return {
        label: `${formatNumber(preparedData.maxDepth * ratio, 0)} m`,
        ratio,
      };
    });

    return { x, y };
  }, [preparedData]);

  const legendTicks = useMemo(() => {
    if (!preparedData) return [];
    return Array.from({ length: 5 }, (_, index) => {
      const ratio = index / 4;
      return {
        ratio,
        value:
          preparedData.minValue +
          (preparedData.maxValue - preparedData.minValue) * ratio,
      };
    });
  }, [preparedData]);

  const handlePointerMove = (event) => {
    if (!preparedData || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clamp(event.clientX - rect.left, 0, rect.width - 1);
    const y = clamp(event.clientY - rect.top, 0, rect.height - 1);
    const xBin = clamp(
      Math.floor((x / rect.width) * preparedData.effectiveXBins),
      0,
      preparedData.effectiveXBins - 1,
    );
    const yBin = clamp(
      Math.floor((y / rect.height) * preparedData.yBins),
      0,
      preparedData.yBins - 1,
    );
    const index = yBin * preparedData.xBins + xBin;
    const data = preparedData.displayTooltipData[index];
    const distanceStep =
      preparedData.effectiveXBins > 1
        ? Math.max(preparedData.effectiveMaxDistance, DISTANCE_BIN_KM) /
          (preparedData.effectiveXBins - 1)
        : 0;
    const distance = Math.min(
      preparedData.effectiveMaxDistance,
      xBin * distanceStep,
    );

    setActiveColumn(xBin);
    setTooltip({
      left: x,
      top: y,
      xBin,
      distance,
      depth: yBin * DEPTH_BIN_M,
      data,
    });
  };

  const handlePointerLeave = () => {
    setTooltip(null);
    setActiveColumn(preparedData?.latestColumnIndex ?? null);
  };

  const summary = preparedData
    ? {
        thermoclineDepth: preparedData.thermocline?.meanDepth,
        thermoclineStrength: preparedData.thermocline?.strength,
        tempLayerStrengthKey: getLayerStrengthKey(
          preparedData.temperatureDelta,
          preparedData.thermocline?.strength,
        ),
      }
    : null;

  return (
    <div className="space-y-5">
      {!preparedData ? (
        <div className="flex h-72 items-center justify-center text-sm text-gray-500 dark:text-gray-400">
          {t("pages.ctd.charts.sectionHeatmapNoData")}
        </div>
      ) : (
        <>
          {(preparedData.isStationaryProfile || !preparedData.hasGpsData) && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
              <span className="mt-0.5 shrink-0 text-base">⚠</span>
              <div>
                <span className="font-semibold">
                  {!preparedData.hasGpsData
                    ? t("pages.ctd.heatmap.noGps")
                    : t("pages.ctd.heatmap.stationaryProfile")}
                </span>
                <span className="ml-1 text-amber-600 dark:text-amber-500">
                  {!preparedData.hasGpsData
                    ? `— ${t("pages.ctd.heatmap.noGpsDesc")}`
                    : `— ${t("pages.ctd.heatmap.stationaryProfileDesc")}`}
                </span>
              </div>
            </div>
          )}

          <div className="grid gap-4">
            <DataCard showHeader={false}>
              <div className="pb-0">
                <div className="mb-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>{t("pages.data.charts.depth")} (m)</span>
                  <span>
                    {summary?.thermoclineDepth
                      ? `${t("pages.ctd.heatmap.thermoclineAround")} ${formatNumber(summary.thermoclineDepth, 1)} m`
                      : t("pages.ctd.heatmap.noThermocline")}
                  </span>
                </div>
                <div
                  ref={containerRef}
                  className="relative w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-slate-600 dark:bg-black"
                  style={{ height: PLOT_HEIGHT }}
                  onMouseMove={handlePointerMove}
                  onMouseLeave={handlePointerLeave}
                >
                  <canvas
                    ref={heatmapCanvasRef}
                    className="absolute inset-0 h-full w-full"
                  />
                  <canvas
                    ref={overlayCanvasRef}
                    className="pointer-events-none absolute inset-0 h-full w-full"
                  />

                  <div className="pointer-events-none absolute left-3 top-3 rounded-md bg-white/90 px-2 py-1 text-[11px] font-medium text-gray-600 backdrop-blur dark:bg-black/90 dark:text-gray-300">
                    0 m
                  </div>
                  <div className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-white/90 px-2 py-1 text-[11px] font-medium text-gray-600 backdrop-blur dark:bg-black/90 dark:text-gray-300">
                    {formatNumber(preparedData.maxDepth, 0)} m
                  </div>

                  {tooltip && (
                    <div
                      className="pointer-events-none absolute z-20 min-w-55 rounded-xl border border-gray-200 bg-white/96 p-3 shadow-xl backdrop-blur dark:border-gray-700 dark:bg-slate-950/96"
                      style={{
                        left: `${clamp(
                          tooltip.left + 14,
                          10,
                          Math.max(
                            10,
                            (containerRef.current?.clientWidth || 0) - 240,
                          ),
                        )}px`,
                        top: `${clamp(tooltip.top + 14, 10, PLOT_HEIGHT - 188)}px`,
                      }}
                    >
                      <div className="mb-2 flex items-center justify-between gap-3 border-b border-gray-200 pb-2 dark:border-gray-800">
                        <div>
                          <div className="text-sm font-semibold text-black dark:text-white">
                            {formatNumber(tooltip.distance, 2)} km
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Depth {formatNumber(tooltip.depth, 0)} m
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-black dark:text-white">
                            {tooltip.data
                              ? `${formatNumber(tooltip.data.value, 2)} ${activeMetric.unit}`
                              : "No Data"}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {activeMetric.label}
                          </div>
                        </div>
                      </div>

                      {tooltip.data ? (
                        <div className="space-y-1.5">
                          {METRICS_FOR_TOOLTIP.map((item) => (
                            <div
                              key={item.key}
                              className="flex items-center justify-between gap-3 text-xs"
                            >
                              <span className="text-gray-500 dark:text-gray-400">
                                {item.label}
                              </span>
                              <span className="font-medium text-black dark:text-white">
                                {formatNumber(
                                  tooltip.data[item.key],
                                  item.digits,
                                )}{" "}
                                {item.unit}
                              </span>
                            </div>
                          ))}
                          <div className="mt-2 border-t border-gray-200 pt-2 text-[11px] text-gray-500 dark:border-gray-800 dark:text-gray-400">
                            {tooltip.data.interpolated
                              ? "Interpolated from adjacent valid bins"
                              : `Source sample: ${tooltip.data.sample?.timestamp || "live stream"}`}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          No valid measurement in this bin. Hatched cells mark
                          unsampled or missing water column coverage.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <div className="space-y-4">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    {axisTicks.x.map((tick) => (
                      <span key={tick.ratio}>{tick.label}</span>
                    ))}
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-600 dark:bg-black">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          {activeMetric.label}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {activeMetric.legendLabel}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Grid 50 m x 1 m
                      </div>
                    </div>

                    <div
                      className="h-3 rounded-full"
                      style={{
                        background: `linear-gradient(90deg, ${activeMetric.colormap.join(", ")})`,
                      }}
                    />

                    <div className="mt-3 flex justify-between text-xs text-gray-500 dark:text-gray-400">
                      {legendTicks.map((tick) => (
                        <span key={tick.ratio}>
                          {formatNumber(tick.value, 2)} {activeMetric.unit}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </DataCard>
          </div>
        </>
      )}
    </div>
  );
};

export default CTDSectionHeatmap;
