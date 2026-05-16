import { useEffect, useMemo } from "react";
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
  FaClock,
  FaPlayCircle,
  FaRoute,
  FaSatelliteDish,
} from "react-icons/fa";
import useTranslation from "../../../hooks/useTranslation";
import DataCard from "../DataCard";
import { DetailItem } from "./MissionDetailStats";
import { formatCoordinate, inferWaypointType, getWaypointLabel } from "./missionDetailHelpers";

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

const MissionDetailMap = ({
  mission,
  journeyPoints,
  telemetryStats,
  tileUrl,
  tileAttribution,
}) => {
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
    <DataCard title={t("pages.missionDetails.journeyMission")}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <DetailItem
            icon={<FaSatelliteDish />}
            iconColor="text-cyan-500"
            iconBg="bg-cyan-50 dark:bg-cyan-950/40"
            label={t("pages.missionDetails.telemetrySamples")}
            value={String(telemetryStats.samples)}
          />
          <DetailItem
            icon={<FaPlayCircle />}
            iconColor="text-green-500"
            iconBg="bg-green-50 dark:bg-green-950/40"
            label={t("pages.missionDetails.firstPing")}
            value={telemetryStats.firstPing}
          />
          <DetailItem
            icon={<FaClock />}
            iconColor="text-orange-500"
            iconBg="bg-orange-50 dark:bg-orange-950/40"
            label={t("pages.missionDetails.lastPing")}
            value={telemetryStats.lastPing}
          />
          <DetailItem
            icon={<FaRoute />}
            iconColor="text-amber-500"
            iconBg="bg-amber-50 dark:bg-amber-950/40"
            label={t("pages.missionDetails.avgSpeed")}
            value={telemetryStats.avgSpeed}
          />
        </div>
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
              attribution={tileAttribution}
              url={tileUrl}
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
                  position={[
                    mission.home_location.lat,
                    mission.home_location.lng,
                  ]}
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
                      {formatCoordinate(
                        actualPoints[actualPoints.length - 1][0],
                      )}
                      ,{" "}
                      {formatCoordinate(
                        actualPoints[actualPoints.length - 1][1],
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
          {t("pages.missionDetails.journeyHint")}
        </div>
      </div>
    </DataCard>
  );
};

export default MissionDetailMap;
