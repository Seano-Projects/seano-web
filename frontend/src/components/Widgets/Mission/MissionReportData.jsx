import { useState, useMemo } from "react";
import { FaFlask } from "react-icons/fa";
import DataCard from "../DataCard";

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const colorPalette = [
  { icon: "text-sky-500", bg: "bg-sky-50 dark:bg-sky-950/40", val: "text-sky-700 dark:text-sky-300" },
  { icon: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/40", val: "text-emerald-700 dark:text-emerald-300" },
  { icon: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-950/40", val: "text-violet-700 dark:text-violet-300" },
  { icon: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/40", val: "text-amber-700 dark:text-amber-300" },
  { icon: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-950/40", val: "text-rose-700 dark:text-rose-300" },
  { icon: "text-cyan-500", bg: "bg-cyan-50 dark:bg-cyan-950/40", val: "text-cyan-700 dark:text-cyan-300" },
];

const SensorSection = ({ sensor, logs }) => {
  const [page, setPage] = useState(1);
  const perPage = 50;

  const parsedLogs = useMemo(
    () =>
      logs.map((log) => {
        try {
          return { ...log, _parsed: JSON.parse(log.data) };
        } catch {
          return { ...log, _parsed: {} };
        }
      }),
    [logs],
  );

  const allKeys = useMemo(() => {
    const keySet = new Set();
    parsedLogs.forEach((l) => {
      if (l._parsed) Object.keys(l._parsed).forEach((k) => keySet.add(k));
    });
    return Array.from(keySet).filter(
      (k) => !["vehicle_code", "sensor_code", "date_time"].includes(k),
    );
  }, [parsedLogs]);

  const stats = useMemo(() => {
    const result = {};
    allKeys.forEach((key) => {
      const vals = parsedLogs
        .map((l) => toNum(l._parsed?.[key]))
        .filter((v) => v !== null);
      if (vals.length === 0) return;
      const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
      result[key] = { min: Math.min(...vals), max: Math.max(...vals), avg, count: vals.length };
    });
    return result;
  }, [parsedLogs, allKeys]);

  const totalPages = Math.ceil(parsedLogs.length / perPage);
  const paginated = parsedLogs.slice((page - 1) * perPage, page * perPage);

  const sensorLabel = sensor?.brand
    ? `${sensor.brand} ${sensor.model || ""}`.trim()
    : sensor?.code || "Sensor";
  const sensorTypeName = sensor?.sensor_type?.name || "";

  return (
    <DataCard>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <FaFlask className="text-sky-500" />
              <span className="font-semibold text-slate-900 dark:text-white">{sensorLabel}</span>
              {sensorTypeName && (
                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                  {sensorTypeName}
                </span>
              )}
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {logs.length} data poin
              {logs[0]?.created_at && ` · ${formatDateTime(logs[0].created_at)}`}
              {logs.length > 1 && ` → ${formatDateTime(logs[logs.length - 1].created_at)}`}
            </div>
          </div>
        </div>

        {Object.keys(stats).length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {Object.entries(stats).map(([key, s], i) => {
              const c = colorPalette[i % colorPalette.length];
              return (
                <div key={key} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-transparent">
                  <div className={`mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide truncate ${c.icon}`}>
                    <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${c.bg}`}>
                      <FaFlask size={9} />
                    </span>
                    {key}
                  </div>
                  <div className={`text-base font-bold ${c.val}`}>{s.avg.toFixed(2)}</div>
                  <div className="text-xs text-slate-400 dark:text-slate-500">{s.min.toFixed(2)} – {s.max.toFixed(2)}</div>
                </div>
              );
            })}
          </div>
        )}

        <div className="w-full max-w-full overflow-x-auto">
          <table className="w-full min-w-max divide-y divide-slate-200 text-sm dark:divide-slate-700">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                <th className="whitespace-nowrap px-3 py-2">Waktu</th>
                {allKeys.map((k) => (
                  <th key={k} className="whitespace-nowrap px-3 py-2">{k}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginated.map((log) => (
                <tr key={log.id || log.created_at} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600 dark:text-slate-300">{formatDateTime(log.created_at)}</td>
                  {allKeys.map((k) => (
                    <td key={k} className="whitespace-nowrap px-3 py-2 text-slate-700 dark:text-slate-200">
                      {log._parsed?.[k] !== undefined && log._parsed?.[k] !== null ? String(log._parsed[k]) : "-"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
            <span>Halaman {page} dari {totalPages} ({logs.length} total)</span>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-slate-300 px-3 py-1 text-sm disabled:opacity-40 dark:border-slate-700">← Prev</button>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-slate-300 px-3 py-1 text-sm disabled:opacity-40 dark:border-slate-700">Next →</button>
            </div>
          </div>
        )}
      </div>
    </DataCard>
  );
};

const MissionReportData = ({ sensorGroups, activeSensorId, setActiveSensorId, activeGroup }) => {
  if (sensorGroups.length === 0) {
    return (
      <DataCard title="Data Sensor">
        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Belum ada data sensor yang ter-link ke misi ini.
          <div className="mt-2 text-xs">
            Data sensor akan otomatis ter-link jika misi sedang berjalan (status Ongoing).
          </div>
        </div>
      </DataCard>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {sensorGroups.map((group) => {
          const id = group.sensor?.id || group.logs[0]?.sensor_id;
          const label = group.sensor?.brand
            ? `${group.sensor.brand} ${group.sensor.model || ""}`.trim()
            : group.sensor?.code || `Sensor ${id}`;
          const typeName = group.sensor?.sensor_type?.name;
          const isActive = activeSensorId === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveSensorId(id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-sky-600 text-white dark:bg-sky-500"
                  : "border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              }`}
            >
              <FaFlask size={11} />
              {label}
              {typeName && (
                <span className={`rounded-full px-1.5 py-0.5 text-xs ${isActive ? "bg-white/20" : "bg-slate-100 dark:bg-slate-800"}`}>
                  {typeName}
                </span>
              )}
              <span className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${isActive ? "bg-white/20" : "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"}`}>
                {group.logs.length}
              </span>
            </button>
          );
        })}
      </div>

      {activeGroup && (
        <SensorSection sensor={activeGroup.sensor} logs={activeGroup.logs} />
      )}
    </div>
  );
};

export default MissionReportData;
