import { useMemo, useState, useEffect } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import {
  MapContainer,
  Polyline,
  TileLayer,
  CircleMarker,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import useMapTile from "../../../hooks/useMapTile";
import useTranslation from "../../../hooks/useTranslation";
import Dropdown from "../Dropdown";

const MAX_SENSOR_POINTS = 10;

// Auto-fit map to all route points
const FitBounds = ({ positions }) => {
  const map = useMap();
  useEffect(() => {
    if (positions && positions.length >= 2) {
      try {
        const bounds = L.latLngBounds(positions);
        map.fitBounds(bounds, { padding: [24, 24] });
      } catch {}
    }
  }, [map, positions]);
  return null;
};

const ChartCard = ({
  title,
  subtitle,
  headerRight,
  children,
  className = "",
  bodyClassName = "h-64",
}) => (
  <div
    className={`bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl pt-4 px-4 pb-2 ${className}`}
  >
    <div className="flex flex-wrap items-start gap-2 mb-3">
      <div className="mr-auto">
        <h3 className="text-base font-semibold text-black dark:text-white">
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {subtitle}
          </p>
        )}
      </div>
      {headerRight && <div className="min-w-[160px]">{headerRight}</div>}
    </div>
    <div className={bodyClassName}>{children}</div>
  </div>
);

const EmptyState = ({ message }) => (
  <div className="flex items-center justify-center h-full text-sm text-gray-500 dark:text-gray-400">
    {message}
  </div>
);

const VehicleLogsCharts = ({ data }) => {
  const { t } = useTranslation();
  const { url: tileUrl, attribution: tileAttribution } = useMapTile();

  const actualPath = useMemo(() => {
    return data
      .filter((row) => row.latitude != null && row.longitude != null)
      .map((row) => ({ lat: Number(row.latitude), lng: Number(row.longitude) }))
      .filter(
        (row) =>
          Number.isFinite(row.lat) &&
          Number.isFinite(row.lng) &&
          !(row.lat === 0 && row.lng === 0),
      );
  }, [data]);

  const positions = useMemo(
    () => actualPath.map((p) => [p.lat, p.lng]),
    [actualPath],
  );

  const center = useMemo(() => {
    if (!actualPath.length) return [-6.2, 106.8166667];
    const midIdx = Math.floor(actualPath.length / 2);
    return [actualPath[midIdx].lat, actualPath[midIdx].lng];
  }, [actualPath]);

  return (
    <div
      className="w-full bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
      style={{ height: "480px" }}
    >
      {actualPath.length < 2 ? (
        <div className="flex items-center justify-center h-full text-sm text-gray-500 dark:text-gray-400">
          {t("pages.data.charts.vehicleMapEmpty")}
        </div>
      ) : (
        <MapContainer
          center={center}
          zoom={13}
          scrollWheelZoom
          style={{ height: "100%", width: "100%" }}
          worldCopyJump={false}
          maxBounds={[
            [-85, -180],
            [85, 180],
          ]}
          maxBoundsViscosity={1}
          minZoom={3}
          maxZoom={20}
        >
          <TileLayer
            attribution={tileAttribution}
            url={tileUrl}
            noWrap={true}
            updateWhenIdle
            updateWhenZooming={false}
            keepBuffer={2}
            maxZoom={20}
            maxNativeZoom={18}
          />
          <FitBounds positions={positions} />
          <Polyline
            positions={positions}
            pathOptions={{ color: "#ef4444", weight: 3, opacity: 0.9 }}
          />
          <CircleMarker
            center={positions[0]}
            radius={7}
            pathOptions={{
              color: "#22c55e",
              fillColor: "#22c55e",
              fillOpacity: 1,
            }}
          />
          <CircleMarker
            center={positions[positions.length - 1]}
            radius={7}
            pathOptions={{
              color: "#ef4444",
              fillColor: "#ef4444",
              fillOpacity: 1,
            }}
          />
        </MapContainer>
      )}
    </div>
  );
};

