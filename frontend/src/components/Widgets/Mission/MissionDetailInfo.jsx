import {
  FaBatteryHalf,
  FaCalendarAlt,
  FaCheckCircle,
  FaMapMarkerAlt,
  FaPlayCircle,
  FaUser,
} from "react-icons/fa";
import useTranslation from "../../../hooks/useTranslation";
import DataCard from "../DataCard";
import { DetailItem } from "./MissionDetailStats";
import { formatDateTime } from "./missionDetailHelpers";

const MissionDetailInfo = ({ mission, executionWaypointCount }) => {
  const { t } = useTranslation();

  return (
    <DataCard title={t("pages.missionDetails.relatedData")}>
      <div className="space-y-3">
        <DetailItem
          icon={<FaUser />}
          iconColor="text-indigo-500"
          iconBg="bg-indigo-50 dark:bg-indigo-950/40"
          label={t("pages.missionDetails.createdBy")}
          value={mission.creator?.name || mission.creator?.email || "-"}
        />
        <DetailItem
          icon={<FaCalendarAlt />}
          iconColor="text-rose-500"
          iconBg="bg-rose-50 dark:bg-rose-950/40"
          label={t("pages.missionDetails.createdAt")}
          value={formatDateTime(mission.created_at)}
        />
        <DetailItem
          icon={<FaPlayCircle />}
          iconColor="text-green-500"
          iconBg="bg-green-50 dark:bg-green-950/40"
          label={t("pages.missionDetails.startTime")}
          value={formatDateTime(mission.start_time)}
        />
        <DetailItem
          icon={<FaCheckCircle />}
          iconColor="text-emerald-500"
          iconBg="bg-emerald-50 dark:bg-emerald-950/40"
          label={t("pages.missionDetails.endTime")}
          value={formatDateTime(mission.end_time)}
        />
        <DetailItem
          icon={<FaBatteryHalf />}
          iconColor="text-yellow-500"
          iconBg="bg-yellow-50 dark:bg-yellow-950/40"
          label={t("pages.missionDetails.energy")}
          value={
            mission.energy_budget
              ? `${Number(mission.energy_consumed || 0).toFixed(1)} / ${Number(mission.energy_budget).toFixed(1)} kWh`
              : t("pages.missionDetails.noEnergyBudget")
          }
        />
        <DetailItem
          icon={<FaMapMarkerAlt />}
          iconColor="text-pink-500"
          iconBg="bg-pink-50 dark:bg-pink-950/40"
          label={t("pages.missionDetails.currentWaypoint")}
          value={`${mission.current_waypoint || 0}/${executionWaypointCount}`}
        />
      </div>
    </DataCard>
  );
};

export default MissionDetailInfo;
