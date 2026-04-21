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

const normalizeCTDData = (payload, fallback = {}) => {
  const timestamp =
    payload?.timestamp || payload?.date_time || fallback.timestamp || null
  const vehicleCode =
    payload?.vehicle_code || fallback.vehicle_code || fallback.vehicleCode || ''
  const sensorCode =
    payload?.sensor_code || fallback.sensor_code || fallback.sensorCode || ''

  const depth = toNumber(payload?.depth ?? payload?.depth_m)
  const pressure = toNumber(payload?.pressure ?? payload?.pressure_m)
  const temperature = toNumber(payload?.temperature ?? payload?.temperature_c)
  const conductivity = toNumber(
    payload?.conductivity ?? payload?.conductivity_ms_cm
  )
  const salinity = toNumber(payload?.salinity ?? payload?.salinity_psu)
  const density = toNumber(payload?.density ?? payload?.density_kg_m3)
  const soundVelocity = toNumber(
    payload?.sound_velocity ?? payload?.sound_velocity_ms
  )
  const latitude = toNumber(payload?.latitude ?? payload?.lat)
  const longitude = toNumber(payload?.longitude ?? payload?.lon)
  const altitude = toNumber(payload?.altitude)
  const gpsOk =
    typeof payload?.gps_ok === 'boolean'
      ? payload.gps_ok
      : typeof payload?.gps_ok === 'string'
      ? payload.gps_ok.toLowerCase() === 'true'
      : null

  if (
    !timestamp ||
    !vehicleCode ||
    !sensorCode ||
    depth === null ||
    pressure === null ||
    temperature === null ||
    conductivity === null ||
    salinity === null ||
    density === null ||
    soundVelocity === null
  ) {
    return null
  }

  return {
    timestamp,
    vehicle_code: vehicleCode,
    sensor_code: sensorCode,
    sensor: payload?.sensor || fallback.sensor || null,
    latitude,
    longitude,
    altitude,
    gps_ok: gpsOk,
    depth,
    pressure,
    temperature,
    conductivity,
    salinity,
    density,
    sound_velocity: soundVelocity
  }
}

export const useCTDData = (vehicle = null) => {
  const vehicleCode = vehicle?.code || null
  const vehicleId = vehicle?.id || null
  const isPollingMode = REALTIME_MODE === 'api'

  const [ctdData, setCTDData] = useState([])
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
    return [...existing, entry].slice(-1000)
  }

  useEffect(() => {
    selectedVehicleCodeRef.current = vehicleCode
      ? vehicleCode.toUpperCase()
      : null
  }, [vehicleCode])

  // Fetch historical sensor log data from REST API on mount / vehicle change
  const fetchHistoricalData = useCallback(async () => {
    const token = localStorage.getItem('access_token')
    if (!token) return

    const requestId = ++fetchRequestIdRef.current
    const cacheKey = vehicleCode ? vehicleCode.toUpperCase() : 'ALL'

    // Show cached data immediately while refreshing in background.
    const cachedData = vehicleCacheRef.current.get(cacheKey)
    if (cachedData && cachedData.length > 0) {
      seenKeys.current = new Set(cachedData.map(makeKey))
      setCTDData(cachedData)
    }

    try {
      // Keep initial payload moderate to reduce filter-to-render latency on vehicle switch.
      let url = `${API_BASE_URL}/sensor-logs/?limit=300`
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

          const n = normalizeCTDData(rawData, {
            timestamp: log.created_at,
            vehicle_code: log.vehicle?.code,
            sensor_code: log.sensor?.code
          })
          if (!n) return null
          if (!n.sensor_code.toUpperCase().includes('CTD')) return null
          if (
            vehicleCode &&
            n.vehicle_code.toUpperCase() !== vehicleCode.toUpperCase()
          )
            return null
          return n
        })
        .filter(Boolean)

      // Ignore stale responses from previous vehicle selections.
      if (requestId !== fetchRequestIdRef.current) return

      vehicleCacheRef.current.set(cacheKey, normalized)
      seenKeys.current = new Set(normalized.map(makeKey))
      setCTDData(normalized)
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

    if (!token) {
      return
    }

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

          if (messageType === 'sensor_data' && data.data) {
            const normalized = normalizeCTDData(data.data, {
              timestamp: data.timestamp,
              vehicle_code: data.vehicle_code,
              sensor_code: data.sensor_code
            })

            if (!normalized) {
              return
            }

            const isCTD = normalized.sensor_code.toUpperCase().includes('CTD')
            if (!isCTD) {
              return
            }

            const normalizedVehicleCode = normalized.vehicle_code.toUpperCase()
            const allCache = vehicleCacheRef.current.get('ALL') || []
            vehicleCacheRef.current.set(
              'ALL',
              appendUnique(allCache, normalized)
            )
            const vehicleCache =
              vehicleCacheRef.current.get(normalizedVehicleCode) || []
            vehicleCacheRef.current.set(
              normalizedVehicleCode,
              appendUnique(vehicleCache, normalized)
            )

            const activeVehicleCode = selectedVehicleCodeRef.current
            if (
              activeVehicleCode &&
              normalized.vehicle_code.toUpperCase() !== activeVehicleCode
            ) {
              return
            }

            const key = makeKey(normalized)
            if (!seenKeys.current.has(key)) {
              seenKeys.current.add(key)
              setCTDData(prevData => {
                const newData = [...prevData, normalized]
                return newData.slice(-1000)
              })
            }
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

            const normalized = normalizeCTDData(rawData, {
              timestamp: logPayload.created_at || data.timestamp,
              vehicle_code: logPayload.vehicle?.code,
              sensor_code: logPayload.sensor?.code
            })

            if (!normalized) {
              return
            }

            const isCTD = normalized.sensor_code.toUpperCase().includes('CTD')
            if (!isCTD) {
              return
            }

            const normalizedVehicleCode = normalized.vehicle_code.toUpperCase()
            const allCache = vehicleCacheRef.current.get('ALL') || []
            vehicleCacheRef.current.set(
              'ALL',
              appendUnique(allCache, normalized)
            )
            const vehicleCache =
              vehicleCacheRef.current.get(normalizedVehicleCode) || []
            vehicleCacheRef.current.set(
              normalizedVehicleCode,
              appendUnique(vehicleCache, normalized)
            )

            const activeVehicleCode = selectedVehicleCodeRef.current
            if (
              activeVehicleCode &&
              normalized.vehicle_code.toUpperCase() !== activeVehicleCode
            ) {
              return
            }

            const key = makeKey(normalized)
            if (!seenKeys.current.has(key)) {
              seenKeys.current.add(key)
              setCTDData(prevData => {
                const newData = [...prevData, normalized]
                return newData.slice(-1000)
              })
            }
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
    if (isPollingMode) {
      return
    }

    const cleanup = connectWebSocket()
    return cleanup
  }, [connectWebSocket, isPollingMode])

  useEffect(() => {
    if (!isPollingMode) {
      return
    }

    const interval = setInterval(() => {
      fetchHistoricalData()
    }, REALTIME_POLL_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [fetchHistoricalData, isPollingMode, REALTIME_POLL_INTERVAL_MS])

  const clearData = useCallback(() => {
    setCTDData([])
  }, [])

  return {
    ctdData,
    isConnected,
    error,
    clearData
  }
}