// Sensor instrument type is signalled by a code prefix app-wide (see
// useCTDData.js / useADCPData.js), there's no dedicated "type" field.
const detectKindFromCode = (code) => {
  const upper = String(code || "").toUpperCase();
  if (upper.includes("ADCP")) return "adcp";
  if (upper.includes("CTD")) return "ctd";
  return null;
};

const detectKindFromPayload = (payload) => {
  if (Array.isArray(payload?.columns) && Array.isArray(payload?.data))
    return "ctd";
  if (
    payload?.current_speed_ms != null ||
    payload?.current_direction_deg != null ||
    payload?.v1_ms != null
  )
    return "adcp";
  if (
    payload?.temperature != null ||
    payload?.salinity != null ||
    payload?.depth != null ||
    payload?.conductivity != null
  )
    return "ctd";
  return null;
};

const SensorLogsCharts = ({ data, sensorCode }) => {
  const { t } = useTranslation();

  const sensorKind = useMemo(() => {
    const fromCode = detectKindFromCode(sensorCode);
    if (fromCode) return fromCode;
    for (const row of data) {
      try {
        const kind = detectKindFromPayload(JSON.parse(row?.data || "{}"));
        if (kind) return kind;
      } catch {
        // skip unparsable row
      }
    }
    return "ctd";
  }, [data, sensorCode]);

  const metricOptions = useMemo(() => {
    if (sensorKind === "adcp") {
      return [
        {
          key: "current_speed_ms",
          label: t("pages.data.charts.currentSpeed"),
          unit: "m/s",
          color: "#f97316",
        },
        {
          key: "current_direction_deg",
          label: t("pages.data.charts.currentDirection"),
          unit: "deg",
          color: "#0ea5e9",
        },
        {
          key: "temperature_c",
          label: t("pages.data.charts.temperature"),
          unit: "C",
          color: "#6366f1",
        },
        {
          key: "water_depth_m",
          label: t("pages.data.charts.waterDepth"),
          unit: "m",
          color: "#22c55e",
        },
      ];
    }
    return [
      {
        key: "temperature",
        label: t("pages.data.charts.temperature"),
        unit: "C",
        color: "#f97316",
      },
      {
        key: "salinity",
        label: t("pages.data.charts.salinity"),
        unit: "PSU",
        color: "#0ea5e9",
      },
      {
        key: "depth",
        label: t("pages.data.charts.depth"),
        unit: "m",
        color: "#6366f1",
      },
      {
        key: "conductivity",
        label: t("pages.data.charts.conductivity"),
        unit: "S/m",
        color: "#22c55e",
      },
    ];
  }, [sensorKind, t]);

  const [selectedMetric, setSelectedMetric] = useState(metricOptions[0].key);

  // Reset the selected metric whenever the sensor kind changes so a stale
  // key from the previous kind (e.g. "temperature" vs "temperature_c")
  // doesn't silently fall through to the default option.
  useEffect(() => {
    setSelectedMetric(metricOptions[0].key);
  }, [sensorKind]); // eslint-disable-line react-hooks/exhaustive-deps

  // Extract metric values from a payload, supporting the CTD flat format
  // ({temperature, salinity, ...}), the columnar format sent by the USV
  // ({columns: [...], data: [[...]]}) averaged per log row, and the flat
  // ADCP format ({current_speed_ms, current_direction_deg, ...}).
  const extractMetrics = (payload) => {
    if (sensorKind === "adcp") {
      return {
        current_speed_ms: Number(payload?.current_speed_ms),
        current_direction_deg: Number(payload?.current_direction_deg),
        temperature_c: Number(payload?.temperature_c ?? payload?.temperature),
        water_depth_m: Number(payload?.water_depth_m),
      };
    }

    if (
      Array.isArray(payload?.columns) &&
      Array.isArray(payload?.data) &&
      payload.data.length > 0
    ) {
      const colIdx = {};
      payload.columns.forEach((col, i) => {
        colIdx[col] = i;
      });
      const average = (name) => {
        const i = colIdx[name];
        if (i === undefined) return NaN;
        const values = payload.data
          .map((row) => Number(row?.[i]))
          .filter((v) => Number.isFinite(v));
        if (!values.length) return NaN;
        return values.reduce((sum, v) => sum + v, 0) / values.length;
      };
      return {
        temperature: average("temperature"),
        salinity: average("salinity"),
        depth: average("depth"),
        conductivity: average("conductivity"),
      };
    }

    return {
      temperature: Number(payload?.temperature),
      salinity: Number(payload?.salinity),
      depth: Number(payload?.depth),
      conductivity: Number(payload?.conductivity),
    };
  };

  const parsed = useMemo(() => {
    return data
      .map((row) => {
        try {
          const payload = JSON.parse(row?.data || "{}");
          const timestamp = row?.created_at || row?.timestamp;
          if (!timestamp) return null;
          const time = new Date(timestamp);
          if (Number.isNaN(time.getTime())) return null;

          return {
            time: `${String(time.getHours()).padStart(2, "0")}:${String(time.getMinutes()).padStart(2, "0")}:${String(time.getSeconds()).padStart(2, "0")}`,
            epoch: time.getTime(),
            ...extractMetrics(payload),
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .filter((row) =>
        metricOptions.some((option) => Number.isFinite(row[option.key])),
      )
      .sort((a, b) => a.epoch - b.epoch)
      .slice(-MAX_SENSOR_POINTS)
      .map(({ epoch: _epoch, ...rest }) => rest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, sensorKind]);

  const overviewMetrics = metricOptions.slice(0, 3);

  const selectedOption =
    metricOptions.find((option) => option.key === selectedMetric) ||
    metricOptions[0];

  const dropdownItems = metricOptions.map((option) => ({
    ...option,
    id: option.key,
  }));

  const selectedDropdownItem =
    dropdownItems.find((option) => option.key === selectedMetric) ||
    dropdownItems[0];

  const renderTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p
            key={`${entry.dataKey}-${index}`}
            className="text-sm font-medium"
            style={{ color: entry.color }}
          >
            {entry.name}:{" "}
            {(() => {
              const numeric = Number(entry.value);
              return Number.isFinite(numeric) ? numeric.toFixed(2) : "-";
            })()}
          </p>
        ))}
      </div>
    );
  };

  const sensorKindLabel = sensorKind === "adcp" ? "ADCP" : "CTD";

  return (
    <div className="space-y-4">
      <ChartCard
        title={t("pages.data.charts.allDataChart")}
        subtitle={t("pages.data.charts.sensorTrendsSubtitle").replace(
          "{{type}}",
          sensorKindLabel,
        )}
        bodyClassName="h-[420px]"
      >
        {!parsed.length ? (
          <EmptyState message={t("pages.data.charts.sensorEmpty")} />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={parsed}
              margin={{ top: 5, right: 10, bottom: 5, left: -12 }}
            >
              <defs>
                {overviewMetrics.map((option) => (
                  <linearGradient
                    key={option.key}
                    id={`sensor-grad-${option.key}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={option.color}
                      stopOpacity={0.25}
                    />
                    <stop offset="95%" stopColor={option.color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <XAxis
                dataKey="time"
                stroke="#6B7280"
                className="dark:stroke-gray-500"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#6B7280"
                className="dark:stroke-gray-500"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={renderTooltip} />
              {overviewMetrics.map((option) => (
                <Area
                  key={option.key}
                  type="monotone"
                  dataKey={option.key}
                  name={`${option.label} (${option.unit})`}
                  stroke={option.color}
                  fill={`url(#sensor-grad-${option.key})`}
                  dot={false}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard
        title={t("pages.data.charts.customSelectChart")}
        subtitle={t("pages.data.charts.customSelectSubtitle")}
        bodyClassName="h-[420px]"
        headerRight={
          <Dropdown
            items={dropdownItems}
            selectedItem={selectedDropdownItem}
            onItemChange={(item) => setSelectedMetric(item.key)}
            getItemKey={(item) => item.key}
            renderSelectedItem={(item) => (
              <span className="text-xs font-medium text-gray-900 dark:text-white">
                {item.label}
              </span>
            )}
            renderItem={(item) => (
              <span className="text-xs text-gray-700 dark:text-gray-300">
                {item.label}
              </span>
            )}
          />
        }
      >
        {!parsed.length ? (
          <EmptyState message={t("pages.data.charts.sensorEmpty")} />
        ) : (
          <div className="h-full flex flex-col">
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={parsed}
                  margin={{ top: 5, right: 10, bottom: 5, left: -12 }}
                >
                  <defs>
                    <linearGradient
                      id="sensor-selected"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={selectedOption.color}
                        stopOpacity={0.28}
                      />
                      <stop
                        offset="95%"
                        stopColor={selectedOption.color}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="time"
                    stroke="#6B7280"
                    className="dark:stroke-gray-500"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#6B7280"
                    className="dark:stroke-gray-500"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={renderTooltip} />
                  <Area
                    type="monotone"
                    dataKey={selectedOption.key}
                    name={selectedOption.label}
                    stroke={selectedOption.color}
                    fill="url(#sensor-selected)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </ChartCard>
    </div>
  );
};

const BatteryLogsCharts = ({ data }) => {
  const { t } = useTranslation();

  const chartRows = useMemo(() => {
    return data
      .filter((row) => row.created_at || row.timestamp)
      .map((row) => {
        const time = new Date(row.created_at || row.timestamp);
        return {
          time: `${String(time.getHours()).padStart(2, "0")}:${String(time.getMinutes()).padStart(2, "0")}`,
          soc: Number(row.percentage),
          voltage: Number(row.voltage),
          current: Number(row.current),
        };
      })
      .filter(
        (row) => Number.isFinite(row.soc) || Number.isFinite(row.voltage),
      );
  }, [data]);

  return (
    <ChartCard
      title={t("pages.data.charts.batteryUsageChart")}
      subtitle={t("pages.data.charts.batteryUsageSubtitle")}
      bodyClassName="h-[420px]"
    >
      {!chartRows.length ? (
        <EmptyState message={t("pages.data.charts.batteryEmpty")} />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartRows}
            margin={{ top: 5, right: 10, bottom: 5, left: -12 }}
          >
            <defs>
              <linearGradient id="bat-soc" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.28} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="bat-volt" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.22} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="bat-curr" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="time" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="soc"
              stroke="#3b82f6"
              fill="url(#bat-soc)"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="voltage"
              stroke="#f59e0b"
              fill="url(#bat-volt)"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="current"
              stroke="#22d3ee"
              fill="url(#bat-curr)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
};

const DataCharts = ({ data, selectedDataType, selectedSensorCode }) => {
  const { t } = useTranslation();

  // waypoint_logs, command_logs, and thruster_logs don't have charts
  if (
    selectedDataType === "waypoint_logs" ||
    selectedDataType === "command_logs" ||
    selectedDataType === "thruster_logs"
  ) {
    return null;
  }

  if (!data || data.length === 0) {
    return (
      <div className="px-4">
        <div className="bg-white dark:bg-transparent border border-gray-200 dark:border-slate-600 rounded-xl p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("pages.data.charts.empty")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4">
      {selectedDataType === "vehicle_logs" && <VehicleLogsCharts data={data} />}
      {selectedDataType === "sensor_logs" && (
        <SensorLogsCharts data={data} sensorCode={selectedSensorCode} />
      )}
      {selectedDataType === "battery_logs" && <BatteryLogsCharts data={data} />}
    </div>
  );
};

export default DataCharts;
