import React, { useEffect, useMemo, useState } from "react";
import {
  Circle,
  CircleMarker,
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import Dropdown from "../../Dropdown";

const MAX_POINTS = 80;
const DEFAULT_CENTER = [-6.2, 106.8166667];
const CONTOUR_RADII = [180, 130, 90, 55];
const CONTOUR_OPACITY = [0.06, 0.1, 0.15, 0.22];

const BASEMAPS = {
  dark: {
    label: "Dark",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
  },
  satellite: {
    label: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
    maxZoom: 20,
    maxNativeZoom: 18,
  },
};

const HEAT_METRICS = {
  temperature: { label: "Temperature", unit: "C", key: "temperature" },
  salinity: { label: "Salinity", unit: "PSU", key: "salinity" },
  depth: { label: "Depth", unit: "m", key: "depth" },
};

const FitBounds = ({ points }) => {
  const map = useMap();

  useEffect(() => {
    if (!points || points.length === 0) return;
    const bounds = points.map((point) => [point.latitude, point.longitude]);
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 17 });
  }, [map, points]);

  return null;
};

const TSDiagram = ({ ctdData }) => {
  const [basemap, setBasemap] = useState("dark");
  const [heatMetric, setHeatMetric] = useState("temperature");
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(MAX_POINTS);

  const locationData = useMemo(() => {
    const metricKey = HEAT_METRICS[heatMetric].key;

    if (!ctdData || ctdData.length === 0) return [];

    return [...ctdData]
      .filter(
        (item) =>
          typeof item.latitude === "number" &&
          typeof item.longitude === "number" &&
          Number.isFinite(item[metricKey]),
      )
      .slice(-MAX_POINTS)
      .map((item, index) => ({
        idx: index + 1,
        latitude: item.latitude,
        longitude: item.longitude,
        depth: item.depth,
        temperature: item.temperature,
        salinity: item.salinity,
        gps_ok: item.gps_ok,
        time: new Date(item.timestamp).toLocaleString("id-ID", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      }));
  }, [ctdData, heatMetric]);

  useEffect(() => {
    setPlaybackIndex(locationData.length);
    setIsPlaying(false);
  }, [locationData.length, heatMetric]);

  useEffect(() => {
    if (!isPlaying || locationData.length === 0) return undefined;

    const timer = setInterval(() => {
      setPlaybackIndex((prev) => {
        if (prev >= locationData.length) {
          setIsPlaying(false);
          return locationData.length;
        }
        return prev + 1;
      });
    }, 350);

    return () => clearInterval(timer);
  }, [isPlaying, locationData.length]);

  const displayedData = useMemo(() => {
    if (locationData.length === 0) return [];
    const clampedIndex = Math.max(
      1,
      Math.min(playbackIndex, locationData.length),
    );
    return locationData.slice(0, clampedIndex);
  }, [locationData, playbackIndex]);

  const metricConfig = HEAT_METRICS[heatMetric];
  const metricKey = metricConfig.key;

  const minValue = useMemo(
    () =>
      displayedData.length
        ? Math.min(...displayedData.map((point) => point[metricKey]))
        : 0,
    [displayedData, metricKey],
  );

  const maxValue = useMemo(
    () =>
      displayedData.length
        ? Math.max(...displayedData.map((point) => point[metricKey]))
        : 1,
    [displayedData, metricKey],
  );

  const latestPoint =
    displayedData.length > 0 ? displayedData[displayedData.length - 1] : null;

  const trackLine = displayedData.map((point) => [
    point.latitude,
    point.longitude,
  ]);

  const getHeatColor = (value) => {
    const range = maxValue - minValue || 1;
    const normalized = Math.max(0, Math.min(1, (value - minValue) / range));

    if (normalized < 0.125) return "#355CFF";
    if (normalized < 0.25) return "#238BFF";
    if (normalized < 0.375) return "#00C7F2";
    if (normalized < 0.5) return "#20D66F";
    if (normalized < 0.625) return "#B9E526";
    if (normalized < 0.75) return "#F6D32D";
    if (normalized < 0.875) return "#F79A2F";
    return "#F04934";
  };

  return (
    <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl p-6">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-black dark:text-white">
          Location Heatmap
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Heat intensity by {metricConfig.label.toLowerCase()} on map (last 80
          samples)
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600 dark:text-gray-400">Map</span>
          <Dropdown
            items={Object.entries(BASEMAPS).map(([key, config]) => ({
              id: key,
              name: config.label,
            }))}
            selectedItem={{ id: basemap, name: BASEMAPS[basemap].label }}
            onItemChange={(item) => setBasemap(item.id)}
            getItemKey={(item) => item.id}
            className="w-32"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600 dark:text-gray-400">Heat</span>
          <Dropdown
            items={Object.entries(HEAT_METRICS).map(([key, config]) => ({
              id: key,
              name: config.label,
            }))}
            selectedItem={{
              id: heatMetric,
              name: HEAT_METRICS[heatMetric].label,
            }}
            onItemChange={(item) => setHeatMetric(item.id)}
            getItemKey={(item) => item.id}
            className="w-40"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (playbackIndex >= locationData.length) setPlaybackIndex(1);
              setIsPlaying((prev) => !prev);
            }}
            className="bg-slate-800 hover:bg-slate-700 text-white text-xs rounded-md px-2 py-1"
          >
            {isPlaying ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsPlaying(false);
              setPlaybackIndex(locationData.length);
            }}
            className="bg-slate-700 hover:bg-slate-600 text-white text-xs rounded-md px-2 py-1"
          >
            Live
          </button>
        </div>
      </div>

      <div className="mb-4">
        <input
          type="range"
          min={locationData.length > 0 ? 1 : 0}
          max={locationData.length > 0 ? locationData.length : 0}
          value={
            locationData.length > 0
              ? Math.min(playbackIndex, locationData.length)
              : 0
          }
          onChange={(event) => {
            setIsPlaying(false);
            setPlaybackIndex(Number(event.target.value));
          }}
          className="w-full accent-sky-500"
          disabled={locationData.length === 0}
        />
        <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
          Showing {displayedData.length}/{locationData.length} points
        </div>
      </div>

      <div className="flex items-center gap-6 mb-4 text-xs text-gray-600 dark:text-gray-400">
        <span className="inline-flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-blue-500" />
          Low {metricConfig.label.toLowerCase()}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-lime-400" />
          Medium {metricConfig.label.toLowerCase()}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          High {metricConfig.label.toLowerCase()}
        </span>
      </div>

      <div className="h-100 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        {locationData.length === 0 ? (
          <div className="flex items-center justify-center h-full bg-white dark:bg-black">
            <p className="text-gray-500 dark:text-gray-400">
              No location data available
            </p>
          </div>
        ) : (
          <MapContainer
            center={
              latestPoint
                ? [latestPoint.latitude, latestPoint.longitude]
                : DEFAULT_CENTER
            }
            zoom={14}
            className="h-full w-full"
            scrollWheelZoom
          >
            <TileLayer
              attribution={BASEMAPS[basemap].attribution}
              url={BASEMAPS[basemap].url}
              maxZoom={BASEMAPS[basemap].maxZoom ?? 19}
              maxNativeZoom={BASEMAPS[basemap].maxNativeZoom ?? 18}
            />

            <FitBounds points={displayedData} />

            {trackLine.length > 1 && (
              <Polyline
                positions={trackLine}
                pathOptions={{ color: "#60A5FA", weight: 2, opacity: 0.75 }}
              />
            )}

            {displayedData.map((point) => {
              const color = getHeatColor(point[metricKey]);
              const invalidGps = point.gps_ok === false;

              return (
                <React.Fragment key={`${point.idx}-${point.time}`}>
                  {CONTOUR_RADII.map((radius, ringIndex) => (
                    <Circle
                      key={`ring-${ringIndex}`}
                      center={[point.latitude, point.longitude]}
                      radius={invalidGps ? radius * 0.65 : radius}
                      pathOptions={{
                        color:
                          ringIndex % 2 === 0
                            ? "rgba(255,255,255,0.18)"
                            : "rgba(255,255,255,0.10)",
                        fillColor: color,
                        fillOpacity: invalidGps
                          ? Math.max(0.03, CONTOUR_OPACITY[ringIndex] - 0.04)
                          : CONTOUR_OPACITY[ringIndex],
                        weight: ringIndex % 2 === 0 ? 1 : 0,
                      }}
                    />
                  ))}

                  <CircleMarker
                    center={[point.latitude, point.longitude]}
                    radius={invalidGps ? 3 : 4}
                    pathOptions={{
                      color: invalidGps ? "#F87171" : color,
                      fillColor: invalidGps ? "#F87171" : color,
                      fillOpacity: invalidGps ? 0.9 : 0.85,
                      weight:
                        latestPoint && point.idx === latestPoint.idx ? 2 : 1,
                    }}
                  >
                    <Popup>
                      <div className="text-sm">
                        <div>
                          <strong>Point #{point.idx}</strong>
                        </div>
                        <div>{point.time}</div>
                        <div>Lat: {point.latitude.toFixed(7)}</div>
                        <div>Lon: {point.longitude.toFixed(7)}</div>
                        <div>Depth: {point.depth.toFixed(2)} m</div>
                        <div>Temp: {point.temperature.toFixed(2)} C</div>
                        <div>
                          {metricConfig.label}: {point[metricKey].toFixed(2)}{" "}
                          {metricConfig.unit}
                        </div>
                        <div>
                          GPS: {point.gps_ok === false ? "Invalid" : "Valid"}
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                </React.Fragment>
              );
            })}
          </MapContainer>
        )}
      </div>
    </div>
  );
};

export default TSDiagram;
