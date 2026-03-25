import { useState, useCallback } from 'react'
import axios from '../utils/axiosConfig'
import mqtt from 'mqtt'
import { API_ENDPOINTS } from '../config'
import useVehicleConnectionStatus from './useVehicleConnectionStatus'

const MQTT_CONNECT_TIMEOUT_MS = 5000
const MQTT_PUBLISH_TIMEOUT_MS = 4000
const MQTT_WAYPOINT_ACK_TIMEOUT_MS = 12000

let mqttClient = null
let mqttClientPromise = null

const buildMqttUrl = () => {
  const explicitWsUrl = import.meta.env.VITE_MQTT_WS_URL
  if (explicitWsUrl) {
    return explicitWsUrl
  }

  const broker = import.meta.env.VITE_MQTT_BROKER
  const port = import.meta.env.VITE_MQTT_PORT || '443'
  const protocol = import.meta.env.VITE_MQTT_PROTOCOL || 'wss'
  const path = import.meta.env.VITE_MQTT_PATH || '/mqtt'

  if (!broker) {
    return null
  }

  return `${protocol}://${broker}:${port}${path}`
}

const getMqttClient = async () => {
  if (mqttClient?.connected) {
    return mqttClient
  }

  if (mqttClientPromise) {
    return mqttClientPromise
  }

  const mqttUrl = buildMqttUrl()
  if (!mqttUrl) {
    throw new Error(
      'MQTT config is missing. Set VITE_MQTT_WS_URL or VITE_MQTT_BROKER.'
    )
  }

  mqttClientPromise = new Promise((resolve, reject) => {
    const client = mqtt.connect(mqttUrl, {
      username: import.meta.env.VITE_MQTT_USERNAME || undefined,
      password: import.meta.env.VITE_MQTT_PASSWORD || undefined,
      connectTimeout: MQTT_CONNECT_TIMEOUT_MS,
      reconnectPeriod: 0,
      clean: true
    })

    const handleConnect = () => {
      client.off('error', handleError)
      mqttClient = client
      resolve(client)
    }

    const handleError = err => {
      client.off('connect', handleConnect)
      client.end(true)
      mqttClient = null
      mqttClientPromise = null
      reject(err || new Error('Failed to connect to MQTT broker'))
    }

    client.once('connect', handleConnect)
    client.once('error', handleError)
    client.on('close', () => {
      mqttClient = null
      mqttClientPromise = null
    })
  })

  try {
    const client = await mqttClientPromise
    mqttClientPromise = null
    return client
  } catch (err) {
    mqttClientPromise = null
    throw err
  }
}

const publishWaypointToMqtt = async (vehicleCode, payload) => {
  const timeout = (ms, message) =>
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms)
    })

  const client = await Promise.race([
    getMqttClient(),
    timeout(MQTT_CONNECT_TIMEOUT_MS, 'MQTT connect timeout')
  ])

  const topic = `seano/${String(vehicleCode || '').trim()}/waypoint`
  const data = JSON.stringify(payload)

  await Promise.race([
    new Promise((resolve, reject) => {
      client.publish(topic, data, { qos: 0 }, err => {
        if (err) {
          reject(err)
          return
        }
        resolve()
      })
    }),
    timeout(MQTT_PUBLISH_TIMEOUT_MS, 'MQTT waypoint publish timeout')
  ])

  return client
}

const normalizeText = value =>
  String(value || '')
    .trim()
    .toUpperCase()

const isFailureText = value => {
  const text = normalizeText(value)
  return text.includes('ERROR') || text.includes('FAILED')
}

const isWaypointRelated = text => {
  const normalized = normalizeText(text)
  return (
    normalized.includes('WAYPOINT') ||
    normalized.includes('MISSION') ||
    normalized.includes('HOME') ||
    normalized.includes('UPLOAD')
  )
}

const waitForWaypointAck = (client, vehicleCode) =>
  new Promise((resolve, reject) => {
    const statusTopic = `seano/${String(vehicleCode || '').trim()}/status`
    const timeoutId = setTimeout(() => {
      cleanup()
      reject(new Error('MQTT waypoint acknowledgement timeout'))
    }, MQTT_WAYPOINT_ACK_TIMEOUT_MS)

    const cleanup = () => {
      clearTimeout(timeoutId)
      client.removeListener('message', onMessage)
      client.unsubscribe(statusTopic, () => {})
    }

    const onMessage = (topic, payloadBuffer) => {
      if (topic !== statusTopic) {
        return
      }

      let payload = {}
      try {
        payload = JSON.parse(payloadBuffer.toString())
      } catch {
        return
      }

      const payloadVehicle =
        payload.vehicle_id || payload.vehicle_code || payload.vehicleCode
      const sameVehicle =
        !payloadVehicle ||
        normalizeText(payloadVehicle) === normalizeText(vehicleCode)
      if (!sameVehicle) {
        return
      }

      const status = String(payload.status || payload.result || '')
      const message = String(payload.message || payload.detail || '')
      const command = String(payload.command || payload.action || '')
      const evidence = `${status} ${message} ${command}`

      if (!isWaypointRelated(evidence)) {
        return
      }

      if (isFailureText(status) || isFailureText(message)) {
        cleanup()
        resolve({
          success: false,
          message: message || 'Waypoint upload failed'
        })
        return
      }

      cleanup()
      resolve({
        success: true,
        message: message || 'Waypoint uploaded successfully'
      })
    }

    client.subscribe(statusTopic, { qos: 0 }, err => {
      if (err) {
        cleanup()
        reject(err)
        return
      }

      client.on('message', onMessage)
    })
  })

