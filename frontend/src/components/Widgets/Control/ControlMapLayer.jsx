import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import usvPointIcon from "../../../assets/usv-point.webp";

const MAP_CENTER = [45.4215, -75.6972];
const MAP_ZOOM = 14;

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
    return () => { clearTimeout(timer); window.removeEventListener("resize", syncSize); };
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
    const selectedVehicleId = String(selectedVehicle?.id || selectedVehicle);
    if (selectedVehicleId === String(lastFocusedVehicleRef.current)) return;
    lastFocusedVehicleRef.current = selectedVehicleId;
    try {
      map.flyTo(vehiclePosition, 15, { animate: true, duration: 1.2 });
    } catch (_) {}
  }, [selectedVehicle, vehiclePosition, isEnabled, map]);

  return null;
};

export const createVehicleIcon = (heading) => {
  const size = 48;
  return L.divIcon({
    html: `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;transform:rotate(${heading}deg);filter:drop-shadow(0 2px 8px rgba(0,0,0,0.3));">
      <img src="${usvPointIcon}" alt="USV" style="width:100%;height:100%;object-fit:contain;" />
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    className: "boat-marker-icon",
  });
};

const ControlMapLayer = ({ mapCenter, mapZoom, selectedVehicle, vehiclePosition, heading = 0 }) => {
  const vehicleIcon = vehiclePosition && selectedVehicle ? createVehicleIcon(heading) : null;
  return (
  <div className="absolute inset-0 z-0">
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
        isEnabled={true}
      />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        noWrap={true}
        minZoom={3}
        maxZoom={20}
        maxNativeZoom={18}
      />
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
