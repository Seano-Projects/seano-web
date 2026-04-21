import React from "react";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import useTranslation from "../../../hooks/useTranslation";
import { Card, SectionTitle } from "./WeatherPrimitives";

const WeatherCharts = ({ todayHourly, tempMin, tempMax }) => {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="px-5 py-4">
        <SectionTitle>{t("weather.chart.tempToday")}</SectionTitle>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={todayHourly} margin={{ top: 2, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.28} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#9ca3af" }} />
            <YAxis
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              domain={[
                Math.floor((tempMin ?? 20) - 2),
                Math.ceil((tempMax ?? 35) + 2),
              ]}
            />
            <Tooltip
              contentStyle={{ fontSize: 11, background: "white", border: "1px solid #e5e7eb", borderRadius: 8 }}
              formatter={(v) => [`${v}°C`, "Temp"]}
              labelFormatter={(l) => `${l}:00`}
            />
            <Area type="monotone" dataKey="temp" stroke="#3b82f6" strokeWidth={2} fill="url(#tempGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <Card className="px-5 py-4">
        <SectionTitle>{t("weather.chart.precipToday")}</SectionTitle>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={todayHourly} margin={{ top: 2, right: 8, left: -14, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#9ca3af" }} />
            <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} domain={[0, 100]} unit="%" />
            <Tooltip
              contentStyle={{ fontSize: 11, background: "white", border: "1px solid #e5e7eb", borderRadius: 8 }}
              formatter={(v) => [`${v}%`, "Pop"]}
              labelFormatter={(l) => `${l}:00`}
            />
            <Bar dataKey="pop" fill="#60a5fa" radius={[3, 3, 0, 0]} maxBarSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};

export default WeatherCharts;
