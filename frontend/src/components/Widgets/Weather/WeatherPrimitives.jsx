import React from "react";
import { OWM_ICON } from "./weatherUtils";

export const Card = ({ children, className = "", style }) => (
  <div className={`bg-white dark:bg-black border border-gray-100 dark:border-gray-800 rounded-2xl ${className}`} style={style}>
    {children}
  </div>
);

export const SectionTitle = ({ children }) => (
  <p className="text-sm font-semibold text-blue-500 dark:text-blue-400 mb-3">{children}</p>
);

export const ForecastRow = ({ dayLabel, min, max, iconCode, allMin, allMax }) => {
  const range = allMax - allMin || 1;
  const barLeft = ((min - allMin) / range) * 100;
  const barWidth = ((max - min) / range) * 100;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="w-8 text-xs text-gray-500 dark:text-gray-400 shrink-0">{dayLabel}</span>
      <img src={OWM_ICON(iconCode, "")} alt="" className="w-6 h-6 shrink-0" />
      <span className="w-8 text-xs text-right text-gray-400 dark:text-gray-500 shrink-0">{min}°</span>
      <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative">``
        <div
          className="absolute h-full bg-blue-700 dark:bg-blue-500 rounded-full"
          style={{ left: `${barLeft}%`, width: `${barWidth}%` }}
        />
      </div>
      <span className="w-8 text-xs text-gray-800 dark:text-gray-200 font-semibold shrink-0">{max}°</span>
    </div>
  );
};

export const CompareRow = ({ label, min, max, allMin, allMax, bold }) => {
  const range = allMax - allMin || 1;
  const barLeft = ((min - allMin) / range) * 100;
  const barWidth = ((max - min) / range) * 100;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className={`w-20 text-xs shrink-0 ${bold ? "font-semibold text-gray-800 dark:text-gray-100" : "text-gray-500 dark:text-gray-400"}`}>
        {label}
      </span>
      <span className="w-6 text-xs text-gray-400 text-right shrink-0">{min}°</span>
      <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative">
        <div
          className={`absolute h-full rounded-full ${bold ? "bg-blue-700 dark:bg-blue-500" : "bg-blue-300 dark:bg-blue-800"}`}
          style={{ left: `${barLeft}%`, width: `${barWidth}%` }}
        />
      </div>
      <span className="w-6 text-xs font-semibold text-gray-800 dark:text-gray-200 shrink-0">{max}°</span>
    </div>
  );
};
