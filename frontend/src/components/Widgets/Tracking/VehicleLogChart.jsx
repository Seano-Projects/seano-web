import React, { useEffect, useState } from "react";
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
import {
  FaBatteryFull,
  FaBolt,
  FaTachometerAlt,
  FaCompass,
  FaChartLine,
  FaThermometerHalf,
} from "react-icons/fa";
import { API_ENDPOINTS } from "../../../config";

const VehicleLogChart = ({ className = "", selectedVehicle }) => {
  const [chartData, setChartData] = useState([]);

  // Fetch vehicle log data from API
  useEffect(() => {
    if (!selectedVehicle?.id) return;

    const fetchVehicleLogData = async () => {
      try {
        const token = localStorage.getItem("access_token");
        const response = await fetch(
          API_ENDPOINTS.VEHICLE_LOGS.LIST +
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

            // Parse vehicle data
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
              battery: logData.battery_level || logData.battery || "N/A",
              voltage: logData.battery_voltage || logData.voltage || "N/A",
              speed: logData.speed || "N/A",
              heading: logData.heading || "N/A",
              temperature: logData.temperature || "N/A",
            };
          });

          setChartData(processed);
        }
      } catch (err) {
      }
    };

    fetchVehicleLogData();
  }, [selectedVehicle]);

  // Current values for display cards
  const currentValues = {
    battery: {
      value: "N/A",
      unit: "%",
      icon: FaBatteryFull,
      color: "#22c55e",
      label: "Battery Level",
    },
    speed: {
      value: "N/A",
      unit: "m/s",
      icon: FaTachometerAlt,
      color: "#8b5cf6",
      label: "Vehicle Speed",
    },
    heading: {
      value: "N/A",
      unit: "°",
      icon: FaCompass,
      color: "#6366f1",
      label: "Heading",
    },
    temperature: {
      value: "N/A",
      unit: "°C",
      icon: FaThermometerHalf,
      color: "#f59e0b",
      label: "System Temperature",
    },
  };

  return (
    <div className={`h-full p-6 flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <FaChartLine className="text-gray-600 dark:text-gray-400 text-xl" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Vehicle Log Chart
        </h3>
      </div>

      {/* Current Values Grid */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="text-center p-5 bg-green-50 dark:bg-green-900/20 rounded-lg min-h-[100px] flex flex-col justify-center">
          <p className="text-sm text-green-600 dark:text-green-400 mb-2">
            Battery Level
          </p>
          <p className="text-2xl font-bold text-green-700 dark:text-green-300">
            {currentValues.battery.value}%
          </p>
        </div>
        <div className="text-center p-5 bg-purple-50 dark:bg-purple-900/20 rounded-lg min-h-[100px] flex flex-col justify-center">
          <p className="text-sm text-purple-600 dark:text-purple-400 mb-2">
            Vehicle Speed
          </p>
          <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
            {currentValues.speed.value}m/s
          </p>
        </div>
        <div className="text-center p-5 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg min-h-[100px] flex flex-col justify-center">
          <p className="text-sm text-indigo-600 dark:text-indigo-400 mb-2">
            Heading
          </p>
          <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
            {currentValues.heading.value}°
          </p>
        </div>
        <div className="text-center p-5 bg-orange-50 dark:bg-orange-900/20 rounded-lg min-h-[100px] flex flex-col justify-center">
          <p className="text-sm text-orange-600 dark:text-orange-400 mb-2">
            System
          </p>
          <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
            {currentValues.temperature.value}°C
          </p>
        </div>
      </div>

      {/* Multi-Line Chart */}
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: -20, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#374151"
              opacity={0.3}
            />
            <XAxis dataKey="time" stroke="#6b7280" fontSize={12} />
            <YAxis stroke="#6b7280" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "none",
                borderRadius: "6px",
                color: "#f9fafb",
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="battery"
              stroke="#22c55e"
              strokeWidth={2}
              name="Battery (%)"
            />
            <Line
              type="monotone"
              dataKey="voltage"
              stroke="#3b82f6"
              strokeWidth={2}
              name="Voltage (V)"
            />
            <Line
              type="monotone"
              dataKey="speed"
              stroke="#8b5cf6"
              strokeWidth={2}
              name="Speed (m/s)"
            />
            <Line
              type="monotone"
              dataKey="heading"
              stroke="#6366f1"
              strokeWidth={2}
              name="Heading (°)"
            />
            <Line
              type="monotone"
              dataKey="temperature"
              stroke="#f59e0b"
              strokeWidth={2}
              name="Temperature (°C)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default VehicleLogChart;
