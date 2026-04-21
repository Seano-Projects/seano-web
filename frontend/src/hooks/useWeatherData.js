import { useState, useEffect, useRef } from "react";

const OWM_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
const OWM_CURRENT = "https://api.openweathermap.org/data/2.5/weather";
const OWM_FORECAST = "https://api.openweathermap.org/data/2.5/forecast";

/**
 * Fetches current weather + 5-day/3-hour forecast from OpenWeatherMap.
 * @param {{ lat: number|null, lon: number|null, refreshKey: number }} params
 */
export const useWeatherData = ({ lat, lon, refreshKey = 0 } = {}) => {
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  useEffect(() => {
    if (!lat || !lon || !OWM_KEY) {
      setWeather(null);
      setForecast(null);
      setLoading(false);
      setError(!OWM_KEY ? "no_api_key" : null);
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    const currentUrl = `${OWM_CURRENT}?lat=${lat}&lon=${lon}&appid=${OWM_KEY}&units=metric`;
    const forecastUrl = `${OWM_FORECAST}?lat=${lat}&lon=${lon}&appid=${OWM_KEY}&units=metric&cnt=40`;

    Promise.all([
      fetch(currentUrl, { signal: controller.signal }).then((r) => {
        if (!r.ok) throw new Error(`OWM_${r.status}`);
        return r.json();
      }),
      fetch(forecastUrl, { signal: controller.signal }).then((r) => {
        if (!r.ok) throw new Error(`OWM_FORECAST_${r.status}`);
        return r.json();
      }),
    ])
      .then(([currentData, forecastData]) => {
        setWeather(currentData);
        setForecast(forecastData);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setError(err.message);
        setLoading(false);
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lon, refreshKey]);

  return { weather, forecast, loading, error, hasApiKey: !!OWM_KEY };
};


