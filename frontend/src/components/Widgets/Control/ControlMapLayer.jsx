import { useEffect, useRef, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import usvPointIcon from "../../../assets/usv-point.webp";

const MAP_CENTER = [45.4215, -75.6972];
const MAP_ZOOM = 14;

// ─── Waypoint marker icon factory ────────────────────────────────────────────
const createWaypointIcon = (label, bgColor, textColor = "#ffffff") =>
  L.divIcon({
    html: `
      <div style="
        width:30px;height:30px;
        border-radius:50%;
        background:${bgColor};
        border:2.5px solid rgba(255,255,255,0.95);
        box-shadow:0 4px 12px rgba(15,23,42,0.35);
        display:flex;align-items:center;justify-content:center;
        color:${textColor};font-size:11px;font-weight:700;
        font-family:system-ui,sans-serif;
        line-height:1;
      ">${label}</div>`,
    className: "ctrl-map-wp-icon",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -16],
  });

const HOME_ICON = createWaypointIcon("H", "#0f766e");

const waypointIconCache = {};
const getWaypointIcon = (number, state = "pending") => {
  const normalizedState =
    state === "completed" || state === "current" ? state : "pending";
  const cacheKey = `${number}-${normalizedState}`;
  if (!waypointIconCache[cacheKey]) {
    const bgColor =
      normalizedState === "completed"
        ? "#16a34a"
        : normalizedState === "current"
          ? "#2563eb"
          : "#64748b";
    waypointIconCache[cacheKey] = createWaypointIcon(
      String(number),
      bgColor,
      "#ffffff",
    );
  }
  return waypointIconCache[cacheKey];
};

// ─── Map sub-controllers ──────────────────────────────────────────────────────
const MinZoomController = () => {
  const map = useMap();
  useEffect(() => {
    const updateMinZoom = () => {
      const size = map.getSize();
      const minZ = Math.ceil(Math.log2(Math.max(size.x, size.y) / 256));
      const clamped = Math.max(minZ, 3);
      map.setMinZoom(clamped);
      if (map.getZoom() < clamped) map.setZoom(clamped, { animate: false });
    };
    updateMinZoom();
    map.on("resize", updateMinZoom);
    return () => map.off("resize", updateMinZoom);
  }, [map]);
  return null;
};

const MapResizeController = () => {
  const map = useMap();
  useEffect(() => {
    const syncSize = () => map.invalidateSize({ pan: false, animate: false });
    const timer = setTimeout(syncSize, 120);
    window.addEventListener("resize", syncSize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", syncSize);
    };
  }, [map]);
  return null;
};

const MapController = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, zoom || map.getZoom(), { animate: true, duration: 1 });
  }, [center, zoom, map]);
  return null;
};

const AutoCenterController = ({ selectedVehicle, vehiclePosition, isEnabled }) => {
  const map = useMap();
  const lastFocusedVehicleRef = useRef(null);
  useEffect(() => {
    if (!selectedVehicle || !vehiclePosition || !isEnabled) {
      lastFocusedVehicleRef.current = null;
      return;
    }
    const id = String(selectedVehicle?.id || selectedVehicle);
    if (id === String(lastFocusedVehicleRef.current)) return;
    lastFocusedVehicleRef.current = id;
    try {
      map.flyTo(vehiclePosition, 15, { animate: true, duration: 1.2 });
    } catch (_) {}
  }, [selectedVehicle, vehiclePosition, isEnabled, map]);
  return null;
};

/**
 * Fits the map to show the full mission path (+ vehicle if present).
 * Re-runs whenever the path identity changes (i.e. a new/different mission).
 */
const MissionFitController = ({ missionPath, vehiclePosition }) => {
  const map = useMap();
  const prevKeyRef = useRef(null);

  const pathKey = useMemo(
    () => (Array.isArray(missionPath) && missionPath.length > 0
      ? missionPath.map((p) => p.join(",")).join("|")
      : null),
    [missionPath],
  );

  useEffect(() => {
    if (!pathKey || pathKey === prevKeyRef.current) return;
    prevKeyRef.current = pathKey;

    const points = [...missionPath];
    if (vehiclePosition) points.push(vehiclePosition);
    if (points.length === 0) return;

    try {
      if (points.length === 1) {
        map.flyTo(points[0], 15, { animate: true, duration: 1.2 });
      } else {
        map.flyToBounds(L.latLngBounds(points), {
          padding: [60, 60],
          maxZoom: 18,
          animate: true,
          duration: 1.4,
        });
      }
    } catch (_) {}
  }, [pathKey, missionPath, vehiclePosition, map]);

  return null;
};

