import React, { useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import useMapTile from "../../../../hooks/useMapTile";
import { useEffect } from "react";
import useTranslation from "../../../../hooks/useTranslation";
import usvPointIcon from "../../../../assets/usv-point.webp";

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

const createUsvIcon = (heading = 0) => {
  const size = 40;
  return L.divIcon({
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        display: flex;
        align-items: center;
        justify-content: center;
        transform: rotate(${90 - heading}deg);
        filter: drop-shadow(0 2px 8px rgba(0,0,0,0.3));
      ">
        <img 
          src="${usvPointIcon}" 
          alt="USV" 
          style="width: 100%; height: 100%; object-fit: contain;"
        />
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    className: "boat-marker-icon",
  });
};

const ADCPMap = ({ adcpData }) => {
  const { t } = useTranslation();
  const { url: tileUrl, attribution: tileAttribution } = useMapTile();

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

  const usvIcon = useMemo(
    () => createUsvIcon(latest?.current_direction_deg ?? 0),
    [latest?.current_direction_deg],
  );

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
          attribution={tileAttribution}
          url={tileUrl}
          noWrap={true}
          maxZoom={20}
          maxNativeZoom={18}
        />
        {trail.length >= 2 && (
          <Polyline
            positions={trail}
            pathOptions={{
              color: "#38bdf8",
              weight: 3,
              opacity: 0.7,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        )}
        {/* USV position marker */}
        <Marker
          position={[latest.latitude, latest.longitude]}
          icon={usvIcon}
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
