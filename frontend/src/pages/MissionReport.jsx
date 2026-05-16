import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import useMapTile from "../hooks/useMapTile";
import { FaArrowLeft } from "react-icons/fa";
import useTitle from "../hooks/useTitle";
import { Title } from "../components/ui";
import DataCard from "../components/Widgets/DataCard";
import axios from "../utils/axiosConfig";
import { API_ENDPOINTS } from "../config";
import { MissionReportHeader, MissionReportStats, MissionReportData } from "../components/Widgets/Mission";

const formatCoordinate = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "-";
  return parsed.toFixed(6);
};

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const FitMapBounds = ({ points }) => {
  const map = useMap();
  useEffect(() => {
    if (!points || points.length === 0) return;
    const valid = points.filter((p) => Array.isArray(p) && p.length === 2);
    if (valid.length === 0) return;
    if (valid.length === 1) { map.setView(valid[0], 14); return; }
    map.fitBounds(valid, { padding: [40, 40] });
  }, [map, points]);
  return null;
};

const actualIcon = L.divIcon({
  html: `<div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#c084fc);display:flex;align-items:center;justify-content:center;color:white;font-size:11px;font-weight:700;border:2px solid rgba(255,255,255,0.9);box-shadow:0 4px 12px rgba(0,0,0,0.25)">A</div>`,
  className: "",
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const MissionTrajectoryMap = ({ journeyLogs, mission, tileUrl, tileAttribution }) => {
  const actualPoints = useMemo(
    () => (journeyLogs || [])
      .filter((l) => Number.isFinite(toNum(l?.latitude)) && Number.isFinite(toNum(l?.longitude)))
      .map((l) => [toNum(l.latitude), toNum(l.longitude)]),
    [journeyLogs],
  );

  const plannedPoints = useMemo(() => {
    const pts = [];
    if (Number.isFinite(toNum(mission?.home_location?.lat)) && Number.isFinite(toNum(mission?.home_location?.lng))) {
      pts.push([toNum(mission.home_location.lat), toNum(mission.home_location.lng)]);
    }
    (mission?.waypoints || []).forEach((wp) => {
      if (Number.isFinite(toNum(wp?.lat)) && Number.isFinite(toNum(wp?.lng))) {
        pts.push([toNum(wp.lat), toNum(wp.lng)]);
      }
    });
    return pts;
  }, [mission]);

  const combined = [...plannedPoints, ...actualPoints];
  const center = combined[0] || [-6.2, 106.816666];

  return (
    <div className="relative h-96 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
      <MapContainer center={center} zoom={13} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
        <TileLayer attribution={tileAttribution} url={tileUrl} noWrap={true} maxZoom={20} maxNativeZoom={18} />
        <FitMapBounds points={combined} />
        {plannedPoints.length > 1 && (
          <Polyline positions={plannedPoints} pathOptions={{ color: "#f59e0b", weight: 3, opacity: 0.8, dashArray: "8 6" }} />
        )}
        {actualPoints.length > 1 && (
          <Polyline positions={actualPoints} pathOptions={{ color: "#8b5cf6", weight: 4, opacity: 0.85 }} />
        )}
        {actualPoints.length > 0 && (
          <Marker position={actualPoints[actualPoints.length - 1]} icon={actualIcon}>
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">Posisi Terakhir</div>
                <div>{formatCoordinate(actualPoints[actualPoints.length - 1][0])}, {formatCoordinate(actualPoints[actualPoints.length - 1][1])}</div>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
};

const MissionReport = () => {
  useTitle("Laporan Misi");
  const { url: tileUrl, attribution: tileAttribution } = useMapTile();
  const { missionId } = useParams();

  const [mission, setMission] = useState(null);
  const [sensorLogs, setSensorLogs] = useState([]);
  const [vehicleLogs, setVehicleLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSensorId, setActiveSensorId] = useState(null);

  useEffect(() => {
    if (!missionId) return;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [missionRes, sensorRes, vehicleRes] = await Promise.all([
          axios.get(API_ENDPOINTS.MISSIONS.BY_ID(missionId)),
          axios.get(API_ENDPOINTS.MISSIONS.SENSOR_LOGS(missionId)),
          axios.get(API_ENDPOINTS.MISSIONS.VEHICLE_LOGS(missionId)),
        ]);
        setMission(missionRes.data);
        const sLogs = Array.isArray(sensorRes.data) ? sensorRes.data : sensorRes.data?.data || [];
        setSensorLogs(sLogs);
        const vLogs = Array.isArray(vehicleRes.data) ? vehicleRes.data : vehicleRes.data?.data || [];
        setVehicleLogs([...vLogs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
      } catch (err) {
        setError(err?.response?.data?.error || err?.message || "Gagal memuat laporan misi.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [missionId]);

  const sensorGroups = useMemo(() => {
    const groups = {};
    sensorLogs.forEach((log) => {
      const key = log.sensor_id;
      if (!groups[key]) groups[key] = { sensor: log.sensor, logs: [] };
      groups[key].logs.push(log);
    });
    return Object.values(groups).sort((a, b) => {
      const nameA = a.sensor?.brand || a.sensor?.code || "";
      const nameB = b.sensor?.brand || b.sensor?.code || "";
      return nameA.localeCompare(nameB);
    });
  }, [sensorLogs]);

  const sensorIds = useMemo(() => sensorGroups.map((g) => g.sensor?.id || g.logs[0]?.sensor_id), [sensorGroups]);

  useEffect(() => {
    if (sensorIds.length > 0 && activeSensorId === null) setActiveSensorId(sensorIds[0]);
  }, [sensorIds, activeSensorId]);

  const activeGroup = useMemo(
    () => sensorGroups.find((g) => (g.sensor?.id || g.logs[0]?.sensor_id) === activeSensorId),
    [sensorGroups, activeSensorId],
  );

  const handleExportCsv = () => {
    if (!mission || sensorLogs.length === 0) return;
    const csvEscape = (v) => `"${String(v ?? "-").replace(/"/g, '""')}"`;
    const allKeys = new Set();
    sensorLogs.forEach((log) => {
      try {
        const parsed = JSON.parse(log.data);
        Object.keys(parsed).filter((k) => !["vehicle_code", "sensor_code", "date_time"].includes(k)).forEach((k) => allKeys.add(k));
      } catch {}
    });
    const keys = Array.from(allKeys);
    const headers = ["mission_id", "mission_code", "sensor", "sensor_type", "timestamp", ...keys];
    const rows = sensorLogs.map((log) => {
      let parsed = {};
      try { parsed = JSON.parse(log.data); } catch {}
      const sensorLabel = log.sensor?.brand ? `${log.sensor.brand} ${log.sensor.model || ""}`.trim() : log.sensor?.code || "-";
      return [mission.id, mission.mission_code, sensorLabel, log.sensor?.sensor_type?.name || "-", log.created_at, ...keys.map((k) => (parsed[k] !== undefined ? parsed[k] : "-"))];
    });
    const csv = [headers.map(csvEscape).join(","), ...rows.map((r) => r.map(csvEscape).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mission-report-${mission.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const breadcrumbItems = [
    { name: "Dashboard", path: "/dashboard" },
    { name: "Misi", path: "/missions" },
    { name: mission?.name || "Detail Misi", path: `/missions/${missionId}` },
    { name: "Laporan Sensor", path: null },
  ];

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Title title="Laporan Sensor Misi" subtitle="Memuat data..." breadcrumbItems={breadcrumbItems} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !mission) {
    return (
      <div className="space-y-4 p-4">
        <Title title="Laporan Sensor Misi" subtitle="Terjadi kesalahan" breadcrumbItems={breadcrumbItems} />
        <DataCard>
          <p className="text-sm text-rose-600 dark:text-rose-400">{error || "Misi tidak ditemukan."}</p>
          <Link to="/missions" className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:underline dark:text-slate-300">
            <FaArrowLeft size={12} /> Kembali ke daftar misi
          </Link>
        </DataCard>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <MissionReportHeader
        mission={mission}
        missionId={missionId}
        breadcrumbItems={breadcrumbItems}
        onExportCsv={handleExportCsv}
        exportDisabled={sensorLogs.length === 0}
      />

      <MissionReportStats
        mission={mission}
        sensorGroupsCount={sensorGroups.length}
        sensorLogsCount={sensorLogs.length}
      />

      {vehicleLogs.length > 0 && (
        <DataCard title="Trajektori Misi">
          <MissionTrajectoryMap journeyLogs={vehicleLogs} mission={mission} tileUrl={tileUrl} tileAttribution={tileAttribution} />
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-6 rounded" style={{ background: "#f59e0b", opacity: 0.9 }} />
              Rute Direncanakan
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-6 rounded" style={{ background: "#8b5cf6" }} />
              Jalur Aktual
            </span>
          </div>
        </DataCard>
      )}

      <MissionReportData
        sensorGroups={sensorGroups}
        activeSensorId={activeSensorId}
        setActiveSensorId={setActiveSensorId}
        activeGroup={activeGroup}
      />
    </div>
  );
};

export default MissionReport;
