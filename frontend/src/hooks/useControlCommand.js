import { useRef, useState } from 'react'
import mqtt from 'mqtt'
import axios from '../utils/axiosConfig'
import { API_ENDPOINTS } from '../config'
import { REALTIME_MODE } from '../utils/realtimeConfig'

const postCommandLog = async (vehicleCode, command, status, message, initiatedAt, resolvedAt) => {
  try {
    await axios.post(API_ENDPOINTS.COMMAND_LOGS.CREATE, {
      vehicle_code: vehicleCode,
      command,
      status,
      message: message || '',
      initiated_at: initiatedAt,
      resolved_at: resolvedAt || null
    })
  } catch {
    // log failure is non-blocking
  }
}

const SUPPORTED_COMMANDS = new Set([
  'ARM',
  'FORCE_ARM',
  'DISARM',
  'FORCE_DISARM',
  'AUTO',
  'MANUAL',
  'HOLD',
  'LOITER',
  'RTL'
])

const MQTT_CONNECT_TIMEOUT_MS = 5000
const MQTT_PUBLISH_TIMEOUT_MS = 3000
const MQTT_COMMAND_ACK_TIMEOUT_MS = 5000
const API_THRUSTER_MIN_INTERVAL_MS = 200
const API_THRUSTER_TTL_MS = 1500

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

const publishThrusterToMqtt = async (vehicleCode, throttle, steering) => {
  const client = await getMqttClient()
  const topic = `seano/${String(vehicleCode || '').trim()}/thruster`
  const payload = JSON.stringify({ throttle, steering })
  return new Promise((resolve, reject) => {
    client.publish(topic, payload, { qos: 1 }, err => {
      if (err) reject(err)
      else resolve()
    })
  })
}

const publishCommandToMqtt = async (vehicleCode, command, topicSuffix = 'command') => {
  const timeout = (ms, message) =>
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms)
    })

  const client = await Promise.race([
    getMqttClient(),
    timeout(MQTT_CONNECT_TIMEOUT_MS, 'MQTT connect timeout')
  ])

  const topicVehicleCode = String(vehicleCode || '').trim()
  const topic = `seano/${topicVehicleCode}/${topicSuffix}`
  const payload = JSON.stringify({ command })

  await Promise.race([
    new Promise((resolve, reject) => {
      // qos 0 keeps command interaction snappy for operator control UI.
      client.publish(topic, payload, { qos: 0 }, err => {
        if (err) {
          reject(err)
          return
        }
        resolve()
      })
    }),
    timeout(MQTT_PUBLISH_TIMEOUT_MS, 'MQTT publish timeout')
  ])
}

const normalizeText = value =>
  String(value || '')
    .trim()
    .toUpperCase()

const isCalibrationCommand = value =>
  /^k\d+(\.\d+)?$/i.test(String(value || '').trim())

const isNegativeStatus = value => {
  const normalized = normalizeText(value)
  return normalized.includes('ERROR') || normalized.includes('FAILED')
}

const isPositiveStatus = value => {
  const normalized = normalizeText(value)
  return (
    normalized === 'OK' ||
    normalized === 'SUCCESS' ||
    normalized === 'ARMED' ||
    normalized === 'DISARMED'
  )
}

