import React, { useRef, useState } from "react";
import { FaDownload, FaUpload, FaSync, FaTimes } from "react-icons/fa";
import { Title, toast } from "../../ui";
import { Dropdown, DatePickerField } from "../";
import axios from "../../../utils/axiosConfig";
import { API_ENDPOINTS } from "../../../config";
import useTranslation from "../../../hooks/useTranslation";

// Data type options for import/export
const DATA_TYPES = [
  {
    value: "vehicle_logs",
    labelKey: "pages.data.types.vehicleLogs",
    endpoint: "VEHICLE_LOGS",
  },
  {
    value: "sensor_logs",
    labelKey: "pages.data.types.sensorLogs",
    endpoint: "SENSOR_LOGS",
  },
  {
    value: "battery_logs",
    labelKey: "pages.data.types.batteryLogs",
    endpoint: "BATTERY_LOGS",
  },
  {
    value: "waypoint_logs",
    labelKey: "pages.data.types.waypointLogs",
    endpoint: "WAYPOINT_LOGS",
  },
  {
    value: "command_logs",
    labelKey: "pages.data.types.commandLogs",
    endpoint: "COMMAND_LOGS",
  },
];

const DATE_RANGE_OPTIONS = [
  { id: "all", name: "All Time" },
  { id: "today", name: "Today" },
  { id: "week", name: "This Week" },
  { id: "month", name: "This Month" },
  { id: "quarter", name: "This Quarter" },
];

const EXPORT_FILTER_DEFAULTS = {
  vehicle: null,
  sensor: null,
  dataType: null, // akan di-set saat modal dibuka
  startDate: "",
  startTime: "00:00",
  endDate: "",
  endTime: "23:59",
  dateRange: "all",
};

