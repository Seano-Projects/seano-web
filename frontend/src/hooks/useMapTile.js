import { useState, useEffect } from "react";

const TILE_URLS = {
  street: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  satellite:
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
};

const TILE_ATTRIBUTIONS = {
  street: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  satellite: '&copy; <a href="https://www.esri.com">Esri</a>',
  dark: '&copy; <a href="https://carto.com">CARTO</a>',
};

const getStyle = () => localStorage.getItem("mapTileStyle") || "street";

const useMapTile = () => {
  const [style, setStyleState] = useState(getStyle);

  useEffect(() => {
    const handler = () => setStyleState(getStyle());
    window.addEventListener("storage", handler);
    window.addEventListener("mapTileChanged", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("mapTileChanged", handler);
    };
  }, []);

  const setStyle = (newStyle) => {
    localStorage.setItem("mapTileStyle", newStyle);
    setStyleState(newStyle);
    window.dispatchEvent(new Event("mapTileChanged"));
  };

  return {
    style,
    setStyle,
    url: TILE_URLS[style] || TILE_URLS.street,
    attribution: TILE_ATTRIBUTIONS[style] || TILE_ATTRIBUTIONS.street,
  };
};

export default useMapTile;
