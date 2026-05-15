import { useState, useEffect, useCallback } from "react";

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
  const [style, setStyle] = useState(getStyle);

  useEffect(() => {
    const handler = () => setStyle(getStyle());
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return {
    url: TILE_URLS[style] || TILE_URLS.street,
    attribution: TILE_ATTRIBUTIONS[style] || TILE_ATTRIBUTIONS.street,
  };
};

export default useMapTile;
