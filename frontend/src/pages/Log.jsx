import React, { useState, useMemo, useRef } from "react";
import { useLogData } from "../hooks/useLogData";
import { useAlertData } from "../hooks/useAlertData";
import useVehicleData from "../hooks/useVehicleData";
import useLoadingTimeout from "../hooks/useLoadingTimeout";
import useTitle from "../hooks/useTitle";
import useTranslation from "../hooks/useTranslation";
import { FiActivity, FiCpu, FiFileText, FiShield, FiAlertTriangle } from "react-icons/fi";
import {
  LogHeader, LogStatsWidgets, LogTabs, LogTableTab, LogRawTab, LogAlertTab,
} from "../components/Widgets/Log";
import {
  VEHICLE_COL_KEYS, VEHICLE_COL_LABELS, VEHICLE_COL_DEFAULT, VEHICLE_MAX,
  SENSOR_COL_KEYS, SENSOR_COL_LABELS, SENSOR_COL_DEFAULT, SENSOR_MAX,
  COMMAND_COL_KEYS, COMMAND_COL_LABELS, COMMAND_COL_DEFAULT, COMMAND_MAX,
  WAYPOINT_COL_KEYS, WAYPOINT_COL_LABELS, WAYPOINT_COL_DEFAULT, WAYPOINT_MAX,
  formatTimestamp, formatTimestampMs,
  getVehicleLogColumns, getSensorLogColumns, getCommandLogColumns, getWaypointLogColumns,
} from "../components/Widgets/Log/logColumns";

