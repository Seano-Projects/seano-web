import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import useMapTile from "../hooks/useMapTile";
import useTitle from "../hooks/useTitle";
import useTranslation from "../hooks/useTranslation";
import { Title } from "../components/ui";
import DataCard from "../components/Widgets/DataCard";
import MissionDetailHeader from "../components/Widgets/Mission/MissionDetailHeader";
import MissionDetailStats from "../components/Widgets/Mission/MissionDetailStats";
import MissionDetailMap from "../components/Widgets/Mission/MissionDetailMap";
import MissionDetailInfo from "../components/Widgets/Mission/MissionDetailInfo";
import MissionDetailPlan from "../components/Widgets/Mission/MissionDetailPlan";
import MissionDetailTimeline from "../components/Widgets/Mission/MissionDetailTimeline";
import MissionDetailTelemetry from "../components/Widgets/Mission/MissionDetailTelemetry";
import {
  formatCoordinate,
  formatDateTime,
  getMissionWindow,
  getWaypointLabel,
  inferWaypointType,
  normalizeJourneyLog,
  normalizeMission,
} from "../components/Widgets/Mission/missionDetailHelpers";
import axios from "../utils/axiosConfig";
import { API_ENDPOINTS } from "../config";

const MissionDetails = () => {
  const { t } = useTranslation();
  const { url: tileUrl, attribution: tileAttribution } = useMapTile();
  useTitle(t("pages.missionDetails.title"));

  const { missionId } = useParams();
  const navigate = useNavigate();
  const [mission, setMission] = useState(null);
  const [journeyLogs, setJourneyLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadMissionDetails = async () => {
      if (!missionId) return;
      setLoading(true);
      setError("");
      try {
        const missionResponse = await axios.get(API_ENDPOINTS.MISSIONS.BY_ID(missionId));
        const missionData = normalizeMission(missionResponse.data);
        setMission(missionData);
        if (!missionData?.vehicle_id) { setJourneyLogs([]); return; }
        const { start, end } = getMissionWindow(missionData);
        const params = new URLSearchParams({ vehicle_id: String(missionData.vehicle_id), mission_id: String(missionData.id), limit: "500" });
        if (start) params.append("start_time", start);
        if (end) params.append("end_time", end);
        const logResponse = await axios.get(`${API_ENDPOINTS.VEHICLE_LOGS.LIST}?${params.toString()}`);
        const logs = Array.isArray(logResponse.data) ? logResponse.data : logResponse.data?.data || [];
        setJourneyLogs(logs.map(normalizeJourneyLog).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
      } catch (requestError) {
        setError(requestError?.response?.data?.error || requestError?.message || "Failed to load mission details.");
        setMission(null);
        setJourneyLogs([]);
      } finally {
        setLoading(false);
      }
    };
    void loadMissionDetails();
  }, [missionId]);

  useEffect(() => {
    if (!missionId) return;
    const intervalId = setInterval(async () => {
      try {
        const res = await axios.get(API_ENDPOINTS.MISSIONS.BY_ID(missionId));
        const data = normalizeMission(res.data);
        setMission((prev) => {
          if (!prev) return data;
          const same = Number(prev.progress || 0) === Number(data.progress || 0) &&
            Number(prev.completed_waypoint || 0) === Number(data.completed_waypoint || 0) &&
            Number(prev.current_waypoint || 0) === Number(data.current_waypoint || 0) &&
            String(prev.status || "") === String(data.status || "");
          return same ? prev : data;
        });
      } catch { /* ignore */ }
    }, 3000);
    return () => clearInterval(intervalId);
  }, [missionId]);

  const journeyPoints = useMemo(() => journeyLogs.filter((l) => Number.isFinite(l?.latitude) && Number.isFinite(l?.longitude)), [journeyLogs]);

  const telemetryStats = useMemo(() => {
    if (journeyLogs.length === 0) return { samples: 0, firstPing: "-", lastPing: "-", avgSpeed: "0 m/s", maxSpeed: "0 m/s" };
    const speeds = journeyLogs.map((l) => Number(l?.speed || 0)).filter((v) => Number.isFinite(v) && v > 0);
    const avg = speeds.length > 0 ? `${(speeds.reduce((s, v) => s + v, 0) / speeds.length).toFixed(2)} m/s` : "0 m/s";
    return { samples: journeyLogs.length, firstPing: formatDateTime(journeyLogs[0]?.created_at), lastPing: formatDateTime(journeyLogs[journeyLogs.length - 1]?.created_at), avgSpeed: avg, maxSpeed: speeds.length > 0 ? `${Math.max(...speeds).toFixed(2)} m/s` : "0 m/s" };
  }, [journeyLogs]);

  const missionEvents = useMemo(() => {
    if (!mission) return [];
    const events = [{ label: t("pages.missionDetails.eventCreated"), time: mission.created_at, detail: mission.creator?.name || t("pages.missionDetails.eventRecorded") }];
    if (mission.start_time) events.push({ label: t("pages.missionDetails.eventScheduled"), time: mission.start_time, detail: t("pages.missionDetails.eventWindowStarted") });
    if (journeyLogs[0]?.created_at) events.push({ label: t("pages.missionDetails.eventFirstTelemetry"), time: journeyLogs[0].created_at, detail: t("pages.missionDetails.eventJourneyRecorded") });
    if (mission.last_update_time) events.push({ label: t("pages.missionDetails.eventLastProgress"), time: mission.last_update_time, detail: `${Math.round(mission.progress || 0)}% progress` });
    if (mission.end_time) events.push({ label: t("pages.missionDetails.eventCompleted"), time: mission.end_time, detail: mission.status || t("pages.missionDetails.eventDone") });
    return events.filter((e) => e.time).sort((a, b) => new Date(a.time) - new Date(b.time));
  }, [journeyLogs, mission, t]);

  const planSteps = useMemo(() => {
    if (!mission) return [];
    const wps = (mission.waypoints || []).filter((w) => inferWaypointType(w) !== "zone");
    const steps = [];
    if (mission.home_location) steps.push({ type: "home", title: t("pages.missionDetails.homeLocation"), description: `${formatCoordinate(mission.home_location.lat)}, ${formatCoordinate(mission.home_location.lng)}` });
    wps.forEach((wp, i) => {
      steps.push({ type: "waypoint", title: getWaypointLabel(wp, i), description: `${formatCoordinate(wp.lat)}, ${formatCoordinate(wp.lng)}`,
        metadata: [`${t("pages.missionDetails.order")} ${i + 1}`, i < (mission.completed_waypoint || 0) ? t("pages.missionDetails.reached") : i === (mission.current_waypoint || 0) ? t("pages.missionDetails.headingTo") : t("pages.missionDetails.pending")] });
    });
    return steps;
  }, [mission, t]);

  const recentTelemetry = useMemo(() => [...journeyLogs].reverse().slice(0, 12), [journeyLogs]);
  const executionWaypointCount = useMemo(() => (mission?.waypoints || []).filter((w) => inferWaypointType(w) !== "zone").length, [mission?.waypoints]);
  const breadcrumbItems = useMemo(() => [{ name: t("nav.dashboard"), path: "/dashboard" }, { name: t("pages.missions.title"), path: "/missions" }, { name: mission?.name || t("pages.missionDetails.title"), path: null }], [mission?.name, t]);

  const handleExportDetailsCsv = () => {
    if (!mission) return;
    const esc = (v) => `"${String(v ?? "-").replace(/"/g, '""')}"`;
    const headers = ["Mission ID","Mission Name","Status","Vehicle","Created At","Start Time","End Time","Progress (%)","Waypoint Progress","Log Time","Latitude","Longitude","Mode","Speed (m/s)","Battery (%)","System Status"];
    const base = [mission.id, mission.name, mission.status, mission.vehicle?.name || mission.vehicle?.code || "-", formatDateTime(mission.created_at), formatDateTime(mission.start_time), formatDateTime(mission.end_time), Math.round(mission.progress || 0), `${mission.completed_waypoint || 0}/${executionWaypointCount}`];
    const rows = journeyLogs.length > 0
      ? journeyLogs.map((l) => [...base, formatDateTime(l.created_at), Number.isFinite(l.latitude) ? formatCoordinate(l.latitude) : "-", Number.isFinite(l.longitude) ? formatCoordinate(l.longitude) : "-", l.mode || "-", Number.isFinite(Number(l.speed)) ? Number(l.speed).toFixed(2) : "-", Number.isFinite(Number(l.battery_percentage)) ? Number(l.battery_percentage).toFixed(1) : "-", l.system_status || "-"])
      : [[...base, "-", "-", "-", "-", "-", "-", "-"]];
    const csv = [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `mission-details-${mission.id}.csv`; link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Title title={t("pages.missionDetails.title")} subtitle={t("pages.missionDetails.loadingSubtitle")} breadcrumbItems={breadcrumbItems} />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (<div key={i} className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800" />))}
        </div>
      </div>
    );
  }

  if (error || !mission) {
    return (
      <div className="space-y-4 p-4">
        <Title title={t("pages.missionDetails.title")} subtitle={t("pages.missionDetails.errorSubtitle")} breadcrumbItems={breadcrumbItems} />
        <DataCard className="border-rose-200 bg-rose-50/80 dark:border-rose-900 dark:bg-rose-950/30">
          <div className="space-y-4">
            <p className="text-sm text-rose-700 dark:text-rose-200">{error || t("pages.missionDetails.missionNotFound")}</p>
            <button type="button" onClick={() => navigate("/missions")} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">
              <FaArrowLeft size={12} />{t("pages.missionDetails.backToList")}
            </button>
          </div>
        </DataCard>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <MissionDetailHeader mission={mission} missionId={missionId} breadcrumbItems={breadcrumbItems} onExportCsv={handleExportDetailsCsv} />
      <MissionDetailStats mission={mission} executionWaypointCount={executionWaypointCount} />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_0.85fr]">
        <MissionDetailMap mission={mission} journeyPoints={journeyPoints} telemetryStats={telemetryStats} tileUrl={tileUrl} tileAttribution={tileAttribution} />
        <MissionDetailInfo mission={mission} executionWaypointCount={executionWaypointCount} />
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <MissionDetailPlan planSteps={planSteps} />
        <MissionDetailTimeline missionEvents={missionEvents} />
      </div>
      <MissionDetailTelemetry recentTelemetry={recentTelemetry} />
    </div>
  );
};

export default MissionDetails;
