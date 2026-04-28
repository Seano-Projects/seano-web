import React, { useRef, useState } from "react";
import { FaDownload, FaUpload, FaSync } from "react-icons/fa";
import { Title, toast } from "../../ui";
import { Dropdown } from "../";
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
];

const DataHeader = ({
  onRefreshData = () => {},
  isRefreshing = false,
  lastRefresh = new Date(),
  selectedDataType = "vehicle_logs",
  onDataTypeChange = () => {},
}) => {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const translatedDataTypes = DATA_TYPES.map((item) => ({
    ...item,
    label: t(item.labelKey),
  }));

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

    // Get selected data type config
    const dataTypeConfig = DATA_TYPES.find(
      (dt) => dt.value === selectedDataType,
    );
    if (!dataTypeConfig) {
      toast.error(t("pages.data.messages.invalidDataType"));
      return;
    }

    // Upload file
    try {
      setIsImporting(true);
      const formData = new FormData();
      formData.append("file", file);

      const importEndpoint = API_ENDPOINTS[dataTypeConfig.endpoint]?.IMPORT;
      if (!importEndpoint) {
        toast.error(`Import not available for ${dataTypeConfig.label}`);
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

  const handleExport = async () => {
    // Get selected data type config
    const dataTypeConfig = DATA_TYPES.find(
      (dt) => dt.value === selectedDataType,
    );
    if (!dataTypeConfig) {
      toast.error(t("pages.data.messages.invalidDataType"));
      return;
    }

    try {
      setIsExporting(true);

      const exportEndpoint = API_ENDPOINTS[dataTypeConfig.endpoint]?.EXPORT;
      if (!exportEndpoint) {
        toast.error(`Export not available for ${dataTypeConfig.label}`);
        return;
      }

      // Call export endpoint
      const response = await axios.get(exportEndpoint, {
        responseType: "blob",
      });

      // Create download link
      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      // Generate filename with timestamp
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, -5);
      link.download = `${selectedDataType}_${timestamp}.csv`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`${dataTypeConfig.label} exported successfully!`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error(
        t("pages.data.messages.exportFailed").replace(
          "{{type}}",
          dataTypeConfig.label,
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
              disabled={isImporting}
              className={`px-4 py-3 text-white text-sm rounded-xl transition-all flex items-center gap-2 font-medium ${
                isImporting
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700"
              }`}
              title={t("pages.data.actions.importCsv")}
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
    </div>
  );
};

export default DataHeader;
