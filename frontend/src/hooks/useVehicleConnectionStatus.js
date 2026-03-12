import { useVehicleConnection } from '../contexts/VehicleConnectionContext'

/**
 * useVehicleConnectionStatus - Hook for realtime vehicle MQTT connection status (LWT)
 *
 * This is a wrapper around useVehicleConnection context hook.
 * Uses shared WebSocket connection across all components.
 *
 * @returns {object} - vehicleStatuses (map), getVehicleStatus(), isVehicleOnline(), isConnected
 */
const useVehicleConnectionStatus = () => {
  return useVehicleConnection()
}

export default useVehicleConnectionStatus
