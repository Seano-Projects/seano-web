import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMapEvents,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState, useRef, useCallback, useMemo, memo } from "react";
import L from "leaflet";
import { MdMyLocation } from "react-icons/md";
import useVehicleData from "../../../hooks/useVehicleData";
import { useLogData } from "../../../hooks/useLogData";

// Memoized Vehicle Marker Component for better performance
const VehicleMarker = memo(
  ({ vehicle, vehicleLog, isSelected, selectedVehicle, createBoatIcon }) => {
    // Get position from log or vehicle data
    const lat = vehicleLog?.latitude ?? vehicle?.latitude;
    const lng = vehicleLog?.longitude ?? vehicle?.longitude;

    // Validate lat/lng are valid numbers
    if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) {
      return null;
    }

    // Get heading from vehicle log
    const heading = vehicleLog?.heading || vehicleLog?.yaw || 0;
    const icon = useMemo(
      () => createBoatIcon(vehicle.id, heading, isSelected),
      [vehicle.id, heading, isSelected, createBoatIcon],
    );

    return (
      <Marker key={vehicle.id} position={[lat, lng]} icon={icon}>
        <Popup>
          <div className="text-sm">
            <h3 className="font-semibold">{vehicle.name || "Unknown"}</h3>
            <p>
              {lat.toFixed(6)}, {lng.toFixed(6)}
            </p>
            {vehicleLog && (
              <p className="text-xs text-gray-500 mt-1">
                Speed:{" "}
                {vehicleLog.speed
                  ? `${vehicleLog.speed.toFixed(2)} m/s`
                  : "N/A"}{" "}
                | Heading: {heading.toFixed(1)}°
              </p>
            )}
          </div>
        </Popup>
      </Marker>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison for better memoization
    const prevLog = prevProps.vehicleLog;
    const nextLog = nextProps.vehicleLog;

    return (
      prevProps.vehicle.id === nextProps.vehicle.id &&
      prevProps.isSelected === nextProps.isSelected &&
      prevLog?.latitude === nextLog?.latitude &&
      prevLog?.longitude === nextLog?.longitude &&
      prevLog?.heading === nextLog?.heading &&
      prevLog?.yaw === nextLog?.yaw &&
      prevLog?.speed === nextLog?.speed
    );
  },
);

VehicleMarker.displayName = "VehicleMarker";

// Component to get map instance and trigger ready callback
const MapInstanceGetter = ({ onMapReady, onMapIdle, onUserInteraction }) => {
  const map = useMap();

  useEffect(() => {
    if (map && onMapReady) {
      onMapReady(map);
    }
  }, [map]); // Remove onMapReady from deps to avoid infinite loop

  useMapEvents({
    dragstart: () => {
      // Mark as user interaction immediately when drag starts
      if (onUserInteraction) {
        onUserInteraction();
      }
    },
    dragend: () => {
      onMapIdle();
    },
    zoomstart: () => {
      // Mark as user interaction when zoom starts
      if (onUserInteraction) {
        onUserInteraction();
      }
    },
    zoomend: () => {
      onMapIdle();
    },
    moveend: () => {
      // Also check on moveend (when map stops moving)
      onMapIdle();
    },
  });

  return null;
};

