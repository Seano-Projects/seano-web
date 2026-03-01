import { useState } from 'react'
import axios from '../utils/axiosConfig'
import { API_ENDPOINTS } from '../config'

/**
 * useControlCommand
 * Sends a control command (arm / disarm / set_mode) to the vehicle
 * via the backend → MQTT → hardware ACK flow.
 *
 * Returns:
 *  sendCommand(vehicleCode, command, mode?) → { success, message, error }
 *  isLoading  – true while waiting for hardware ACK
 */
const useControlCommand = () => {
  const [isLoading, setIsLoading] = useState(false)

  /**
   * @param {string} vehicleCode  – e.g. "USV-001"
   * @param {string} command      – "arm" | "disarm" | "set_mode"
   * @param {string} [mode]       – "MANUAL" | "AUTO" | "LOITER" | "RTL" (set_mode only)
   * @returns {{ success: boolean, message?: string, error?: string }}
   */
  const sendCommand = async (vehicleCode, command, mode = null) => {
    if (!vehicleCode) {
      return { success: false, error: 'no_vehicle' }
    }

    setIsLoading(true)
    try {
      const payload = { command }
      if (mode) payload.mode = mode

      const response = await axios.post(
        API_ENDPOINTS.CONTROL.COMMAND(vehicleCode),
        payload
      )
      return { success: true, message: response.data?.message }
    } catch (err) {
      const status = err.response?.status
      const errMsg = err.response?.data?.error || err.message

      // 503 = MQTT not configured (dev mode without broker)
      if (status === 503) {
        return { success: false, error: 'mqtt_unavailable', message: errMsg }
      }
      // 504 = hardware timeout
      if (status === 504) {
        return { success: false, error: 'timeout', message: errMsg }
      }
      // 422 = hardware replied with error
      if (status === 422) {
        return { success: false, error: 'hardware_error', message: errMsg }
      }
      return { success: false, error: 'unknown', message: errMsg }
    } finally {
      setIsLoading(false)
    }
  }

  return { sendCommand, isLoading }
}

export default useControlCommand
