import { useMemo } from "react";
import {
  ComposedChart, Area, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";

const MAX_POINTS = 80;

const fmt = (ts) => {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg text-xs">
      <p className="text-gray-500 dark:text-gray-400 mb-2">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="font-medium" style={{ color: p.color }}>
          {p.name}: {p.value != null ? Number(p.value).toFixed(3) : "—"} {p.dataKey === "speed" ? "m/s" : "°"}
        </p>
      ))}
    </div>
  );
};

const SpeedDirectionChart = ({ adcpData }) => {
  const series = useMemo(() => {
    if (!adcpData?.length) return [];
    return [...adcpData]
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .slice(-MAX_POINTS)
      .map((d) => ({
        time: fmt(d.timestamp),
        speed: d.current_speed_ms,
        direction: d.current_direction_deg,
      }));
  }, [adcpData]);

  return (
    <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl p-6">
      <h3 className="text-xl font-semibold text-black dark:text-white">Kecepatan & Arah Arus</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">
        Tren kecepatan (m/s) dan arah (°) terhadap waktu
      </p>

      <div className="h-64">
        {series.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-gray-400">Tidak ada data</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={series} margin={{ top: 4, right: 40, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis dataKey="time" stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis
                yAxisId="speed"
                orientation="left"
                stroke="#6B7280"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                domain={[0, "auto"]}
                label={{ value: "m/s", angle: -90, position: "insideLeft", fill: "#9CA3AF", fontSize: 10 }}
              />
              <YAxis
                yAxisId="dir"
                orientation="right"
                stroke="#6B7280"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                domain={[0, 360]}
                tickCount={5}
                label={{ value: "°", position: "insideRight", fill: "#9CA3AF", fontSize: 10 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <defs>
                <linearGradient id="speedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                yAxisId="speed"
                type="monotone"
                dataKey="speed"
                name="Speed"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#speedGrad)"
                dot={false}
              />
              <Line
                yAxisId="dir"
                type="monotone"
                dataKey="direction"
                name="Direction"
                stroke="#f97316"
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="4 2"
              />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                formatter={(v) => <span className="text-gray-600 dark:text-gray-400">{v}</span>}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default SpeedDirectionChart;
