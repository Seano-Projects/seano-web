import useTranslation from "../../../hooks/useTranslation";
import DataCard from "../DataCard";
import { formatCoordinate, formatDateTime } from "./missionDetailHelpers";

const MissionDetailTelemetry = ({ recentTelemetry }) => {
  const { t } = useTranslation();

  return (
    <DataCard title={t("pages.missionDetails.telemetryJourney")}>
      <div className="w-full max-w-full overflow-x-auto">
        <table className="w-full min-w-max divide-y divide-slate-200 text-sm dark:divide-slate-700">
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
  );
};

export default MissionDetailTelemetry;