/**
 * Custom hook untuk handle mission upload ke vehicle dengan safety checks
 * Includes vehicle state checking, battery validation, dan upload progress tracking
 */
const useMissionUpload = () => {
  const { getVehicleStatus, vehicleStatuses } = useVehicleConnectionStatus()

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
  const checkVehicleReadiness = useCallback(
    async vehicleId => {
      try {
        setUploadState(prev => ({
          ...prev,
          currentStep: 'checking',
          error: null
        }))

        // Fetch vehicle status dari API
        const response = await axios.get(
          API_ENDPOINTS.VEHICLES.DETAIL(vehicleId)
        )
        const vehicle = response.data

        // Fetch latest telemetry/logs untuk real-time status
        const logsResponse = await axios.get(
          `${API_ENDPOINTS.VEHICLES.LOGS(vehicleId)}?limit=1`
        )
        const latestLog = logsResponse.data?.[0]

        // Connection must come from MQTT LWT status topic only.
        const vehicleCode = vehicle?.code || vehicle?.vehicle_code || null
        const mqttConnectionStatus = vehicleCode
          ? getVehicleStatus(vehicleCode)
          : 'unknown'
        const mqttLastSeen = vehicleCode
          ? vehicleStatuses?.[vehicleCode]?.timestamp
          : null

        // Parse vehicle state
        const state = {
          vehicleCode: vehicleCode || null,
          isConnected: mqttConnectionStatus === 'online',
          status: mqttConnectionStatus,
          batteryLevel:
            vehicle.battery_level || latestLog?.battery_percentage || 0,
          hasActiveMission: vehicle.status === 'on_mission',
          armedState: latestLog?.armed_state || 'unknown',
          flightMode: latestLog?.flight_mode || 'unknown',
          lastSeen: mqttLastSeen || vehicle.last_seen || latestLog?.created_at
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
    },
    [getVehicleStatus, vehicleStatuses]
  )

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
   * Upload mission ke vehicle via MQTT (direct from frontend).
   * Process: validate -> readiness check -> publish waypoint payload -> wait status ack.
   */
  const uploadMissionToVehicle = useCallback(
    async (missionId, vehicleId, missionData, options = {}) => {
      try {
        const forceOverride = Boolean(options?.forceOverride)

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
        if (!forceOverride && (!vehicleReady || !vehicleReady.isReady)) {
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

        const vehicleCode =
          missionData.vehicle_code ||
          vehicleReady?.vehicleCode ||
          missionData.vehicleCode
        if (!vehicleCode) {
          throw new Error('Vehicle code not found for MQTT topic publishing')
        }

        // Use ROS command node "Bentuk A" payload for waypoint upload.
        const waypointPayload = {
          set_home_from_first_waypoint:
            missionData.set_home_from_first_waypoint !== false,
          waypoints: (missionData.waypoints || []).map(wp => {
            const mapped = {
              lat: Number(wp.lat ?? wp.latitude),
              lon: Number(wp.lng ?? wp.lon ?? wp.longitude),
              alt: Number(wp.altitude ?? wp.alt ?? 0)
            }

            const optionalFields = [
              'frame',
              'command',
              'param1',
              'param2',
              'param3',
              'param4',
              'autocontinue'
            ]

            optionalFields.forEach(key => {
              if (wp[key] !== undefined) {
                mapped[key] = wp[key]
              }
            })

            return mapped
          })
        }

        const client = await publishWaypointToMqtt(vehicleCode, waypointPayload)

        setUploadState(prev => ({
          ...prev,
          progress: 70,
          currentStep: 'verifying'
        }))

        const ack = await waitForWaypointAck(client, vehicleCode)
        if (!ack.success) {
          throw new Error(ack.message || 'Vehicle rejected waypoint upload')
        }

        setUploadState(prev => ({
          ...prev,
          progress: 100,
          currentStep: 'complete',
          success: true,
          isUploading: false
        }))

        return {
          success: true,
          data: {
            mission_id: missionId,
            vehicle_id: vehicleId,
            vehicle_code: vehicleCode,
            status_message: ack.message
          },
          message: ack.message || 'Mission uploaded successfully to vehicle'
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
