import React, { useState } from "react";
import {
  MapContainer,
  TileLayer,
  FeatureGroup,
  Marker,
  Popup,
  useMapEvents,
  Polyline,
  useMap,
} from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import L from "leaflet";
import "leaflet-draw";
import {
  FaHome,
  FaEdit,
  FaSearch,
  FaQuestionCircle,
  FaTimes,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { FaX } from "react-icons/fa6";
import { toast } from "../../ui";

// Fix default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Map controller component to update map position
const MapController = ({ center, zoom }) => {
  const map = useMap();

  React.useEffect(() => {
    if (center) {
      map.setView(center, zoom || map.getZoom(), {
        animate: true,
        duration: 1,
      });
    }
  }, [center, zoom, map]);

  return null;
};

const MissionMap = ({
  darkMode,
  activeMission,
  homeLocation,
  setHomeLocation,
  isSettingHome,
  setIsSettingHome,
  waypoints,
  setWaypoints,
  generatedPaths,
  setGeneratedPaths,
  planningMode,
  hasGeneratedWaypoints,
  setHasGeneratedWaypoints,
  isEditingWaypoints,
  editingWaypoint,
  setEditingWaypoint,
  featureGroupRef,
  setFeatureGroupRef,
  missionParams,
  setActiveMission,
  getActualWaypointCount,
}) => {
  // Search coordinates state
  const [searchQuery, setSearchQuery] = useState("");
  const [mapCenter, setMapCenter] = useState(null);
  const [mapZoom, setMapZoom] = useState(null);
  const [showSearchInput, setShowSearchInput] = useState(false);

  // Guide state
  const [showGuide, setShowGuide] = useState(false);

  // Restore polygon/zone shapes when waypoints are loaded
  React.useEffect(() => {
    if (featureGroupRef && waypoints.length > 0) {
      // Clear existing zone layers first
      featureGroupRef.eachLayer((layer) => {
        if (layer.options && layer.options.isZoneLayer) {
          featureGroupRef.removeLayer(layer);
        }
      });

      // Redraw zones from waypoints
      waypoints.forEach((wp) => {
        if (wp.type === "zone" && wp.shape) {
          let layer;

          if (wp.shape === "polygon" && wp.vertices) {
            // Recreate polygon
            const latLngs = wp.vertices.map((v) => [v.lat, v.lng]);
            layer = L.polygon(latLngs, {
              color: "#018190",
              weight: 3,
              fillOpacity: 0.15,
              isZoneLayer: true,
            });
          } else if (wp.shape === "rectangle" && wp.bounds) {
            // Recreate rectangle
            const bounds = L.latLngBounds(
              [wp.bounds.south, wp.bounds.west],
              [wp.bounds.north, wp.bounds.east],
            );
            layer = L.rectangle(bounds, {
              color: "#018190",
              weight: 3,
              fillOpacity: 0.15,
              isZoneLayer: true,
            });
          } else if (wp.shape === "circle" && wp.radius) {
            // Recreate circle
            layer = L.circle([wp.lat, wp.lng], {
              radius: wp.radius,
              color: "#018190",
              weight: 3,
              fillOpacity: 0.15,
              isZoneLayer: true,
            });
          }

          if (layer) {
            layer.waypointId = wp.id;
            featureGroupRef.addLayer(layer);
          } else {
          }
        }
      });
    } else {
    }
  }, [waypoints, featureGroupRef]);

  // Clear drawing layers when entering edit waypoints mode
  React.useEffect(() => {
    if (isEditingWaypoints && featureGroupRef && waypoints.length > 0) {
      // Clear all drawn shapes from FeatureGroup (polyline, polygon, rectangle)
      // but keep zone layers if needed
      featureGroupRef.eachLayer((layer) => {
        // Remove polyline and other drawing layers but keep zone markers
        if (
          layer instanceof L.Polyline ||
          layer instanceof L.Polygon ||
          layer instanceof L.Rectangle ||
          layer instanceof L.Circle
        ) {
          if (!layer.options.isZoneLayer) {
            featureGroupRef.removeLayer(layer);
          }
        }
      });
    }
  }, [isEditingWaypoints, featureGroupRef, waypoints]);

  // Handle coordinate search
  const handleSearchCoordinates = (e) => {
    // Check if it's Enter key press or button click (mousedown)
    if (e.key === "Enter" || e.type === "mousedown") {
      e.preventDefault();
      const query = searchQuery.trim();
      if (!query) return;

      let lat, lng;

      // Try comma-separated format
      if (query.includes(",")) {
        const parts = query.split(",").map((s) => s.trim());
        if (parts.length === 2) {
          lat = parseFloat(parts[0]);
          lng = parseFloat(parts[1]);
        }
      }
      // Try space-separated format
      else {
        const parts = query.split(/\s+/);
        if (parts.length === 2) {
          lat = parseFloat(parts[0]);
          lng = parseFloat(parts[1]);
        }
      }

      // Validate coordinates
      if (
        !isNaN(lat) &&
        !isNaN(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180
      ) {
        setMapCenter([lat, lng]);
        setMapZoom(18);
        setShowSearchInput(false);
        setSearchQuery("");
      } else {
        toast.error("An error occurred");
      }
    }
  };

  // Home icon definition
  const homeIcon = L.divIcon({
    html: `<div style="background-color: #018190; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.15); font-size: 14px;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
      </svg>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    className: "custom-home-marker",
  });

  // Drawing event handlers
  const onDrawCreated = (e) => {
    const { layerType, layer } = e;

    // PATH PLANNING - Handle polyline (sequential waypoint navigation)
    if (layerType === "polyline") {
      const latLngs = layer.getLatLngs();
      const newWaypoints = latLngs.map((latlng, index) => ({
        id: Date.now() + index,
        name: `WP${waypoints.length + index + 1}`,
        type: "path",
        lat: latlng.lat,
        lng: latlng.lng,
        altitude: 0, // Fixed for USV
        speed: missionParams.speed,
        delay: missionParams.delay,
        loiter: missionParams.loiter,
        radius: missionParams.radius,
        action: missionParams.action,
      }));

      setWaypoints((prev) => [...prev, ...newWaypoints]);

      if (activeMission) {
        setActiveMission((prev) => ({
          ...prev,
          waypoints: getActualWaypointCount([...waypoints, ...newWaypoints]),
        }));
      }

      // Remove the polyline from map since waypoints are now created
      // The connection lines will be rendered by our custom Polyline component
      if (featureGroupRef && layer) {
        featureGroupRef.removeLayer(layer);
      }
    } else if (layerType === "polygon") {
      const latLngs = layer.getLatLngs()[0]; // Polygon returns nested array
      const bounds = layer.getBounds();
      const center = bounds.getCenter();

      const zoneWaypointId = Date.now();
      const zoneWaypoint = {
        id: zoneWaypointId,
        name: `Zone${waypoints.filter((wp) => wp.type === "zone").length + 1}`,
        type: "zone",
        shape: "polygon",
        lat: center.lat,
        lng: center.lng,
        bounds: {
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest(),
        },
        vertices: latLngs.map((latlng) => ({
          lat: latlng.lat,
          lng: latlng.lng,
        })),
        altitude: 0,
        speed: missionParams.speed,
        pattern: "zigzag", // Coverage pattern for zone
        coverage: 80, // Coverage percentage
        overlap: 20, // Line overlap percentage
      };

      // Store waypoint ID in the layer for future reference during edits
      layer.waypointId = zoneWaypointId;
      layer.options = layer.options || {};
      layer.options.waypointId = zoneWaypointId;

      // Also store the leaflet layer ID for reverse lookup
      const leafletLayerId = layer._leaflet_id;

      setWaypoints((prev) => [...prev, { ...zoneWaypoint, leafletLayerId }]);

      if (activeMission) {
        setActiveMission((prev) => ({
          ...prev,
          waypoints: getActualWaypointCount([...waypoints, zoneWaypoint]),
        }));
      }
    }

    // ZONE PLANNING - Handle rectangle (rectangular area coverage)
    else if (layerType === "rectangle") {
      const bounds = layer.getBounds();
      const center = bounds.getCenter();

      const zoneWaypointId = Date.now() + 1; // Ensure different ID from polygon if created at same time
      const zoneWaypoint = {
        id: zoneWaypointId,
        name: `Zone${waypoints.filter((wp) => wp.type === "zone").length + 1}`,
        type: "zone",
        shape: "rectangle",
        lat: center.lat,
        lng: center.lng,
        bounds: {
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest(),
        },
        altitude: 0,
        speed: missionParams.speed,
        pattern: "zigzag", // Coverage pattern for zone
        coverage: 80, // Coverage percentage
        overlap: 20, // Line overlap percentage
      };

      // Store waypoint ID in the layer for future reference during edits
      layer.waypointId = zoneWaypointId;
      layer.options = layer.options || {};
      layer.options.waypointId = zoneWaypointId;

      // Also store the leaflet layer ID for reverse lookup
      const leafletLayerId = layer._leaflet_id;

      setWaypoints((prev) => [...prev, { ...zoneWaypoint, leafletLayerId }]);

      if (activeMission) {
        setActiveMission((prev) => ({
          ...prev,
          waypoints: getActualWaypointCount([...waypoints, zoneWaypoint]),
        }));
      }
    }
  };

  const onDrawDeleted = (e) => {
    // Get deleted layers
    const deletedLayers = e.layers;

    if (deletedLayers.getLayers().length > 0) {
      // When shapes are deleted from map, clear all waypoints and generated paths
      setWaypoints([]);
      setGeneratedPaths([]);
      setHasGeneratedWaypoints(false);

      // Update mission waypoints count
      if (activeMission) {
        setActiveMission((prev) => ({
          ...prev,
          waypoints: 0,
        }));
      }
    }
  };

  // Handle when shapes are edited (resized, moved, etc.)
  const onDrawEdited = (e) => {
    const layers = e.layers;

    layers.eachLayer((layer) => {
      // Get layer type and updated geometry
      const layerType = layer.constructor.name.toLowerCase();

      // Check different ways to identify polygon/rectangle layers
      const isPolygon =
        layerType === "polygon" ||
        layerType.includes("polygon") ||
        layer instanceof L.Polygon ||
        (layer.getLatLngs && typeof layer.getLatLngs === "function");

      const isRectangle =
        layerType === "rectangle" ||
        layerType.includes("rectangle") ||
        layer instanceof L.Rectangle;

      if (isPolygon || isRectangle) {
        // Get updated bounds and center
        const bounds = layer.getBounds();
        const center = bounds.getCenter();

        let updatedData = {
          lat: center.lat,
          lng: center.lng,
          bounds: {
            north: bounds.getNorth(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            west: bounds.getWest(),
          },
        };

        // For polygon, also update vertices
        if (
          isPolygon &&
          layer.getLatLngs &&
          typeof layer.getLatLngs === "function"
        ) {
          try {
            const latLngs = layer.getLatLngs()[0]; // Get first ring for polygon
            updatedData.vertices = latLngs.map((latlng) => ({
              lat: latlng.lat,
              lng: latlng.lng,
            }));
          } catch (error) {
            // Fallback: create vertices from bounds for rectangle-like shapes
            updatedData.vertices = [
              { lat: bounds.getNorth(), lng: bounds.getWest() },
              { lat: bounds.getNorth(), lng: bounds.getEast() },
              { lat: bounds.getSouth(), lng: bounds.getEast() },
              { lat: bounds.getSouth(), lng: bounds.getWest() },
            ];
            return error;
          }
        } else {
          // For rectangle or when getLatLngs is not available, create vertices from bounds
          updatedData.vertices = [
            { lat: bounds.getNorth(), lng: bounds.getWest() },
            { lat: bounds.getNorth(), lng: bounds.getEast() },
            { lat: bounds.getSouth(), lng: bounds.getEast() },
            { lat: bounds.getSouth(), lng: bounds.getWest() },
          ];
        }

        // Get the layer's waypoint ID and leaflet ID
        const layerWaypointId = layer.options?.waypointId || layer.waypointId;
        const layerLeafletId = layer._leaflet_id;

        // Update the corresponding zone waypoint AND clear generated waypoints in one operation
        setWaypoints((prev) => {
          const zoneWaypoints = prev.filter((wp) => wp.type === "zone");
          const hasExistingPaths = prev.some((wp) => wp.type === "path");

          if (zoneWaypoints.length === 0) {
            return prev;
          }

          // Find the matching zone waypoint
          let matchingZone = zoneWaypoints[0];

          if (layerLeafletId || layerWaypointId) {
            const idMatch = zoneWaypoints.find(
              (zone) =>
                zone.leafletLayerId === layerLeafletId ||
                zone.id === layerWaypointId,
            );
            if (idMatch) {
              matchingZone = idMatch;
            }
          }

          if (matchingZone) {
            // Create completely new waypoint object to force React re-render
            const updatedZone = {
              // Keep existing properties
              id: matchingZone.id,
              name: matchingZone.name,
              type: matchingZone.type,
              shape: matchingZone.shape,
              altitude: matchingZone.altitude,
              speed: matchingZone.speed,
              pattern: matchingZone.pattern,
              coverage: matchingZone.coverage,
              overlap: matchingZone.overlap,
              // Apply new geometry data
              ...updatedData,
              leafletLayerId: layerLeafletId,
              // Force new timestamp to ensure change detection
              lastModified: Date.now(),
              editCount: (matchingZone.editCount || 0) + 1,
            };

            // Update zone data AND remove generated waypoints in one operation
            let updated = prev.map((wp) =>
              wp.id === matchingZone.id ? updatedZone : wp,
            );

            // Remove generated path waypoints if they exist
            if (hasExistingPaths) {
              updated = updated.filter((wp) => wp.type !== "path");

              // Show user notification
              setTimeout(() => {
                toast.warning(
                  "Zone has been modified! Generated waypoints have been cleared. Please click 'Generate Waypoints' again to create new waypoints for the updated zone.",
                );
              }, 100);
            }

            return updated;
          } else {
            return prev;
          }
        });

        // Also clear generated paths and reset state if zone was edited
        setGeneratedPaths([]);
        setHasGeneratedWaypoints(false);
      }
    });
  };

  // Update waypoint position when dragged
  const handleWaypointDrag = (waypointId, newPosition) => {
    // Clear drawing layers from FeatureGroup when dragging waypoint
    if (featureGroupRef) {
      featureGroupRef.clearLayers();
    }

    setWaypoints((prev) => {
      const updatedWaypoints = prev.map((wp) =>
        wp.id === waypointId
          ? { ...wp, lat: newPosition.lat, lng: newPosition.lng }
          : wp,
      );

      // Update generated paths if this waypoint belongs to a path
      const updatedWaypoint = updatedWaypoints.find(
        (wp) => wp.id === waypointId,
      );
      if (updatedWaypoint && updatedWaypoint.type === "path") {
        regeneratePathsFromWaypoints(updatedWaypoints);
      }

      return updatedWaypoints;
    });
  };

  // Utility function to regenerate paths from current waypoints
  const regeneratePathsFromWaypoints = (currentWaypoints) => {
    const pathWaypoints = currentWaypoints.filter((wp) => wp.type === "path");

    if (pathWaypoints.length > 1) {
      const pathCoordinates = pathWaypoints.map((wp) => [wp.lat, wp.lng]);
      setGeneratedPaths((prev) => {
        // Remove existing generated coverage paths and add new one
        const otherPaths = prev.filter(
          (path) => path.zoneName !== "Generated Coverage",
        );
        return [
          ...otherPaths,
          {
            id: Date.now(),
            zoneName: "Generated Coverage",
            coordinates: pathCoordinates,
            color: "#018190",
          },
        ];
      });
    } else {
      // Remove generated coverage paths if less than 2 waypoints
      setGeneratedPaths((prev) =>
        prev.filter((path) => path.zoneName !== "Generated Coverage"),
      );
    }
  };

  // Component to handle map clicks for setting home location
  const MapClickHandler = () => {
    useMapEvents({
      click: (e) => {
        if (isSettingHome && activeMission) {
          setHomeLocation(e.latlng);
          setIsSettingHome(false);
        }
        // Clear editing waypoint when clicking on empty space
        if (isEditingWaypoints && editingWaypoint) {
          setEditingWaypoint(null);
        }
      },
    });
    return null;
  };

  return (
    <div
      className="w-full h-full overflow-hidden z-30"
      style={{ position: "relative" }}
    >
      {/* Search Coordinates - Floating Button at Top Center */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-1000 pointer-events-auto">
        {!showSearchInput ? (
          <button
            onClick={() => setShowSearchInput(true)}
            className="bg-white dark:bg-black hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 p-3 rounded-full shadow-lg transition-all border border-gray-200 dark:border-gray-600 flex items-center gap-2"
            title="Search Coordinates"
          >
            <FaSearch className="text-base" />
          </button>
        ) : (
          <div className="bg-white dark:bg-black rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 p-2 w-96">
            <div className="relative flex items-center">
              <FaSearch className="absolute left-3 text-gray-400 dark:text-gray-500 z-10" />
              <input
                type="text"
                placeholder="Enter coordinates (e.g., -6.2088, 106.8456)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchCoordinates}
                onBlur={() => {
                  setTimeout(() => {
                    if (!searchQuery) setShowSearchInput(false);
                  }, 200);
                }}
                autoFocus
                className="w-full bg-white dark:bg-black border border-gray-200 dark:border-gray-600 rounded-lg pl-10 pr-20 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
              />
              <div className="absolute right-2 flex gap-1">
                {searchQuery && (
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSearchCoordinates(e);
                    }}
                    className="p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
                    title="Search"
                  >
                    <FaSearch className="text-xs" />
                  </button>
                )}
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setShowSearchInput(false);
                    setSearchQuery("");
                  }}
                  className="p-1.5 bg-gray-200 dark:bg-black hover:text-red-600 dark:hover:text-red-600 text-gray-700 dark:text-gray-300 rounded-md font-bold transition-colors text-xs"
                  title="Close"
                >
                  <FaX className="text-xs" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        .leaflet-draw-toolbar {
          display: block !important;
        }
        .leaflet-draw-toolbar a {
          background-color: #fff !important;
          border: 1px solid #ccc !important;
          border-radius: 4px !important;
          cursor: pointer !important;
        }
        .leaflet-draw-toolbar a:hover {
          background-color: #f0f0f0 !important;
        }
        .leaflet-draw-actions {
          display: block !important;
        }
        .leaflet-draw-actions a {
          background-color: #fff !important;
          color: #333 !important;
          border: 1px solid #ccc !important;
        }
      `}</style>
      <MapContainer
        center={[-6.86, 108.103]}
        zoom={18}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
        worldCopyJump={false}
        maxBounds={[
          [-85, -180],
          [85, 180],
        ]}
        maxBoundsViscosity={1.5}
        minZoom={18}
        maxZoom={22}
      >
        <MapController center={mapCenter} zoom={mapZoom} />
        <TileLayer
          attribution="&copy; Esri"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          noWrap={true}
          maxZoom={22}
          maxNativeZoom={19}
        />

        {activeMission && (
          <FeatureGroup
            key={`mission-${activeMission.id || "default"}`}
            ref={(featureGroupInstance) => {
              if (
                featureGroupInstance &&
                featureGroupInstance !== featureGroupRef
              ) {
                setFeatureGroupRef(featureGroupInstance);
              }
            }}
          >
            <EditControl
              position="topright"
              onCreated={onDrawCreated}
              onDeleted={onDrawDeleted}
              onEdited={onDrawEdited}
              draw={{
                // Path Planning Mode - hanya polyline (requires home location)
                polyline:
                  planningMode === "path" &&
                  homeLocation &&
                  !hasGeneratedWaypoints &&
                  !waypoints.some((wp) => wp.type === "path") &&
                  activeMission
                    ? {
                        shapeOptions: {
                          color: "#018190",
                          weight: 3,
                        },
                        allowIntersection: false,
                        repeatMode: false,
                        drawError: {
                          color: "#e74c3c",
                          timeout: 1000,
                        },
                      }
                    : false,

                // Zone Planning Mode - polygon & rectangle (requires home location)
                polygon:
                  planningMode === "zone" &&
                  homeLocation &&
                  !hasGeneratedWaypoints &&
                  !waypoints.some((wp) => wp.type === "path") &&
                  activeMission
                    ? {
                        shapeOptions: {
                          color: "#f59e0b",
                          weight: 2,
                          fillColor: "#fbbf24",
                          fillOpacity: 0.2,
                        },
                        allowIntersection: false,
                        repeatMode: false,
                        drawError: {
                          color: "#e74c3c",
                          timeout: 1000,
                        },
                      }
                    : false,
                rectangle:
                  planningMode === "zone" &&
                  homeLocation &&
                  !hasGeneratedWaypoints &&
                  !waypoints.some((wp) => wp.type === "path") &&
                  activeMission
                    ? {
                        shapeOptions: {
                          color: "#10b981",
                          weight: 2,
                          fillColor: "#34d399",
                          fillOpacity: 0.2,
                        },
                        repeatMode: false,
                      }
                    : false,

                // Always disabled tools
                marker: false,
                circle: false,
                circlemarker: false,
              }}
              edit={{
                featureGroup: featureGroupRef,
                // Enable editing if featureGroup exists
                edit: featureGroupRef
                  ? {
                      selectedPathOptions: {
                        maintainColor: false,
                        opacity: 0.6,
                        dashArray: "10, 10",
                      },
                    }
                  : false,
                // Control remove/delete based on waypoint state
                remove:
                  featureGroupRef &&
                  !(
                    hasGeneratedWaypoints ||
                    waypoints.some((wp) => wp.type === "path")
                  )
                    ? {
                        selectedPathOptions: {
                          opacity: 0.6,
                          dashArray: "10, 10",
                        },
                      }
                    : false,
              }}
            />
          </FeatureGroup>
        )}

        {/* Generated Paths Visualization */}
        {generatedPaths.map((path) => (
          <Polyline
            key={path.id}
            positions={path.coordinates}
            pathOptions={{
              color: path.color,
              weight: 3,
              opacity: 0.8,
              dashArray: "5, 5", // Dashed line to differentiate from manual polylines
            }}
          >
            <Popup>
              <div className="text-center">
                <strong>Generated Path</strong>
                <br />
                <small>From: {path.zoneName}</small>
                <br />
                <small>Points: {path.coordinates.length}</small>
              </div>
            </Popup>
          </Polyline>
        ))}

        {/* Home to First Waypoint Line */}
        {homeLocation &&
          waypoints.filter((wp) => wp.type === "path").length > 0 && (
            <Polyline
              positions={[
                [homeLocation.lat, homeLocation.lng],
                [
                  waypoints.filter((wp) => wp.type === "path")[0].lat,
                  waypoints.filter((wp) => wp.type === "path")[0].lng,
                ],
              ]}
              pathOptions={{
                color: "#ff6b35",
                weight: 2,
                opacity: 0.7,
                dashArray: "5, 10",
              }}
            >
              <Popup>
                <div className="text-center">
                  <strong>Launch Path</strong>
                  <br />
                  <small>Home → WP1</small>
                </div>
              </Popup>
            </Polyline>
          )}

        {/* Waypoint Connection Lines */}
        {waypoints.filter((wp) => wp.type === "path").length > 1 && (
          <Polyline
            positions={waypoints
              .filter((wp) => wp.type === "path")
              .map((wp) => [wp.lat, wp.lng])}
            pathOptions={{
              color: "#018190",
              weight: 2,
              opacity: 0.7,
            }}
          >
            <Popup>
              <div className="text-center">
                <strong>Mission Path</strong>
                <br />
                <small>
                  Waypoints:{" "}
                  {waypoints.filter((wp) => wp.type === "path").length}
                </small>
              </div>
            </Popup>
          </Polyline>
        )}

        {/* Return to Home Line (RTL) */}
        {homeLocation &&
          waypoints.filter((wp) => wp.type === "path").length > 0 && (
            <Polyline
              positions={[
                [
                  waypoints.filter((wp) => wp.type === "path")[
                    waypoints.filter((wp) => wp.type === "path").length - 1
                  ].lat,
                  waypoints.filter((wp) => wp.type === "path")[
                    waypoints.filter((wp) => wp.type === "path").length - 1
                  ].lng,
                ],
                [homeLocation.lat, homeLocation.lng],
              ]}
              pathOptions={{
                color: "#ff6b35",
                weight: 2,
                opacity: 0.7,
                dashArray: "5, 10",
              }}
            >
              <Popup>
                <div className="text-center">
                  <strong>Return to Home (RTL)</strong>
                  <br />
                  <small>
                    WP{waypoints.filter((wp) => wp.type === "path").length} →
                    Home
                  </small>
                </div>
              </Popup>
            </Polyline>
          )}

        {/* Waypoint Markers with Numbers */}
        {waypoints
          .filter((wp) => wp.type === "path") // Only show path waypoints (not zones)
          .map((waypoint, index) => (
            <Marker
              key={waypoint.id}
              position={[waypoint.lat, waypoint.lng]}
              draggable={isEditingWaypoints} // Enable dragging only in edit mode
              eventHandlers={{
                dragend: (e) => {
                  if (isEditingWaypoints) {
                    const marker = e.target;
                    const position = marker.getLatLng();
                    handleWaypointDrag(waypoint.id, position);
                  }
                },
              }}
              icon={L.divIcon({
                html: `<div style="
                  background: ${isEditingWaypoints ? "#ff6b35" : "#018190"}; 
                  color: white; 
                  width: 24px; 
                  height: 24px; 
                  border-radius: 50%; 
                  display: flex; 
                  align-items: center; 
                  justify-content: center; 
                  font-size: 11px; 
                  font-weight: bold; 
                  border: 2px solid white;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                  ${
                    isEditingWaypoints
                      ? "cursor: move; transition: all 0.2s; box-shadow: 0 2px 8px rgba(255, 107, 53, 0.4);"
                      : ""
                  }
                " class="waypoint-marker ${
                  isEditingWaypoints ? "editable" : ""
                }">${index + 1}</div>`,
                className: `custom-waypoint-marker ${
                  isEditingWaypoints ? "edit-mode" : ""
                }`,
                iconSize: [24, 24],
                iconAnchor: [12, 12],
              })}
            >
              <Popup>
                <div className="text-center min-w-[180px]">
                  <strong>WP{index + 1}</strong>
                  <br />
                  <small>Waypoint {index + 1}</small>

                  {editingWaypoint === waypoint.id ? (
                    // Edit form
                    <div className="mt-2 space-y-2">
                      <div className="text-left">
                        <label className="text-xs font-medium">
                          Altitude (m):
                        </label>
                        <input
                          type="number"
                          value={waypoint.altitude}
                          onChange={(e) => {
                            const newAltitude = parseFloat(e.target.value) || 0;
                            setWaypoints((prev) =>
                              prev.map((wp) =>
                                wp.id === waypoint.id
                                  ? { ...wp, altitude: newAltitude }
                                  : wp,
                              ),
                            );
                          }}
                          className="w-full mt-1 px-2 py-1 text-xs border rounded"
                          step="0.1"
                        />
                      </div>
                      <div className="text-left">
                        <label className="text-xs font-medium">
                          Speed (m/s):
                        </label>
                        <input
                          type="number"
                          value={waypoint.speed}
                          onChange={(e) => {
                            const newSpeed = parseFloat(e.target.value) || 2.5;
                            setWaypoints((prev) =>
                              prev.map((wp) =>
                                wp.id === waypoint.id
                                  ? { ...wp, speed: newSpeed }
                                  : wp,
                              ),
                            );
                          }}
                          className="w-full mt-1 px-2 py-1 text-xs border rounded"
                          step="0.1"
                          min="0.1"
                        />
                      </div>
                      <div className="flex gap-1 mt-2">
                        <button
                          onClick={() => setEditingWaypoint(null)}
                          className="flex-1 px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Display mode
                    <div className="mt-1">
                      <small>Lat: {waypoint.lat.toFixed(6)}</small>
                      <br />
                      <small>Lng: {waypoint.lng.toFixed(6)}</small>
                      <br />
                      <small>Alt: {waypoint.altitude}m</small>
                      <br />
                      <small>Speed: {waypoint.speed}m/s</small>

                      {isEditingWaypoints && (
                        <div className="mt-2 space-y-1">
                          <div className="text-xs text-gray-600">
                            <strong>Drag to move</strong>
                          </div>
                          <button
                            onClick={() => setEditingWaypoint(waypoint.id)}
                            className="w-full px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                          >
                            Edit Parameters
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Edit Mode Notification */}
        {isEditingWaypoints && (
          <div
            className="leaflet-top leaflet-center"
            style={{
              marginTop: "10px",
              left: "50%",
              transform: "translateX(-50%)",
            }}
          >
            <div className="bg-orange-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium">
              <div className="flex items-center gap-2">
                <FaEdit size={12} />
                <span>Edit Mode: Drag waypoints to move them</span>
              </div>
            </div>
          </div>
        )}

        {/* Custom Set Home Location Button */}
        {activeMission && !homeLocation && (
          <div
            className="leaflet-top leaflet-right"
            style={{ marginTop: "1px", marginRight: "40px" }}
          >
            <div className="leaflet-control leaflet-bar">
              <button
                onClick={() => setIsSettingHome(!isSettingHome)}
                className={`${
                  isSettingHome
                    ? "bg-blue-500 hover:bg-blue-600 text-white"
                    : "bg-white dark:bg-black hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                } p-3 rounded-full shadow-lg transition-all border ${
                  isSettingHome
                    ? "border-blue-500"
                    : "border-gray-200 dark:border-gray-600"
                }`}
                title={
                  isSettingHome
                    ? "Click on map to set home"
                    : "Set Home Location"
                }
              >
                <FaHome className="text-base" />
              </button>
            </div>
          </div>
        )}

        {/* Map click handler for setting home location */}
        <MapClickHandler />

        {/* Home location marker with custom home icon */}
        {homeLocation && (
          <Marker
            position={[homeLocation.lat, homeLocation.lng]}
            icon={homeIcon}
          >
            <Popup>
              <strong>Home Location</strong>
              <br />
              {homeLocation.lat.toFixed(4)}, {homeLocation.lng.toFixed(4)}
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Floating Guide Button */}
      <div className="absolute bottom-16 right-6 z-1000 pointer-events-auto">
        <AnimatePresence>
          {showGuide && (
            <>
              {/* Backdrop untuk close saat klik di luar */}
              <div
                className="fixed inset-0 z-999"
                onClick={() => setShowGuide(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.2 }}
                className="absolute bottom-16 right-0 w-80 bg-white dark:bg-black rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 flex flex-col max-h-[calc(100vh-200px)] z-1000"
              >
                {/* Guide Header */}
                <div className="bg-blue-500 dark:bg-blue-600 text-white p-3 rounded-t-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FaQuestionCircle className="text-base" />
                    <h3 className="font-semibold">Mission Planner Guide</h3>
                  </div>
                  <button
                    onClick={() => setShowGuide(false)}
                    className="p-1 hover:bg-white/10 rounded transition-colors"
                  >
                    <FaTimes className="text-sm" />
                  </button>
                </div>

                {/* Guide Content - Scrollable */}
                <div className="overflow-y-auto p-4 space-y-3 text-sm custom-scrollbar">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-semibold">
                        1
                      </div>
                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                        Create New Mission
                      </h4>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 ml-7 text-xs">
                      Click "+ New Mission" button to start planning.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-semibold">
                        2
                      </div>
                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                        Set Home Location
                      </h4>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 ml-7 text-xs">
                      Click the <FaHome className="inline" /> button, then click
                      on map to set starting point.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-semibold">
                        3
                      </div>
                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                        Draw Waypoints
                      </h4>
                    </div>
                    <div className="text-gray-600 dark:text-gray-300 ml-7 text-xs space-y-1">
                      <p>Use drawing tools on the left:</p>
                      <ul className="list-disc list-inside space-y-0.5 text-xs">
                        <li>Polyline - Sequential path</li>
                        <li>Polygon - Area coverage</li>
                        <li>Rectangle - Quick area mapping</li>
                        <li>Circle - Circular patrol zone</li>
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-semibold">
                        4
                      </div>
                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                        Edit Waypoints
                      </h4>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 ml-7 text-xs">
                      Click on waypoint markers to edit altitude, speed, and
                      other parameters. Enable Edit Mode to drag waypoints.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-semibold">
                        5
                      </div>
                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                        Search Location
                      </h4>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 ml-7 text-xs">
                      Use the <FaSearch className="inline" /> search button at
                      the top to find coordinates.
                      <br />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Format: -6.2088, 106.8456
                      </span>
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-semibold">
                        6
                      </div>
                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                        Mission Parameters
                      </h4>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 ml-7 text-xs">
                      Adjust speed, delay, loiter time, and radius in the left
                      sidebar.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-semibold">
                        7
                      </div>
                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                        Save & Upload
                      </h4>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 ml-7 text-xs">
                      Click "Save Mission" to save, then "Upload to Vehicle" to
                      deploy.
                    </p>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Guide Toggle Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowGuide(!showGuide)}
          className={`${
            showGuide
              ? "bg-blue-500 hover:bg-blue-600"
              : "bg-white dark:bg-black hover:bg-gray-50 dark:hover:bg-gray-700"
          } ${
            showGuide ? "text-white" : "text-gray-700 dark:text-gray-200"
          } p-3 rounded-full shadow-lg transition-all border ${
            showGuide
              ? "border-blue-500"
              : "border-gray-200 dark:border-gray-600"
          } flex items-center justify-center`}
          title="Mission Planner Guide"
        >
          <FaQuestionCircle className="text-xl" />
        </motion.button>
      </div>
    </div>
  );
};

export default MissionMap;
