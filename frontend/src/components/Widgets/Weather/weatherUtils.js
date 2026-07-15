import L from "leaflet";

export const OWM_ICON = (code, size = "@2x") =>
  `https://openweathermap.org/img/wn/${code}${size}.png`;

export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const todayStr = () => new Date().toDateString();

export const INDONESIA_CITIES = [
  { name: "Jakarta",       lat: -6.2088,  lon: 106.8456 },
  { name: "Bandung",       lat: -6.9175,  lon: 107.6191 },
  { name: "Surabaya",      lat: -7.2575,  lon: 112.7521 },
  { name: "Medan",         lat: 3.5952,   lon: 98.6722  },
  { name: "Makassar",      lat: -5.1477,  lon: 119.4327 },
  { name: "Denpasar",      lat: -8.6500,  lon: 115.2167 },
  { name: "Semarang",      lat: -6.9667,  lon: 110.4167 },
  { name: "Manado",        lat: 1.4931,   lon: 124.8413 },
  { name: "Palembang",     lat: -2.9761,  lon: 104.7754 },
  { name: "Balikpapan",    lat: -1.2654,  lon: 116.8312 },
  { name: "Yogyakarta",    lat: -7.7956,  lon: 110.3695 },
  { name: "Malang",        lat: -7.9666,  lon: 112.6326 },
  { name: "Padang",        lat: -0.9471,  lon: 100.4172 },
  { name: "Pekanbaru",     lat: 0.5071,   lon: 101.4478 },
  { name: "Batam",         lat: 1.1301,   lon: 104.0529 },
  { name: "Banjarmasin",   lat: -3.3186,  lon: 114.5944 },
  { name: "Pontianak",     lat: -0.0263,  lon: 109.3425 },
  { name: "Samarinda",     lat: -0.5022,  lon: 117.1536 },
  { name: "Jayapura",      lat: -2.5337,  lon: 140.7181 },
  { name: "Ambon",         lat: -3.6954,  lon: 128.1814 },
  { name: "Kupang",        lat: -10.1772, lon: 123.6070 },
  { name: "Mataram",       lat: -8.5833,  lon: 116.1167 },
  { name: "Bengkulu",      lat: -3.7928,  lon: 102.2608 },
  { name: "Jambi",         lat: -1.6101,  lon: 103.6131 },
  { name: "Banda Aceh",    lat: 5.5483,   lon: 95.3238  },
  { name: "Gorontalo",     lat: 0.5435,   lon: 123.0568 },
  { name: "Palu",          lat: -0.8917,  lon: 119.8707 },
  { name: "Kendari",       lat: -3.9450,  lon: 122.4989 },
  { name: "Serang",        lat: -6.1200,  lon: 106.1503 },
  { name: "Bandar Lampung", lat: -5.4292, lon: 105.2610 },
  { name: "Pangkal Pinang", lat: -2.1316, lon: 106.1169 },
  { name: "Tanjung Pinang", lat: 0.9284,  lon: 104.4593 },
  { name: "Sorong",        lat: -0.8762,  lon: 131.2558 },
  { name: "Ternate",       lat: 0.7909,   lon: 127.3844 },
];

export const getWindSafety = (mps, t) => {
  if (mps === undefined || mps === null) return null;
  if (mps < 5.5)
    return { label: t("weather.wind.safe"), color: "text-green-600 dark:text-green-400", dot: "bg-green-500" };
  if (mps < 10.8)
    return { label: t("weather.wind.caution"), color: "text-yellow-600 dark:text-yellow-400", dot: "bg-yellow-500" };
  return { label: t("weather.wind.danger"), color: "text-red-600 dark:text-red-400", dot: "bg-red-500" };
};

export const buildDailyForecast = (list = []) => {
  const days = {};
  list.forEach((item) => {
    const d = new Date(item.dt * 1000);
    const key = d.toDateString();
    if (!days[key]) days[key] = { date: d, temps: [], icons: {}, pops: [], rain: 0 };
    days[key].temps.push(item.main.temp);
    const ic = item.weather[0]?.icon || "01d";
    days[key].icons[ic] = (days[key].icons[ic] || 0) + 1;
    days[key].pops.push(item.pop || 0);
    days[key].rain += item.rain?.["3h"] || 0;
  });
  return Object.entries(days)
    .filter(([key]) => key !== todayStr())
    .slice(0, 5)
    .map(([, d]) => ({
      dayLabel: DAY_SHORT[d.date.getDay()],
      min: Math.round(Math.min(...d.temps)),
      max: Math.round(Math.max(...d.temps)),
      iconCode: Object.entries(d.icons).sort((a, b) => b[1] - a[1])[0][0],
      pop: Math.round((Math.max(...d.pops) || 0) * 100),
      rain: Math.round(d.rain * 10) / 10,
    }));
};

export const buildTodayHourly = (list = []) => {
  const today = new Date().toDateString();
  return list
    .filter((item) => new Date(item.dt * 1000).toDateString() === today)
    .map((item) => {
      const d = new Date(item.dt * 1000);
      return {
        time: d.getHours().toString().padStart(2, "0"),
        temp: Math.round(item.main.temp),
        pop: Math.round((item.pop || 0) * 100),
      };
    });
};

export const createWeatherIcon = (iconCode, temp, name, humidity, isActive = false) => {
  const iconUrl = OWM_ICON(iconCode, "");
  const bg        = isActive ? "#2563eb" : "rgba(15,23,42,0.82)";
  const textColor = "white";
  const subColor  = isActive ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.65)";
  const arrowColor = isActive ? "#2563eb" : "rgba(15,23,42,0.82)";
  const maxLen = 10;
  const label  = name.length > maxLen ? name.slice(0, maxLen) + "…" : name;
  return L.divIcon({
    className: "",
    iconAnchor: [50, 54],
    popupAnchor: [0, -56],
    html: `<div style="background:${bg};border-radius:10px;padding:5px 10px 5px 5px;display:inline-flex;align-items:center;gap:5px;box-shadow:0 2px 12px rgba(0,0,0,0.18);white-space:nowrap;position:relative;">
      <img src="${iconUrl}" style="width:28px;height:28px;flex-shrink:0;" />
      <div>
        <div style="font-size:13px;font-weight:700;color:${textColor};line-height:1.2;">${temp}°C</div>
        <div style="font-size:9px;color:${subColor};line-height:1.3;max-width:80px;overflow:hidden;text-overflow:ellipsis;">${humidity}% · ${label}</div>
      </div>
      <div style="position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:6px solid ${arrowColor};"></div>
    </div>`,
  });
};
