import useTranslation from "../../../hooks/useTranslation";
import DataCard from "../DataCard";
import { formatDateTime } from "./missionDetailHelpers";

const MissionDetailTimeline = ({ missionEvents }) => {
  const { t } = useTranslation();

  return (
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
  );
};

export default MissionDetailTimeline;
