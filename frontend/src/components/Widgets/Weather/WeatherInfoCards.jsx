import React from "react";
import useTranslation from "../../../hooks/useTranslation";
import { OWM_ICON } from "./weatherUtils";
import { Card, SectionTitle, ForecastRow, CompareRow } from "./WeatherPrimitives";

export const ForecastCard = ({ dailyForecast, forecastAllMin, forecastAllMax }) => {
  const { t } = useTranslation();
  return (
    <Card className="px-5 py-4">
      <SectionTitle>{t("weather.forecast.title")}</SectionTitle>
      {dailyForecast.length > 0 ? (
        <div className="space-y-0.5">
          {dailyForecast.map((d, i) => (
            <ForecastRow key={i} {...d} allMin={forecastAllMin} allMax={forecastAllMax} />
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400 dark:text-gray-600">{t("weather.forecast.noData")}</p>
      )}
    </Card>
  );
};

export const PrecipCard = ({ forecast, next24hRain, next24hPop, nextWeekRain, humidity }) => {
  const { t } = useTranslation();
  return (
    <Card className="px-5 py-4">
      <SectionTitle>{t("weather.precip.title")}</SectionTitle>
      <div className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">{t("weather.precip.next24h")}</p>
          <div className="flex items-end justify-between">
            <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
              {forecast?.list?.[0]?.weather?.[0]?.icon && (
                <img src={OWM_ICON(forecast.list[0].weather[0].icon, "")} alt="" className="w-5 h-5" />
              )}
              <span className="capitalize text-xs">{forecast?.list?.[0]?.weather?.[0]?.description || "--"}</span>
            </div>
            <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {next24hRain.toFixed(1)}<span className="text-xs font-normal ml-1">mm</span>
            </span>
          </div>
          <div className="mt-2 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-blue-400 rounded-full" style={{ width: `${Math.min(next24hPop * 100, 100)}%` }} />
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{Math.round(next24hPop * 100)}% {t("weather.precip.chance")}</p>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
          <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">{t("weather.precip.nextWeek")}</p>
          <div className="flex items-end justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">{t("weather.precip.total")}</span>
            <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {nextWeekRain.toFixed(1)}<span className="text-xs font-normal ml-1">mm</span>
            </span>
          </div>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
          <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">{t("weather.atmosphere.humidity")}</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-400 rounded-full" style={{ width: `${humidity || 0}%` }} />
            </div>
            <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{humidity ?? "--"}%</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export const CompareCard = ({
  tempMin, tempMax, tomorrowEntry, compareAllMin, compareAllMax,
  pressure, windSpeed, windGust, feelsLike,
}) => {
  const { t } = useTranslation();
  return (
    <Card className="px-5 py-4">
      <SectionTitle>{t("weather.compare.title")}</SectionTitle>
      {tempMin !== null && tempMax !== null && (
        <div className="space-y-0.5">
          <CompareRow label={t("weather.today")} min={tempMin} max={tempMax} allMin={compareAllMin} allMax={compareAllMax} bold />
          {tomorrowEntry && (
            <CompareRow label={t("weather.forecast.tomorrow")} min={tomorrowEntry.min} max={tomorrowEntry.max} allMin={compareAllMin} allMax={compareAllMax} bold={false} />
          )}
        </div>
      )}
      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500 dark:text-gray-400">{t("weather.atmosphere.pressure")}</span>
          <span className="font-semibold text-gray-800 dark:text-gray-200">{pressure ?? "--"} hPa</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500 dark:text-gray-400">{t("weather.wind.title")}</span>
          <span className="font-semibold text-gray-800 dark:text-gray-200">
            {windSpeed !== undefined ? `${windSpeed.toFixed(1)} m/s` : "--"}
            {windGust !== undefined && <span className="text-gray-400 font-normal"> (gusts {windGust.toFixed(1)})</span>}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500 dark:text-gray-400">{t("weather.temperature.feelsLike")}</span>
          <span className="font-semibold text-gray-800 dark:text-gray-200">{feelsLike !== null ? `${feelsLike}°C` : "--"}</span>
        </div>
      </div>
    </Card>
  );
};