const waitForCommandAck = (client, vehicleCode, command) =>
  new Promise((resolve, reject) => {
    const topicVehicleCode = String(vehicleCode || '').trim()
    const statusTopic = `seano/${topicVehicleCode}/command/response`
    const normalizedCommand = normalizeText(command)
    const timeoutId = setTimeout(() => {
      cleanup()
      reject(new Error('MQTT command acknowledgement timeout'))
    }, MQTT_COMMAND_ACK_TIMEOUT_MS)

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

      const message = String(payload.message || payload.detail || '')
      const status = String(payload.status || payload.result || '')
      const payloadCommand = String(payload.command || payload.action || '')

      const referencesCommand =
        normalizeText(payloadCommand) === normalizedCommand ||
        normalizeText(message).includes(normalizedCommand)
      if (!referencesCommand) {
        return
      }

      if (isNegativeStatus(status) || isNegativeStatus(message)) {
        cleanup()
        resolve({
          success: false,
          error: 'hardware_error',
          message: message || `${command} failed`
        })
        return
      }

      if (isPositiveStatus(status) || isPositiveStatus(message)) {
        cleanup()
        resolve({ success: true, message: message || `${command} success` })
      }
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
 * useControlCommand
 * Sends a control command to the vehicle.
 * Supported commands are published directly to MQTT from frontend.
 * Unsupported commands fall back to backend API.
 *
 * Returns:
 *  sendCommand(vehicleCode, command, extraPayload?) → { success, message, error }
 *  isLoading  – true while waiting for hardware ACK
 */
const useControlCommand = () => {
  const [isLoading, setIsLoading] = useState(false)
  const isPollingMode = REALTIME_MODE === 'api'
  const lastThrusterApiSendRef = useRef(0)
  const lastThrusterPayloadRef = useRef({ throttle: null, steering: null })

  /**
   * @param {string} vehicleCode  – e.g. "USV-001"
   * @param {string} command      – e.g. "ARM" | "DISARM" | "AUTO"
   * @param {string|Object|null} [extraPayload] – optional legacy payload support
   * @returns {{ success: boolean, message?: string, error?: string }}
   */
  const sendCommand = async (vehicleCode, command, extraPayload = null) => {
    if (!vehicleCode) {
      return { success: false, error: 'no_vehicle' }
    }

    const rawCommand = String(command || '').trim()
    const normalizedCommand = rawCommand.toUpperCase()
    const calibrationCommand = isCalibrationCommand(rawCommand)
    const isSupportedModeCommand = SUPPORTED_COMMANDS.has(normalizedCommand)
    const mqttCommand = calibrationCommand ? rawCommand : normalizedCommand
    const finalCommand = isSupportedModeCommand
      ? normalizedCommand
      : rawCommand

    const useMqttForCommand =
      (isSupportedModeCommand || calibrationCommand) && !isPollingMode

    try {
      if (useMqttForCommand) {
        setIsLoading(true)
        const initiatedAt = new Date().toISOString()
        const topicSuffix = calibrationCommand ? 'battery/cmd' : 'command'
        await publishCommandToMqtt(vehicleCode, mqttCommand, topicSuffix)
        const shouldWaitAck = isSupportedModeCommand
        if (!shouldWaitAck) {
          const resolvedAt = new Date().toISOString()
          postCommandLog(
            vehicleCode,
            mqttCommand,
            'success',
            'Command sent via MQTT',
            initiatedAt,
            resolvedAt
          )
          return { success: true, message: 'Command sent via MQTT' }
        }
        const client = await getMqttClient()
        const result = await waitForCommandAck(client, vehicleCode, mqttCommand)
        const resolvedAt = new Date().toISOString()
        postCommandLog(
          vehicleCode,
          mqttCommand,
          result.success ? 'success' : (result.error || 'failed'),
          result.message || '',
          initiatedAt,
          resolvedAt
        )
        return result
      }

      setIsLoading(true)

      const payload = { command: finalCommand }

      if (typeof extraPayload === 'string' && extraPayload.trim()) {
        payload.mode = extraPayload.trim().toUpperCase()
      } else if (
        extraPayload &&
        typeof extraPayload === 'object' &&
        !Array.isArray(extraPayload)
      ) {
        Object.assign(payload, extraPayload)
      }

      const initiatedAt = new Date().toISOString()
      const response = await axios.post(
        API_ENDPOINTS.CONTROL.COMMAND(vehicleCode),
        payload
      )
      const status = String(response.data?.status || '').toLowerCase()
      const queued = status === 'queued'
      const message =
        response.data?.message ||
        (queued ? 'Command queued for vehicle' : 'Command sent')
      return { success: true, queued, message }
    } catch (err) {
      const status = err.response?.status
      const errMsg = err.response?.data?.error || err.message

      if (!err.response) {
        const msg = err.message || ''
        if (
          msg.includes('acknowledgement timeout') ||
          msg.includes('publish timeout') ||
          msg.includes('connect timeout')
        ) {
          if (useMqttForCommand) {
            postCommandLog(vehicleCode, mqttCommand, 'timeout', errMsg, new Date().toISOString(), new Date().toISOString())
          }
          return { success: false, error: 'timeout', message: errMsg }
        }
        if (useMqttForCommand) {
          postCommandLog(vehicleCode, mqttCommand, 'failed', errMsg, new Date().toISOString(), new Date().toISOString())
        }
        return { success: false, error: 'mqtt_unavailable', message: errMsg }
      }

      // 503 = MQTT not configured (dev mode without broker)
      if (status === 503) {
        if (useMqttForCommand) {
          postCommandLog(vehicleCode, mqttCommand, 'failed', errMsg, new Date().toISOString(), new Date().toISOString())
        }
        return { success: false, error: 'mqtt_unavailable', message: errMsg }
      }
      // 504 = hardware timeout
      if (status === 504) {
        if (useMqttForCommand) {
          postCommandLog(vehicleCode, mqttCommand, 'timeout', errMsg, new Date().toISOString(), new Date().toISOString())
        }
        return { success: false, error: 'timeout', message: errMsg }
      }
      // 422 = hardware replied with error
      if (status === 422) {
        if (useMqttForCommand) {
          postCommandLog(vehicleCode, mqttCommand, 'failed', errMsg, new Date().toISOString(), new Date().toISOString())
        }
        return { success: false, error: 'hardware_error', message: errMsg }
      }
      if (useMqttForCommand) {
        postCommandLog(vehicleCode, mqttCommand, 'failed', errMsg, new Date().toISOString(), new Date().toISOString())
      }
      return { success: false, error: 'unknown', message: errMsg }
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * @param {string} vehicleCode
   * @param {number} throttle  – [-100, 100]
   * @param {number} steering  – [-100, 100]
   */
  const sendThruster = async (vehicleCode, throttle, steering) => {
    if (!vehicleCode) return { success: false, error: 'no_vehicle' }
    if (isPollingMode) {
      const now = Date.now()
      const safeThrottle = Math.max(-100, Math.min(100, Number(throttle)))
      const safeSteering = Math.max(-100, Math.min(100, Number(steering)))
      const lastPayload = lastThrusterPayloadRef.current
      const samePayload =
        lastPayload.throttle === safeThrottle &&
        lastPayload.steering === safeSteering

      if (now - lastThrusterApiSendRef.current < API_THRUSTER_MIN_INTERVAL_MS && samePayload) {
        return { success: true, queued: true }
      }

      lastThrusterApiSendRef.current = now
      lastThrusterPayloadRef.current = {
        throttle: safeThrottle,
        steering: safeSteering
      }

      try {
        await axios.post(API_ENDPOINTS.THRUSTER.CREATE, {
          vehicle_code: vehicleCode,
          throttle: safeThrottle,
          steering: safeSteering,
          ttl_ms: API_THRUSTER_TTL_MS
        })
        return { success: true, queued: true }
      } catch (err) {
        const errMsg = err.response?.data?.error || err.message
        return { success: false, error: 'api_failed', message: errMsg }
      }
    }
    try {
      await publishThrusterToMqtt(vehicleCode, throttle, steering)
      return { success: true }
    } catch (err) {
      return { success: false, error: 'mqtt_unavailable', message: err.message }
    }
  }

  return { sendCommand, sendThruster, isLoading }
}

export default useControlCommand
