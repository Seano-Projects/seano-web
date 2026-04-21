import React, { useState, useEffect, useMemo, useCallback } from "react";
import useTitle from "../hooks/useTitle";
import useVehicleData from "../hooks/useVehicleData";
import { useLogData, useVehicleConnectionStatus } from "../hooks";
import { useWeatherData } from "../hooks/useWeatherData";
import useTranslation from "../hooks/useTranslation";
import { FaExclamationCircle, FaExclamationTriangle, FaTimesCircle } from "react-icons/fa";
import { TbSunWind } from "react-icons/tb";
import {
  WeatherControls,
  WeatherHero,
  WeatherMap,
  ForecastCard,
  PrecipCard,
  CompareCard,
  WeatherCharts,
} from "../components/Widgets/Weather";
import {
  OWM_API_KEY,
  INDONESIA_CITIES,
  buildDailyForecast,
  buildTodayHourly,
} from "../components/Widgets/Weather/weatherUtils";
// ─── Main Page ────────────────────────────────────────────────────────────────
const Weather = () => {
  const { t } = useTranslation();

  const { vehicles, selectedVehicleId, setSelectedVehicleId, loading: vehicleLoading } = useVehicleData();
  const { vehicleLogs } = useLogData();
  const { getVehicleStatus } = useVehicleConnectionStatus();

  const [browserCoords, setBrowserCoords] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastRefreshTime, setLastRefreshTime] = useState(null);
  const [citiesWeather, setCitiesWeather] = useState([]);
  const [mapLoading, setMapLoading] = useState(false);

  const selectedVehicle = useMemo(() => {
    if (!selectedVehicleId || !vehicles?.length) return vehicles?.[0] || null;
    return vehicles.find((v) => v.id === parseInt(selectedVehicleId)) || vehicles[0] || null;
  }, [selectedVehicleId, vehicles]);

  const vehicleLog = useMemo(() => {
    if (!selectedVehicle?.id || !vehicleLogs.length) return null;
    const filtered = vehicleLogs.filter((log) => (log.vehicle?.id || log.vehicle_id) == selectedVehicle.id);
    return filtered[0] || null;
  }, [vehicleLogs, selectedVehicle]);

  const usvStatus = useMemo(() => {
    if (!selectedVehicle?.code) return "offline";
    return getVehicleStatus(selectedVehicle.code) || "offline";
  }, [selectedVehicle, getVehicleStatus]);

  const hasUsvCoords = usvStatus === "online" && vehicleLog?.latitude && vehicleLog?.longitude;

  const activeCoords = useMemo(() => {
    if (hasUsvCoords) return { lat: vehicleLog.latitude, lon: vehicleLog.longitude };
    return browserCoords;
  }, [hasUsvCoords, vehicleLog, browserCoords]);

  const coordsSource = hasUsvCoords ? "usv" : browserCoords ? "browser" : null;

  useEffect(() => {
    if (hasUsvCoords) return;
    if (!navigator.geolocation) { setGeoError("unsupported"); return; }
    setGeoLoading(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setBrowserCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }); setGeoLoading(false); },
      (err) => { setGeoError(err.message); setGeoLoading(false); },
      { timeout: 10000 }
    );
  }, [hasUsvCoords]);

  const { weather, forecast, loading: weatherLoading, error: weatherError, hasApiKey } = useWeatherData({
    lat: activeCoords?.lat ?? null,
    lon: activeCoords?.lon ?? null,
    refreshKey,
  });

  useEffect(() => { if (weather) setLastRefreshTime(new Date()); }, [weather]);
  useEffect(() => {
    const id = setInterval(() => setRefreshKey((k) => k + 1), 10 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!OWM_API_KEY) return;
    setMapLoading(true);
    Promise.all(
      INDONESIA_CITIES.map((city) =>
        fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${city.lat}&lon=${city.lon}&appid=${OWM_API_KEY}&units=metric`
        )
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => (data ? { ...city, data } : null))
          .catch(() => null)
      )
    ).then((results) => {
      setCitiesWeather(results.filter(Boolean));
      setMapLoading(false);
    });
  }, [refreshKey]);

  const handleRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // ── Derived ──────────────────────────────────────────────────────────────
  const temp        = weather ? Math.round(weather.main?.temp) : null;
  const tempMin     = weather ? Math.round(weather.main?.temp_min) : null;
  const tempMax     = weather ? Math.round(weather.main?.temp_max) : null;
  const feelsLike   = weather ? Math.round(weather.main?.feels_like) : null;
  const humidity    = weather?.main?.humidity;
  const pressure    = weather?.main?.pressure;
  const windSpeed   = weather?.wind?.speed;
  const windGust    = weather?.wind?.gust;
  const description = weather?.weather?.[0]?.description ?? "";
  const iconCode    = weather?.weather?.[0]?.icon;
  const cityName    = weather?.name;

  const dailyForecast = useMemo(() => buildDailyForecast(forecast?.list || []), [forecast]);
  const todayHourly   = useMemo(() => buildTodayHourly(forecast?.list || []), [forecast]);

  const forecastAllMin = dailyForecast.length ? Math.min(...dailyForecast.map((d) => d.min)) : 0;
  const forecastAllMax = dailyForecast.length ? Math.max(...dailyForecast.map((d) => d.max)) : 30;

  const next24hRain = (forecast?.list || []).slice(0, 8).reduce((s, i) => s + (i.rain?.["3h"] || 0), 0);
  const next24hPop  = (forecast?.list || []).slice(0, 8).reduce((s, i) => s + (i.pop || 0), 0) / Math.max((forecast?.list || []).slice(0, 8).length, 1);
  const nextWeekRain = (forecast?.list || []).reduce((s, i) => s + (i.rain?.["3h"] || 0), 0);

  const tomorrowEntry = dailyForecast[0];
  const compareAllMin = Math.min(tempMin ?? 999, tomorrowEntry?.min ?? 999);
  const compareAllMax = Math.max(tempMax ?? 0, tomorrowEntry?.max ?? 0);

  const today    = new Date();
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - today.getDay() + i);
    return d;
  });

  const isLoading = weatherLoading && !weather;
  const hasData   = !!weather;

  return (
    <div className="px-4 pt-4 pb-8">
      <div className="max-w-5xl mx-auto space-y-5">

        {/* ── Controls bar ─────────────────────────────────────────────── */}
        <WeatherControls
          vehicles={vehicles}
          selectedVehicle={selectedVehicle}
          vehicleLoading={vehicleLoading}
          onVehicleChange={(v) => setSelectedVehicleId(v?.id?.toString() ?? "")}
          coordsSource={coordsSource}
          geoLoading={geoLoading}
          geoError={geoError}
          lastRefreshTime={lastRefreshTime}
          weatherLoading={weatherLoading}
          activeCoords={activeCoords}
          onRefresh={handleRefresh}
        />

        {/* ── Alerts ───────────────────────────────────────────────────── */}
        {!hasApiKey && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300">
            <FaExclamationCircle size={16} className="shrink-0" />
            <div>
              <p className="text-sm font-semibold">{t("weather.noApiKey")}</p>
              <p className="text-xs mt-0.5 opacity-80">Set <code className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 rounded">VITE_OPENWEATHER_API_KEY</code></p>
            </div>
          </div>
        )}
        {weatherError && weatherError !== "no_api_key" && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
            <FaTimesCircle size={14} className="shrink-0" /> {t("weather.fetchError")}: {weatherError}
          </div>
        )}
        {geoError && !hasUsvCoords && geoError !== "unsupported" && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300 text-sm">
            <FaExclamationTriangle size={14} className="shrink-0" /> {t("weather.locationError")}: {geoError}
          </div>
        )}

        {/* ── Skeleton ─────────────────────────────────────────────────── */}
        {isLoading && (
          <div className="animate-pulse space-y-5">
            <div className="h-40 rounded-2xl bg-gray-200 dark:bg-gray-800" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => <div key={i} className="h-52 rounded-2xl bg-gray-200 dark:bg-gray-800" />)}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(2)].map((_, i) => <div key={i} className="h-48 rounded-2xl bg-gray-200 dark:bg-gray-800" />)}
            </div>
          </div>
        )}

        {/* ── Empty state ───────────────────────────────────────────────── */}
        {!activeCoords && !isLoading && !geoLoading && hasApiKey && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-600 gap-3">
            <TbSunWind size={56} />
            <p className="text-sm">{t("weather.sourceNone")}</p>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {hasData && (
          <>
            {/* ── Hero card ──────────────────────────────────────────── */}
            <WeatherHero weather={weather} weekDays={weekDays} today={today} />

            {/* ── Indonesia Weather Map ──────────────────────────────── */}
            <WeatherMap
              citiesWeather={citiesWeather}
              activeCoords={activeCoords}
              weather={weather}
              iconCode={iconCode}
              temp={temp}
              humidity={humidity}
              cityName={cityName}
              description={description}
              coordsSource={coordsSource}
            />

            {/* ── 3-column info cards ────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ForecastCard dailyForecast={dailyForecast} forecastAllMin={forecastAllMin} forecastAllMax={forecastAllMax} />
              <PrecipCard
                forecast={forecast}
                next24hRain={next24hRain}
                next24hPop={next24hPop}
                nextWeekRain={nextWeekRain}
                humidity={humidity}
              />
              <CompareCard
                tempMin={tempMin}
                tempMax={tempMax}
                tomorrowEntry={tomorrowEntry}
                compareAllMin={compareAllMin}
                compareAllMax={compareAllMax}
                pressure={pressure}
                windSpeed={windSpeed}
                windGust={windGust}
                feelsLike={feelsLike}
              />
            </div>

            {/* ── Charts ─────────────────────────────────────────────── */}
            {todayHourly.length > 0 && (
              <WeatherCharts todayHourly={todayHourly} tempMin={tempMin} tempMax={tempMax} />
            )}

            <p className="text-xs text-gray-300 dark:text-gray-700 text-right">
              Data by{" "}
              <a href="https://openweathermap.org" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-400">
                OpenWeatherMap
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default Weather;
