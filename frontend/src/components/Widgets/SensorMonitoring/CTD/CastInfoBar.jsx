import { useMemo } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { FaClock, FaMapMarkerAlt, FaWater, FaDatabase } from "react-icons/fa";
import useMapTile from "../../../../hooks/useMapTile";
import usvPointIcon from "../../../../assets/usv-point.webp";

const createBoatIcon = () =>
  L.divIcon({
    html: `<div style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.6));">
      <img src="${usvPointIcon}" style="width:100%;height:100%;object-fit:contain;" />
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    className: "ctd-cast-map-icon",
  });

const BOAT_ICON = createBoatIcon();

// Just the map, no card wrapper
export const CastMiniMap = ({ lat, lon }) => {
  const { url: tileUrl } = useMapTile();

  if (lat == null || lon == null) return null;

  return (
    <div className="mb-4 w-full h-96 rounded-xl overflow-hidden">
      <MapContainer
        center={[lat, lon]}
        zoom={14}
        style={{ height: "100%", width: "100%" }}
        zoomControl={true}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        dragging={true}
        attributionControl={false}
      >
        <TileLayer url={tileUrl} />
        <Marker position={[lat, lon]} icon={BOAT_ICON} />
      </MapContainer>
      <style>{`.ctd-cast-map-icon { background:none!important; border:none!important; }`}</style>
    </div>
  );
};

const StatCard = ({ icon, iconBg, value, title, subtitle }) => (
  <div className="bg-white dark:bg-transparent border border-gray-300 dark:border-slate-600 rounded-xl p-6 hover:bg-gray-50 dark:hover:bg-slate-600/30 transition-colors duration-200 group">
    <div className="mb-4">
      <div className={`p-1.5 ${iconBg} rounded-lg inline-flex group-hover:scale-105 transition-transform duration-200`}>
        {icon}
      </div>
    </div>
    <div className="space-y-2">
      <p className="text-2xl font-bold text-gray-900 dark:text-white truncate">
        {value}
      </p>
      <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">{title}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 pt-1">{subtitle}</p>
    </div>
  </div>
);

export const CastInfoBar = ({ ctdData }) => {
  const castInfo = useMemo(() => {
    if (!ctdData || ctdData.length === 0) return null;

    const latestTs = ctdData.reduce(
      (max, d) =>
        !max || new Date(d.timestamp) > new Date(max) ? d.timestamp : max,
      null,
    );
    const castEntries = ctdData.filter((d) => d.timestamp === latestTs);
    const withCoord = castEntries.find(
      (d) => d.latitude != null && d.longitude != null,
    );

    return {
      latestTs,
      castEntries,
      lat: withCoord?.latitude ?? null,
      lon: withCoord?.longitude ?? null,
      depthMax: Math.max(
        ...castEntries.map((d) => d.depth).filter(Number.isFinite),
        0,
      ),
    };
  }, [ctdData]);

  if (!castInfo) return null;

  const { latestTs, castEntries, lat, lon, depthMax } = castInfo;
  const hasCoord = lat != null && lon != null;

  const timeLabel = latestTs
    ? new Date(latestTs).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })
    : "—";

  const coordLabel = hasCoord
    ? `${Number(Math.abs(lat)).toFixed(4)}° ${lat >= 0 ? "N" : "S"}`
    : "—";
  const coordSub = hasCoord
    ? `${Number(Math.abs(lon)).toFixed(4)}° ${lon >= 0 ? "E" : "W"}`
    : "Koordinat tidak tersedia";

  return (
    <div className="mb-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        icon={<FaClock className="text-blue-500 text-lg" />}
        iconBg="bg-blue-100 dark:bg-blue-900/30"
        value={timeLabel}
        title="Waktu Cast"
        subtitle="Timestamp cast terakhir"
      />
      <StatCard
        icon={<FaMapMarkerAlt className="text-green-500 text-lg" />}
        iconBg="bg-green-100 dark:bg-green-900/30"
        value={coordLabel}
        title="Koordinat"
        subtitle={coordSub}
      />
      <StatCard
        icon={<FaWater className="text-cyan-500 text-lg" />}
        iconBg="bg-cyan-100 dark:bg-cyan-900/30"
        value={depthMax > 0 ? `${depthMax.toFixed(1)} m` : "—"}
        title="Kedalaman Maks"
        subtitle="Titik terdalam cast"
      />
      <StatCard
        icon={<FaDatabase className="text-purple-500 text-lg" />}
        iconBg="bg-purple-100 dark:bg-purple-900/30"
        value={`${castEntries.length}`}
        title="Jumlah Data"
        subtitle="Total titik pengukuran"
      />
    </div>
  );
};
