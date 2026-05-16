import React from "react";

const LogAlertTab = ({
  logs,
  isRealtimePaused,
  tabKey,
  emptyIcon: EmptyIcon,
  emptyMessage,
  normalMessage,
  alertLabel,
  accentColor,
  t,
  formatTimestamp,
}) => (
  <div className="p-6" key={`${tabKey}-${isRealtimePaused ? "paused" : "live"}`}>
    <div className="space-y-3">
      {logs.length === 0 ? (
        <div className="text-center py-12">
          <EmptyIcon
            className={`mx-auto text-${accentColor}-500 dark:text-${accentColor}-400 mb-4`}
            size={48}
          />
          <p className="text-gray-500 dark:text-gray-400 font-medium mb-2">
            {emptyMessage}
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            {normalMessage}
          </p>
        </div>
      ) : (
        logs.map((log, index) => (
          <div
            key={
              log._client_id ||
              log.id ||
              `${log.timestamp || log.created_at || tabKey}-${log.vehicle_id || log.vehicle_name || "vehicle"}-${String(log.message || "").slice(0, 24)}-${index}`
            }
            className="bg-white dark:bg-black border border-gray-200 dark:border-slate-700 rounded-xl p-4 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {formatTimestamp(log.timestamp || log.created_at)}
                </span>
                {log.acknowledged && (
                  <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-700 rounded-full">
                    ✓ {t("pages.logs.acknowledged")}
                  </span>
                )}
              </div>
              <span className={`text-xs font-semibold text-${accentColor}-600 dark:text-${accentColor}-400`}>
                {log.vehicle_name || "N/A"}
              </span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-semibold uppercase border ${
                  log.severity === "critical"
                    ? "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700"
                    : log.severity === "warning"
                      ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700"
                      : "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700"
                }`}
              >
                {log.severity || "info"}
              </span>
              <span className={`text-xs font-semibold px-2 py-0.5 bg-${accentColor}-100 dark:bg-${accentColor}-900/30 text-${accentColor}-700 dark:text-${accentColor}-300 border border-${accentColor}-200 dark:border-${accentColor}-700 rounded-full`}>
                {alertLabel}
              </span>
            </div>
            <p className="text-sm text-gray-800 dark:text-gray-200">
              {log.message}
            </p>
            {log.location && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                {t("pages.logs.location")}: {log.location}
              </p>
            )}
          </div>
        ))
      )}
    </div>
  </div>
);

export default LogAlertTab;
