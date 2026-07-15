import { useState, useEffect, useCallback, useRef } from 'react'
import { WS_URL, API_BASE_URL } from '../config'
import {
  REALTIME_MODE,
  REALTIME_POLL_INTERVAL_MS
} from '../utils/realtimeConfig'
import { getAuthenticatedWebSocketUrl } from '../utils/wsAuth'

const toNumber = value => {
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

const sortLatestFirst = items =>
  [...items].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

const makeKey = entry =>
  [
    entry.timestamp,
    entry.vehicle_code,
    entry.sensor_code,
    entry.depth,
    entry.latitude,
    entry.longitude
  ].join('|')

const appendUnique = (existing, entries) => {
  const incomingEntries = Array.isArray(entries) ? entries : [entries]
  if (incomingEntries.length === 0) return existing

  const existingKeys = new Set(existing.map(makeKey))
  const uniqueIncoming = incomingEntries.filter(entry => {
    const entryKey = makeKey(entry)
    if (existingKeys.has(entryKey)) return false
    existingKeys.add(entryKey)
    return true
  })

  if (uniqueIncoming.length === 0) return existing
  return [...uniqueIncoming, ...existing].slice(0, 1000)
}

const normalizeSingleCTDEntry = (payload, fallback = {}) => {
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
  const latitude = toNumber(
    payload?.latitude ?? payload?.lat ?? fallback.latitude ?? fallback.lat
  )
  const longitude = toNumber(
    payload?.longitude ?? payload?.lon ?? fallback.longitude ?? fallback.lon
  )
  const altitude = toNumber(payload?.altitude ?? fallback.altitude)
  const gpsOk =
    typeof payload?.gps_ok === 'boolean'
      ? payload.gps_ok
      : typeof payload?.gps_ok === 'string'
      ? payload.gps_ok.toLowerCase() === 'true'
      : typeof fallback?.gps_ok === 'boolean'
      ? fallback.gps_ok
      : typeof fallback?.gps_ok === 'string'
      ? fallback.gps_ok.toLowerCase() === 'true'
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

const buildMetaFallback = (payload, fallback) => ({
  ...fallback,
  timestamp:
    payload?.timestamp || payload?.date_time || fallback.timestamp || null,
  vehicle_code:
    payload?.vehicle_code || fallback.vehicle_code || fallback.vehicleCode || '',
  sensor_code:
    payload?.sensor_code || fallback.sensor_code || fallback.sensorCode || '',
  sensor: payload?.sensor || fallback.sensor || null,
  latitude: payload?.latitude ?? payload?.lat ?? fallback.latitude,
  longitude: payload?.longitude ?? payload?.lon ?? fallback.longitude,
  altitude: payload?.altitude ?? fallback.altitude,
  gps_ok:
    typeof payload?.gps_ok === 'boolean' || typeof payload?.gps_ok === 'string'
      ? payload.gps_ok
      : fallback.gps_ok,
})

const normalizeCTDData = (payload, fallback = {}) => {
  // Format columnar: {columns:[...], data:[[...]]} — format baru dari USV
  if (
    Array.isArray(payload?.columns) &&
    Array.isArray(payload?.data) &&
    payload.data.length > 0
  ) {
    const colIdx = {}
    payload.columns.forEach((col, i) => { colIdx[col] = i })
    const meta = buildMetaFallback(payload, fallback)
    const get = (row, name) => {
      const i = colIdx[name]
      return i !== undefined ? toNumber(row[i]) : null
    }
    return payload.data
      .map(row => {
        if (!Array.isArray(row)) return null
        const depth = get(row, 'depth')
        const pressure = get(row, 'pressure')
        const temperature = get(row, 'temperature')
        const conductivity = get(row, 'conductivity')
        const salinity = get(row, 'salinity')
        const density = get(row, 'density')
        const soundVelocity = get(row, 'sound_velocity')
        if (
          !meta.timestamp || !meta.vehicle_code || !meta.sensor_code ||
          depth === null || pressure === null || temperature === null ||
          conductivity === null || salinity === null ||
          density === null || soundVelocity === null
        ) return null
        return {
          timestamp: meta.timestamp,
          vehicle_code: meta.vehicle_code,
          sensor_code: meta.sensor_code,
          sensor: meta.sensor,
          latitude: toNumber(meta.latitude),
          longitude: toNumber(meta.longitude),
          altitude: toNumber(meta.altitude),
          gps_ok: meta.gps_ok ?? null,
          depth,
          pressure,
          temperature,
          conductivity,
          salinity,
          density,
          sound_velocity: soundVelocity,
        }
      })
      .filter(Boolean)
  }

  // Format profile[]: {profile:[{depth,temperature,...}]} — dari WS sensor_data
  if (Array.isArray(payload?.profile) && payload.profile.length > 0) {
    const meta = buildMetaFallback(payload, fallback)
    return payload.profile
      .map((profileEntry, profileIndex) =>
        normalizeSingleCTDEntry(profileEntry, { ...meta, profile_index: profileIndex })
      )
      .filter(Boolean)
  }

  // Single entry fallback
  const normalized = normalizeSingleCTDEntry(payload, fallback)
  return normalized ? [normalized] : []
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
      // Find CTD sensor IDs first
      const sensorRes = await fetch(`${API_BASE_URL}/sensors/`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!sensorRes.ok) return
      const sensorList = await sensorRes.json()
      const sensors = Array.isArray(sensorList) ? sensorList : sensorList.data || []
      const ctdSensor = sensors.find(s => s.code && s.code.toUpperCase().includes('CTD'))
      if (!ctdSensor) return

      let url = `${API_BASE_URL}/sensor-logs/?limit=500&order=desc&skip_count=true&sensor_id=${ctdSensor.id}`
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

          const normalizedEntries = normalizeCTDData(rawData, {
            timestamp: log.created_at,
            vehicle_code: log.vehicle?.code,
            sensor_code: log.sensor?.code
          })
          if (normalizedEntries.length === 0) return []
          return normalizedEntries.filter(entry => {
            if (!vehicleCode) return true
            return (
              entry.vehicle_code.toUpperCase() === vehicleCode.toUpperCase()
            )
          })
        })
        .flat()

      const sorted = sortLatestFirst(normalized)

      // Ignore stale responses from previous vehicle selections.
      if (requestId !== fetchRequestIdRef.current) return

      vehicleCacheRef.current.set(cacheKey, sorted)
      seenKeys.current = new Set(sorted.map(makeKey))
      setCTDData(sorted)
    } catch {
      // Silently ignore; WebSocket will still stream live data
    }
  }, [vehicleId, vehicleCode])

  useEffect(() => {
    seenKeys.current = new Set()
    setCTDData([])
    fetchHistoricalData()
  }, [fetchHistoricalData])

  const connectWebSocket = useCallback(() => {
    let websocket = null
    let pingInterval = null
    let reconnectTimeout = null
    let isIntentionalClose = false
    const maxReconnectDelay = 30000
    let reconnectDelay = 1000

    const connect = () => {
      ;(async () => {
        const wsUrl = await getAuthenticatedWebSocketUrl(WS_URL, '/ws/logs')
        if (!wsUrl || isIntentionalClose) return

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
            const normalizedEntries = normalizeCTDData(data.data, {
              timestamp: data.timestamp,
              vehicle_code: data.vehicle_code,
              sensor_code: data.sensor_code
            })

            if (normalizedEntries.length === 0) {
              return
            }

            const ctdEntries = normalizedEntries.filter(entry =>
              entry.sensor_code.toUpperCase().includes('CTD')
            )
            if (ctdEntries.length === 0) {
              return
            }

            const allCache = vehicleCacheRef.current.get('ALL') || []
            vehicleCacheRef.current.set('ALL', appendUnique(allCache, ctdEntries))

            const entriesByVehicle = ctdEntries.reduce((acc, entry) => {
              const normalizedVehicleCode = entry.vehicle_code.toUpperCase()
              if (!acc.has(normalizedVehicleCode)) {
                acc.set(normalizedVehicleCode, [])
              }
              acc.get(normalizedVehicleCode).push(entry)
              return acc
            }, new Map())

            entriesByVehicle.forEach((entries, normalizedVehicleCode) => {
              const vehicleCache =
                vehicleCacheRef.current.get(normalizedVehicleCode) || []
              vehicleCacheRef.current.set(
                normalizedVehicleCode,
                appendUnique(vehicleCache, entries)
              )
            })

            const activeVehicleCode = selectedVehicleCodeRef.current
            const visibleEntries = activeVehicleCode
              ? ctdEntries.filter(
                  entry => entry.vehicle_code.toUpperCase() === activeVehicleCode
                )
              : ctdEntries

            const uniqueVisibleEntries = visibleEntries.filter(entry => {
              const key = makeKey(entry)
              if (seenKeys.current.has(key)) return false
              seenKeys.current.add(key)
              return true
            })

            if (uniqueVisibleEntries.length > 0) {
              setCTDData(prevData => {
                const newData = [...uniqueVisibleEntries, ...prevData]
                return newData.slice(0, 1000)
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

            const normalizedEntries = normalizeCTDData(rawData, {
              timestamp: logPayload.created_at || data.timestamp,
              vehicle_code: logPayload.vehicle?.code,
              sensor_code: logPayload.sensor?.code
            })

            if (normalizedEntries.length === 0) {
              return
            }

            const ctdEntries = normalizedEntries.filter(entry =>
              entry.sensor_code.toUpperCase().includes('CTD')
            )
            if (ctdEntries.length === 0) {
              return
            }

            const allCache = vehicleCacheRef.current.get('ALL') || []
            vehicleCacheRef.current.set('ALL', appendUnique(allCache, ctdEntries))

            const entriesByVehicle = ctdEntries.reduce((acc, entry) => {
              const normalizedVehicleCode = entry.vehicle_code.toUpperCase()
              if (!acc.has(normalizedVehicleCode)) {
                acc.set(normalizedVehicleCode, [])
              }
              acc.get(normalizedVehicleCode).push(entry)
              return acc
            }, new Map())

            entriesByVehicle.forEach((entries, normalizedVehicleCode) => {
              const vehicleCache =
                vehicleCacheRef.current.get(normalizedVehicleCode) || []
              vehicleCacheRef.current.set(
                normalizedVehicleCode,
                appendUnique(vehicleCache, entries)
              )
            })

            const activeVehicleCode = selectedVehicleCodeRef.current
            const visibleEntries = activeVehicleCode
              ? ctdEntries.filter(
                  entry => entry.vehicle_code.toUpperCase() === activeVehicleCode
                )
              : ctdEntries

            const uniqueVisibleEntries = visibleEntries.filter(entry => {
              const key = makeKey(entry)
              if (seenKeys.current.has(key)) return false
              seenKeys.current.add(key)
              return true
            })

            if (uniqueVisibleEntries.length > 0) {
              setCTDData(prevData => {
                const newData = [...uniqueVisibleEntries, ...prevData]
                return newData.slice(0, 1000)
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
      })().catch(() => {
        setIsConnected(false)
        setError('WebSocket authentication failed')
      })
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
  }, [fetchHistoricalData, isPollingMode])

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