const Log = () => {
  const { t } = useTranslation();
  useTitle(t("pages.logs.title"));
  const tr = (key, params = {}) => {
    let text = t(key);
    Object.entries(params).forEach(([k, v]) => { text = text.replace(`{{${k}}}`, String(v)); });
    return text;
  };

  const [isRealtimePaused, setIsRealtimePaused] = useState(false);
  const { vehicles, loading: vehicleLoading, selectedVehicleId, setSelectedVehicleId } = useVehicleData();
  const selectedVehicle = useMemo(() => vehicles.find((v) => v.id === selectedVehicleId) ?? null, [vehicles, selectedVehicleId]);

  const { stats, vehicleLogs, sensorLogs, rawLogs, commandLogs, waypointLogs, loading } = useLogData({
    enableRealtime: true, pauseRealtime: isRealtimePaused, selectedVehicleId: selectedVehicle?.id || 0,
  });
  const { alerts } = useAlertData();
  const [activeTab, setActiveTab] = useState("vehicle");
  const hasInitializedVehicleSelection = useRef(false);

  const [vehicleVisibleKeys, setVehicleVisibleKeys] = useState(VEHICLE_COL_DEFAULT);
  const [sensorVisibleKeys, setSensorVisibleKeys] = useState(SENSOR_COL_DEFAULT);
  const [commandVisibleKeys, setCommandVisibleKeys] = useState(COMMAND_COL_DEFAULT);
  const [waypointVisibleKeys, setWaypointVisibleKeys] = useState(WAYPOINT_COL_DEFAULT);

  const antiTheftLogs = useMemo(() => alerts.filter((a) => (a.alert_type || a.type || "").toLowerCase() === "anti-theft"), [alerts]);
  const failsafeLogs = useMemo(() => alerts.filter((a) => (a.alert_type || a.type || "").toLowerCase() === "failsafe"), [alerts]);

  const { loading: timeoutLoading } = useLoadingTimeout(loading, 5000);
  const shouldShowSkeleton = timeoutLoading && loading && vehicleLogs.length === 0;

  const filterLogsByVehicle = (logs) => {
    if (!selectedVehicle) return logs;
    return logs.filter((l) => l.vehicle?.code === selectedVehicle.code || l.vehicle_id === selectedVehicle.id);
  };
  const filterActionLogsByVehicle = (logs) => {
    if (!selectedVehicle) return logs;
    return logs.filter((l) => l.vehicle?.code === selectedVehicle.code || l.vehicle_code === selectedVehicle.code || l.vehicle_id === selectedVehicle.id);
  };

  const filteredVehicleLogs = filterLogsByVehicle(vehicleLogs);
  const filteredSensorLogs = filterLogsByVehicle(sensorLogs);
  const filteredRawLogs = filterLogsByVehicle(rawLogs);
  const filteredAntiTheftLogs = filterLogsByVehicle(antiTheftLogs);
  const filteredFailsafeLogs = filterLogsByVehicle(failsafeLogs);
  const filteredCommandLogs = filterActionLogsByVehicle(commandLogs);
  const filteredWaypointLogs = filterActionLogsByVehicle(waypointLogs);

  const makeToggle = (setter, max) => (key) => setter((prev) => {
    const next = new Set(prev);
    if (next.has(key)) { if (next.size === 1) return prev; next.delete(key); }
    else { if (next.size >= max) return prev; next.add(key); }
    return next;
  });

  const widgets = [
    { title: t("pages.logs.widgets.vehicle"), value: stats.vehicle_logs.total, icon: <FiActivity className="text-blue-600 dark:text-blue-400" size={24} />, trendIcon: stats.vehicle_logs.percentage_change >= 0 ? <span className="text-green-600 dark:text-green-400">↑</span> : <span className="text-red-600 dark:text-red-400">↓</span>, trendText: tr("pages.logs.widgets.vsYesterday", { count: Math.abs(stats.vehicle_logs.percentage_change).toFixed(1) }), iconBgColor: "bg-blue-100 dark:bg-blue-900/30" },
    { title: t("pages.logs.widgets.sensor"), value: stats.sensor_logs.total, icon: <FiCpu className="text-green-600 dark:text-green-400" size={24} />, trendIcon: stats.sensor_logs.percentage_change >= 0 ? <span className="text-green-600 dark:text-green-400">↑</span> : <span className="text-red-600 dark:text-red-400">↓</span>, trendText: tr("pages.logs.widgets.vsYesterday", { count: Math.abs(stats.sensor_logs.percentage_change).toFixed(1) }), iconBgColor: "bg-green-100 dark:bg-green-900/30" },
    { title: t("pages.logs.widgets.raw"), value: stats.raw_logs.total, icon: <FiFileText className="text-purple-600 dark:text-purple-400" size={24} />, trendIcon: stats.raw_logs.percentage_change >= 0 ? <span className="text-green-600 dark:text-green-400">↑</span> : <span className="text-red-600 dark:text-red-400">↓</span>, trendText: tr("pages.logs.widgets.vsYesterday", { count: Math.abs(stats.raw_logs.percentage_change).toFixed(1) }), iconBgColor: "bg-purple-100 dark:bg-purple-900/30" },
    { title: t("pages.logs.widgets.antiTheft"), value: antiTheftLogs.length, icon: <FiShield className="text-orange-600 dark:text-orange-400" size={24} />, trendIcon: antiTheftLogs.length > 0 ? <span className="text-orange-600 dark:text-orange-400">⚠</span> : null, trendText: antiTheftLogs.length > 0 ? tr("pages.logs.widgets.unacknowledged", { count: antiTheftLogs.filter((a) => !a.acknowledged).length }) : t("pages.logs.widgets.noAlerts"), iconBgColor: "bg-orange-100 dark:bg-orange-900/30" },
    { title: t("pages.logs.widgets.failsafe"), value: failsafeLogs.length, icon: <FiAlertTriangle className="text-red-600 dark:text-red-400" size={24} />, trendIcon: failsafeLogs.length > 0 ? <span className="text-red-600 dark:text-red-400">⚠</span> : null, trendText: failsafeLogs.length > 0 ? tr("pages.logs.widgets.unacknowledged", { count: failsafeLogs.filter((a) => !a.acknowledged).length }) : t("pages.logs.widgets.noAlerts"), iconBgColor: "bg-red-100 dark:bg-red-900/30" },
  ];

  const vehicleLogColumns = useMemo(() => getVehicleLogColumns(), []);
  const sensorLogColumns = useMemo(() => getSensorLogColumns(), []);
  const commandLogColumns = useMemo(() => getCommandLogColumns(t), [t]);
  const waypointLogColumns = useMemo(() => getWaypointLogColumns(t), [t]);

  return (
    <div className="p-4" key={`logs-root-${isRealtimePaused ? "paused" : "live"}`}>
      <LogHeader t={t} vehicles={vehicles} selectedVehicle={selectedVehicle} setSelectedVehicleId={setSelectedVehicleId} vehicleLoading={vehicleLoading} isRealtimePaused={isRealtimePaused} setIsRealtimePaused={setIsRealtimePaused} />
      <LogStatsWidgets widgets={widgets} shouldShowSkeleton={shouldShowSkeleton} />
      <div className="bg-white dark:bg-black border border-gray-300 dark:border-slate-600 rounded-xl my-4">
        <LogTabs activeTab={activeTab} setActiveTab={setActiveTab} t={t} />
        {activeTab === "vehicle" && (
          <LogTableTab tabKey="vehicle" isRealtimePaused={isRealtimePaused} allKeys={VEHICLE_COL_KEYS} labels={VEHICLE_COL_LABELS} visibleKeys={vehicleVisibleKeys} onToggle={makeToggle(setVehicleVisibleKeys, VEHICLE_MAX)} onReset={() => setVehicleVisibleKeys(new Set(VEHICLE_COL_DEFAULT))} maxColumns={VEHICLE_MAX} columns={vehicleLogColumns} data={filteredVehicleLogs} searchPlaceholder={t("pages.logs.searchVehicle")} searchKeys={["vehicle_code", "system_status"]} emptyMessage={t("pages.logs.emptyVehicle")} />
        )}
        {activeTab === "sensor" && (
          <LogTableTab tabKey="sensor" isRealtimePaused={isRealtimePaused} allKeys={SENSOR_COL_KEYS} labels={SENSOR_COL_LABELS} visibleKeys={sensorVisibleKeys} onToggle={makeToggle(setSensorVisibleKeys, SENSOR_MAX)} onReset={() => setSensorVisibleKeys(new Set(SENSOR_COL_DEFAULT))} maxColumns={SENSOR_MAX} columns={sensorLogColumns} data={filteredSensorLogs} searchPlaceholder={t("pages.logs.searchSensor")} searchKeys={["vehicle_code", "sensor_code"]} emptyMessage={t("pages.logs.emptySensor")} />
        )}
        {activeTab === "raw" && (
          <LogRawTab logs={filteredRawLogs} isRealtimePaused={isRealtimePaused} emptyMessage={t("pages.logs.emptyRaw")} formatTimestampMs={formatTimestampMs} />
        )}
        {activeTab === "antitheft" && (
          <LogAlertTab logs={filteredAntiTheftLogs} isRealtimePaused={isRealtimePaused} tabKey="antitheft" emptyIcon={FiShield} emptyMessage={t("pages.logs.emptyAntiTheft")} normalMessage={t("pages.logs.normalOperation")} alertLabel={t("pages.logs.alerts.antiTheft")} accentColor="orange" t={t} formatTimestamp={formatTimestamp} />
        )}
        {activeTab === "failsafe" && (
          <LogAlertTab logs={filteredFailsafeLogs} isRealtimePaused={isRealtimePaused} tabKey="failsafe" emptyIcon={FiAlertTriangle} emptyMessage={t("pages.logs.emptyFailsafe")} normalMessage={t("pages.logs.normalOperation")} alertLabel={t("pages.logs.alerts.failsafe")} accentColor="red" t={t} formatTimestamp={formatTimestamp} />
        )}
        {activeTab === "command" && (
          <LogTableTab tabKey="command" isRealtimePaused={isRealtimePaused} allKeys={COMMAND_COL_KEYS} labels={COMMAND_COL_LABELS} visibleKeys={commandVisibleKeys} onToggle={makeToggle(setCommandVisibleKeys, COMMAND_MAX)} onReset={() => setCommandVisibleKeys(new Set(COMMAND_COL_DEFAULT))} maxColumns={COMMAND_MAX} columns={commandLogColumns} data={filteredCommandLogs} searchPlaceholder={t("pages.logs.searchCommand")} searchKeys={["vehicle_code", "command", "status"]} pageSize={Math.max(filteredCommandLogs.length, 1)} emptyMessage={t("pages.logs.emptyCommand")} />
        )}
        {activeTab === "waypoint" && (
          <LogTableTab tabKey="waypoint" isRealtimePaused={isRealtimePaused} allKeys={WAYPOINT_COL_KEYS} labels={WAYPOINT_COL_LABELS} visibleKeys={waypointVisibleKeys} onToggle={makeToggle(setWaypointVisibleKeys, WAYPOINT_MAX)} onReset={() => setWaypointVisibleKeys(new Set(WAYPOINT_COL_DEFAULT))} maxColumns={WAYPOINT_MAX} columns={waypointLogColumns} data={filteredWaypointLogs} searchPlaceholder={t("pages.logs.searchWaypoint")} searchKeys={["vehicle_code", "mission_name", "status"]} pageSize={Math.max(filteredWaypointLogs.length, 1)} emptyMessage={t("pages.logs.emptyWaypoint")} />
        )}
      </div>
    </div>
  );
};

export default Log;
