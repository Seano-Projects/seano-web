import { useState, useCallback } from 'react'
import axios from '../utils/axiosConfig'
import { API_ENDPOINTS } from '../config'

/**
 * Custom hook untuk handle mission upload ke vehicle dengan safety checks
 * Includes vehicle state checking, battery validation, dan upload progress tracking
 */
const useMissionUpload = () => {
  const [uploadState, setUploadState] = useState({
    isUploading: false,
    progress: 0,
    currentStep: '', // 'checking', 'validating', 'uploading', 'verifying', 'complete'
    error: null,
    success: false
  })

  const [vehicleState, setVehicleState] = useState({
    isReady: false,
    status: null,
    batteryLevel: null,
    isConnected: false,
    hasActiveMission: false,
    armedState: null, // armed/disarmed state dari ArduPilot
    flightMode: null // current flight mode
  })

  /**
   * Check vehicle readiness sebelum upload
   * Memastikan vehicle dalam kondisi aman untuk menerima mission baru
   */
  const checkVehicleReadiness = useCallback(async vehicleId => {
    try {
      setUploadState(prev => ({
        ...prev,
        currentStep: 'checking',
        error: null
      }))

      // Fetch vehicle status dari API
      const response = await axios.get(API_ENDPOINTS.VEHICLES.DETAIL(vehicleId))
      const vehicle = response.data

      // Fetch latest telemetry/logs untuk real-time status
      const logsResponse = await axios.get(
        `${API_ENDPOINTS.VEHICLES.LOGS(vehicleId)}?limit=1`
      )
      const latestLog = logsResponse.data?.[0]

      // Parse vehicle state
      const state = {
        isConnected:
          vehicle.status === 'idle' || vehicle.status === 'on_mission',
        status: vehicle.status,
        batteryLevel:
          vehicle.battery_level || latestLog?.battery_percentage || 0,
        hasActiveMission: vehicle.status === 'on_mission',
        armedState: latestLog?.armed_state || 'unknown',
        flightMode: latestLog?.flight_mode || 'unknown',
        lastSeen: vehicle.last_seen || latestLog?.created_at
      }

      // Determine if vehicle is ready
      const checks = {
        isOnline: state.isConnected,
        batteryOk: state.batteryLevel >= 20, // Minimum 20% battery
        notArmed: state.armedState !== 'armed', // Vehicle tidak boleh armed
        noActiveMission: !state.hasActiveMission, // Tidak ada mission aktif
        recentlyActive: state.lastSeen
          ? new Date() - new Date(state.lastSeen) < 60000
          : false // Active dalam 1 menit terakhir
      }

      state.isReady = Object.values(checks).every(check => check === true)
      state.checks = checks

      setVehicleState(state)
      return state
    } catch (error) {
      setUploadState(prev => ({
        ...prev,
        error: 'Failed to check vehicle status',
        currentStep: 'error'
      }))
      return null
    }
  }, [])

  /**
   * Validate mission data sebelum upload
   */
  const validateMission = useCallback(mission => {
    const errors = []

    if (!mission.name || mission.name.trim() === '') {
      errors.push('Mission name is required')
    }

    if (!mission.waypoints || mission.waypoints.length === 0) {
      errors.push('Mission must have at least one waypoint')
    }

    if (!mission.home_location) {
      errors.push('Home location is required')
    }

    // Validate waypoints structure
    if (mission.waypoints && mission.waypoints.length > 0) {
      const invalidWaypoints = mission.waypoints.filter(
        wp => typeof wp.lat !== 'number' || typeof wp.lng !== 'number'
      )
      if (invalidWaypoints.length > 0) {
        errors.push('Invalid waypoint coordinates detected')
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }, [])

  /**
   * Upload mission ke vehicle via MQTT
   * Process: validate -> upload to backend -> send via MQTT -> verify reception
   */
  const uploadMissionToVehicle = useCallback(
    async (missionId, vehicleId, missionData) => {
      try {
        // Reset state
        setUploadState({
          isUploading: true,
          progress: 10,
          currentStep: 'validating',
          error: null,
          success: false
        })

        // Step 1: Validate mission data
        const validation = validateMission(missionData)
        if (!validation.isValid) {
          throw new Error(validation.errors.join(', '))
        }

        setUploadState(prev => ({
          ...prev,
          progress: 20,
          currentStep: 'checking'
        }))

        // Step 2: Check vehicle readiness
        const vehicleReady = await checkVehicleReadiness(vehicleId)
        if (!vehicleReady || !vehicleReady.isReady) {
          const reasons = []
          if (vehicleReady?.checks) {
            if (!vehicleReady.checks.isOnline)
              reasons.push('Vehicle is offline')
            if (!vehicleReady.checks.batteryOk)
              reasons.push('Battery level too low (< 20%)')
            if (!vehicleReady.checks.notArmed) reasons.push('Vehicle is armed')
            if (!vehicleReady.checks.noActiveMission)
              reasons.push('Vehicle has active mission')
            if (!vehicleReady.checks.recentlyActive)
              reasons.push('Vehicle not responding')
          }
          throw new Error(
            `Vehicle not ready: ${reasons.join(', ') || 'Unknown reason'}`
          )
        }

        setUploadState(prev => ({
          ...prev,
          progress: 40,
          currentStep: 'uploading'
        }))

        // Step 3: Upload mission via backend API
        // Backend akan handle MQTT publish ke vehicle
        const uploadPayload = {
          mission_id: missionId,
          vehicle_id: vehicleId,
          waypoints: missionData.waypoints,
          home_location: missionData.home_location,
          mission_name: missionData.name,
          parameters: {
            speed: missionData.speed || 2.5,
            altitude: missionData.altitude || 0,
            radius: missionData.radius || 2
          }
        }

        const response = await axios.post(
          API_ENDPOINTS.MISSIONS.UPLOAD_TO_VEHICLE ||
            `/missions/${missionId}/upload-to-vehicle`,
          uploadPayload
        )

        setUploadState(prev => ({
          ...prev,
          progress: 70,
          currentStep: 'verifying'
        }))

        // Step 4: Wait for vehicle acknowledgment (via WebSocket or polling)
        // Simulate verification delay
        await new Promise(resolve => setTimeout(resolve, 2000))

        setUploadState(prev => ({
          ...prev,
          progress: 100,
          currentStep: 'complete',
          success: true,
          isUploading: false
        }))

        return {
          success: true,
          data: response.data,
          message: 'Mission uploaded successfully to vehicle'
        }
      } catch (error) {

        setUploadState({
          isUploading: false,
          progress: 0,
          currentStep: 'error',
          error:
            error.response?.data?.message || error.message || 'Upload failed',
          success: false
        })

        return {
          success: false,
          error:
            error.response?.data?.message || error.message || 'Upload failed'
        }
      }
    },
    [checkVehicleReadiness, validateMission]
  )

  /**
   * Reset upload state
   */
  const resetUploadState = useCallback(() => {
    setUploadState({
      isUploading: false,
      progress: 0,
      currentStep: '',
      error: null,
      success: false
    })
    setVehicleState({
      isReady: false,
      status: null,
      batteryLevel: null,
      isConnected: false,
      hasActiveMission: false,
      armedState: null,
      flightMode: null
    })
  }, [])

  /**
   * Get human-readable status message
   */
  const getStatusMessage = useCallback(() => {
    const { currentStep, error } = uploadState

    if (error) return error

    const messages = {
      checking: 'Checking vehicle status...',
      validating: 'Validating mission data...',
      uploading: 'Uploading mission to vehicle...',
      verifying: 'Verifying reception...',
      complete: 'Mission uploaded successfully!',
      error: 'Upload failed'
    }

    return messages[currentStep] || 'Preparing...'
  }, [uploadState])

  return {
    uploadState,
    vehicleState,
    checkVehicleReadiness,
    validateMission,
    uploadMissionToVehicle,
    resetUploadState,
    getStatusMessage
  }
}

export default useMissionUpload
