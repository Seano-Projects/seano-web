import { useState, useEffect, useRef } from "react";
import useTitle from "../hooks/useTitle";
import useVehicleData from "../hooks/useVehicleData";
import useRawLogData from "../hooks/useRawLogData";
import useLoadingTimeout from "../hooks/useLoadingTimeout";
import { getDataManagementCards } from "../constant";
import {
  DataHeader,
  DataStats,
  DataTable,
  DataFilters,
} from "../components/Widgets/Data";
import { ErrorBoundary } from "../components/ErrorBoundary";
import useTranslation from "../hooks/useTranslation";

const Data = () => {
  const { t } = useTranslation();
  useTitle(t("nav.data"));

  // State for filters
  const [filters, setFilters] = useState({
    vehicle: "",
    mission: "",
    startDate: "",
    endDate: "",
    dateRange: "all",
    source: "all",
    status: "all",
    search: "",
  });

  // State for refresh functionality
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // State for selected data type
  const [selectedDataType, setSelectedDataType] = useState("raw_logs");
  const hasInitializedVehicleFilter = useRef(false);

  // Get vehicle data
  const { vehicles, loading } = useVehicleData();

  useEffect(() => {
    if (loading) return;

    if (!vehicles || vehicles.length === 0) {
      setFilters((prev) => (prev.vehicle ? { ...prev, vehicle: "" } : prev));
      hasInitializedVehicleFilter.current = false;
      return;
    }

    if (!hasInitializedVehicleFilter.current && !filters.vehicle) {
      setFilters((prev) => ({ ...prev, vehicle: vehicles[0] }));
      hasInitializedVehicleFilter.current = true;
      return;
    }

    if (
      filters.vehicle?.id &&
      !vehicles.some((vehicle) => vehicle.id === filters.vehicle.id)
    ) {
      setFilters((prev) => ({ ...prev, vehicle: vehicles[0] }));
    }
  }, [loading, vehicles, filters.vehicle]);

  // Get raw logs data
  const {
    rawLogsStats,
    loading: rawLogsLoading,
    error: rawLogsError,
    refreshStats,
  } = useRawLogData();

  // Use loading timeout to prevent infinite skeleton loading
  const { loading: timeoutLoading } = useLoadingTimeout(
    loading || rawLogsLoading,
    5000,
  );

  // Show skeleton only if still loading and within timeout
  const shouldShowSkeleton = timeoutLoading && (loading || rawLogsLoading);

  // TODO: Fetch mission data from API
  const missions = [];

  // Handler functions
  const handleFilterChange = (filterKey, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterKey]: value,
    }));
  };

  const handleResetFilters = () => {
    setFilters({
      vehicle: "",
      mission: "",
      startDate: "",
      endDate: "",
      dateRange: "all",
      source: "all",
      status: "all",
      search: "",
    });
  };

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      // Refresh raw logs stats
      await refreshStats();
      await new Promise((resolve) => setTimeout(resolve, 500));
      setLastRefresh(new Date());
    } catch (error) {
    } finally {
      setIsRefreshing(false);
    }
  };

  // Check if any filter is active
  const hasActiveFilters = Object.values(filters).some(
    (value) => value && value !== "all" && value !== "",
  );

  // Get data management cards with real raw logs data
  const dataWidgetCards = getDataManagementCards(rawLogsStats);

  // Safe render to prevent crashes
  try {
    return (
      <ErrorBoundary>
        <div className="space-y-6">
          {/* Header Section with Title and Action Buttons */}
          <DataHeader
            onRefreshData={handleRefreshData}
            isRefreshing={isRefreshing}
            lastRefresh={lastRefresh}
            selectedDataType={selectedDataType}
            onDataTypeChange={setSelectedDataType}
          />

          {/* Data Statistics Cards */}
          <DataStats
            cards={dataWidgetCards || []}
            loading={shouldShowSkeleton}
            isRefreshing={isRefreshing}
          />

          {/* Advanced Filters Section */}
          <div className="px-4">
            <DataFilters
              vehicles={vehicles || []}
              missions={missions || []}
              filters={filters}
              onFilterChange={handleFilterChange}
              onResetFilters={handleResetFilters}
              hasActiveFilters={hasActiveFilters}
              totalRecords={0}
            />
          </div>

          {/* Data Table/Records Section */}
          <div className="px-4">
            <DataTable
              hasActiveFilters={hasActiveFilters}
              handleResetFilters={handleResetFilters}
              selectedDataType={selectedDataType}
            />
          </div>
        </div>
      </ErrorBoundary>
    );
  } catch (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">
            {t("pages.data.errorLoadingPage")}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {error.message || t("pages.data.unexpectedError")}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {t("pages.data.reloadPage")}
          </button>
        </div>
      </div>
    );
  }
};

export default Data;
