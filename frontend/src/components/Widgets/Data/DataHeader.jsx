import React from "react";
import { FaDownload, FaUpload, FaSync } from "react-icons/fa";
import { Title } from "../../ui";

const DataHeader = ({
  onRefreshData = () => {},
  isRefreshing = false,
  lastRefresh = new Date(),
}) => {
  const handleImport = () => {
    // Implement import logic here
  };

  const handleExport = () => {
    // Implement export logic here
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4">
        <Title title="Data Management" />

        {/* Action Controls */}
        <div className="flex items-center gap-3">
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
              className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white text-sm rounded-xl transition-all flex items-center gap-2 font-medium"
              title="Import Data"
            >
              <FaUpload size={14} />
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-xl transition-all flex items-center gap-2 font-medium"
              title="Export Data"
            >
              <FaDownload size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataHeader;