// ─── Vehicle icon factory ─────────────────────────────────────────────────────
export const createVehicleIcon = (heading) => {
  const size = 48;
  return L.divIcon({
    html: `<div style="
      width:${size}px;height:${size}px;
      display:flex;align-items:center;justify-content:center;
      transform:rotate(${90 - heading}deg);
      filter:drop-shadow(0 2px 8px rgba(0,0,0,0.3));
    ">
      <img src="${usvPointIcon}" alt="USV" style="width:100%;height:100%;object-fit:contain;" />
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    className: "boat-marker-icon",
  });
};

// ─── Main component ────────────────────────────────────────────────────────────
const ControlMapLayer = ({
  mapCenter,
  mapZoom,
  selectedVehicle,
  vehiclePosition,
  heading = 0,
  missionPath = [],
  missionMarkers = [],
}) => {
  const vehicleIcon = vehiclePosition && selectedVehicle
    ? createVehicleIcon(heading)
    : null;

  const hasMissionPath    = Array.isArray(missionPath)    && missionPath.length > 1;
  const hasMissionMarkers = Array.isArray(missionMarkers) && missionMarkers.length > 0;

  // waypoint counter resets per render (only path-type markers count)
  let wpCounter = 0;

  return (
    <div className="absolute inset-0 z-0">
      {/* CSS injected once for marker wrapper */}
      <style>{`.ctrl-map-wp-icon { background:none!important; border:none!important; }`}</style>

      <MapContainer
        center={MAP_CENTER}
        zoom={MAP_ZOOM}
        className="h-full w-full"
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
        worldCopyJump={false}
        maxBounds={[[-85, -180], [85, 180]]}
        maxBoundsViscosity={1}
        minZoom={3}
        maxZoom={20}
        zoomControl={false}
      >
        <MinZoomController />
        <MapResizeController />
        <MapController center={mapCenter} zoom={mapZoom} />
        <AutoCenterController
          selectedVehicle={selectedVehicle}
          vehiclePosition={vehiclePosition}
          isEnabled={!hasMissionPath}
        />
        {hasMissionPath && (
          <MissionFitController
            missionPath={missionPath}
            vehiclePosition={vehiclePosition}
          />
        )}

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          noWrap={true}
          minZoom={3}
          maxZoom={20}
          maxNativeZoom={18}
        />

        {/* ── Mission path line ── */}
        {hasMissionPath && (
          <>
            {/* Shadow / glow underneath */}
            <Polyline
              positions={missionPath}
              pathOptions={{ color: "#000000", weight: 8, opacity: 0.18 }}
            />
            {/* Dashed amber line */}
            <Polyline
              positions={missionPath}
              pathOptions={{
                color: "#f59e0b",
                weight: 4,
                opacity: 0.95,
                dashArray: "12 8",
                lineCap: "round",
                lineJoin: "round",
              }}
            />
          </>
        )}

        {/* ── Waypoint markers ── */}
        {hasMissionMarkers &&
          missionMarkers.map((marker, index) => {
            if (!Array.isArray(marker?.position)) return null;

            const isHome = marker.type === "home";
            let icon;
            if (isHome) {
              icon = HOME_ICON;
            } else {
              wpCounter += 1;
              icon = getWaypointIcon(
                wpCounter,
                marker?.state,
              );
            }

            return (
              <Marker
                key={`ctrl-wp-${index}`}
                position={marker.position}
                icon={icon}
              />
            );
          })}

        {/* ── Vehicle ── */}
        {vehiclePosition && vehicleIcon && selectedVehicle && (
          <Marker
            key={`vehicle-${selectedVehicle.id}`}
            position={vehiclePosition}
            icon={vehicleIcon}
          />
        )}
      </MapContainer>
    </div>
  );
};

export default ControlMapLayer;
