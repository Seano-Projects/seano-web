export const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(date);
};

export const formatCoordinate = (value) => {
  const parsed = toNumberOrNull(value);
  if (!Number.isFinite(parsed)) return "-";
  return parsed.toFixed(6);
};

export const normalizeMission = (mission) => ({
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
    ? { ...mission.home_location, lat: toNumberOrNull(mission.home_location.lat), lng: toNumberOrNull(mission.home_location.lng) }
    : null,
});

export const normalizeJourneyLog = (log) => ({
  ...log,
  latitude: toNumberOrNull(log?.latitude),
  longitude: toNumberOrNull(log?.longitude),
  speed: toNumberOrNull(log?.speed),
  battery_percentage: toNumberOrNull(log?.battery_percentage),
});

export const getMissionWindow = (mission) => {
  const start = mission?.start_time || mission?.created_at || mission?.updated_at || null;
  const end = mission?.end_time || mission?.last_update_time ||
    (mission?.status === "Completed" || mission?.status === "Failed" ? mission?.updated_at : new Date().toISOString());
  return { start, end };
};

export const inferWaypointType = (waypoint) => {
  if (!waypoint) return "path";
  if (waypoint.type) return waypoint.type;
  return waypoint.shape || waypoint.bounds || Array.isArray(waypoint.vertices) ? "zone" : "path";
};

export const getWaypointLabel = (waypoint, index) => waypoint?.name || `WP ${index + 1}`;
