import { useState, useEffect } from "react";
import { FaEdit, FaTrash, FaDownload } from "react-icons/fa";
import { DataTable as BaseDataTable } from "../../ui";
import axios from "../../../utils/axiosConfig";
import { API_ENDPOINTS } from "../../../config";
import { toast, LoadingDots } from "../../ui";

const DataTable = ({ hasActiveFilters, handleResetFilters }) => {
  const [rawLogs, setRawLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [error, setError] = useState(null);

  // Fetch raw logs
  useEffect(() => {
    fetchRawLogs();
  }, []);

  const fetchRawLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(API_ENDPOINTS.RAW_LOGS.LIST);

      // Ensure response.data is an array
      const logsData = Array.isArray(response.data) ? response.data : [];
      setRawLogs(logsData);
    } catch (error) {
      setError(error.message || "Failed to fetch raw logs");
      setRawLogs([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle select all checkbox
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(rawLogs.map((row) => row.id));
    } else {
      setSelectedIds([]);
    }
  };

  // Handle individual checkbox
  const handleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    const confirmBulk = window.confirm(
      `Are you sure you want to delete ${selectedIds.length} log(s)? This action cannot be undone.`,
    );

    if (!confirmBulk) return;

    try {
      await Promise.all(
        selectedIds.map((id) =>
          axios.delete(API_ENDPOINTS.RAW_LOGS.DELETE(id)),
        ),
      );

      toast.success(`${selectedIds.length} log(s) deleted successfully!`);
      setSelectedIds([]);
      fetchRawLogs();
    } catch (error) {
      toast.error("Failed to delete some logs");
    }
  };

  // Handle delete single
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this log?")) return;

    try {
      await axios.delete(API_ENDPOINTS.RAW_LOGS.DELETE(id));
      toast.success("Log deleted successfully!");
      fetchRawLogs();
    } catch (error) {
      toast.error("Failed to delete log");
    }
  };

  // Handle export
  const handleExport = (row) => {
    const dataStr = JSON.stringify(row, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `raw-log-${row.id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Log exported successfully!");
  };

  // Define columns
  const columns = [
    {
      header: (
        <input
          type="checkbox"
          checked={selectedIds.length === rawLogs.length && rawLogs.length > 0}
          onChange={handleSelectAll}
          className="appearance-none w-4 h-4 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-fourth cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-fourth focus:ring-offset-0 hover:border-gray-400 dark:hover:border-gray-500 checked:bg-fourth checked:border-fourth dark:checked:bg-fourth dark:checked:border-fourth checked:hover:bg-blue-700 dark:checked:hover:bg-blue-700"
          style={{
            backgroundImage:
              selectedIds.length === rawLogs.length && rawLogs.length > 0
                ? "url(\"data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e\")"
                : "none",
            backgroundSize: "100% 100%",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
      ),
      accessorKey: "checkbox",
      className: "w-12 text-center",
      cellClassName: "text-center",
      sortable: false,
      cell: (row) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(row.id)}
          onChange={() => handleSelectOne(row.id)}
          onClick={(e) => e.stopPropagation()}
          className="appearance-none w-4 h-4 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-fourth cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-fourth focus:ring-offset-0 hover:border-gray-400 dark:hover:border-gray-500 checked:bg-fourth checked:border-fourth dark:checked:bg-fourth dark:checked:border-fourth checked:hover:bg-blue-700 dark:checked:hover:bg-blue-700"
          style={{
            backgroundImage: selectedIds.includes(row.id)
              ? "url(\"data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e\")"
              : "none",
            backgroundSize: "100% 100%",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
      ),
    },
    {
      header: "ID",
      accessorKey: "id",
      cell: (row) => (
        <span className="font-medium text-gray-900 dark:text-white">
          #{row.id}
        </span>
      ),
    },
    {
      header: "Vehicle",
      accessorKey: "vehicle_id",
      cell: (row) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">
          Vehicle {row.vehicle_id || "N/A"}
        </span>
      ),
    },
    {
      header: "Topic",
      accessorKey: "topic",
      cell: (row) => (
        <span className="text-sm text-gray-700 dark:text-gray-300 font-mono">
          {row.topic || "N/A"}
        </span>
      ),
    },
    {
      header: "Timestamp",
      accessorKey: "created_at",
      cell: (row) => (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {row.created_at
            ? new Date(row.created_at).toLocaleString()
            : "Unknown"}
        </span>
      ),
    },
    {
      header: "Actions",
      accessorKey: "actions",
      className: "text-center w-32",
      cellClassName: "text-center whitespace-nowrap",
      sortable: false,
      cell: (row) => (
        <div className="flex items-center justify-center gap-3 w-full h-full">
          <button
            onClick={() => handleExport(row)}
            className="inline-flex items-center justify-center p-2 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 transition-colors rounded hover:bg-green-50 dark:hover:bg-green-900/20"
            title="Export log"
          >
            <FaDownload size={16} />
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            className="inline-flex items-center justify-center p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors rounded hover:bg-red-50 dark:hover:bg-red-900/20"
            title="Delete log"
          >
            <FaTrash size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="bg-white dark:bg-transparent border border-gray-300 dark:border-slate-600 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Data Records
        </h2>
      </div>

      {selectedIds.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center justify-between">
          <span className="text-sm text-gray-700 dark:text-gray-300">
            <span className="font-semibold text-fourth">
              {selectedIds.length}
            </span>{" "}
            log(s) selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <FaTrash size={14} />
              Delete Selected
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingDots size="lg" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-red-500 dark:text-red-400 mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Failed to Load Data
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchRawLogs}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : (
        <BaseDataTable
          columns={columns}
          data={rawLogs}
          searchPlaceholder="Search logs by ID, vehicle, or topic..."
          searchKeys={["id", "vehicle_id", "topic"]}
          pageSize={10}
          showPagination={true}
          emptyMessage="No data records available. Logs will appear here when vehicles send data."
        />
      )}
    </div>
  );
};

export default DataTable;
