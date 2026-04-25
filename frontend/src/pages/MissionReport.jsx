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
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaDownload,
  FaFlask,
  FaRoute,
  FaShip,
} from "react-icons/fa";
import useTitle from "../hooks/useTitle";
import { Title } from "../components/ui";
import DataCard from "../components/Widgets/DataCard";
import axios from "../utils/axiosConfig";
import { API_ENDPOINTS } from "../config";

const statusClasses = {
  Draft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  Ongoing: "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-200",
  Completed:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200",
  Failed: "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-200",
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const formatCoordinate = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "-";
  return parsed.toFixed(6);
};

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const formatDuration = (seconds) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "00h 00m 00s";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
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

const MissionTrajectoryMap = ({ journeyLogs, mission }) => {
  const actualPoints = useMemo(
    () =>
      (journeyLogs || [])
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
        <TileLayer
          attribution="&copy; Esri"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          noWrap={true}
          maxZoom={20}
          maxNativeZoom={18}
        />
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

const SensorSection = ({ sensor, logs }) => {
  const [page, setPage] = useState(1);
  const perPage = 50;

  const parsedLogs = useMemo(() =>
    logs.map((log) => {
      try { return { ...log, _parsed: JSON.parse(log.data) }; }
      catch { return { ...log, _parsed: {} }; }
    }), [logs]);

  const allKeys = useMemo(() => {
    const keySet = new Set();
    parsedLogs.forEach((l) => { if (l._parsed) Object.keys(l._parsed).forEach((k) => keySet.add(k)); });
    return Array.from(keySet).filter((k) => !["vehicle_code", "sensor_code", "date_time"].includes(k));
  }, [parsedLogs]);

  const stats = useMemo(() => {
    const result = {};
    allKeys.forEach((key) => {
      const vals = parsedLogs.map((l) => toNum(l._parsed?.[key])).filter((v) => v !== null);
      if (vals.length === 0) return;
      const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
      result[key] = { min: Math.min(...vals), max: Math.max(...vals), avg, count: vals.length };
    });
    return result;
  }, [parsedLogs, allKeys]);

  const totalPages = Math.ceil(parsedLogs.length / perPage);
  const paginated = parsedLogs.slice((page - 1) * perPage, page * perPage);

  const sensorLabel = sensor?.brand
    ? `${sensor.brand} ${sensor.model || ""}`.trim()
    : sensor?.code || "Sensor";

  const sensorTypeName = sensor?.sensor_type?.name || "";

  return (
    <DataCard>
      <div className="space-y-4">
        {/* Sensor Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <FaFlask className="text-sky-500" />
              <span className="font-semibold text-slate-900 dark:text-white">{sensorLabel}</span>
              {sensorTypeName && (
                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                  {sensorTypeName}
                </span>
              )}
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {logs.length} data poin
              {logs[0]?.created_at && ` · ${formatDateTime(logs[0].created_at)}`}
              {logs.length > 1 && ` → ${formatDateTime(logs[logs.length - 1].created_at)}`}
            </div>
          </div>
        </div>

        {/* Stats per key */}
        {Object.keys(stats).length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {Object.entries(stats).map(([key, s], i) => {
              const colorPalette = [
                { icon: "text-sky-500", bg: "bg-sky-50 dark:bg-sky-950/40", val: "text-sky-700 dark:text-sky-300" },
                { icon: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/40", val: "text-emerald-700 dark:text-emerald-300" },
                { icon: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-950/40", val: "text-violet-700 dark:text-violet-300" },
                { icon: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/40", val: "text-amber-700 dark:text-amber-300" },
                { icon: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-950/40", val: "text-rose-700 dark:text-rose-300" },
                { icon: "text-cyan-500", bg: "bg-cyan-50 dark:bg-cyan-950/40", val: "text-cyan-700 dark:text-cyan-300" },
              ];
              const c = colorPalette[i % colorPalette.length];
              return (
                <div key={key} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-transparent">
                  <div className={`mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide truncate ${c.icon}`}>
                    <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${c.bg}`}>
                      <FaFlask size={9} />
                    </span>
                    {key}
                  </div>
                  <div className={`text-base font-bold ${c.val}`}>
                    {s.avg.toFixed(2)}
                  </div>
                  <div className="text-xs text-slate-400 dark:text-slate-500">
                    {s.min.toFixed(2)} – {s.max.toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                <th className="whitespace-nowrap px-3 py-2">Waktu</th>
                {allKeys.map((k) => (
                  <th key={k} className="whitespace-nowrap px-3 py-2">{k}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginated.map((log) => (
                <tr key={log.id || log.created_at} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600 dark:text-slate-300">
                    {formatDateTime(log.created_at)}
                  </td>
                  {allKeys.map((k) => (
                    <td key={k} className="whitespace-nowrap px-3 py-2 text-slate-700 dark:text-slate-200">
                      {log._parsed?.[k] !== undefined && log._parsed?.[k] !== null
                        ? String(log._parsed[k])
                        : "-"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
            <span>
              Halaman {page} dari {totalPages} ({logs.length} total)
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-slate-300 px-3 py-1 text-sm disabled:opacity-40 dark:border-slate-700"
              >
                ← Prev
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-slate-300 px-3 py-1 text-sm disabled:opacity-40 dark:border-slate-700"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </DataCard>
  );
};

const MissionReport = () => {
  useTitle("Laporan Misi");
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

        const sLogs = Array.isArray(sensorRes.data)
          ? sensorRes.data
          : sensorRes.data?.data || [];
        setSensorLogs(sLogs);

        const vLogs = Array.isArray(vehicleRes.data)
          ? vehicleRes.data
          : vehicleRes.data?.data || [];
        const sorted = [...vLogs].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );
        setVehicleLogs(sorted);
      } catch (err) {
        setError(err?.response?.data?.error || err?.message || "Gagal memuat laporan misi.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [missionId]);

  // Group sensor logs by sensor
  const sensorGroups = useMemo(() => {
    const groups = {};
    sensorLogs.forEach((log) => {
      const key = log.sensor_id;
      if (!groups[key]) {
        groups[key] = { sensor: log.sensor, logs: [] };
      }
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
    if (sensorIds.length > 0 && activeSensorId === null) {
      setActiveSensorId(sensorIds[0]);
    }
  }, [sensorIds, activeSensorId]);

  const activeGroup = useMemo(
    () => sensorGroups.find((g) => (g.sensor?.id || g.logs[0]?.sensor_id) === activeSensorId),
    [sensorGroups, activeSensorId],
  );

  const handleExportCsv = () => {
    if (!mission || sensorLogs.length === 0) return;

    const csvEscape = (v) => `"${String(v ?? "-").replace(/"/g, '""')}"`;

    // Gather all unique keys across all sensors
    const allKeys = new Set();
    sensorLogs.forEach((log) => {
      try {
        const parsed = JSON.parse(log.data);
        Object.keys(parsed)
          .filter((k) => !["vehicle_code", "sensor_code", "date_time"].includes(k))
          .forEach((k) => allKeys.add(k));
      } catch {}
    });
    const keys = Array.from(allKeys);

    const headers = ["mission_id", "mission_code", "sensor", "sensor_type", "timestamp", ...keys];
    const rows = sensorLogs.map((log) => {
      let parsed = {};
      try { parsed = JSON.parse(log.data); } catch {}
      const sensorLabel = log.sensor?.brand
        ? `${log.sensor.brand} ${log.sensor.model || ""}`.trim()
        : log.sensor?.code || "-";
      return [
        mission.id,
        mission.mission_code,
        sensorLabel,
        log.sensor?.sensor_type?.name || "-",
        log.created_at,
        ...keys.map((k) => (parsed[k] !== undefined ? parsed[k] : "-")),
      ];
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

  const statusClass = statusClasses[mission.status] || statusClasses.Draft;

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <Title
          title={`Laporan Sensor — ${mission.name}`}
          subtitle={`${mission.mission_code} · ${mission.vehicle?.name || mission.vehicle?.code || "Tanpa kendaraan"}`}
          breadcrumbItems={breadcrumbItems}
        />
        <div className="flex flex-wrap items-center gap-3">
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${statusClass}`}>
            {mission.status}
          </span>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={sensorLogs.length === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <FaDownload size={12} />
            Export CSV
          </button>
          <Link
            to={`/missions/${missionId}`}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <FaArrowLeft size={12} />
            Detail Misi
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: <FaShip />, label: "Kendaraan", value: mission.vehicle?.name || mission.vehicle?.code || "-", iconColor: "text-sky-500", iconBg: "bg-sky-50 dark:bg-sky-950/40" },
          { icon: <FaFlask />, label: "Jenis Sensor", value: `${sensorGroups.length} sensor`, iconColor: "text-violet-500", iconBg: "bg-violet-50 dark:bg-violet-950/40" },
          { icon: <FaCheckCircle />, label: "Total Data Sensor", value: sensorLogs.toLocaleString?.() || sensorLogs.length, iconColor: "text-emerald-500", iconBg: "bg-emerald-50 dark:bg-emerald-950/40" },
          { icon: <FaClock />, label: "Durasi", value: formatDuration(mission.time_elapsed || 0), iconColor: "text-amber-500", iconBg: "bg-amber-50 dark:bg-amber-950/40" },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-transparent">
            <div className="mb-3 flex items-center gap-2.5">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm ${item.iconBg} ${item.iconColor}`}>
                {item.icon}
              </span>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{item.label}</span>
            </div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white">{item.value}</div>
          </div>
        ))}
      </div>

      {/* Info row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: <FaCalendarAlt />, label: "Dibuat", value: formatDateTime(mission.created_at), iconColor: "text-rose-500", iconBg: "bg-rose-50 dark:bg-rose-950/40" },
          { icon: <FaRoute />, label: "Mulai", value: formatDateTime(mission.start_time), iconColor: "text-green-500", iconBg: "bg-green-50 dark:bg-green-950/40" },
          { icon: <FaCheckCircle />, label: "Selesai", value: formatDateTime(mission.end_time), iconColor: "text-emerald-500", iconBg: "bg-emerald-50 dark:bg-emerald-950/40" },
          { icon: <FaRoute />, label: "Waypoint", value: `${mission.completed_waypoint || 0}/${mission.total_waypoints || 0}`, iconColor: "text-orange-500", iconBg: "bg-orange-50 dark:bg-orange-950/40" },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-transparent">
            <div className="mb-3 flex items-center gap-2.5">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm ${item.iconBg} ${item.iconColor}`}>
                {item.icon}
              </span>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{item.label}</span>
            </div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white">{item.value}</div>
          </div>
        ))}
      </div>

      {/* Trajectory Map */}
      {vehicleLogs.length > 0 && (
        <DataCard title="Trajektori Misi">
          <MissionTrajectoryMap journeyLogs={vehicleLogs} mission={mission} />
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

      {/* Sensor Data */}
      {sensorGroups.length === 0 ? (
        <DataCard title="Data Sensor">
          <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Belum ada data sensor yang ter-link ke misi ini.
            <div className="mt-2 text-xs">
              Data sensor akan otomatis ter-link jika misi sedang berjalan (status Ongoing).
            </div>
          </div>
        </DataCard>
      ) : (
        <div className="space-y-4">
          {/* Sensor Tabs */}
          <div className="flex flex-wrap gap-2">
            {sensorGroups.map((group) => {
              const id = group.sensor?.id || group.logs[0]?.sensor_id;
              const label = group.sensor?.brand
                ? `${group.sensor.brand} ${group.sensor.model || ""}`.trim()
                : group.sensor?.code || `Sensor ${id}`;
              const typeName = group.sensor?.sensor_type?.name;
              const isActive = activeSensorId === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveSensorId(id)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-sky-600 text-white dark:bg-sky-500"
                      : "border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  }`}
                >
                  <FaFlask size={11} />
                  {label}
                  {typeName && (
                    <span className={`rounded-full px-1.5 py-0.5 text-xs ${isActive ? "bg-white/20" : "bg-slate-100 dark:bg-slate-800"}`}>
                      {typeName}
                    </span>
                  )}
                  <span className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${isActive ? "bg-white/20" : "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"}`}>
                    {group.logs.length}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Sensor Data */}
          {activeGroup && (
            <SensorSection
              sensor={activeGroup.sensor}
              logs={activeGroup.logs}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default MissionReport;
