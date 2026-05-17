import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const SensorChart = ({ vehicles, selectedVehicle, sensorData }) => {
  const selectedVehicleName = vehicles.find(
    (v) => v.id == selectedVehicle
  )?.name;

  return (
    <div className="bg-white dark:bg-black dark:border-1 dark:border-gray-700 rounded-3xl shadow py-4 px-8 h-96 col-span-3">
      <h3 className="text-lg text-black font-bold mb-4 dark:text-white">
        Sensor Data{" "}
        {selectedVehicle && selectedVehicleName && `- ${selectedVehicleName}`}
      </h3>

      {selectedVehicle ? (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={sensorData}>
            <XAxis
              dataKey="created_at"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) =>
                new Date(value).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              }
            />
            <YAxis width={40} label={{ angle: -90, position: "insideLeft" }} />
            <Tooltip
              formatter={(value, name) => [
                name.includes("Temperature") ? `${value} °C` : `${value} %`,
                name,
              ]}
              labelFormatter={(value) => new Date(value).toLocaleString()}
            />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{
                marginTop: "-10px",
                fontSize: "12px",
              }}
            />
            <Line
              type="monotone"
              dataKey="temperature"
              stroke="#ef4444"
              name="Temperature (°C)"
            />
            <Line
              type="monotone"
              dataKey="humidity"
              stroke="#3b82f6"
              name="Humidity (%)"
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-gray-500 dark:text-gray-400">
          Please select a vehicle to see sensor data
        </p>
      )}
    </div>
  );
};

export default SensorChart;
