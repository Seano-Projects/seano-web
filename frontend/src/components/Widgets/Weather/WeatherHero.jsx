import React from "react";
import { FaMapMarkerAlt } from "react-icons/fa";
import useTranslation from "../../../hooks/useTranslation";
import { OWM_ICON, DAY_SHORT, getWindSafety } from "./weatherUtils";
import { Card } from "./WeatherPrimitives";

const WeatherHero = ({ weather, weekDays, today }) => {
  const { t } = useTranslation();

  const temp        = weather ? Math.round(weather.main?.temp) : null;
  const description = weather?.weather?.[0]?.description ?? "";
  const iconCode    = weather?.weather?.[0]?.icon;
  const cityName    = weather?.name;
  const windSpeed   = weather?.wind?.speed;
  const windSafety  = getWindSafety(windSpeed, t);

  return (
    <Card className="px-6 py-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {iconCode && (
            <img src={OWM_ICON(iconCode)} alt={description} className="w-20 h-20 shrink-0" />
          )}
          <div>
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-3xl font-bold text-gray-900 dark:text-white capitalize">
                {description},
              </span>
              <span className="text-3xl font-bold text-gray-400 dark:text-gray-400">
                +{temp}°
              </span>
              <span className="text-2xl font-light text-gray-300 dark:text-gray-500">
                {t("weather.today")}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-1.5 flex-wrap">
              {cityName && (
                <span className="flex items-center gap-1 text-sm text-gray-400 dark:text-gray-500">
                  <FaMapMarkerAlt size={11} /> {cityName}
                </span>
              )}
              {windSafety && (
                <span className={`flex items-center gap-1.5 text-xs font-semibold ${windSafety.color}`}>
                  <span className={`inline-block w-2 h-2 rounded-full ${windSafety.dot}`} />
                  {t("weather.wind.usvStatus")}: {windSafety.label}
                  {windSpeed !== undefined && (
                    <span className="font-normal text-gray-400 dark:text-gray-500">
                      ({windSpeed.toFixed(1)} m/s)
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
          {weekDays.map((d, i) => {
            const isToday = d.toDateString() === today.toDateString();
            return (
              <div
                key={i}
                className={`flex flex-col items-center px-2.5 py-2 rounded-xl text-xs gap-1 ${
                  isToday ? "bg-blue-600 text-white" : "text-gray-400 dark:text-gray-500"
                }`}
              >
                <span className="uppercase">{DAY_SHORT[d.getDay()].charAt(0)}</span>
                <span className={`font-bold ${isToday ? "text-white" : "text-gray-700 dark:text-gray-300"}`}>
                  {d.getDate()}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};

export default WeatherHero;
