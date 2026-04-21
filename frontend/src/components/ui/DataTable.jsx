import { useState, useMemo, useRef, useEffect } from "react";
import {
  FaSearch,
  FaChevronLeft,
  FaChevronRight,
  FaChevronDown,
  FaSortUp,
  FaSortDown,
  FaSort,
} from "react-icons/fa";
import useTranslation from "../../hooks/useTranslation";

const DataTable = ({
  columns,
  data,
  searchPlaceholder,
  searchKeys = [],
  pageSize: initialPageSize = 10,
  showPagination = true,
  emptyMessage,
  loading = false,
  skeletonRows = 5,
  SkeletonComponent = null,
}) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [isPageSizeOpen, setIsPageSizeOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsPageSizeOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Filter data based on search query
  const filteredData = useMemo(() => {
    if (!searchQuery || searchKeys.length === 0) return data;

    const query = searchQuery.toLowerCase();
    return data.filter((item) => {
      return searchKeys.some((key) => {
        const value = item[key];
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(query);
      });
    });
  }, [data, searchQuery, searchKeys]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;

    const sorted = [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      // Handle null/undefined values
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      // Compare values
      if (aValue < bValue) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });

    return sorted;
  }, [filteredData, sortConfig]);

  // Handle sorting
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // Get sort icon
  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return <FaSort className="text-gray-400" />;
    }
    return sortConfig.direction === "asc" ? (
      <FaSortUp className="text-fourth" />
    ) : (
      <FaSortDown className="text-fourth" />
    );
  };

  // Pagination
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  // Reset to first page when search changes
  const handleSearch = (value) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  // Pagination handlers
  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  return (
    <div className="w-full space-y-4">
      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 min-w-50 max-w-md">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder={searchPlaceholder || `${t("common.search")}...`}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-transparent border border-gray-300 dark:border-slate-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent transition-colors duration-200"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {t("common.show")}
          </span>

          {/* Custom Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsPageSizeOpen(!isPageSizeOpen)}
              className="min-w-20 px-4 py-3 bg-white dark:bg-transparent border border-gray-300 dark:border-slate-600 rounded-xl text-sm text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-slate-700 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent transition-colors duration-200 cursor-pointer flex items-center justify-between gap-2"
            >
              <span>{pageSize}</span>
              <FaChevronDown
                className={`text-gray-500 dark:text-gray-400 transition-transform duration-200 ${
                  isPageSizeOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {isPageSizeOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg shadow-lg z-50">
                {[5, 10, 25, 50].map((size) => (
                  <button
                    key={size}
                    onClick={() => {
                      handlePageSizeChange(size);
                      setIsPageSizeOpen(false);
                    }}
                    className={`w-full px-4 py-3 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors duration-200 ${
                      pageSize === size
                        ? "bg-blue-100 dark:bg-blue-600 text-gray-900 dark:text-white"
                        : "text-gray-900 dark:text-white"
                    } ${size === 5 ? "rounded-t-lg" : ""} ${
                      size === 50 ? "rounded-b-lg" : ""
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            )}
          </div>

          <span className="text-sm text-gray-600 dark:text-gray-400">
            {t("common.entries")}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 custom-scrollbar">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-transparent">
            <tr>
              {columns.map((column, index) => {
                const headerKey = column.accessorKey || column.header || index
                return (
                  <th
                    key={headerKey}
                  className={`px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider align-middle ${
                    column.className || ""
                  } ${
                    column.sortable !== false
                      ? "cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      : ""
                  }`}
                  onClick={() => {
                    if (column.sortable !== false && column.accessorKey) {
                      handleSort(column.accessorKey);
                    }
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span>{column.header}</span>
                    {column.sortable !== false && column.accessorKey && (
                      <span className="text-sm">
                        {getSortIcon(column.accessorKey)}
                      </span>
                    )}
                  </div>
                </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-transparent divide-y divide-gray-200 dark:divide-gray-700">
            {loading && SkeletonComponent ? (
              <SkeletonComponent rows={skeletonRows} columns={columns} />
            ) : paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  {emptyMessage || t("common.noDataAvailable")}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIndex) => {
                const rowKey =
                  row?._client_id ||
                  row?.id ||
                  row?.created_at ||
                  row?.initiated_at ||
                  row?.timestamp ||
                  (row
                    ? `${
                        row.vehicle_id ||
                        row.vehicle_code ||
                        row.sensor_id ||
                        row.sensor_code ||
                        "row"
                      }-${
                        row.message ||
                        row.logs ||
                        row.data ||
                        row.status ||
                        ""
                      }`
                    : rowIndex)

                return (
                  <tr
                    key={rowKey}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  >
                    {columns.map((column, colIndex) => {
                      const columnKey = column.accessorKey || column.header || colIndex
                      return (
                        <td
                          key={columnKey}
                          className={`px-6 py-4 text-gray-900 dark:text-gray-100 ${
                            column.cellClassName || ""
                          }`}
                          style={{ verticalAlign: "middle" }}
                        >
                          {column.cell
                            ? column.cell(row)
                            : row[column.accessorKey]}
                        </td>
                      )
                    })}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {showPagination && filteredData.length > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {t("common.showing")}{" "}
            {Math.min((currentPage - 1) * pageSize + 1, filteredData.length)} to{" "}
            {Math.min(currentPage * pageSize, filteredData.length)}{" "}
            {t("common.of")} {filteredData.length} {t("common.results")}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FaChevronLeft />
            </button>

            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => goToPage(pageNum)}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      currentPage === pageNum
                        ? "bg-blue-600 text-white"
                        : "bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FaChevronRight />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
