import { useState, useEffect, useCallback, useRef } from 'react'
import { WS_URL, API_BASE_URL } from '../config'
import {
  REALTIME_MODE,
  REALTIME_POLL_INTERVAL_MS
} from '../utils/realtimeConfig'

const toNumber = value => {
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

const sortLatestFirst = items =>
  [...items].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

const normalizeADCPData = (payload, fallback = {}) => {
  const timestamp =
    payload?.timestamp || payload?.date_time || fallback.timestamp || null
  const vehicleCode =
    payload?.vehicle_code || fallback.vehicle_code || fallback.vehicleCode || ''
  const sensorCode =
    payload?.sensor_code || fallback.sensor_code || fallback.sensorCode || ''

  if (!timestamp || !vehicleCode || !sensorCode) return null

  return {
    timestamp,
    vehicle_code: vehicleCode,
    sensor_code: sensorCode,
    sensor: payload?.sensor || fallback.sensor || null,
    latitude: toNumber(payload?.latitude ?? payload?.lat),
    longitude: toNumber(payload?.longitude ?? payload?.lon),
    altitude: toNumber(payload?.altitude),
    heading_deg: toNumber(payload?.heading_deg),
    gps_ok: typeof payload?.gps_ok === 'boolean' ? payload.gps_ok : null,
    ensemble_no: toNumber(payload?.ensemble_no),
    temperature_c: toNumber(payload?.temperature_c ?? payload?.temperature),
    v1_ms: toNumber(payload?.v1_ms),
    v2_ms: toNumber(payload?.v2_ms),
    v3_ms: toNumber(payload?.v3_ms),
    v4_ms: toNumber(payload?.v4_ms),
    current_speed_ms: toNumber(payload?.current_speed_ms),
    current_direction_deg: toNumber(payload?.current_direction_deg),
    water_depth_m: toNumber(payload?.water_depth_m)
  }
}

export const useADCPData = (vehicle = null) => {
  const vehicleCode = vehicle?.code || null
  const vehicleId = vehicle?.id || null
  const isPollingMode = REALTIME_MODE === 'api'

  const [adcpData, setADCPData] = useState([])
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState(null)
  const seenKeys = useRef(new Set())
  const selectedVehicleCodeRef = useRef(null)
  const fetchRequestIdRef = useRef(0)
  const vehicleCacheRef = useRef(new Map())

  const makeKey = entry =>
    `${entry.timestamp}|${entry.vehicle_code}|${entry.sensor_code}`

  const appendUnique = (existing, entry) => {
    const entryKey = makeKey(entry)
    const hasEntry = existing.some(item => makeKey(item) === entryKey)
    if (hasEntry) return existing
    return [entry, ...existing].slice(0, 1000)
  }

  useEffect(() => {
    selectedVehicleCodeRef.current = vehicleCode
      ? vehicleCode.toUpperCase()
      : null
  }, [vehicleCode])

  const fetchHistoricalData = useCallback(async () => {
    const token = localStorage.getItem('access_token')
    if (!token) return

    const requestId = ++fetchRequestIdRef.current
    const cacheKey = vehicleCode ? vehicleCode.toUpperCase() : 'ALL'

    const cachedData = vehicleCacheRef.current.get(cacheKey)
    if (cachedData && cachedData.length > 0) {
      seenKeys.current = new Set(cachedData.map(makeKey))
      setADCPData(cachedData)
    }

    try {
      let url = `${API_BASE_URL}/sensor-logs/?limit=300&sensor_id=2`
      if (vehicleId) url += `&vehicle_id=${vehicleId}`

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!response.ok) return

      const result = await response.json()
      const logs = result.data || []

      const normalized = logs
        .map(log => {
          let rawData = {}
          try {
            rawData =
              typeof log.data === 'string'
                ? JSON.parse(log.data)
                : log.data || {}
          } catch {
            return null
          }

          const n = normalizeADCPData(rawData, {
            timestamp: log.created_at,
            vehicle_code: log.vehicle?.code,
            sensor_code: log.sensor?.code
          })
          if (!n) return null
          if (!n.sensor_code.toUpperCase().includes('ADCP')) return null

          const currentVehicle = selectedVehicleCodeRef.current
          if (currentVehicle && n.vehicle_code.toUpperCase() !== currentVehicle) {
            return null
          }
          return n
        })
        .filter(Boolean)

      const sorted = sortLatestFirst(normalized)

      if (requestId !== fetchRequestIdRef.current) return

      vehicleCacheRef.current.set(cacheKey, sorted)
      seenKeys.current = new Set(sorted.map(makeKey))
      setADCPData(sorted)
    } catch {
      // Silently ignore; WebSocket will still stream live data
    }
  }, [vehicleId, vehicleCode])

  useEffect(() => {
    seenKeys.current = new Set()
    fetchHistoricalData()
  }, [fetchHistoricalData])

  const connectWebSocket = useCallback(() => {
    const token = localStorage.getItem('access_token')
    if (!token) return

    let websocket = null
    let pingInterval = null
    let reconnectTimeout = null
    let isIntentionalClose = false
    const maxReconnectDelay = 30000
    let reconnectDelay = 1000

    const connect = () => {
      const wsUrl = `${WS_URL}/ws/logs?token=${token}`
      websocket = new WebSocket(wsUrl)

      websocket.onopen = () => {
        setIsConnected(true)
        setError(null)
        reconnectDelay = 1000

        if (websocket?.readyState === WebSocket.OPEN) {
          websocket.send(JSON.stringify({ type: 'subscribe' }))
        }

        pingInterval = setInterval(() => {
          if (websocket?.readyState === WebSocket.OPEN) {
            websocket.send(JSON.stringify({ type: 'ping' }))
          } else {
            clearInterval(pingInterval)
          }
        }, 30000)
      }

      websocket.onmessage = event => {
        try {
          const data = JSON.parse(event.data)
          const messageType = data.message_type || data.type

          const handleNormalized = normalized => {
            if (!normalized) return
            if (!normalized.sensor_code.toUpperCase().includes('ADCP')) return

            const normalizedVehicleCode = normalized.vehicle_code.toUpperCase()
            const allCache = vehicleCacheRef.current.get('ALL') || []
            vehicleCacheRef.current.set('ALL', appendUnique(allCache, normalized))
            const vehicleCache = vehicleCacheRef.current.get(normalizedVehicleCode) || []
            vehicleCacheRef.current.set(normalizedVehicleCode, appendUnique(vehicleCache, normalized))

            const activeVehicleCode = selectedVehicleCodeRef.current
            if (activeVehicleCode && normalizedVehicleCode !== activeVehicleCode) return

            const key = makeKey(normalized)
            if (!seenKeys.current.has(key)) {
              seenKeys.current.add(key)
              setADCPData(prev => [normalized, ...prev].slice(0, 1000))
            }
          }

          if (messageType === 'sensor_data' && data.data) {
            handleNormalized(
              normalizeADCPData(data.data, {
                timestamp: data.timestamp,
                vehicle_code: data.vehicle_code,
                sensor_code: data.sensor_code
              })
            )
          } else if (messageType === 'sensor_log' && data.data) {
            const logPayload = data.data
            let rawData = {}
            try {
              rawData =
                typeof logPayload.data === 'string'
                  ? JSON.parse(logPayload.data)
                  : logPayload.data || {}
            } catch {
              return
            }
            handleNormalized(
              normalizeADCPData(rawData, {
                timestamp: logPayload.created_at || data.timestamp,
                vehicle_code: logPayload.vehicle?.code,
                sensor_code: logPayload.sensor?.code
              })
            )
          } else if (messageType === 'error') {
            setError(data.message)
          }
        } catch {
          // Ignore malformed websocket messages
        }
      }

      websocket.onerror = () => {
        setIsConnected(false)
        setError('WebSocket connection error')
      }

      websocket.onclose = () => {
        setIsConnected(false)
        if (pingInterval) {
          clearInterval(pingInterval)
          pingInterval = null
        }
        if (!isIntentionalClose) {
          reconnectTimeout = setTimeout(() => {
            reconnectDelay = Math.min(reconnectDelay * 2, maxReconnectDelay)
            connect()
          }, reconnectDelay)
        }
      }
    }

    connect()

    return () => {
      isIntentionalClose = true
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
      if (pingInterval) clearInterval(pingInterval)
      if (websocket?.readyState === WebSocket.OPEN) {
        websocket.close()
      }
    }
  }, [])

  useEffect(() => {
    if (isPollingMode) return
    const cleanup = connectWebSocket()
    return cleanup
  }, [connectWebSocket, isPollingMode])

  useEffect(() => {
    if (!isPollingMode) return
    const interval = setInterval(() => {
      fetchHistoricalData()
    }, REALTIME_POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fetchHistoricalData, isPollingMode])

  const clearData = useCallback(() => {
    setADCPData([])
  }, [])

  return { adcpData, isConnected, error, clearData }
}
