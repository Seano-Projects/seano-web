import { useState, useEffect } from "react";
import { getGoogleSatelliteUrl } from "./googleTileSession";
import { useSystemSettings } from "../contexts/SystemSettingsContext";

const BASE_TILE_URLS = {
  street: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  satellite:
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
};

const TILE_ATTRIBUTIONS = {
  street: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  satellite: '&copy; <a href="https://www.esri.com">Esri</a>',
  dark: '&copy; <a href="https://carto.com">CARTO</a>',
  "google-satellite": '&copy; <a href="https://maps.google.com">Google</a>',
  "mapbox-satellite": '&copy; <a href="https://www.mapbox.com">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
};

const MAX_NATIVE_ZOOMS = {
  street: 19,
  satellite: 19,
  dark: 20,
  "google-satellite": 22,
  "mapbox-satellite": 22,
};

const getStyle = () => localStorage.getItem("mapTileStyle") || "street";

const useMapTile = () => {
  const { settings } = useSystemSettings();
  const [style, setStyleState] = useState(getStyle);
  const [googleUrl, setGoogleUrl] = useState(null);

  const TILE_URLS = {
    ...BASE_TILE_URLS,
    "mapbox-satellite": `https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}.png?access_token=${settings.mapbox_token}`,
  };

  useEffect(() => {
    const handler = () => setStyleState(getStyle());
    window.addEventListener("storage", handler);
    window.addEventListener("mapTileChanged", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("mapTileChanged", handler);
    };
  }, []);

  useEffect(() => {
    if (style === "google-satellite" && settings.google_maps_enabled) {
      getGoogleSatelliteUrl(settings.google_maps_api_key).then((url) => setGoogleUrl(url));
    }
  }, [style, settings.google_maps_enabled, settings.google_maps_api_key]);

  const setStyle = (newStyle) => {
    localStorage.setItem("mapTileStyle", newStyle);
    setStyleState(newStyle);
    window.dispatchEvent(new Event("mapTileChanged"));
  };

  // Fall back to plain satellite if the stored style was disabled by an admin
  // after it was selected (System Management toggles).
  const effectiveStyle =
    (style === "mapbox-satellite" && !settings.mapbox_enabled) ||
    (style === "google-satellite" && !settings.google_maps_enabled)
      ? "satellite"
      : style;

  const getUrl = () => {
    if (effectiveStyle === "google-satellite") {
      return googleUrl || TILE_URLS.satellite;
    }
    return TILE_URLS[effectiveStyle] || TILE_URLS.street;
  };

  const url = getUrl();

  const getMaxNativeZoom = () => {
    if (effectiveStyle === "google-satellite") return googleUrl ? 22 : 19;
    return MAX_NATIVE_ZOOMS[effectiveStyle] ?? 19;
  };

  const isGoogle = effectiveStyle === "google-satellite" && !!googleUrl;

  return {
    style: effectiveStyle,
    setStyle,
    url,
    attribution: TILE_ATTRIBUTIONS[effectiveStyle] || TILE_ATTRIBUTIONS.street,
    maxNativeZoom: getMaxNativeZoom(),
    tileSize: isGoogle ? 512 : 256,
    zoomOffset: isGoogle ? -1 : 0,
  };
};

export default useMapTile;
