import {
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaFlask,
  FaRoute,
  FaShip,
} from "react-icons/fa";

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
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
};

const StatCard = ({ icon, label, value, iconColor, iconBg }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-transparent">
    <div className="mb-3 flex items-center gap-2.5">
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm ${iconBg} ${iconColor}`}
      >
        {icon}
      </span>
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </span>
    </div>
    <div className="text-sm font-semibold text-slate-900 dark:text-white">
      {value}
    </div>
  </div>
);

const MissionReportStats = ({ mission, sensorGroupsCount, sensorLogsCount }) => {
  const statsRow = [
    {
      icon: <FaShip />,
      label: "Kendaraan",
      value: mission.vehicle?.name || mission.vehicle?.code || "-",
      iconColor: "text-sky-500",
      iconBg: "bg-sky-50 dark:bg-sky-950/40",
    },
    {
      icon: <FaFlask />,
      label: "Jenis Sensor",
      value: `${sensorGroupsCount} sensor`,
      iconColor: "text-violet-500",
      iconBg: "bg-violet-50 dark:bg-violet-950/40",
    },
    {
      icon: <FaCheckCircle />,
      label: "Total Data Sensor",
      value: sensorLogsCount.toLocaleString?.() || sensorLogsCount,
      iconColor: "text-emerald-500",
      iconBg: "bg-emerald-50 dark:bg-emerald-950/40",
    },
    {
      icon: <FaClock />,
      label: "Durasi",
      value: formatDuration(mission.time_elapsed || 0),
      iconColor: "text-amber-500",
      iconBg: "bg-amber-50 dark:bg-amber-950/40",
    },
  ];

  const infoRow = [
    {
      icon: <FaCalendarAlt />,
      label: "Dibuat",
      value: formatDateTime(mission.created_at),
      iconColor: "text-rose-500",
      iconBg: "bg-rose-50 dark:bg-rose-950/40",
    },
    {
      icon: <FaRoute />,
      label: "Mulai",
      value: formatDateTime(mission.start_time),
      iconColor: "text-green-500",
      iconBg: "bg-green-50 dark:bg-green-950/40",
    },
    {
      icon: <FaCheckCircle />,
      label: "Selesai",
      value: formatDateTime(mission.end_time),
      iconColor: "text-emerald-500",
      iconBg: "bg-emerald-50 dark:bg-emerald-950/40",
    },
    {
      icon: <FaRoute />,
      label: "Waypoint",
      value: `${mission.completed_waypoint || 0}/${mission.total_waypoints || 0}`,
      iconColor: "text-orange-500",
      iconBg: "bg-orange-50 dark:bg-orange-950/40",
    },
  ];

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statsRow.map((item) => (
          <StatCard key={item.label} {...item} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {infoRow.map((item) => (
          <StatCard key={item.label} {...item} />
        ))}
      </div>
    </>
  );
};

export default MissionReportStats;
