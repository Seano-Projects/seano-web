import { Link } from "react-router-dom";
import { FaArrowLeft, FaChartBar, FaDownload } from "react-icons/fa";
import useTranslation from "../../../hooks/useTranslation";
import { Title } from "../../ui";

const statusClasses = {
  Draft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  Ongoing: "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-200",
  Completed:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200",
  Failed: "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-200",
};

const MissionDetailHeader = ({
  mission,
  missionId,
  breadcrumbItems,
  onExportCsv,
}) => {
  const { t } = useTranslation();
  const statusClass = statusClasses[mission.status] || statusClasses.Draft;

  return (
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
          onClick={onExportCsv}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <FaDownload size={12} />
          {t("pages.missionDetails.exportCsv")}
        </button>
        <Link
          to={`/missions/${missionId}/report`}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600"
        >
          <FaChartBar size={12} />
          Laporan Sensor
        </Link>
        <Link
          to="/missions"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <FaArrowLeft size={12} />
          {t("pages.missionDetails.back")}
        </Link>
      </div>
    </div>
  );
};

export default MissionDetailHeader;
