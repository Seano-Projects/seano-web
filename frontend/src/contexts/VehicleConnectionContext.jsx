import {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
  useRef,
} from "react";
import {
  REALTIME_MODE,
  REALTIME_POLL_INTERVAL_MS,
} from "../utils/realtimeConfig";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Auto-detect WebSocket URL from API URL
const getWsUrl = () => {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }
  const apiUrl = API_URL.replace("https://", "wss://").replace(
    "http://",
    "ws://",
  );
  return apiUrl;
};
const WS_URL = getWsUrl();

// Create Context
const VehicleConnectionContext = createContext(null);

/**
 * VehicleConnectionProvider - Singleton WebSocket connection for MQTT LWT status
 *
 * Provides shared vehicle connection state across all components.
 * Only ONE WebSocket connection is created for the entire app.
 * All components using this context will receive the same real-time updates.
 */
export const VehicleConnectionProvider = ({ children }) => {
  const [vehicleStatuses, setVehicleStatuses] = useState({});
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const isPollingMode = REALTIME_MODE === "api";

  // Fetch initial connection statuses from backend
  const fetchInitialStatuses = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/vehicles/connection-statuses`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const statuses = await response.json();
        const statusMap = {};

        statuses.forEach(
          ({ vehicle_code, connection_status, last_connected }) => {
            statusMap[vehicle_code] = {
              status: connection_status,
              timestamp: last_connected,
              vehicle_code: vehicle_code,
            };
          },
        );

        setVehicleStatuses(statusMap);
      }
    } catch (err) {
      console.error("Failed to fetch initial vehicle statuses:", err);
    }
  }, []);

  const connectWebSocket = useCallback(() => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      return;
    }

    const maxReconnectDelay = 30000;
    let reconnectDelay = 1000;

    const connect = () => {
      // Use existing WebSocket endpoint (logs endpoint can handle all message types)
      const wsUrl = `${WS_URL}/ws/logs?token=${token}`;

      const websocket = new WebSocket(wsUrl);
      wsRef.current = websocket;

      websocket.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectDelay = 1000;

        // Send ping to keep connection alive
        const pingInterval = setInterval(() => {
          if (websocket?.readyState === WebSocket.OPEN) {
            websocket.send(JSON.stringify({ type: "ping" }));
          } else {
            clearInterval(pingInterval);
          }
        }, 30000);
      };

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle vehicle status updates from MQTT LWT
          if (data.type === "vehicle_status") {
            setVehicleStatuses((prev) => ({
              ...prev,
              [data.vehicle_code]: {
                status: data.status,
                timestamp: data.timestamp,
                vehicle_code: data.vehicle_code,
              },
            }));
          } else if (data.type === "pong") {
            // Heartbeat response
          } else if (data.type === "error") {
            setError(data.message);
          }
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
        }
      };

      websocket.onerror = () => {
        setIsConnected(false);
        setError("WebSocket connection error");
      };

      websocket.onclose = () => {
        setIsConnected(false);

        // Reconnect with exponential backoff
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectDelay = Math.min(reconnectDelay * 2, maxReconnectDelay);
          connect();
        }, reconnectDelay);
      };
    };

    connect();

    // Cleanup function
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [fetchInitialStatuses]);

  useEffect(() => {
    // Load initial statuses from backend on mount
    fetchInitialStatuses();

    if (isPollingMode) {
      setIsConnected(true);
      setError(null);
      const interval = setInterval(() => {
        fetchInitialStatuses();
      }, REALTIME_POLL_INTERVAL_MS);

      return () => clearInterval(interval);
    }

    // Then connect WebSocket for real-time updates
    const cleanup = connectWebSocket();
    return cleanup;
  }, [
    fetchInitialStatuses,
    connectWebSocket,
    isPollingMode,
    REALTIME_POLL_INTERVAL_MS,
  ]);

  /**
   * Get MQTT connection status for a specific vehicle
   * @param {string} vehicleCode - Vehicle code (e.g., "USV-01")
   * @returns {string} - "online", "offline", or "unknown"
   */
  const getVehicleStatus = useCallback(
    (vehicleCode) => {
      if (!vehicleCode) return "unknown";
      return vehicleStatuses[vehicleCode]?.status || "unknown";
    },
    [vehicleStatuses],
  );

  /**
   * Check if vehicle is connected to MQTT broker
   * @param {string} vehicleCode - Vehicle code
   * @returns {boolean}
   */
  const isVehicleOnline = useCallback(
    (vehicleCode) => {
      return getVehicleStatus(vehicleCode) === "online";
    },
    [getVehicleStatus],
  );

  const value = {
    vehicleStatuses,
    getVehicleStatus,
    isVehicleOnline,
    isConnected,
    error,
  };

  return (
    <VehicleConnectionContext.Provider value={value}>
      {children}
    </VehicleConnectionContext.Provider>
  );
};

/**
 * Hook to use Vehicle Connection Status
 * Must be used within VehicleConnectionProvider
 */
export const useVehicleConnection = () => {
  const context = useContext(VehicleConnectionContext);
  if (!context) {
    throw new Error(
      "useVehicleConnection must be used within VehicleConnectionProvider",
    );
  }
  return context;
};