const DataHeader = ({
  onRefreshData = () => {},
  isRefreshing = false,
  lastRefresh = new Date(),
  selectedDataType = "vehicle_logs",
  onDataTypeChange = () => {},
  filters = {},
  exportData = [],
  vehicles = [],
  missions = [],
  sensors = [],
}) => {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFilters, setExportFilters] = useState(EXPORT_FILTER_DEFAULTS);

  const translatedDataTypes = DATA_TYPES.map((item) => ({
    ...item,
    label: t(item.labelKey),
  }));

  const selectedTypeConfig = DATA_TYPES.find(
    (dt) => dt.value === selectedDataType,
  );

  const importEndpoint = selectedTypeConfig
    ? API_ENDPOINTS[selectedTypeConfig.endpoint]?.IMPORT
    : null;

  const exportEndpoint = selectedTypeConfig
    ? API_ENDPOINTS[selectedTypeConfig.endpoint]?.EXPORT
    : null;

  const toISO = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  };

  const buildExportParams = (type, activeFilters) => {
    const params = {};

    if (activeFilters.vehicle?.id) params.vehicle_id = activeFilters.vehicle.id;
    if (activeFilters.mission?.id) params.mission_id = activeFilters.mission.id;

    // Handle custom date range with time
    if (activeFilters.startDate) {
      const timeStr = activeFilters.startTime || "00:00";
      const [hours, mins] = timeStr.split(":").map(Number);
      const d = new Date(activeFilters.startDate);
      d.setHours(hours, mins, 0, 0);
      params.start_time = d.toISOString();
    }

    if (activeFilters.endDate) {
      const timeStr = activeFilters.endTime || "23:59";
      const [hours, mins] = timeStr.split(":").map(Number);
      const d = new Date(activeFilters.endDate);
      d.setHours(hours, mins, 59, 999);
      params.end_time = d.toISOString();
    } else if (activeFilters.startDate && !activeFilters.endDate) {
      // If only start date is provided, set end date to end of same day
      const timeStr = activeFilters.endTime || "23:59";
      const [hours, mins] = timeStr.split(":").map(Number);
      const d = new Date(activeFilters.startDate);
      d.setHours(hours, mins, 59, 999);
      params.end_time = d.toISOString();
    }

    if (
      activeFilters.dateRange &&
      activeFilters.dateRange !== "all" &&
      !activeFilters.startDate
    ) {
      const now = new Date();
      let from;

      if (activeFilters.dateRange === "today") {
        from = new Date(now);
        from.setHours(0, 0, 0, 0);
      } else if (activeFilters.dateRange === "week") {
        from = new Date(now);
        from.setDate(from.getDate() - 7);
      } else if (activeFilters.dateRange === "month") {
        from = new Date(now);
        from.setMonth(from.getMonth() - 1);
      } else if (activeFilters.dateRange === "quarter") {
        from = new Date(now);
        from.setMonth(from.getMonth() - 3);
      }

      if (from) params.start_time = from.toISOString();
    }

    if (type === "sensor_logs" && activeFilters.sensor?.id) {
      params.sensor_id = activeFilters.sensor.id;
    }

    return params;
  };

  const escapeCsvValue = (value) => {
    if (value === null || value === undefined) return "";
    const raw =
      typeof value === "object" ? JSON.stringify(value) : String(value);
    return `"${raw.replace(/"/g, '""')}"`;
  };

  const exportRowsToCsv = (rows) => {
    if (!Array.isArray(rows) || rows.length === 0) return "";

    // Build deterministic headers and flatten rows per data type
    let headers = [];
    const lines = [];

    if (selectedDataType === "vehicle_logs") {
      headers = [
        "Timestamp",
        "Vehicle",
        "Mission",
        "Latitude",
        "Longitude",
        "Altitude",
        "Speed_m_s",
        "Heading",
        "Roll",
        "Pitch",
        "Yaw",
        "Battery_V",
        "Battery_Current",
        "Battery_Percentage",
        "Mode",
        "SystemStatus",
        "Armed",
        "GPS_OK",
        "RSSI",
        "Temperature",
        "UsvTimestamp",
        "MqttReceivedAt",
        "WsSentAt",
        "WsReceivedAt",
      ];

      lines.push(headers.join(","));

      rows.forEach((row) => {
        const ts = row.usv_timestamp || row.created_at || row.createdAt || "";
        const vehicle =
          (row.vehicle && (row.vehicle.name || row.vehicle.code)) ||
          row.vehicle_code ||
          row.vehicle?.code ||
          row.vehicle_id ||
          "";
        const mission =
          row.mission_code ||
          row.missionCode ||
          (row.mission && row.mission.code) ||
          row.mission_id ||
          "";
        const lat = row.latitude || row.lat || "";
        const lon = row.longitude || row.lon || row.lng || "";
        const alt = row.altitude || "";
        const speed = row.speed || "";
        const heading = row.heading || "";
        const roll = row.roll || "";
        const pitch = row.pitch || "";
        const yaw = row.yaw || "";
        const battery = row.battery_voltage || row.batteryVoltage || "";
        const batteryCurrent = row.battery_current || row.batteryCurrent || "";
        const batteryPercent =
          row.battery_percentage || row.batteryPercentage || "";
        const mode = row.mode || "";
        const status = row.system_status || row.systemStatus || "";
        const armed = row.armed || "";
        const gpsOk = row.gps_ok || row.gpsOk || "";
        const rssi = row.rssi || "";
        const temp = row.temperature_system || row.temperatureSystem || "";
        const usvTs = row.usv_timestamp || "";
        const mqttTs = row.mqtt_received_at || "";
        const wsSentAt = row.ws_sent_at || "";
        const wsReceivedAt = row.ws_received_at || "";

        const vals = [
          ts,
          vehicle,
          mission,
          lat,
          lon,
          alt,
          speed,
          heading,
          roll,
          pitch,
          yaw,
          battery,
          batteryCurrent,
          batteryPercent,
          mode,
          status,
          armed,
          gpsOk,
          rssi,
          temp,
          usvTs,
          mqttTs,
          wsSentAt,
          wsReceivedAt,
        ].map(escapeCsvValue);
        lines.push(vals.join(","));
      });
    } else if (selectedDataType === "sensor_logs") {
      headers = [
        "Timestamp",
        "Vehicle",
        "Sensor",
        "Mission",
        "Data",
        "UsvTimestamp",
        "MqttReceivedAt",
        "WsSentAt",
        "WsReceivedAt",
      ];
      lines.push(headers.join(","));

      rows.forEach((row) => {
        const ts = row.usv_timestamp || row.created_at || row.createdAt || "";
        const vehicle =
          (row.vehicle && (row.vehicle.name || row.vehicle.code)) ||
          row.vehicle_code ||
          row.vehicle?.code ||
          row.vehicle_id ||
          "";
        const sensor =
          (row.sensor &&
            (row.sensor.name || row.sensor.code || row.sensor.type)) ||
          row.sensor_code ||
          row.sensor?.code ||
          row.sensor_id ||
          "";
        const mission =
          row.mission_code ||
          row.missionCode ||
          (row.mission && row.mission.code) ||
          row.mission_id ||
          "";
        const dataField =
          typeof row.data === "object"
            ? JSON.stringify(row.data)
            : row.data || row.Data || "";
        const usvTs = row.usv_timestamp || "";
        const mqttTs = row.mqtt_received_at || row.mqttReceivedAt || "";
        const wsSentAt = row.ws_sent_at || "";
        const wsReceivedAt = row.ws_received_at || "";

        const vals = [
          ts,
          vehicle,
          sensor,
          mission,
          dataField,
          usvTs,
          mqttTs,
          wsSentAt,
          wsReceivedAt,
        ].map(escapeCsvValue);
        lines.push(vals.join(","));
      });
    } else if (selectedDataType === "battery_logs") {
      headers = [
        "Timestamp",
        "Vehicle",
        "BatteryID",
        "Percentage",
        "Voltage",
        "Current",
        "Status",
        "Temperature",
        "CellVoltages",
        "Metadata",
      ];
      lines.push(headers.join(","));

      rows.forEach((row) => {
        const ts = row.created_at || row.timestamp || "";
        const vehicle =
          (row.vehicle && (row.vehicle.name || row.vehicle.code)) ||
          row.vehicle_code ||
          row.vehicle?.code ||
          row.vehicle_id ||
          "";
        const batteryId = row.battery_id || row.batteryId || "";
        const percentage = row.percentage || "";
        const voltage = row.voltage || "";
        const current = row.current || "";
        const status = row.status || "";
        const temperature = row.temperature || "";
        const cellVoltages =
          typeof row.cell_voltages === "object"
            ? JSON.stringify(row.cell_voltages)
            : row.cell_voltages || "";
        const metadata =
          typeof row.metadata === "object"
            ? JSON.stringify(row.metadata)
            : row.metadata || "";

        const vals = [
          ts,
          vehicle,
          batteryId,
          percentage,
          voltage,
          current,
          status,
          temperature,
          cellVoltages,
          metadata,
        ].map(escapeCsvValue);
        lines.push(vals.join(","));
      });
    } else if (selectedDataType === "waypoint_logs") {
      headers = [
        "Timestamp",
        "Vehicle",
        "VehicleCode",
        "Mission",
        "MissionName",
        "WaypointCount",
        "Status",
        "Message",
        "InitiatedAt",
        "ResolvedAt",
      ];
      lines.push(headers.join(","));

      rows.forEach((row) => {
        const ts = row.created_at || row.timestamp || "";
        const vehicle =
          (row.vehicle && (row.vehicle.name || row.vehicle.code)) ||
          row.vehicle_code ||
          row.vehicle?.code ||
          row.vehicle_id ||
          "";
        const vehicleCode = row.vehicle_code || "";
        const mission = row.mission_id || "";
        const missionName = row.mission_name || "";
        const waypointCount = row.waypoint_count || 0;
        const status = row.status || "";
        const message = row.message || "";
        const initiatedAt = row.initiated_at || "";
        const resolvedAt = row.resolved_at || "";

        const vals = [
          ts,
          vehicle,
          vehicleCode,
          mission,
          missionName,
          waypointCount,
          status,
          message,
          initiatedAt,
          resolvedAt,
        ].map(escapeCsvValue);
        lines.push(vals.join(","));
      });
    } else if (selectedDataType === "command_logs") {
      headers = [
        "Timestamp",
        "Vehicle",
        "VehicleCode",
        "RequestID",
        "Command",
        "Status",
        "Message",
        "InitiatedAt",
        "MqttPublishedAt",
        "UsvAckAt",
        "AckReceivedAt",
        "ResolvedAt",
        "WsSentAt",
        "WsReceivedAt",
      ];
      lines.push(headers.join(","));

      rows.forEach((row) => {
        const ts = row.created_at || row.timestamp || "";
        const vehicle =
          (row.vehicle && (row.vehicle.name || row.vehicle.code)) ||
          row.vehicle_code ||
          row.vehicle?.code ||
          row.vehicle_id ||
          "";
        const vehicleCode = row.vehicle_code || "";
        const requestId = row.request_id || "";
        const command = row.command || "";
        const status = row.status || "";
        const message = row.message || "";
        const initiatedAt = row.initiated_at || "";
        const mqttPublishedAt = row.mqtt_published_at || "";
        const usvAckAt = row.usv_ack_at || "";
        const ackReceivedAt = row.ack_received_at || "";
        const resolvedAt = row.resolved_at || "";
        const wsSentAt = row.ws_sent_at || "";
        const wsReceivedAt = row.ws_received_at || "";

        const vals = [
          ts,
          vehicle,
          vehicleCode,
          requestId,
          command,
          status,
          message,
          initiatedAt,
          mqttPublishedAt,
          usvAckAt,
          ackReceivedAt,
          resolvedAt,
          wsSentAt,
          wsReceivedAt,
        ].map(escapeCsvValue);
        lines.push(vals.join(","));
      });
    } else {
      // Fallback: collect headers from all rows but ensure 'id' excluded and timestamp first if present
      const headerSet = rows.reduce((set, row) => {
        Object.keys(row || {}).forEach((k) => {
          if (k === "id" || k === "ID") return;
          set.add(k);
        });
        return set;
      }, new Set());

      // Prefer timestamp keys first
      const timestampKey = [
        "created_at",
        "usv_timestamp",
        "timestamp",
        "createdAt",
      ].find((k) => headerSet.has(k));
      if (timestampKey) headerSet.delete(timestampKey);

      headers = [];
      if (timestampKey) headers.push(timestampKey);
      headers.push(...Array.from(headerSet));

      lines.push(headers.join(","));
      rows.forEach((row) => {
        const vals = headers.map((h) => escapeCsvValue(row?.[h]));
        lines.push(vals.join(","));
      });
    }

    return `${lines.join("\n")}\n`;
  };

  const downloadCsvBlob = (blob, dataType) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, -5);
    link.download = `${dataType}_${timestamp}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    // Trigger file input click
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith(".csv")) {
      toast.error(t("pages.data.messages.csvOnly"));
      return;
    }

    const dataTypeConfig = selectedTypeConfig;
    if (!dataTypeConfig) {
      toast.error(t("pages.data.messages.invalidDataType"));
      return;
    }

    // Upload file
    try {
      setIsImporting(true);
      const formData = new FormData();
      formData.append("file", file);

      if (!importEndpoint) {
        toast.error(t("pages.data.messages.importUnavailable"));
        return;
      }

      const response = await axios.post(importEndpoint, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success(
        `${dataTypeConfig.label} import completed! ${response.data.success_count} records imported, ${response.data.error_count} errors`,
      );

      // Refresh data after import
      onRefreshData();

      // Clear file input
      e.target.value = "";
    } catch (error) {
      console.error("Import error:", error);
      toast.error(
        error.response?.data?.error || t("pages.data.messages.importFailed"),
      );
    } finally {
      setIsImporting(false);
    }
  };

  const handleExport = () => {
    // Open export filter modal instead of exporting immediately
    setExportFilters({
      ...EXPORT_FILTER_DEFAULTS,
      dataType: selectedDataType, // Set current data type as default
      vehicle: filters.vehicle || null,
      sensor: filters.sensor || null,
      startDate: filters.startDate || "",
      startTime: filters.startTime || "00:00",
      endDate: filters.endDate || "",
      endTime: filters.endTime || "23:59",
      dateRange: filters.dateRange || "all",
    });
    setShowExportModal(true);
  };

  const handleExportConfirm = async () => {
    // Use data type from modal, or fall back to currently selected type
    const exportType = exportFilters.dataType || selectedDataType;
    const exportTypeConfig = DATA_TYPES.find((dt) => dt.value === exportType);

    if (!exportTypeConfig) {
      toast.error(t("pages.data.messages.invalidDataType"));
      return;
    }

    const exportEndpointForType =
      API_ENDPOINTS[exportTypeConfig.endpoint]?.EXPORT;

    setShowExportModal(false);

    try {
      setIsExporting(true);

      if (!exportEndpointForType) {
        if (!Array.isArray(exportData) || exportData.length === 0) {
          toast.error(t("pages.data.messages.noDataToExport"));
          return;
        }

        const csvContent = exportRowsToCsv(exportData);
        if (!csvContent) {
          toast.error(t("pages.data.messages.noDataToExport"));
          return;
        }

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
        downloadCsvBlob(blob, exportType);
        toast.success(t("pages.data.messages.exportFromLoadedData"));
        return;
      }

      const queryParams = buildExportParams(exportType, exportFilters);

      const response = await axios.get(exportEndpointForType, {
        responseType: "blob",
        params: queryParams,
        timeout: 15000,
      });

      // If backend returns an error JSON as blob, parse and surface message.
      if (response.data?.type?.includes("application/json")) {
        const text = await response.data.text();
        try {
          const parsed = JSON.parse(text);
          throw new Error(
            parsed?.error ||
              parsed?.message ||
              t("pages.data.messages.exportFailed").replace(
                "{{type}}",
                exportTypeConfig.label || "data",
              ),
          );
        } catch {
          throw new Error(
            t("pages.data.messages.exportFailed").replace(
              "{{type}}",
              exportTypeConfig.label || "data",
            ),
          );
        }
      }

      downloadCsvBlob(response.data, exportType);

      toast.success(
        `${exportTypeConfig.label || "Data"} exported successfully!`,
      );
    } catch (error) {
      console.error("Export error:", error);

      // If server export fails or times out, fallback to currently loaded rows.
      if (Array.isArray(exportData) && exportData.length > 0) {
        const csvContent = exportRowsToCsv(exportData);
        if (csvContent) {
          const blob = new Blob([csvContent], {
            type: "text/csv;charset=utf-8",
          });
          downloadCsvBlob(blob, exportType);
          toast.success(t("pages.data.messages.exportFromLoadedData"));
          return;
        }
      }

      toast.error(
        t("pages.data.messages.exportFailed").replace(
          "{{type}}",
          exportTypeConfig.label || "data",
        ),
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4">
        <Title title={t("nav.dataManagement")} />

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {/* Data Type Selector */}
          <div className="w-64">
            <Dropdown
              items={translatedDataTypes.filter((type) => !type.disabled)}
              selectedItem={translatedDataTypes.find(
                (t) => t.value === selectedDataType,
              )}
              onItemChange={(item) => onDataTypeChange(item.value)}
              placeholder={t("pages.data.filters.selectDataType")}
              getItemKey={(item) => item.value}
              renderSelectedItem={(item) => (
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {item.label}
                </span>
              )}
              renderItem={(item) => (
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {item.label}
                </span>
              )}
            />
          </div>

          {/* Import/Export Buttons */}
          <div className="flex items-center gap-2 ml-2">
            {/* Refresh Data Button */}
            <button
              onClick={onRefreshData}
              disabled={isRefreshing}
              className={`px-4 py-3 text-white text-sm rounded-xl transition-all flex items-center gap-2 font-medium ${
                isRefreshing
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700"
              }`}
              title={
                isRefreshing
                  ? t("pages.data.actions.refreshing")
                  : `${t("pages.data.actions.refreshData")} (${t("pages.data.actions.last")} ${lastRefresh.toLocaleTimeString()})`
              }
            >
              <FaSync
                size={12}
                className={isRefreshing ? "animate-spin" : ""}
              />
            </button>
            <button
              onClick={handleImport}
              disabled={isImporting || !importEndpoint}
              className={`px-4 py-3 text-white text-sm rounded-xl transition-all flex items-center gap-2 font-medium ${
                isImporting || !importEndpoint
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700"
              }`}
              title={
                importEndpoint
                  ? t("pages.data.actions.importCsv")
                  : t("pages.data.messages.importUnavailable")
              }
            >
              <FaUpload
                size={14}
                className={isImporting ? "animate-pulse" : ""}
              />
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className={`px-4 py-3 text-white text-sm rounded-xl transition-all flex items-center gap-2 font-medium ${
                isExporting
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
              title={t("pages.data.actions.exportCsv")}
            >
              <FaDownload
                size={14}
                className={isExporting ? "animate-pulse" : ""}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Export Filter Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 p-6 max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Export Filter
              </h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <FaTimes size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Start Date & Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Date & Time
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <DatePickerField
                      value={exportFilters.startDate}
                      onChange={(v) =>
                        setExportFilters((prev) => ({ ...prev, startDate: v }))
                      }
                      placeholder="Date"
                      maxDate={exportFilters.endDate || undefined}
                      className="w-full"
                    />
                  </div>
                  <input
                    type="time"
                    value={exportFilters.startTime}
                    onChange={(e) =>
                      setExportFilters((prev) => ({
                        ...prev,
                        startTime: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* End Date & Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Date & Time
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <DatePickerField
                      value={exportFilters.endDate}
                      onChange={(v) =>
                        setExportFilters((prev) => ({ ...prev, endDate: v }))
                      }
                      placeholder="Date"
                      minDate={exportFilters.startDate || undefined}
                      className="w-full"
                    />
                  </div>
                  <input
                    type="time"
                    value={exportFilters.endTime}
                    onChange={(e) =>
                      setExportFilters((prev) => ({
                        ...prev,
                        endTime: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              {/* Data Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Data Type
                </label>
                <Dropdown
                  items={translatedDataTypes.filter((type) => !type.disabled)}
                  selectedItem={translatedDataTypes.find(
                    (t) =>
                      t.value === (exportFilters.dataType || selectedDataType),
                  )}
                  onItemChange={(item) =>
                    setExportFilters((prev) => ({
                      ...prev,
                      dataType: item.value,
                    }))
                  }
                  placeholder="Select Data Type"
                  getItemKey={(item) => item.value}
                  renderSelectedItem={(item) => (
                    <span className="text-sm text-gray-900 dark:text-white">
                      {item.label}
                    </span>
                  )}
                  renderItem={(item) => (
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {item.label}
                    </span>
                  )}
                  useFixedPositioning={true}
                />
              </div>

              {/* Vehicle filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Vehicle
                </label>
                <Dropdown
                  items={
                    vehicles.map((vehicle) => ({
                      ...vehicle,
                    })) || []
                  }
                  selectedItem={exportFilters.vehicle || null}
                  onItemChange={(item) =>
                    setExportFilters((prev) => ({
                      ...prev,
                      vehicle: item
                        ? { id: item.id, name: item.name, code: item.code }
                        : null,
                    }))
                  }
                  placeholder="All Vehicles"
                  getItemKey={(item) => item.id}
                  renderSelectedItem={(item) => (
                    <span className="text-sm text-gray-900 dark:text-white">
                      {item.name || "All Vehicles"}
                    </span>
                  )}
                  renderItem={(item) => (
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {item.name}
                    </span>
                  )}
                  useFixedPositioning={true}
                />
              </div>

              {/* Sensor filter - only for sensor_logs */}
              {(exportFilters.dataType || selectedDataType) ===
                "sensor_logs" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Sensor
                  </label>
                  <Dropdown
                    items={
                      sensors.map((sensor) => ({
                        id: sensor.id,
                        name:
                          sensor.code ||
                          sensor.name ||
                          `${sensor.brand || "Unknown"} ${sensor.model || ""}`,
                        code: sensor.code,
                        sensorType: sensor.sensor_type?.name || "",
                      })) || []
                    }
                    selectedItem={
                      sensors
                        .map((sensor) => ({
                          id: sensor.id,
                          name:
                            sensor.code ||
                            sensor.name ||
                            `${sensor.brand || "Unknown"} ${sensor.model || ""}`,
                          code: sensor.code,
                          sensorType: sensor.sensor_type?.name || "",
                        }))
                        .find((s) => s.id === exportFilters.sensor?.id) || null
                    }
                    onItemChange={(item) =>
                      setExportFilters((prev) => ({
                        ...prev,
                        sensor: item ? { id: item.id, code: item.code } : null,
                      }))
                    }
                    placeholder="All Sensors"
                    getItemKey={(item) => item.id}
                    renderSelectedItem={(item) => (
                      <span className="text-sm text-gray-900 dark:text-white">
                        {item.code || item.name}
                      </span>
                    )}
                    renderItem={(item) => (
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {item.code || item.name}
                        {item.sensorType && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                            ({item.sensorType})
                          </span>
                        )}
                      </span>
                    )}
                    className="text-sm"
                    useFixedPositioning={true}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExportConfirm}
                disabled={isExporting}
                className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <FaDownload size={12} />
                Export
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataHeader;
