import { useState } from 'react'
import mqtt from 'mqtt'
import axios from '../utils/axiosConfig'
import { API_ENDPOINTS } from '../config'

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

const publishCommandToMqtt = async (vehicleCode, command) => {
  const timeout = (ms, message) =>
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms)
    })

  const client = await Promise.race([
    getMqttClient(),
    timeout(MQTT_CONNECT_TIMEOUT_MS, 'MQTT connect timeout')
  ])

  const topicVehicleCode = String(vehicleCode || '').trim()
  const topic = `seano/${topicVehicleCode}/command`
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
    const statusTopic = `seano/${topicVehicleCode}/status`
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
    const finalCommand = SUPPORTED_COMMANDS.has(normalizedCommand)
      ? normalizedCommand
      : rawCommand

    try {
      if (SUPPORTED_COMMANDS.has(normalizedCommand)) {
        setIsLoading(true)
        await publishCommandToMqtt(vehicleCode, normalizedCommand)
        const client = await getMqttClient()
        return await waitForCommandAck(client, vehicleCode, normalizedCommand)
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

      const response = await axios.post(
        API_ENDPOINTS.CONTROL.COMMAND(vehicleCode),
        payload
      )
      return { success: true, message: response.data?.message }
    } catch (err) {
      const status = err.response?.status
      const errMsg = err.response?.data?.error || err.message

      if (!err.response) {
        return { success: false, error: 'mqtt_unavailable', message: errMsg }
      }

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
