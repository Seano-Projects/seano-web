import { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend, ReferenceLine,
} from "recharts";

const MAX_POINTS = 80;

const BEAMS = [
  { key: "v1", label: "Beam 1", color: "#3b82f6" },
  { key: "v2", label: "Beam 2", color: "#22c55e" },
  { key: "v3", label: "Beam 3", color: "#f97316" },
  { key: "v4", label: "Beam 4", color: "#a855f7" },
];

const fmt = (ts) => {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg text-xs min-w-40">
      <p className="text-gray-500 dark:text-gray-400 mb-2">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="font-medium" style={{ color: p.color }}>
          {p.name}: {p.value != null ? Number(p.value).toFixed(4) : "—"} m/s
        </p>
      ))}
    </div>
  );
};

const BeamVelocityChart = ({ adcpData }) => {
  const series = useMemo(() => {
    if (!adcpData?.length) return [];
    return [...adcpData]
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .slice(-MAX_POINTS)
      .map((d) => ({
        time: fmt(d.timestamp),
        v1: d.v1_ms,
        v2: d.v2_ms,
        v3: d.v3_ms,
        v4: d.v4_ms,
      }));
  }, [adcpData]);

  return (
    <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl p-6">
      <h3 className="text-xl font-semibold text-black dark:text-white">Beam Velocity History</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">
        Kecepatan 4 beam akustik terhadap waktu (m/s)
      </p>

      <div className="h-64">
        {series.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-gray-400">Tidak ada data</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis dataKey="time" stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis
                stroke="#6B7280"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                domain={["auto", "auto"]}
                label={{ value: "m/s", angle: -90, position: "insideLeft", fill: "#9CA3AF", fontSize: 10 }}
              />
              <ReferenceLine y={0} stroke="#6B7280" strokeDasharray="2 2" opacity={0.5} />
              <Tooltip content={<CustomTooltip />} />
              {BEAMS.map(({ key, label, color }) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={label}
                  stroke={color}
                  strokeWidth={1.5}
                  dot={false}
                  connectNulls={false}
                />
              ))}
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                formatter={(v) => <span className="text-gray-600 dark:text-gray-400">{v}</span>}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default BeamVelocityChart;
