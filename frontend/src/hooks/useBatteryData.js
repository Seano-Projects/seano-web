import { useState, useEffect, useCallback } from 'react'
import { useLogData } from './useLogData'

/**
 * useBatteryData - Hook untuk battery monitoring real-time
 *
 * SUMBER DATA:
 * - useLogData hook yang sudah handle WebSocket connection
 * - WebSocket message type: "battery" di /ws/logs endpoint
 *
 * MESSAGE FORMAT:
 * {
 *   "type": "battery",
 *   "vehicle_id": 1,
 *   "vehicle_code": "USV001",
 *   "battery_id": 1,
 *   "percentage": 85.5,
 *   "voltage": 12.4,
 *   "current": 2.3,
 *   "temperature": 25.5,
 *   "status": "discharging",
 *   "timestamp": "2026-01-17T10:30:00Z"
 * }
 */
const useBatteryData = () => {
  const { batteryData: batteryDataFromLog } = useLogData()
  const [batteryLogs, setBatteryLogs] = useState([]) // Store battery history
  const [lastUpdate, setLastUpdate] = useState(null)

  // Monitor battery data changes and add to logs
  useEffect(() => {
    if (!batteryDataFromLog || Object.keys(batteryDataFromLog).length === 0) {
      return
    }

    // Convert current battery data to log entries
    Object.entries(batteryDataFromLog).forEach(([vehicleId, batteries]) => {
      Object.entries(batteries).forEach(([batteryId, battery]) => {
        if (battery) {
          const logEntry = {
            id: Date.now() + parseInt(batteryId),
            vehicle_id: parseInt(vehicleId),
            ...battery
          }

          setBatteryLogs(prev => {
            // Check if this entry already exists (avoid duplicates)
            const exists = prev.some(
              log =>
                log.vehicle_id === logEntry.vehicle_id &&
                log.battery_id === logEntry.battery_id &&
                log.timestamp === logEntry.timestamp
            )

            if (!exists) {
              const updated = [logEntry, ...prev].slice(0, 100)
              return updated
            }
            return prev
          })
        }
      })
    })

    setLastUpdate(new Date().toISOString())
  }, [batteryDataFromLog])

  // Get battery data for specific vehicle
  const getVehicleBatteries = useCallback(
    vehicleId => {
      if (!vehicleId || !batteryDataFromLog) {
        return { 1: null, 2: null }
      }
      return batteryDataFromLog[vehicleId] || { 1: null, 2: null }
    },
    [batteryDataFromLog]
  )

  // Get logs for specific vehicle
  const getVehicleLogs = useCallback(
    (vehicleId, batteryId = null, limit = 50) => {
      if (!vehicleId) return []

      let filtered = batteryLogs.filter(log => log.vehicle_id === vehicleId)

      if (batteryId !== null) {
        filtered = filtered.filter(log => log.battery_id === batteryId)
      }

      return filtered.slice(0, limit)
    },
    [batteryLogs]
  )

  // Get summary stats
  const getSummary = useCallback(
    vehicleId => {
      const batteries = getVehicleBatteries(vehicleId)
      const battery1 = batteries[1]
      const battery2 = batteries[2]

      const validBatteries = [battery1, battery2].filter(b => b !== null)

      if (validBatteries.length === 0) {
        return {
          totalCapacity: 0,
          averagePercentage: 0,
          totalVoltage: 0,
          totalCurrent: 0,
          avgTemperature: 0,
          batteryCount: 0
        }
      }

      const totalPercentage = validBatteries.reduce(
        (sum, b) => sum + (b.percentage || 0),
        0
      )
      const totalVoltage = validBatteries.reduce(
        (sum, b) => sum + (b.voltage || 0),
        0
      )
      const totalCurrent = validBatteries.reduce(
        (sum, b) => sum + (b.current || 0),
        0
      )
      const totalTemp = validBatteries.reduce(
        (sum, b) => sum + (b.temperature || 0),
        0
      )

      return {
        totalCapacity: 0, // This would come from battery specs if available
        averagePercentage: totalPercentage / validBatteries.length,
        totalVoltage,
        totalCurrent,
        avgTemperature: totalTemp / validBatteries.length,
        batteryCount: validBatteries.length
      }
    },
    [getVehicleBatteries]
  )

  return {
    batteryData: batteryDataFromLog || {},
    batteryLogs: batteryLogs || [],
    isConnected: true, // Connected through useLogData WebSocket
    lastUpdate,
    getVehicleBatteries,
    getVehicleLogs,
    getSummary
  }
}

export default useBatteryData
