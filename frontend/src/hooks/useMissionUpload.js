import { useState, useCallback } from 'react'
import axios from '../utils/axiosConfig'
import mqtt from 'mqtt'
import { API_ENDPOINTS } from '../config'
import { REALTIME_MODE } from '../utils/realtimeConfig'

const postWaypointLog = async (vehicleCode, missionId, missionName, waypointCount, status, message, initiatedAt, resolvedAt, mqttPublishedAt) => {
  try {
    await axios.post(API_ENDPOINTS.WAYPOINT_LOGS.CREATE, {
      vehicle_code: vehicleCode,
      mission_id: missionId || null,
      mission_name: missionName || '',
      waypoint_count: waypointCount || 0,
      status,
      message: message || '',
      initiated_at: initiatedAt,
      resolved_at: resolvedAt || null,
      mqtt_published_at: mqttPublishedAt || null
    })
  } catch {
    // log failure is non-blocking
  }
}

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
  const port = import.meta.env.VITE_MQTT_PORT || '8884'
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
    throw new Error('Connection to vehicle is not configured. Please contact your administrator.')
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
      reject(err || new Error('Could not connect to the vehicle. Please check your network.'))
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

const publishWaypointToMqtt = async (client, vehicleCode, payload) => {
  const timeout = (ms, message) =>
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms)
    })

  const topic = `seano/${String(vehicleCode || '').trim()}/waypoint`
  const data = JSON.stringify(payload)

  await Promise.race([
    new Promise((resolve, reject) => {
      // qos 1: mission waypoint data is large and critical — ensure broker receives it
      client.publish(topic, data, { qos: 1 }, err => {
        if (err) {
          reject(err)
          return
        }
        resolve()
      })
    }),
    timeout(MQTT_PUBLISH_TIMEOUT_MS, 'Upload timed out. Please check your connection and try again.')
  ])
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
    const responseTopic = `seano/${String(vehicleCode || '').trim()}/waypoint/response`
    const timeoutId = setTimeout(() => {
      cleanup()
      reject(new Error('The vehicle did not respond in time. Please check the vehicle status and try again.'))
    }, MQTT_WAYPOINT_ACK_TIMEOUT_MS)

    const cleanup = () => {
      clearTimeout(timeoutId)
      client.removeListener('message', onMessage)
      client.unsubscribe(responseTopic, () => {})
    }

    const onMessage = (topic, payloadBuffer) => {
      if (topic !== responseTopic) return

      let payload = {}
      try {
        payload = JSON.parse(payloadBuffer.toString())
      } catch {
        return
      }

      const payloadVehicle = payload.vehicle_id || payload.vehicle_code || payload.vehicleCode
      const sameVehicle =
        !payloadVehicle ||
        normalizeText(payloadVehicle) === normalizeText(vehicleCode)
      if (!sameVehicle) return

      const status = normalizeText(payload.status || payload.result || '')
      const message = String(payload.message || payload.detail || '')

      cleanup()
      if (status === 'SUCCESS' || status === 'OK') {
        resolve({ success: true, message: message || 'Mission uploaded successfully' })
      } else {
        resolve({ success: false, message: message || 'Waypoint upload failed on USV' })
      }
    }

    client.subscribe(responseTopic, { qos: 0 }, err => {
      if (err) {
        cleanup()
        reject(err)
        return
      }
      client.on('message', onMessage)
    })
  })

/**
 * Custom hook untuk handle mission upload ke vehicle
 */
