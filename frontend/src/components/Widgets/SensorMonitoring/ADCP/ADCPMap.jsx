import React, { useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  CircleMarker,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import useTranslation from "../../../../hooks/useTranslation";

const FitBounds = ({ positions }) => {
  const map = useMap();
  useEffect(() => {
    if (positions && positions.length >= 2) {
      try {
        map.fitBounds(L.latLngBounds(positions), { padding: [32, 32] });
      } catch {}
    } else if (positions && positions.length === 1) {
      map.setView(positions[0], 14);
    }
  }, [map, positions]);
  return null;
};

const createCurrentArrow = (directionDeg, speedMs) => {
  const rotate = directionDeg ?? 0;
  const opacity = speedMs !== null ? Math.min(0.4 + speedMs * 2, 1) : 0.7;

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <g transform="rotate(${rotate}, 20, 20)">
      <line x1="20" y1="32" x2="20" y2="10" stroke="#ef4444" stroke-width="3" stroke-linecap="round" opacity="${opacity}"/>
      <polygon points="20,4 14,14 26,14" fill="#ef4444" opacity="${opacity}"/>
    </g>
  </svg>`;

  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

const ADCPMap = ({ adcpData }) => {
  const { t } = useTranslation();

  const latest = useMemo(() => {
    if (!adcpData || adcpData.length === 0) return null;
    const sorted = [...adcpData].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
    );
    return (
      sorted.find(
        (d) => Number.isFinite(d.latitude) && Number.isFinite(d.longitude),
      ) || null
    );
  }, [adcpData]);

  const trail = useMemo(() => {
    return adcpData
      .filter(
        (d) => Number.isFinite(d.latitude) && Number.isFinite(d.longitude),
      )
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .slice(-50)
      .map((d) => [d.latitude, d.longitude]);
  }, [adcpData]);

  const center = latest
    ? [latest.latitude, latest.longitude]
    : [-6.2, 106.8166667];

  if (!latest) {
    return (
      <div
        className="bg-white dark:bg-transparent border border-gray-300 dark:border-slate-600 rounded-xl overflow-hidden"
        style={{ height: "100%", minHeight: "360px" }}
      >
        <div className="flex items-center justify-center h-full text-sm text-gray-500 dark:text-gray-400">
          {t("common.noDataAvailable")}
        </div>
      </div>
    );
  }

  const arrowIcon = createCurrentArrow(
    latest.current_direction_deg,
    latest.current_speed_ms,
  );

  return (
    <div
      className="bg-white dark:bg-transparent border border-gray-300 dark:border-slate-600 rounded-xl overflow-hidden"
      style={{ height: "100%", minHeight: "360px" }}
    >
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
        minZoom={3}
        maxZoom={20}
      >
        <TileLayer
          attribution="&copy; Esri"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          noWrap={true}
          maxZoom={20}
          maxNativeZoom={18}
        />
        {trail.length >= 2 && (
          <>
            {trail.slice(0, -1).map((pos, i) => (
              <CircleMarker
                key={i}
                center={pos}
                radius={2}
                pathOptions={{
                  color: "#38bdf8",
                  fillColor: "#38bdf8",
                  fillOpacity: 0.5,
                  weight: 1,
                }}
              />
            ))}
          </>
        )}
        {/* Current direction arrow at latest position */}
        <Marker
          position={[latest.latitude, latest.longitude]}
          icon={arrowIcon}
        />
        <FitBounds
          positions={
            trail.length > 0 ? trail : [[latest.latitude, latest.longitude]]
          }
        />
      </MapContainer>
    </div>
  );
};

export default ADCPMap;
