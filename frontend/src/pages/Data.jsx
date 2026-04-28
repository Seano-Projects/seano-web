import { useState, useEffect, useMemo } from "react";
import {
  FaDatabase,
  FaHdd,
  FaCalendarDay,
  FaShieldAlt,
  FaChartLine,
} from "react-icons/fa";
import useTitle from "../hooks/useTitle";
import useVehicleData from "../hooks/useVehicleData";
import {
  DataHeader,
  DataStats,
  DataTable,
  DataFilters,
  DataCharts,
} from "../components/Widgets/Data";
import { ErrorBoundary } from "../components/ErrorBoundary";
import useTranslation from "../hooks/useTranslation";
import axios from "../utils/axiosConfig";
import { API_ENDPOINTS } from "../config";

const FILTER_DEFAULTS = {
  vehicle: null,
  mission: null,
  startDate: "",
  endDate: "",
  dateRange: "all",
  dataScope: "all",
  sensorType: "all",
};

const getTimestamp = (row) =>
  row?.created_at || row?.timestamp || row?.reached_at || row?.usv_timestamp;

const toStorageLabel = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const getMissingRate = (records, selectedDataType) => {
  if (!records.length) return 0;

  const fieldsByType = {
    vehicle_logs: ["vehicle_id", "latitude", "longitude", "mode", "created_at"],
    sensor_logs: ["vehicle_id", "sensor_id", "data", "created_at"],
    battery_logs: [
      "vehicle_id",
      "battery_id",
      "percentage",
      "voltage",
      "current",
      "timestamp",
    ],
  };

  const requiredFields = fieldsByType[selectedDataType] || [];
  if (!requiredFields.length) return 0;

  let missing = 0;
  let total = 0;

  records.forEach((record) => {
    requiredFields.forEach((field) => {
      total += 1;
      const value = record?.[field];
      if (
        value === null ||
        value === undefined ||
        value === "" ||
        value === "N/A"
      ) {
        missing += 1;
      }
    });
  });

  return total ? (missing / total) * 100 : 0;
};

const getInsightValue = (records, selectedDataType, t) => {
  if (!records.length) return t("pages.data.widgets.empty");

  if (selectedDataType === "vehicle_logs") {
    const speeds = records
      .map((item) => Number(item?.speed))
      .filter((value) => Number.isFinite(value));
    if (!speeds.length) return t("pages.data.widgets.avgSpeedEmpty");
    const avg = speeds.reduce((sum, value) => sum + value, 0) / speeds.length;
    return t("pages.data.widgets.avgSpeed").replace(
      "{{value}}",
      avg.toFixed(2),
    );
  }

  if (selectedDataType === "sensor_logs") {
    const temperatures = records
      .map((item) => {
        try {
          const parsed = JSON.parse(item?.data || "{}");
          return Number(parsed?.temperature);
        } catch {
          return NaN;
        }
      })
      .filter((value) => Number.isFinite(value));

    if (!temperatures.length) return t("pages.data.widgets.avgTempEmpty");
    const avg =
      temperatures.reduce((sum, value) => sum + value, 0) / temperatures.length;
    return t("pages.data.widgets.avgTemp").replace("{{value}}", avg.toFixed(2));
  }

  const socValues = records
    .map((item) => Number(item?.percentage))
    .filter((value) => Number.isFinite(value));
  if (!socValues.length) return t("pages.data.widgets.avgSocEmpty");
  const avgSoc =
    socValues.reduce((sum, value) => sum + value, 0) / socValues.length;
  return t("pages.data.widgets.avgSoc").replace("{{value}}", avgSoc.toFixed(1));
};

