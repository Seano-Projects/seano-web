import { FaCheckCircle, FaClock, FaRoute, FaShip } from "react-icons/fa";
import useTranslation from "../../../hooks/useTranslation";

const formatDuration = (seconds) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "00h 00m 00s";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(remainingSeconds).padStart(2, "0")}s`;
};

const DetailItem = ({
  icon,
  label,
  value,
  iconColor = "text-slate-400",
  iconBg = "bg-slate-100 dark:bg-slate-800",
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-black">
    <div className="mb-3 flex items-center gap-2.5">
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm ${iconBg} ${iconColor}`}
      >
        {icon}
      </span>
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
        {label}
      </span>
    </div>
    <div className="text-sm font-semibold text-slate-900 dark:text-white">
      {value}
    </div>
  </div>
);

export { DetailItem };

const MissionDetailStats = ({ mission, executionWaypointCount }) => {
  const { t } = useTranslation();
  const progressPercent = Math.round(mission.progress || 0);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <DetailItem
        icon={<FaShip />}
        iconColor="text-sky-500"
        iconBg="bg-sky-50 dark:bg-sky-950/40"
        label={t("pages.missionDetails.vehicle")}
        value={
          mission.vehicle?.name ||
          mission.vehicle?.code ||
          t("pages.missionDetails.notSelected")
        }
      />
      <DetailItem
        icon={<FaRoute />}
        iconColor="text-amber-500"
        iconBg="bg-amber-50 dark:bg-amber-950/40"
        label={t("pages.missionDetails.waypointProgress")}
        value={`${mission.completed_waypoint || 0}/${executionWaypointCount} ${t("pages.missionDetails.waypointUnit")}`}
      />
      <DetailItem
        icon={<FaCheckCircle />}
        iconColor="text-emerald-500"
        iconBg="bg-emerald-50 dark:bg-emerald-950/40"
        label={t("pages.missionDetails.progress")}
        value={`${progressPercent}%`}
      />
      <DetailItem
        icon={<FaClock />}
        iconColor="text-violet-500"
        iconBg="bg-violet-50 dark:bg-violet-950/40"
        label={t("pages.missionDetails.duration")}
        value={formatDuration(mission.time_elapsed || 0)}
      />
    </div>
  );
};

export default MissionDetailStats;
