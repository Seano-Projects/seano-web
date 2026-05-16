import React from "react";

const LogRawTab = ({ logs, isRealtimePaused, emptyMessage, formatTimestampMs }) => (
  <div className="p-6" key={`raw-${isRealtimePaused ? "paused" : "live"}`}>
    <div className="max-h-[65vh] overflow-y-auto pr-1 custom-scrollbar">
      <div className="space-y-3">
        {logs.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">
            {emptyMessage}
          </p>
        ) : (
          logs.map((log, index) => (
            <div
              key={
                log._client_id ||
                log.id ||
                `${log.created_at || log._received_at || "raw"}-${String(log.logs || "").slice(0, 24)}-${index}`
              }
              className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-4 border border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500 transition-colors overflow-hidden min-w-0"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {log.created_at ? formatTimestampMs(log.created_at) : "—"}
                  </span>
                </div>
                <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                  {log.vehicle?.code || "N/A"}
                </span>
              </div>
              <pre className="text-sm text-gray-900 dark:text-gray-300 whitespace-pre-wrap break-all overflow-x-hidden">
                {log.logs}
              </pre>
            </div>
          ))
        )}
      </div>
    </div>
  </div>
);

export default LogRawTab;