const Data = () => {
  const { t } = useTranslation();
  useTitle(t("nav.data"));

  const [filters, setFilters] = useState(FILTER_DEFAULTS);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [selectedDataType, setSelectedDataType] = useState("vehicle_logs");
  const [chartData, setChartData] = useState([]);
  const [chartDataType, setChartDataType] = useState("vehicle_logs");
  const [missions, setMissions] = useState([]);

  const { vehicles, loading } = useVehicleData();

  useEffect(() => {
    let ignore = false;

    const loadMissions = async () => {
      try {
        const response = await axios.get(API_ENDPOINTS.MISSIONS.LIST);
        const missionRows = Array.isArray(response.data)
          ? response.data
          : response.data?.data || [];

        if (!ignore) {
          setMissions(
            missionRows.map((mission) => ({
              id: mission.id,
              name: mission.name || `Mission #${mission.id}`,
              status: mission.status || "unknown",
            })),
          );
        }
      } catch {
        if (!ignore) setMissions([]);
      }
    };

    loadMissions();
    return () => {
      ignore = true;
    };
  }, []);

  const handleDataLoaded = (data, type) => {
    setChartData(data);
    setChartDataType(type);
  };

  const handleFilterChange = (filterKey, value) => {
    setFilters((prev) => ({ ...prev, [filterKey]: value }));
  };

  const handleResetFilters = () => {
    setFilters(FILTER_DEFAULTS);
    setChartData([]);
  };

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    setLastRefresh(new Date());
    setTimeout(() => setIsRefreshing(false), 300);
  };

  const hasActiveFilters = useMemo(() => {
    return Object.entries(filters).some(([key, value]) => {
      if (key === "vehicle" || key === "mission") return Boolean(value?.id);
      return value && value !== "all";
    });
  }, [filters]);

  const recordsToday = useMemo(() => {
    const today = new Date();
    return chartData.filter((row) => {
      const ts = getTimestamp(row);
      if (!ts) return false;
      const dt = new Date(ts);
      return (
        dt.getFullYear() === today.getFullYear() &&
        dt.getMonth() === today.getMonth() &&
        dt.getDate() === today.getDate()
      );
    }).length;
  }, [chartData]);

  const missionCount = useMemo(() => {
    const missionIds = new Set(
      chartData
        .map((row) => row?.mission_id)
        .filter((missionId) => missionId !== null && missionId !== undefined),
    );
    return missionIds.size;
  }, [chartData]);

  const dataWidgetCards = useMemo(() => {
    const totalRecords = chartData.length;
    const storageBytes = new Blob([JSON.stringify(chartData)]).size;
    const missingRate = getMissingRate(chartData, chartDataType);
    const qualityScore = Math.max(0, 100 - missingRate);

    return [
      {
        title: t("pages.data.widgets.totalRawRecords"),
        value: totalRecords,
        icon: <FaDatabase className="text-blue-600" size={16} />,
        trendText: t("pages.data.widgets.loadedFromFilters"),
      },
      {
        title: t("pages.data.widgets.storageSize"),
        value: toStorageLabel(storageBytes),
        icon: <FaHdd className="text-cyan-600" size={16} />,
        trendText: t("pages.data.widgets.approxPayload"),
      },
      {
        title: t("pages.data.widgets.todayRecords"),
        value: recordsToday,
        icon: <FaCalendarDay className="text-green-600" size={16} />,
        trendText: t("pages.data.widgets.createdToday"),
      },
      {
        title: t("pages.data.widgets.dataQuality"),
        value: `${qualityScore.toFixed(1)}%`,
        icon: <FaShieldAlt className="text-orange-600" size={16} />,
        trendText: t("pages.data.widgets.missingFields").replace(
          "{{rate}}",
          missingRate.toFixed(1),
        ),
      },
      {
        title: t("pages.data.widgets.missionAnalytics"),
        value: missionCount,
        icon: <FaChartLine className="text-indigo-600" size={16} />,
        trendText: getInsightValue(chartData, chartDataType, t),
      },
    ];
  }, [chartData, chartDataType, missionCount, recordsToday, t]);

  try {
    return (
      <ErrorBoundary>
        <div className="space-y-6">
          <DataHeader
            onRefreshData={handleRefreshData}
            isRefreshing={isRefreshing}
            lastRefresh={lastRefresh}
            selectedDataType={selectedDataType}
            onDataTypeChange={setSelectedDataType}
          />

          <DataStats
            cards={dataWidgetCards}
            loading={loading}
            isRefreshing={isRefreshing}
          />

          <div className="px-4">
            <DataFilters
              vehicles={vehicles || []}
              missions={missions}
              filters={filters}
              selectedDataType={selectedDataType}
              onFilterChange={handleFilterChange}
              onResetFilters={handleResetFilters}
              hasActiveFilters={hasActiveFilters}
              totalRecords={chartData.length}
            />
          </div>

          <DataCharts data={chartData} selectedDataType={chartDataType} />

          <div className="px-4">
            <DataTable
              hasActiveFilters={hasActiveFilters}
              handleResetFilters={handleResetFilters}
              selectedDataType={selectedDataType}
              filters={filters}
              onDataLoaded={handleDataLoaded}
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
