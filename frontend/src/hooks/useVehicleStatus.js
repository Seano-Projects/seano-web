import { useState, useEffect, useRef } from 'react'
import {
  determineVehicleStatus,
  DebouncedStatusTracker
} from '../utils/vehicleStatus'

/**
 * Custom hook for managing vehicle connection status with debouncing
 * Prevents rapid status changes (flickering) by introducing grace periods
 *
 * @param {Object} params
 * @param {Object} params.vehicleLog - Latest vehicle log data
 * @param {WebSocket} params.websocket - WebSocket connection
 * @returns {Object} - Status information and utilities
 */
export const useVehicleStatus = ({ vehicleLog, websocket }) => {
  // Initialize debounced tracker (persists across renders)
  const trackerRef = useRef(new DebouncedStatusTracker())

  // Current status state
  const [status, setStatus] = useState('offline')
  const [lastDataTime, setLastDataTime] = useState(null)

  useEffect(() => {
    // Determine raw status (without debouncing)
    const rawStatus = determineVehicleStatus({
      lastDataTime: vehicleLog?.timestamp || vehicleLog?.created_at,
      websocket: websocket,
      currentTime: Date.now()
    })

    // Apply debouncing through tracker
    const debouncedStatus = trackerRef.current.updateStatus(rawStatus)

    // Update state if changed
    if (debouncedStatus !== status) {
      setStatus(debouncedStatus)
    }

    // Update last data time
    if (vehicleLog?.timestamp || vehicleLog?.created_at) {
      setLastDataTime(vehicleLog.timestamp || vehicleLog.created_at)
    }
  }, [vehicleLog, websocket, status])

  // Periodic check to update status based on time passing
  useEffect(() => {
    const interval = setInterval(() => {
      if (!lastDataTime) return

      const rawStatus = determineVehicleStatus({
        lastDataTime: lastDataTime,
        websocket: websocket,
        currentTime: Date.now()
      })

      const debouncedStatus = trackerRef.current.updateStatus(rawStatus)

      if (debouncedStatus !== status) {
        setStatus(debouncedStatus)
      }
    }, 5000) // Check every 5 seconds

    return () => clearInterval(interval)
  }, [lastDataTime, websocket, vehicleLog, status])

  return {
    status,
    lastDataTime,
    isOnline: status === 'online',
    isIdle: status === 'idle',
    isOffline: status === 'offline'
  }
}

export default useVehicleStatus
