import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
  FaBatteryHalf,
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaDownload,
  FaMapMarkerAlt,
  FaPlayCircle,
  FaRoute,
  FaSatelliteDish,
  FaShip,
  FaUser,
} from "react-icons/fa";
import useTitle from "../hooks/useTitle";
import useTranslation from "../hooks/useTranslation";
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

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === "") return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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

const formatDuration = (seconds) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "00h 00m 00s";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(remainingSeconds).padStart(2, "0")}s`;
};

const formatCoordinate = (value) => {
  const parsed = toNumberOrNull(value);
  if (!Number.isFinite(parsed)) return "-";
  return parsed.toFixed(6);
};

const normalizeMission = (mission) => ({
  ...mission,
  progress: toNumberOrNull(mission?.progress) ?? 0,
  energy_consumed: toNumberOrNull(mission?.energy_consumed) ?? 0,
  energy_budget: toNumberOrNull(mission?.energy_budget),
  waypoints: (mission?.waypoints || []).map((waypoint) => ({
    ...waypoint,
    lat: toNumberOrNull(waypoint?.lat),
    lng: toNumberOrNull(waypoint?.lng),
  })),
  home_location: mission?.home_location
    ? {
        ...mission.home_location,
        lat: toNumberOrNull(mission.home_location.lat),
        lng: toNumberOrNull(mission.home_location.lng),
      }
    : null,
});

const normalizeJourneyLog = (log) => ({
  ...log,
  latitude: toNumberOrNull(log?.latitude),
  longitude: toNumberOrNull(log?.longitude),
  speed: toNumberOrNull(log?.speed),
  battery_percentage: toNumberOrNull(log?.battery_percentage),
});

const getMissionWindow = (mission) => {
  const start =
    mission?.start_time || mission?.created_at || mission?.updated_at || null;
  const end =
    mission?.end_time ||
    mission?.last_update_time ||
    (mission?.status === "Completed" || mission?.status === "Failed"
      ? mission?.updated_at
      : new Date().toISOString());

  return { start, end };
};

const getWaypointLabel = (waypoint, index) => {
  return waypoint?.name || `WP ${index + 1}`;
};

const inferWaypointType = (waypoint) => {
  if (!waypoint) return "path";
  if (waypoint.type) return waypoint.type;

  return waypoint.shape || waypoint.bounds || Array.isArray(waypoint.vertices)
    ? "zone"
    : "path";
};

const createMarkerIcon = (label, className) =>
  L.divIcon({
    html: `<div class="${className}">${label}</div>`,
    className: "mission-detail-marker-wrapper",
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -16],
  });

const homeIcon = createMarkerIcon(
  "H",
  "mission-detail-marker mission-detail-marker-home",
);
const actualIcon = createMarkerIcon(
  "A",
  "mission-detail-marker mission-detail-marker-actual",
);

const waypointIconFor = (stateLabel) =>
  createMarkerIcon(
    stateLabel.label,
    `mission-detail-marker ${stateLabel.className}`,
  );

const FitMapBounds = ({ points }) => {
  const map = useMap();

  useEffect(() => {
    if (!Array.isArray(points) || points.length === 0) return;

    const validPoints = points.filter(
      (point) => Array.isArray(point) && point.length === 2,
    );

    if (validPoints.length === 0) return;

    if (validPoints.length === 1) {
      map.setView(validPoints[0], 14);
      return;
    }

    map.fitBounds(validPoints, { padding: [40, 40] });
  }, [map, points]);

  return null;
};

const MissionJourneyMap = ({ mission, journeyPoints }) => {
  const { t } = useTranslation();
  const executionWaypoints = useMemo(
    () =>
      (mission?.waypoints || []).filter(
        (waypoint) => inferWaypointType(waypoint) !== "zone",
      ),
    [mission?.waypoints],
  );

  const plannedPoints = useMemo(() => {
    const points = [];

    if (
      Number.isFinite(mission?.home_location?.lat) &&
      Number.isFinite(mission?.home_location?.lng)
    ) {
      points.push([mission.home_location.lat, mission.home_location.lng]);
    }

    executionWaypoints.forEach((waypoint) => {
      if (Number.isFinite(waypoint?.lat) && Number.isFinite(waypoint?.lng)) {
        points.push([waypoint.lat, waypoint.lng]);
      }
    });

    return points;
  }, [executionWaypoints, mission]);

  const actualPoints = useMemo(
    () =>
      (journeyPoints || [])
        .filter(
          (point) =>
            Number.isFinite(point?.latitude) &&
            Number.isFinite(point?.longitude),
        )
        .map((point) => [point.latitude, point.longitude]),
    [journeyPoints],
  );

  const combinedPoints = [...plannedPoints, ...actualPoints];
  const center = combinedPoints[0] || [-6.2, 106.816666];
  const completedCount = mission?.completed_waypoint || 0;
  const currentIndex = mission?.current_waypoint ?? completedCount;

  return (
    <div className="relative h-105 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
      <style>
        {`
          .mission-detail-marker {
            width: 34px;
            height: 34px;
            border-radius: 9999px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 12px;
            font-weight: 700;
            border: 2px solid rgba(255, 255, 255, 0.95);
            box-shadow: 0 8px 20px rgba(15, 23, 42, 0.28);
          }
          .mission-detail-marker-home {
            background: linear-gradient(135deg, #0f766e, #14b8a6);
          }
          .mission-detail-marker-completed {
            background: linear-gradient(135deg, #15803d, #22c55e);
          }
          .mission-detail-marker-current {
            background: linear-gradient(135deg, #2563eb, #38bdf8);
          }
          .mission-detail-marker-pending {
            background: linear-gradient(135deg, #475569, #94a3b8);
          }
          .mission-detail-marker-actual {
            background: linear-gradient(135deg, #7c3aed, #c084fc);
          }
        `}
      </style>
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution="&copy; Esri"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          noWrap={true}
          maxZoom={20}
          maxNativeZoom={18}
        />
        <FitMapBounds points={combinedPoints} />

        {plannedPoints.length > 1 && (
          <Polyline
            positions={plannedPoints}
            pathOptions={{
              color: "#f59e0b",
              weight: 4,
              opacity: 0.9,
              dashArray: "10 8",
            }}
          />
        )}

        {actualPoints.length > 1 && (
          <Polyline
            positions={actualPoints}
            pathOptions={{
              color: "#8b5cf6",
              weight: 5,
              opacity: 0.85,
            }}
          />
        )}

        {mission?.home_location &&
          Number.isFinite(mission.home_location.lat) &&
          Number.isFinite(mission.home_location.lng) && (
            <Marker
              position={[mission.home_location.lat, mission.home_location.lng]}
              icon={homeIcon}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">
                    {t("pages.missionDetails.homeLocation")}
                  </div>
                  <div>
                    {formatCoordinate(mission.home_location.lat)},{" "}
                    {formatCoordinate(mission.home_location.lng)}
                  </div>
                </div>
              </Popup>
            </Marker>
          )}

        {executionWaypoints.map((waypoint, index) => {
          const stateLabel =
            index < completedCount
              ? {
                  label: String(index + 1),
                  className: "mission-detail-marker-completed",
                }
              : index === currentIndex
                ? {
                    label: String(index + 1),
                    className: "mission-detail-marker-current",
                  }
                : {
                    label: String(index + 1),
                    className: "mission-detail-marker-pending",
                  };

          if (
            !Number.isFinite(waypoint?.lat) ||
            !Number.isFinite(waypoint?.lng)
          ) {
            return null;
          }

          return (
            <Marker
              key={`waypoint-${index}`}
              position={[waypoint.lat, waypoint.lng]}
              icon={waypointIconFor(stateLabel)}
            >
              <Popup>
                <div className="text-sm space-y-1">
                  <div className="font-semibold">
                    {getWaypointLabel(waypoint, index)}
                  </div>
                  <div>
                    {formatCoordinate(waypoint.lat)},{" "}
                    {formatCoordinate(waypoint.lng)}
                  </div>
                  <div>
                    {t("pages.missionDetails.target")} {index + 1}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {actualPoints.length > 0 && (
          <Marker
            position={actualPoints[actualPoints.length - 1]}
            icon={actualIcon}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">
                  {t("pages.missionDetails.lastTelemetryPosition")}
                </div>
                <div>
                  {formatCoordinate(actualPoints[actualPoints.length - 1][0])},{" "}
                  {formatCoordinate(actualPoints[actualPoints.length - 1][1])}
                </div>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
};

const DetailItem = ({ icon, label, value }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/40">
    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
      <span className="text-sm">{icon}</span>
      <span>{label}</span>
    </div>
    <div className="text-sm font-medium text-slate-900 dark:text-white">
      {value}
    </div>
  </div>
);

const MissionDetails = () => {
  const { t } = useTranslation();
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
        const missionResponse = await axios.get(
          API_ENDPOINTS.MISSIONS.BY_ID(missionId),
        );
        const missionData = normalizeMission(missionResponse.data);
        setMission(missionData);

        if (!missionData?.vehicle_id) {
          setJourneyLogs([]);
          return;
        }

        const { start, end } = getMissionWindow(missionData);
        const params = new URLSearchParams({
          vehicle_id: String(missionData.vehicle_id),
          mission_id: String(missionData.id),
          limit: "500",
        });

        if (start) params.append("start_time", start);
        if (end) params.append("end_time", end);

        const logResponse = await axios.get(
          `${API_ENDPOINTS.VEHICLE_LOGS.LIST}?${params.toString()}`,
        );

        const logs = Array.isArray(logResponse.data)
          ? logResponse.data
          : logResponse.data?.data || [];

        const sortedLogs = logs
          .map(normalizeJourneyLog)
          .sort(
            (left, right) =>
              new Date(left.created_at).getTime() -
              new Date(right.created_at).getTime(),
          );

        setJourneyLogs(sortedLogs);
      } catch (requestError) {
        setError(
          requestError?.response?.data?.error ||
            requestError?.message ||
            "Failed to load mission details.",
        );
        setMission(null);
        setJourneyLogs([]);
      } finally {
        setLoading(false);
      }
    };

    void loadMissionDetails();
  }, [missionId]);

  const journeyPoints = useMemo(
    () =>
      journeyLogs.filter(
        (log) =>
          Number.isFinite(log?.latitude) && Number.isFinite(log?.longitude),
      ),
    [journeyLogs],
  );

  const telemetryStats = useMemo(() => {
    if (journeyLogs.length === 0) {
      return {
        samples: 0,
        firstPing: "-",
        lastPing: "-",
        avgSpeed: "0 m/s",
        maxSpeed: "0 m/s",
      };
    }

    const speeds = journeyLogs
      .map((log) => Number(log?.speed || 0))
      .filter((value) => Number.isFinite(value) && value > 0);

    const averageSpeed =
      speeds.length > 0
        ? `${(speeds.reduce((sum, value) => sum + value, 0) / speeds.length).toFixed(2)} m/s`
        : "0 m/s";

    const maxSpeed =
      speeds.length > 0 ? `${Math.max(...speeds).toFixed(2)} m/s` : "0 m/s";

    return {
      samples: journeyLogs.length,
      firstPing: formatDateTime(journeyLogs[0]?.created_at),
      lastPing: formatDateTime(journeyLogs[journeyLogs.length - 1]?.created_at),
      avgSpeed: averageSpeed,
      maxSpeed,
    };
  }, [journeyLogs]);

  const missionEvents = useMemo(() => {
    if (!mission) return [];

    const events = [
      {
        label: t("pages.missionDetails.eventCreated"),
        time: mission.created_at,
        detail:
          mission.creator?.name || t("pages.missionDetails.eventRecorded"),
      },
    ];

    if (mission.start_time) {
      events.push({
        label: t("pages.missionDetails.eventScheduled"),
        time: mission.start_time,
        detail: t("pages.missionDetails.eventWindowStarted"),
      });
    }

    if (journeyLogs[0]?.created_at) {
      events.push({
        label: t("pages.missionDetails.eventFirstTelemetry"),
        time: journeyLogs[0].created_at,
        detail: t("pages.missionDetails.eventJourneyRecorded"),
      });
    }

    if (mission.last_update_time) {
      events.push({
        label: t("pages.missionDetails.eventLastProgress"),
        time: mission.last_update_time,
        detail: `${Math.round(mission.progress || 0)}% progress`,
      });
    }

    if (mission.end_time) {
      events.push({
        label: t("pages.missionDetails.eventCompleted"),
        time: mission.end_time,
        detail: mission.status || t("pages.missionDetails.eventDone"),
      });
    }

    return events
      .filter((event) => event.time)
      .sort((left, right) => new Date(left.time) - new Date(right.time));
  }, [journeyLogs, mission, t]);

  const planSteps = useMemo(() => {
    if (!mission) return [];

    const executionWaypoints = (mission.waypoints || []).filter(
      (waypoint) => inferWaypointType(waypoint) !== "zone",
    );

    const steps = [];

    if (mission.home_location) {
      steps.push({
        type: "home",
        title: t("pages.missionDetails.homeLocation"),
        description: `${formatCoordinate(mission.home_location.lat)}, ${formatCoordinate(mission.home_location.lng)}`,
      });
    }

    executionWaypoints.forEach((waypoint, index) => {
      steps.push({
        type: "waypoint",
        title: getWaypointLabel(waypoint, index),
        description: `${formatCoordinate(waypoint.lat)}, ${formatCoordinate(waypoint.lng)}`,
        metadata: [
          `${t("pages.missionDetails.order")} ${index + 1}`,
          index < (mission.completed_waypoint || 0)
            ? t("pages.missionDetails.reached")
            : index === (mission.current_waypoint || 0)
              ? t("pages.missionDetails.headingTo")
              : t("pages.missionDetails.pending"),
        ],
      });
    });

    return steps;
  }, [mission, t]);

  const recentTelemetry = useMemo(
    () => [...journeyLogs].reverse().slice(0, 12),
    [journeyLogs],
  );

  const executionWaypointCount = useMemo(
    () =>
      (mission?.waypoints || []).filter(
        (waypoint) => inferWaypointType(waypoint) !== "zone",
      ).length,
    [mission?.waypoints],
  );

  const breadcrumbItems = useMemo(
    () => [
      { name: t("nav.dashboard"), path: "/dashboard" },
      { name: t("pages.missions.title"), path: "/missions" },
      { name: mission?.name || t("pages.missionDetails.title"), path: null },
    ],
    [mission?.name, t],
  );

  const handleExportDetailsCsv = () => {
    if (!mission) return;

    const csvEscape = (value) =>
      `"${String(value ?? "-").replace(/"/g, '""')}"`;
    const headers = [
      "Mission ID",
      "Mission Name",
      "Status",
      "Vehicle",
      "Created At",
      "Start Time",
      "End Time",
      "Progress (%)",
      "Waypoint Progress",
      "Log Time",
      "Latitude",
      "Longitude",
      "Mode",
      "Speed (m/s)",
      "Battery (%)",
      "System Status",
    ];

    const baseMissionColumns = [
      mission.id,
      mission.name,
      mission.status,
      mission.vehicle?.name || mission.vehicle?.code || "-",
      formatDateTime(mission.created_at),
      formatDateTime(mission.start_time),
      formatDateTime(mission.end_time),
      Math.round(mission.progress || 0),
      `${mission.completed_waypoint || 0}/${executionWaypointCount}`,
    ];

    const rows =
      journeyLogs.length > 0
        ? journeyLogs.map((log) => [
            ...baseMissionColumns,
            formatDateTime(log.created_at),
            Number.isFinite(log.latitude)
              ? formatCoordinate(log.latitude)
              : "-",
            Number.isFinite(log.longitude)
              ? formatCoordinate(log.longitude)
              : "-",
            log.mode || "-",
            Number.isFinite(Number(log.speed))
              ? Number(log.speed).toFixed(2)
              : "-",
            Number.isFinite(Number(log.battery_percentage))
              ? Number(log.battery_percentage).toFixed(1)
              : "-",
            log.system_status || "-",
          ])
        : [[...baseMissionColumns, "-", "-", "-", "-", "-", "-", "-"]];

    const csvContent = [
      headers.map(csvEscape).join(","),
      ...rows.map((row) => row.map(csvEscape).join(",")),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mission-details-${mission.id}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Title
          title={t("pages.missionDetails.title")}
          subtitle={t("pages.missionDetails.loadingSubtitle")}
          breadcrumbItems={breadcrumbItems}
        />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || !mission) {
    return (
      <div className="space-y-4 p-4">
        <Title
          title={t("pages.missionDetails.title")}
          subtitle={t("pages.missionDetails.errorSubtitle")}
          breadcrumbItems={breadcrumbItems}
        />
        <DataCard className="border-rose-200 bg-rose-50/80 dark:border-rose-900 dark:bg-rose-950/30">
          <div className="space-y-4">
            <p className="text-sm text-rose-700 dark:text-rose-200">
              {error || t("pages.missionDetails.missionNotFound")}
            </p>
            <button
              type="button"
              onClick={() => navigate("/missions")}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              <FaArrowLeft size={12} />
              {t("pages.missionDetails.backToList")}
            </button>
          </div>
        </DataCard>
      </div>
    );
  }

  const progressPercent = Math.round(mission.progress || 0);
  const statusClass = statusClasses[mission.status] || statusClasses.Draft;

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Title
            title={mission.name || t("pages.missionDetails.title")}
            subtitle={t("pages.missionDetails.summarySubtitle")}
            breadcrumbItems={breadcrumbItems}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold ${statusClass}`}
          >
            {mission.status || t("pages.missionDetails.draft")}
          </span>
          <button
            type="button"
            onClick={handleExportDetailsCsv}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <FaDownload size={12} />
            {t("pages.missionDetails.exportCsv")}
          </button>
          <Link
            to="/missions"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <FaArrowLeft size={12} />
            {t("pages.missionDetails.back")}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DetailItem
          icon={<FaShip />}
          label={t("pages.missionDetails.vehicle")}
          value={
            mission.vehicle?.name ||
            mission.vehicle?.code ||
            t("pages.missionDetails.notSelected")
          }
        />
        <DetailItem
          icon={<FaRoute />}
          label={t("pages.missionDetails.waypointProgress")}
          value={`${mission.completed_waypoint || 0}/${executionWaypointCount} ${t("pages.missionDetails.waypointUnit")}`}
        />
        <DetailItem
          icon={<FaCheckCircle />}
          label={t("pages.missionDetails.progress")}
          value={`${progressPercent}%`}
        />
        <DetailItem
          icon={<FaClock />}
          label={t("pages.missionDetails.duration")}
          value={formatDuration(mission.time_elapsed || 0)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_0.85fr]">
        <DataCard title={t("pages.missionDetails.journeyMission")}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <DetailItem
                icon={<FaSatelliteDish />}
                label={t("pages.missionDetails.telemetrySamples")}
                value={String(telemetryStats.samples)}
              />
              <DetailItem
                icon={<FaPlayCircle />}
                label={t("pages.missionDetails.firstPing")}
                value={telemetryStats.firstPing}
              />
              <DetailItem
                icon={<FaClock />}
                label={t("pages.missionDetails.lastPing")}
                value={telemetryStats.lastPing}
              />
              <DetailItem
                icon={<FaRoute />}
                label={t("pages.missionDetails.avgSpeed")}
                value={telemetryStats.avgSpeed}
              />
            </div>
            <MissionJourneyMap
              mission={mission}
              journeyPoints={journeyPoints}
            />
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
              {t("pages.missionDetails.journeyHint")}
            </div>
          </div>
        </DataCard>

        <DataCard title={t("pages.missionDetails.relatedData")}>
          <div className="space-y-3">
            <DetailItem
              icon={<FaUser />}
              label={t("pages.missionDetails.createdBy")}
              value={mission.creator?.name || mission.creator?.email || "-"}
            />
            <DetailItem
              icon={<FaCalendarAlt />}
              label={t("pages.missionDetails.createdAt")}
              value={formatDateTime(mission.created_at)}
            />
            <DetailItem
              icon={<FaPlayCircle />}
              label={t("pages.missionDetails.startTime")}
              value={formatDateTime(mission.start_time)}
            />
            <DetailItem
              icon={<FaCheckCircle />}
              label={t("pages.missionDetails.endTime")}
              value={formatDateTime(mission.end_time)}
            />
            <DetailItem
              icon={<FaBatteryHalf />}
              label={t("pages.missionDetails.energy")}
              value={
                mission.energy_budget
                  ? `${Number(mission.energy_consumed || 0).toFixed(1)} / ${Number(mission.energy_budget).toFixed(1)} kWh`
                  : t("pages.missionDetails.noEnergyBudget")
              }
            />
            <DetailItem
              icon={<FaMapMarkerAlt />}
              label={t("pages.missionDetails.currentWaypoint")}
              value={String(mission.current_waypoint || 0)}
            />
          </div>
        </DataCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DataCard title={t("pages.missionDetails.planHistory")}>
          <div className="max-h-160 overflow-y-auto custom-scrollbar pr-2 space-y-3">
            {planSteps.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                {t("pages.missionDetails.noPlan")}
              </div>
            ) : (
              planSteps.map((step, index) => (
                <div
                  key={`${step.type}-${index}`}
                  className="flex gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700"
                >
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white dark:bg-slate-100 dark:text-slate-900">
                    {step.type === "home" ? "H" : index}
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      {step.title}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-300">
                      {step.description}
                    </div>
                    {step.metadata && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {step.metadata.map((item) => (
                          <span
                            key={item}
                            className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </DataCard>

        <DataCard title={t("pages.missionDetails.missionHistory")}>
          <div className="space-y-3">
            {missionEvents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                {t("pages.missionDetails.noMissionEvents")}
              </div>
            ) : (
              missionEvents.map((event) => (
                <div
                  key={`${event.label}-${event.time}`}
                  className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      {event.label}
                    </div>
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {formatDateTime(event.time)}
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    {event.detail}
                  </div>
                </div>
              ))
            )}
          </div>
        </DataCard>
      </div>

      <DataCard title={t("pages.missionDetails.telemetryJourney")}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                <th className="px-4 py-3">{t("pages.missionDetails.time")}</th>
                <th className="px-4 py-3">
                  {t("pages.missionDetails.coordinates")}
                </th>
                <th className="px-4 py-3">{t("pages.missionDetails.mode")}</th>
                <th className="px-4 py-3">{t("pages.missionDetails.speed")}</th>
                <th className="px-4 py-3">
                  {t("pages.missionDetails.battery")}
                </th>
                <th className="px-4 py-3">
                  {t("pages.missionDetails.system")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {recentTelemetry.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    {t("pages.missionDetails.noTelemetry")}
                  </td>
                </tr>
              ) : (
                recentTelemetry.map((log) => (
                  <tr key={log.id || log.created_at}>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {Number.isFinite(log.latitude) &&
                      Number.isFinite(log.longitude)
                        ? `${formatCoordinate(log.latitude)}, ${formatCoordinate(log.longitude)}`
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {log.mode || "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {Number.isFinite(Number(log.speed))
                        ? `${Number(log.speed).toFixed(2)} m/s`
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {Number.isFinite(Number(log.battery_percentage))
                        ? `${Number(log.battery_percentage).toFixed(1)}%`
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {log.system_status || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </DataCard>
    </div>
  );
};

export default MissionDetails;