const useMissionUpload = () => {
  const [uploadState, setUploadState] = useState({
    isUploading: false,
    progress: 0,
    currentStep: '', // 'validating', 'uploading', 'complete'
    error: null,
    success: false
  })
  const isPollingMode = REALTIME_MODE === 'api'

  /**
   * Get basic vehicle info (code only, no safety checks)
   */
  const getVehicleInfo = useCallback(
    async vehicleId => {
      try {
        const response = await axios.get(
          API_ENDPOINTS.VEHICLES.DETAIL(vehicleId)
        )
        const vehicle = response.data
        return {
          vehicleCode: vehicle?.code || vehicle?.vehicle_code || null
        }
      } catch (error) {
        setUploadState(prev => ({
          ...prev,
          error: 'Could not load vehicle information. Please try again.',
          currentStep: 'error'
        }))
        return null
      }
    },
    []
  )

  /**
   * Validate mission data sebelum upload
   */
  const validateMission = useCallback(mission => {
    const errors = []

    if (!mission.name || mission.name.trim() === '') {
      errors.push('Please give your mission a name')
    }

    if (!mission.waypoints || mission.waypoints.length === 0) {
      errors.push('Add at least one waypoint to your mission')
    }

    if (!mission.home_location) {
      errors.push('Set a home location before uploading')
    }

    if (mission.waypoints && mission.waypoints.length > 0) {
      const invalidWaypoints = mission.waypoints.filter(
        wp => typeof wp.lat !== 'number' || typeof wp.lng !== 'number'
      )
      if (invalidWaypoints.length > 0) {
        errors.push('Some waypoints have invalid coordinates')
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }, [])

  /**
   * Upload mission ke vehicle (MQTT atau API polling)
   * Process: validate -> publish/queue -> done
   */
  const uploadMissionToVehicle = useCallback(
    async (missionId, vehicleId, missionData, options = {}) => {
      try {
        // Reset state
        setUploadState({
          isUploading: true,
          progress: 15,
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
          progress: 40,
          currentStep: 'uploading'
        }))

        // Get vehicle code
        const vehicleInfo = await getVehicleInfo(vehicleId)
        if (!vehicleInfo || !vehicleInfo.vehicleCode) {
          throw new Error('Could not find the selected vehicle. Please try again.')
        }

        const vehicleCode = vehicleInfo.vehicleCode
        const missionName = missionData.name || ''
        const waypointCount = (missionData.waypoints || []).length
        const initiatedAt = new Date().toISOString()

        if (isPollingMode) {
          const payload = {
            vehicle_id: vehicleId,
            mission_name: missionName,
            waypoints: missionData.waypoints || [],
            home_location:
              missionData.home_location || missionData.homeLocation || null
          }
          const parameters =
            missionData.parameters ||
            missionData.upload_parameters ||
            missionData.uploadParameters ||
            null
          if (parameters) {
            payload.parameters = parameters
          }

          const response = await axios.post(
            API_ENDPOINTS.MISSIONS.UPLOAD_TO_VEHICLE(missionId),
            payload
          )

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
            message: response.data?.message || 'Mission sent to vehicle'
          }
        }

        // Build waypoint payload
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

        const client = await Promise.race([
          getMqttClient(),
          new Promise((_, reject) => {
            setTimeout(
              () => reject(new Error('Connection to vehicle timed out. Please try again.')),
              MQTT_CONNECT_TIMEOUT_MS
            )
          })
        ])

        // Publish waypoint to vehicle
        await publishWaypointToMqtt(client, vehicleCode, waypointPayload)
        const mqttPublishedAt = new Date().toISOString()

        // Log as pending — backend will update to success/failed when MQTT ACK arrives
        postWaypointLog(vehicleCode, missionId, missionName, waypointCount, 'pending', 'Waiting for vehicle confirmation', initiatedAt, null, mqttPublishedAt)

        // Wait for USV to ACK the upload via seano/{vehicleCode}/waypoint/response
        setUploadState(prev => ({
          ...prev,
          progress: 70,
          currentStep: 'waiting_ack'
        }))

        const ack = await waitForWaypointAck(client, vehicleCode)

        if (!ack.success) {
          throw new Error(ack.message)
        }

        // Update mission record: set vehicle_id and status to Ongoing
        try {
          await axios.put(API_ENDPOINTS.MISSIONS.UPDATE(missionId), {
            vehicle_id: vehicleId,
            status: 'Ongoing',
            completed_waypoint: 0,
            progress: 0,
          })
        } catch (_) {
          // Non-fatal: mission will still run even if DB update fails
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
          message: ack.message
        }
      } catch (error) {
        const errMsg = error.response?.data?.message || error.message || 'Upload failed. Please try again.'
        // Best-effort log: initiatedAt may be undefined if error happened before vehicleCode was set
        const _vehicleCode = missionData?.vehicle_code || missionData?.vehicleCode || ''
        if (_vehicleCode && !isPollingMode) {
          postWaypointLog(_vehicleCode, missionId, missionData?.name || '', (missionData?.waypoints || []).length, 'failed', errMsg, new Date().toISOString(), new Date().toISOString())
        }
        setUploadState({
          isUploading: false,
          progress: 0,
          currentStep: 'error',
          error: errMsg,
          success: false
        })

        return {
          success: false,
          error: errMsg
        }
      }
    },
    [getVehicleInfo, isPollingMode, validateMission]
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
  }, [])

  /**
   * Get human-readable status message
   */
  const getStatusMessage = useCallback(() => {
    const { currentStep, error } = uploadState

    if (error) return error

    const messages = {
      validating: 'Checking mission details...',
      uploading: 'Sending mission to vehicle...',
      waiting_ack: 'Waiting for vehicle response...',
      complete: 'Mission uploaded successfully!',
      error: 'Upload failed. Please try again.'
    }

    return messages[currentStep] || 'Preparing...'
  }, [uploadState])

  return {
    uploadState,
    validateMission,
    uploadMissionToVehicle,
    resetUploadState,
    getStatusMessage
  }
}

export default useMissionUpload
