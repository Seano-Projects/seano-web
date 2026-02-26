import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useEffect, useState } from "react";
import { FaChartLine, FaRuler } from "react-icons/fa";
import { API_ENDPOINTS } from "../../../config";

const SensorDataChart = ({ className = "", selectedVehicle }) => {
  const [chartData, setChartData] = useState([]);
  const [currentValues, setCurrentValues] = useState({
    waterTemp: "N/A",
    waterDepth: "N/A",
    windSpeed: "N/A",
    visibility: "N/A",
  });

  // Fetch sensor data from API
  useEffect(() => {
    if (!selectedVehicle?.id) return;

    const fetchSensorData = async () => {
      try {
        const token = localStorage.getItem("access_token");
        const response = await fetch(
          API_ENDPOINTS.SENSOR_LOGS.LIST +
            `?vehicle_id=${selectedVehicle.id}&limit=100`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();

          // Process data for chart
          const processed = data.map((log) => {
            let logData = {};

            // Parse sensor data
            try {
              if (typeof log.data === "string") {
                logData = JSON.parse(log.data);
              } else {
                logData = log.data;
              }
            } catch (e) {
              logData = {};
            }

            return {
              time: new Date(log.created_at).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              waterTemp: logData.water_temp || logData.waterTemp || "N/A",
              waterDepth: logData.water_depth || logData.waterDepth || "N/A",
              windSpeed: logData.wind_speed || logData.windSpeed || "N/A",
              visibility: logData.visibility || "N/A",
            };
          });

          setChartData(processed);

          // Set current values from latest data
          if (processed.length > 0) {
            const latest = processed[processed.length - 1];
            setCurrentValues({
              waterTemp: latest.waterTemp,
              waterDepth: latest.waterDepth,
              windSpeed: latest.windSpeed,
              visibility: latest.visibility,
            });
          }
        }
      } catch (err) {
      }
    };

    fetchSensorData();
  }, [selectedVehicle]);

  return (
    <div className={`h-full p-6 flex flex-col ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <FaChartLine className="text-green-600 text-xl" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Sensor Data Chart
          </h3>
        </div>
      </div>

      {/* Current Values Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="text-center p-5 bg-blue-50 dark:bg-blue-900/20 rounded-lg min-h-[100px] flex flex-col justify-center">
          <p className="text-sm text-blue-600 dark:text-blue-400 mb-2">
            Water Temp
          </p>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
            {currentValues.waterTemp}°C
          </p>
        </div>
        <div className="text-center p-5 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg min-h-[100px] flex flex-col justify-center">
          <p className="text-sm text-indigo-600 dark:text-indigo-400 mb-2">
            Depth
          </p>
          <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
            {currentValues.waterDepth}m
          </p>
        </div>
        <div className="text-center p-5 bg-green-50 dark:bg-green-900/20 rounded-lg min-h-[100px] flex flex-col justify-center">
          <p className="text-sm text-green-600 dark:text-green-400 mb-2">
            Wind Speed
          </p>
          <p className="text-2xl font-bold text-green-700 dark:text-green-300">
            {currentValues.windSpeed} m/s
          </p>
        </div>
        <div className="text-center p-5 bg-purple-50 dark:bg-purple-900/20 rounded-lg min-h-[100px] flex flex-col justify-center">
          <p className="text-sm text-purple-600 dark:text-purple-400 mb-2">
            Visibility
          </p>
          <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
            {currentValues.visibility} km
          </p>
        </div>
      </div>

      {/* Line Chart */}
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: -20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis
              dataKey="time"
              className="text-xs"
              stroke="currentColor"
              tick={{ fontSize: 12 }}
            />
            <YAxis
              className="text-xs"
              stroke="currentColor"
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                border: "none",
                borderRadius: "8px",
                color: "white",
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="waterTemp"
              stroke="#3b82f6"
              strokeWidth={2}
              name="Water Temp (°C)"
              dot={{ fill: "#3b82f6", strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="waterDepth"
              stroke="#6366f1"
              strokeWidth={2}
              name="Depth (m)"
              dot={{ fill: "#6366f1", strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="windSpeed"
              stroke="#10b981"
              strokeWidth={2}
              name="Wind Speed (m/s)"
              dot={{ fill: "#10b981", strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="visibility"
              stroke="#8b5cf6"
              strokeWidth={2}
              name="Visibility (km)"
              dot={{ fill: "#8b5cf6", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SensorDataChart;
