import React, { useRef, useState } from "react";
import { FaDownload, FaUpload, FaSync } from "react-icons/fa";
import { Title, toast } from "../../ui";
import { Dropdown } from "../";
import axios from "../../../utils/axiosConfig";
import { API_ENDPOINTS } from "../../../config";

// Data type options for import/export
const DATA_TYPES = [
  { value: "raw_logs", label: "Raw Data Logs", endpoint: "RAW_LOGS" },
  { value: "vehicle_logs", label: "Vehicle Logs", endpoint: "VEHICLE_LOGS" },
  { value: "sensor_logs", label: "Sensor Logs", endpoint: "SENSOR_LOGS" },
  {
    value: "alerts",
    label: "Alerts (Anti-theft & Failsafe)",
    endpoint: "ALERTS",
  },
  {
    value: "ctd_logs",
    label: "CTD Logs",
    endpoint: "CTD_LOGS",
    disabled: true,
  },
];

const DataHeader = ({
  onRefreshData = () => {},
  isRefreshing = false,
  lastRefresh = new Date(),
  selectedDataType = "raw_logs",
  onDataTypeChange = () => {},
}) => {
  const fileInputRef = useRef(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleImport = () => {
    // Trigger file input click
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }

    // Get selected data type config
    const dataTypeConfig = DATA_TYPES.find(
      (dt) => dt.value === selectedDataType,
    );
    if (!dataTypeConfig) {
      toast.error("Invalid data type selected");
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
      toast.error(error.response?.data?.error || "Failed to import CSV file");
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
      toast.error("Invalid data type selected");
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
      toast.error(`Failed to export ${dataTypeConfig.label}`);
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
        <Title title="Data Management" />

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {/* Data Type Selector */}
          <div className="w-64">
            <Dropdown
              items={DATA_TYPES.filter((type) => !type.disabled)}
              selectedItem={DATA_TYPES.find(
                (t) => t.value === selectedDataType,
              )}
              onItemChange={(item) => onDataTypeChange(item.value)}
              placeholder="Select data type"
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
                  ? "Refreshing data..."
                  : `Refresh Data (Last: ${lastRefresh.toLocaleTimeString()})`
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
              title="Import Data from CSV"
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
              title="Export Data to CSV"
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
