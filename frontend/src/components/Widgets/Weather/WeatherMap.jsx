import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { OWM_ICON, INDONESIA_CITIES, createWeatherIcon } from "./weatherUtils";
import { Card } from "./WeatherPrimitives";

const WeatherMap = ({ citiesWeather, activeCoords, weather, iconCode, temp, humidity, cityName, description, coordsSource }) => {
  return (
    <Card className="overflow-hidden" style={{ position: "relative", zIndex: 0, isolation: "isolate" }}>
      <div style={{ height: "clamp(280px, 50vh, 540px)" }}>
        <MapContainer
          center={[-2.5, 118]}
          zoom={5}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution="&copy; Esri"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={20}
          />

          {citiesWeather.map((city, i) => {
            const ic   = city.data?.weather?.[0]?.icon || "01d";
            const tmp  = Math.round(city.data?.main?.temp ?? 0);
            const hum  = city.data?.main?.humidity ?? 0;
            const wind = city.data?.wind?.speed?.toFixed(1) ?? "--";
            const desc = city.data?.weather?.[0]?.description ?? "";
            return (
              <Marker
                key={i}
                position={[city.lat, city.lon]}
                icon={createWeatherIcon(ic, tmp, city.name, hum, false)}
              >
                <Popup closeButton={false} minWidth={160}>
                  <div style={{ fontFamily: "system-ui,sans-serif", padding: "2px 0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                      <img src={OWM_ICON(ic, "")} style={{ width: 32, height: 32 }} alt="" />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "#1e293b", lineHeight: 1.2 }}>{city.name}</div>
                        <div style={{ fontSize: 10, color: "#64748b", textTransform: "capitalize", lineHeight: 1.3 }}>{desc}</div>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 8px" }}>
                      <div style={{ background: "#eff6ff", borderRadius: 6, padding: "4px 6px", textAlign: "center" }}>
                        <div style={{ fontSize: 9, color: "#3b82f6", fontWeight: 600, letterSpacing: 0.5 }}>TEMP</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#1e40af" }}>{tmp}°C</div>
                      </div>
                      <div style={{ background: "#f0fdf4", borderRadius: 6, padding: "4px 6px", textAlign: "center" }}>
                        <div style={{ fontSize: 9, color: "#16a34a", fontWeight: 600, letterSpacing: 0.5 }}>HUMID</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#15803d" }}>{hum}%</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 5, display: "flex", alignItems: "center", gap: 4 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#94a3b8" }} />
                      <span style={{ fontSize: 10, color: "#475569" }}>Wind {wind} m/s</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {activeCoords && weather && (
            <Marker
              position={[activeCoords.lat, activeCoords.lon]}
              icon={createWeatherIcon(iconCode || "01d", temp ?? 0, cityName || "Current", humidity ?? 0, true)}
            >
              <Popup closeButton={false} minWidth={160}>
                <div style={{ fontFamily: "system-ui,sans-serif", padding: "2px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <img src={OWM_ICON(iconCode || "01d", "")} style={{ width: 32, height: 32 }} alt="" />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#1e293b", lineHeight: 1.2 }}>{cityName || "Current Location"}</div>
                      <div style={{ fontSize: 10, color: "#3b82f6", fontWeight: 600, lineHeight: 1.3 }}>
                        ● {coordsSource === "usv" ? "USV GPS" : "Browser"}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 8px" }}>
                    <div style={{ background: "#eff6ff", borderRadius: 6, padding: "4px 6px", textAlign: "center" }}>
                      <div style={{ fontSize: 9, color: "#3b82f6", fontWeight: 600, letterSpacing: 0.5 }}>TEMP</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#1e40af" }}>{temp ?? 0}°C</div>
                    </div>
                    <div style={{ background: "#f0fdf4", borderRadius: 6, padding: "4px 6px", textAlign: "center" }}>
                      <div style={{ fontSize: 9, color: "#16a34a", fontWeight: 600, letterSpacing: 0.5 }}>HUMID</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#15803d" }}>{humidity ?? 0}%</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 5, fontSize: 10, color: "#64748b", textTransform: "capitalize" }}>{description}</div>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </Card>
  );
};

export default WeatherMap;
