import { Link } from "react-router-dom";
import { FaArrowLeft, FaDownload } from "react-icons/fa";
import { Title } from "../../ui";

const statusClasses = {
  Draft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  Ongoing: "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-200",
  Completed:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200",
  Failed: "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-200",
};

const MissionReportHeader = ({
  mission,
  missionId,
  breadcrumbItems,
  onExportCsv,
  exportDisabled,
}) => {
  const statusClass = statusClasses[mission.status] || statusClasses.Draft;

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <Title
        title={`Laporan Sensor — ${mission.name}`}
        subtitle={`${mission.mission_code} · ${mission.vehicle?.name || mission.vehicle?.code || "Tanpa kendaraan"}`}
        breadcrumbItems={breadcrumbItems}
      />
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${statusClass}`}
        >
          {mission.status}
        </span>
        <button
          type="button"
          onClick={onExportCsv}
          disabled={exportDisabled}
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
  );
};

export default MissionReportHeader;