const ViewMap = ({ darkMode, selectedVehicle, vehicles: propVehicles }) => {
  const [showFocusButton, setShowFocusButton] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [showTrails, setShowTrails] = useState(true); // Toggle untuk menampilkan/menyembunyikan jalur

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const userInteractedRef = useRef(false);
  const isProgrammaticMoveRef = useRef(false);
  const iconCacheRef = useRef({});
  const lastFocusedVehicleRef = useRef(null); // Track last focused vehicle ID

  const { vehicles: hookVehicles } = useVehicleData();
  const vehicles = propVehicles || hookVehicles;
  const { vehicleLogs } = useLogData();

  // Get latest vehicle log for each vehicle
  const vehicleLogsMap = useMemo(() => {
    const map = {};
    vehicleLogs.forEach((log) => {
      const vehicleId = log.vehicle?.id || log.vehicle_id;
      if (vehicleId) {
        // Store with both string and number keys for compatibility
        const vehicleIdStr = String(vehicleId);
        const vehicleIdNum = Number(vehicleId);

        // Only update if this is the latest log for this vehicle
        const existingLog = map[vehicleIdStr] || map[vehicleIdNum];
        if (
          !existingLog ||
          new Date(log.created_at) > new Date(existingLog.created_at)
        ) {
          map[vehicleIdStr] = log;
          map[vehicleIdNum] = log; // Also store as number for compatibility
        }
      }
    });
    return map;
  }, [vehicleLogs]);

  // Generate vehicle trail/history path from logs
  const vehicleTrailsMap = useMemo(() => {
    const trailsMap = {};

    // Group logs by vehicle ID and sort by time
    vehicleLogs.forEach((log) => {
      const vehicleId = log.vehicle?.id || log.vehicle_id;
      if (!vehicleId) return;

      const lat = log.latitude;
      const lng = log.longitude;

      // Validate coordinates
      if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) return;

      const vehicleIdStr = String(vehicleId);

      if (!trailsMap[vehicleIdStr]) {
        trailsMap[vehicleIdStr] = [];
      }

      trailsMap[vehicleIdStr].push({
        position: [Number(lat), Number(lng)],
        timestamp: new Date(log.created_at).getTime(),
      });
    });

    // Sort each trail by timestamp and extract positions
    Object.keys(trailsMap).forEach((vehicleId) => {
      trailsMap[vehicleId] = trailsMap[vehicleId]
        .sort((a, b) => a.timestamp - b.timestamp)
        .map((item) => item.position)
        .filter((pos, index, arr) => {
          // Remove duplicate consecutive positions for cleaner trail
          if (index === 0) return true;
          const prev = arr[index - 1];
          return pos[0] !== prev[0] || pos[1] !== prev[1];
        });
    });

    return trailsMap;
  }, [vehicleLogs]);

  // Get vehicle position (from log or vehicle data)
  // Accepts either vehicle object or vehicle ID
  const getVehiclePosition = useCallback(
    (vehicleIdOrObject) => {
      if (!vehicleIdOrObject) {
        return null;
      }

      // Extract ID if it's an object
      const vehicleId = vehicleIdOrObject?.id || vehicleIdOrObject;
      if (!vehicleId && vehicleId !== 0) {
        return null;
      }

      // Try to find vehicle by ID (handle both string and number)
      const vehicle = vehicles.find((v) => {
        const vId = String(v.id);
        const searchId = String(vehicleId);
        return vId === searchId;
      });

      // Try to get vehicle log (handle both string and number keys)
      const vehicleLog =
        vehicleLogsMap[vehicleId] ||
        vehicleLogsMap[String(vehicleId)] ||
        vehicleLogsMap[Number(vehicleId)];

      // Priority: vehicle log > vehicle data
      const lat = vehicleLog?.latitude ?? vehicle?.latitude;
      const lng = vehicleLog?.longitude ?? vehicle?.longitude;

      // Validate lat/lng are numbers
      if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
        const position = [Number(lat), Number(lng)];
        return position;
      }

      // If vehicle exists but no position, return default center (Jakarta area)
      if (vehicle) {
        return [-6.86, 108.103]; // Default center (Jakarta area)
      }

      return null;
    },
    [vehicles, vehicleLogsMap],
  );

  const handleMapReady = (map) => {
    mapInstanceRef.current = map;
    setIsMapReady(true);

    setTimeout(() => {
      map.invalidateSize();
    }, 200);
  };

  // Handle user interaction (drag start, zoom start)
  const handleUserInteraction = useCallback(() => {
    // Mark as interacted immediately when user starts interacting
    if (mapInstanceRef.current && !isProgrammaticMoveRef.current) {
      userInteractedRef.current = true;
    }
  }, []);

  const handleMapIdle = useCallback(() => {
    // Check distance when map stops moving (only if not programmatic)
    if (
      mapInstanceRef.current &&
      !isProgrammaticMoveRef.current &&
      selectedVehicle
    ) {
      // Use setTimeout to ensure map center is updated
      setTimeout(() => {
        if (mapInstanceRef.current && selectedVehicle) {
          const map = mapInstanceRef.current;
          const position = getVehiclePosition(selectedVehicle);

          if (position) {
            try {
              const center = map.getCenter();
              const vehicleLatLng = L.latLng(position[0], position[1]);
              const distance = center.distanceTo(vehicleLatLng);
              const shouldShow = userInteractedRef.current && distance > 200;
              setShowFocusButton(shouldShow);
            } catch (error) {
              setShowFocusButton(false);
            }
          }
        }
      }, 100);
    }
    // Reset programmatic flag
    isProgrammaticMoveRef.current = false;
  }, [selectedVehicle, getVehiclePosition]);

  const checkDistanceFromVehicle = useCallback(
    (mapArg = null) => {
      const map = mapArg || mapInstanceRef.current;

      if (!map || !selectedVehicle) {
        setShowFocusButton(false);
        return;
      }

      const position = getVehiclePosition(selectedVehicle);

      if (!position) {
        setShowFocusButton(false);
        return;
      }

      try {
        const center = map.getCenter();
        const vehicleLatLng = L.latLng(position[0], position[1]);
        const distance = center.distanceTo(vehicleLatLng); // Distance in meters

        // Show button if user has interacted AND distance > 200 meters
        const shouldShow = userInteractedRef.current && distance > 200;
        setShowFocusButton(shouldShow);
      } catch (error) {
        setShowFocusButton(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedVehicle],
  );

  const focusToVehicle = (e) => {
    e?.preventDefault();
    e?.stopPropagation();

    const map = mapInstanceRef.current;
    if (!map) {
      return;
    }

    if (!selectedVehicle) {
      return;
    }

    const position = getVehiclePosition(selectedVehicle);
    if (!position) {
      return;
    }

    // Mark as programmatic move and use flyTo for smooth animation
    isProgrammaticMoveRef.current = true;
    map.flyTo(position, 15, {
      animate: true,
      duration: 1.5,
    });

    // Reset user interaction flag
    userInteractedRef.current = false;
    setShowFocusButton(false);

    // Reset programmatic flag after animation completes
    setTimeout(() => {
      isProgrammaticMoveRef.current = false;
      userInteractedRef.current = false;
      setShowFocusButton(false);
    }, 1600);
  };

  const createBoatIcon = useCallback((id, heading = 0, isSelected = false) => {
    const key = `${id}-${Math.round(heading / 5) * 5}-${isSelected}`; // Round to nearest 5 degrees for better caching
    if (iconCacheRef.current[key]) return iconCacheRef.current[key];

    const color = isSelected ? "#ef4444" : "#2563eb";
    const size = isSelected ? 40 : 35;

    const icon = L.divIcon({
      html: `
        <div style="
          width:${size}px;
          height:${size}px;
          transform: rotate(${heading}deg);
          display:flex;
          align-items:center;
          justify-content:center;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        ">
          <svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <!-- Boat Hull -->
            <path d="M 20 60 L 30 75 L 70 75 L 80 60 L 75 50 L 25 50 Z" 
              fill="${color}" 
              stroke="white" 
              stroke-width="2"/>
            <!-- Boat Deck -->
            <path d="M 30 50 L 35 40 L 65 40 L 70 50 Z" 
              fill="${isSelected ? "#dc2626" : "#1e40af"}" 
              stroke="white" 
              stroke-width="1.5"/>
            <!-- Mast -->
            <line x1="50" y1="40" x2="50" y2="20" 
              stroke="white" 
              stroke-width="2"/>
            <!-- Flag/Sail -->
            <path d="M 50 20 L 50 35 L 65 30 Z" 
              fill="white" 
              opacity="0.9"/>
            <!-- Porthole -->
            <circle cx="50" cy="55" r="3" fill="white" opacity="0.8"/>
          </svg>
        </div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      className: "boat-marker-icon",
    });

    iconCacheRef.current[key] = icon;

    // Limit cache size to prevent memory leaks
    const cacheKeys = Object.keys(iconCacheRef.current);
    if (cacheKeys.length > 100) {
      // Remove oldest entries (first 20)
      cacheKeys.slice(0, 20).forEach((k) => delete iconCacheRef.current[k]);
    }

    return icon;
  }, []);

  // Auto-focus when vehicle is selected - improved to handle vehicle changes properly
  useEffect(() => {
    if (!selectedVehicle) {
      lastFocusedVehicleRef.current = null;
      return;
    }

    // Don't try autofocus if vehicles are empty
    if (!vehicles || vehicles.length === 0) {
      return;
    }

    // Wait for map to be ready
    if (!mapInstanceRef.current || !isMapReady) {
      return;
    }

    // Check if this is a new vehicle selection
    const selectedVehicleId = String(selectedVehicle?.id || selectedVehicle);
    const lastFocusedId = String(lastFocusedVehicleRef.current);

    if (selectedVehicleId === lastFocusedId) {
      // Same vehicle, don't refocus
      return;
    }

    // New vehicle selected - focus to it with smooth animation
    const position = getVehiclePosition(selectedVehicle);

    if (position && mapInstanceRef.current) {
      // Update last focused vehicle
      lastFocusedVehicleRef.current = selectedVehicleId;

      // Reset user interaction flag for new vehicle
      userInteractedRef.current = false;
      setShowFocusButton(false);
      isProgrammaticMoveRef.current = true;

      try {
        // Use flyTo for smooth animated transition
        mapInstanceRef.current.flyTo(position, 15, {
          animate: true,
          duration: 1.2, // Smooth transition duration
        });

        // Reset programmatic flag after animation
        setTimeout(() => {
          isProgrammaticMoveRef.current = false;
        }, 1300);
      } catch (error) {
        isProgrammaticMoveRef.current = false;
      }
    }
  }, [selectedVehicle, isMapReady, vehicles, getVehiclePosition]);

  // Reset states when vehicle changes
  useEffect(() => {
    if (!selectedVehicle) {
      setShowFocusButton(false);
      userInteractedRef.current = false;
      lastFocusedVehicleRef.current = null;
      return;
    }

    // Hide focus button when vehicle changes (will reappear if user interacts)
    setShowFocusButton(false);
  }, [selectedVehicle]);

  // Check distance for focus button when vehicle log updates (with debounce for performance)
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedVehicle || !isMapReady) return;

    // Debounce distance check for better performance
    const timeoutId = setTimeout(() => {
      if (
        userInteractedRef.current &&
        mapInstanceRef.current &&
        selectedVehicle
      ) {
        const position = getVehiclePosition(selectedVehicle);
        if (position) {
          try {
            const center = mapInstanceRef.current.getCenter();
            const vehicleLatLng = L.latLng(position[0], position[1]);
            const distance = center.distanceTo(vehicleLatLng);
            const shouldShow = distance > 200;

            // Only update state if it actually changed to prevent unnecessary re-renders
            setShowFocusButton((prev) =>
              prev !== shouldShow ? shouldShow : prev,
            );
          } catch (error) {
            setShowFocusButton(false);
          }
        }
      }
    }, 300); // Increased debounce for better performance

    return () => clearTimeout(timeoutId);
  }, [vehicleLogsMap, selectedVehicle, isMapReady, getVehiclePosition]);

  // Get initial center position - use vehicle position if available
  const initialCenter = useMemo(() => {
    if (selectedVehicle && vehicles && vehicles.length > 0) {
      const position = getVehiclePosition(selectedVehicle);
      if (position) return position;
    }
    return [-6.86, 108.103]; // Default center
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVehicle, vehicles, vehicleLogsMap]);

  // Show focus button only if user has interacted and moved away from vehicle
  const shouldShowFocusButton =
    selectedVehicle &&
    showFocusButton &&
    getVehiclePosition(selectedVehicle) !== null;

  return (
    <div className="relative w-full h-full z-50">
      {shouldShowFocusButton && (
        <button
          onClick={focusToVehicle}
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute top-4 right-4 z-[9999] w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white shadow-2xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer pointer-events-auto border-2 border-white dark:border-gray-800"
          title="Kembali ke posisi kapal"
          type="button"
          aria-label="Focus to vehicle"
          style={{
            boxShadow: "0 10px 25px rgba(37, 99, 235, 0.5)",
          }}
        >
          <MdMyLocation className="w-7 h-7" />
        </button>
      )}

      {/* Toggle Trail Button */}
      <button
        onClick={() => setShowTrails(!showTrails)}
        onMouseDown={(e) => e.stopPropagation()}
        className={`absolute top-4 ${
          shouldShowFocusButton ? "right-20" : "right-4"
        } z-[9999] w-14 h-14 rounded-full ${
          showTrails
            ? "bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
            : "bg-gray-600 hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600"
        } text-white shadow-2xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer pointer-events-auto border-2 border-white dark:border-gray-800`}
        title={showTrails ? "Sembunyikan jalur" : "Tampilkan jalur"}
        type="button"
        aria-label="Toggle trail"
        style={{
          boxShadow: showTrails
            ? "0 10px 25px rgba(34, 197, 94, 0.5)"
            : "0 10px 25px rgba(75, 85, 99, 0.5)",
        }}
      >
        <svg
          className="w-7 h-7"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {/* Icon Route/Timeline Path */}
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
          />
        </svg>
      </button>

      <MapContainer
        ref={mapRef}
        scrollWheelZoom
        center={initialCenter}
        zoom={15}
        style={{ height: "100%", width: "100%" }}
        worldCopyJump={false}
        maxBounds={[
          [-85, -180],
          [85, 180],
        ]}
        maxBoundsViscosity={1.0}
        minZoom={2}
      >
        <MapInstanceGetter
          onMapReady={handleMapReady}
          onMapIdle={handleMapIdle}
          onUserInteraction={handleUserInteraction}
        />

        <TileLayer
          attribution="&copy; Esri"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          noWrap={true}
          updateWhenIdle
          updateWhenZooming={false}
          keepBuffer={2}
        />

        {/* Vehicle Trail/History Lines */}
        {showTrails &&
          vehicles.map((vehicle) => {
            const vehicleId = String(vehicle.id);
            const trail = vehicleTrailsMap[vehicleId];

            // Only show trail if it has at least 2 points
            if (!trail || trail.length < 2) return null;

            const isSelected = String(vehicle.id) === String(selectedVehicle);

            // Color based on selection - more visible for selected vehicle
            const lineColor = isSelected ? "#ef4444" : "#2563eb";
            const lineOpacity = isSelected ? 0.8 : 0.5;
            const lineWeight = isSelected ? 4 : 2.5;

            return (
              <Polyline
                key={`trail-${vehicle.id}`}
                positions={trail}
                pathOptions={{
                  color: lineColor,
                  weight: lineWeight,
                  opacity: lineOpacity,
                  lineCap: "round",
                  lineJoin: "round",
                }}
              />
            );
          })}

        {vehicles.map((vehicle) => {
          // Try to get vehicle log with fallback for string/number ID mismatch
          const vehicleLog =
            vehicleLogsMap[vehicle.id] ||
            vehicleLogsMap[String(vehicle.id)] ||
            vehicleLogsMap[Number(vehicle.id)];
          const isSelected = String(vehicle.id) === String(selectedVehicle);

          return (
            <VehicleMarker
              key={vehicle.id}
              vehicle={vehicle}
              vehicleLog={vehicleLog}
              isSelected={isSelected}
              selectedVehicle={selectedVehicle}
              createBoatIcon={createBoatIcon}
            />
          );
        })}
      </MapContainer>
    </div>
  );
};

export default memo(ViewMap);
