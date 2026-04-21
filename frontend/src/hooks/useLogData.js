import { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'
import {
  REALTIME_MODE,
  REALTIME_POLL_INTERVAL_MS
} from '../utils/realtimeConfig'

const LOG_LIMIT = 200
const WS_FLUSH_INTERVAL_MS = 250
const MAX_RAW_LOG_CHARS = 512

const parseNumber = value => {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const parseJsonValue = value => {
  if (value === null || value === undefined || value === '') {
    return null
  }

  if (Array.isArray(value) || typeof value === 'object') {
    return value
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return null
    }
  }

  return null
}

const parseCellVoltages = value => {
  const parsed = parseJsonValue(value)

  if (!Array.isArray(parsed)) {
    return []
  }

  return parsed
    .map(cellVoltage => parseNumber(cellVoltage))
    .filter(cellVoltage => cellVoltage !== null)
}

const parseMetadata = value => {
  const parsed = parseJsonValue(value)
  return parsed && !Array.isArray(parsed) ? parsed : {}
}

const normalizeBatteryRecord = battery => {
  const cellVoltages = parseCellVoltages(battery.cell_voltages)
  const metadata = parseMetadata(battery.metadata)
  const explicitCellCount = parseNumber(battery.cell_count)
  const metadataCellCount = parseNumber(metadata.cell_count)

  return {
    battery_id: parseNumber(battery.battery_id) || 1,
    percentage: parseNumber(battery.percentage) || 0,
    voltage: parseNumber(battery.voltage) || 0,
    current: parseNumber(battery.current) || 0,
    temperature: parseNumber(battery.temperature) || 0,
    status: battery.status || 'N/A',
    cell_voltages: cellVoltages,
    cell_count:
      explicitCellCount || metadataCellCount || cellVoltages.length || 0,
    timestamp:
      battery.timestamp || battery.created_at || new Date().toISOString()
  }
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
// Auto-detect WebSocket URL from API URL
const getWsUrl = () => {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL
  }
  // Convert https:// to wss:// and http:// to ws://
  const apiUrl = API_URL.replace('https://', 'wss://').replace(
    'http://',
    'ws://'
  )
  return apiUrl
}
const WS_URL = getWsUrl()
const BATTERY_STORAGE_KEY = 'batteryData'

const normalizeBatteryMap = rawBatteryMap => {
  if (!rawBatteryMap || typeof rawBatteryMap !== 'object') {
    return {}
  }

  const normalizedMap = {}

  Object.entries(rawBatteryMap).forEach(([vehicleId, batteries]) => {
    if (!batteries || typeof batteries !== 'object') {
      return
    }

    const normalizedBatteries = { 1: null, 2: null }

    Object.values(batteries).forEach(battery => {
      if (!battery || typeof battery !== 'object') {
        return
      }

      const normalizedBattery = normalizeBatteryRecord(battery)
      normalizedBatteries[normalizedBattery.battery_id] = normalizedBattery
    })

    normalizedMap[vehicleId] = normalizedBatteries
  })

  return normalizedMap
}

const normalizeRawLogEntry = entry => {
  if (!entry || typeof entry !== 'object') {
    return entry
  }

  const rawText = typeof entry.logs === 'string' ? entry.logs : String(entry.logs || '')

  if (rawText.length <= MAX_RAW_LOG_CHARS) {
    return entry
  }

  return {
    ...entry,
    logs: `${rawText.slice(0, MAX_RAW_LOG_CHARS)}...`,
    _truncated: true
  }
}

export const useLogData = (options = {}) => {
  const enableStats = options.enableStats ?? true
  const enableChartData = options.enableChartData ?? true
  const enableVehicleLogs = options.enableVehicleLogs ?? true
  const enableSensorLogs = options.enableSensorLogs ?? true
  const enableRawLogs = options.enableRawLogs ?? true
  const enableCommandLogs = options.enableCommandLogs ?? true
  const enableWaypointLogs = options.enableWaypointLogs ?? true
  const enableBatteryData = options.enableBatteryData ?? true
  const enableRealtime = options.enableRealtime ?? true
  const pauseRealtime = options.pauseRealtime ?? false
  const isPollingMode = REALTIME_MODE === 'api'

  const [stats, setStats] = useState({
    vehicle_logs: { today: 0, yesterday: 0, total: 0, percentage_change: 0 },
    sensor_logs: { today: 0, yesterday: 0, total: 0, percentage_change: 0 },
    raw_logs: { today: 0, yesterday: 0, total: 0, percentage_change: 0 }
  })

  const [chartData, setChartData] = useState([])

  const [vehicleLogs, setVehicleLogs] = useState([])
  const [sensorLogs, setSensorLogs] = useState([])
  const [rawLogs, setRawLogs] = useState([])
  const [commandLogs, setCommandLogs] = useState([])
  const [waypointLogs, setWaypointLogs] = useState([])
  const [batteryData, setBatteryData] = useState(() => {
    // Load from localStorage on init
    try {
      const stored = localStorage.getItem(BATTERY_STORAGE_KEY)
      return stored ? normalizeBatteryMap(JSON.parse(stored)) : {}
    } catch {
      return {}
    }
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [ws, setWs] = useState(null)
  const vehicleQueueRef = useRef([])
  const sensorQueueRef = useRef([])
  const rawQueueRef = useRef([])
  const commandQueueRef = useRef([])
  const waypointQueueRef = useRef([])
  const rawClientSeqRef = useRef(0)
  const wsClientSeqRef = useRef(0)
  const pauseRealtimeRef = useRef(pauseRealtime)

  useEffect(() => {
    pauseRealtimeRef.current = pauseRealtime
  }, [pauseRealtime])

  const flushQueues = useCallback(() => {
    if (vehicleQueueRef.current.length > 0) {
      const chunk = vehicleQueueRef.current.splice(0, vehicleQueueRef.current.length)
      setVehicleLogs(prev => [...chunk, ...prev].slice(0, LOG_LIMIT))
    }

    if (sensorQueueRef.current.length > 0) {
      const chunk = sensorQueueRef.current.splice(0, sensorQueueRef.current.length)
      setSensorLogs(prev => [...chunk, ...prev].slice(0, LOG_LIMIT))
    }

    if (rawQueueRef.current.length > 0) {
      const chunk = rawQueueRef.current.splice(0, rawQueueRef.current.length)
      setRawLogs(prev => [...chunk, ...prev].slice(0, LOG_LIMIT))
    }

    if (commandQueueRef.current.length > 0) {
      const chunk = commandQueueRef.current.splice(0, commandQueueRef.current.length)
      setCommandLogs(prev => [...chunk, ...prev].slice(0, LOG_LIMIT))
    }

    if (waypointQueueRef.current.length > 0) {
      const chunk = waypointQueueRef.current.splice(0, waypointQueueRef.current.length)
      setWaypointLogs(prev => [...chunk, ...prev].slice(0, LOG_LIMIT))
    }
  }, [])

  // Fetch latest battery data from API
  const fetchBatteryData = useCallback(async () => {
    if (!enableBatteryData) {
      return
    }

    try {
      const token = localStorage.getItem('access_token')
      const response = await axios.get(`${API_URL}/vehicle-batteries/latest`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      // Transform API response to batteryData format
      const latestBatteries = response.data || []

      // Keep cached data if backend has no battery rows yet.
      if (!Array.isArray(latestBatteries) || latestBatteries.length === 0) {
        return
      }

      const batteryMap = {}

      latestBatteries.forEach(battery => {
        const vehicleId = battery.vehicle_id
        if (!vehicleId) {
          return
        }

        if (!batteryMap[vehicleId]) {
          batteryMap[vehicleId] = { 1: null, 2: null }
        }

        const normalizedBattery = normalizeBatteryRecord(battery)
        batteryMap[vehicleId][normalizedBattery.battery_id] = normalizedBattery
      })

      setBatteryData(batteryMap)
      localStorage.setItem(BATTERY_STORAGE_KEY, JSON.stringify(batteryMap))
    } catch (err) {
      // Keep localStorage data if API fails
    }
  }, [enableBatteryData])

  // Fetch stats
  const fetchStats = useCallback(async () => {
    if (!enableStats) {
      return
    }

    try {
      const token = localStorage.getItem('access_token')
      const response = await axios.get(`${API_URL}/logs/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setStats(response.data)
    } catch (err) {
      setError(err.message)
    }
  }, [enableStats])

  // Fetch chart data
  const fetchChartData = useCallback(async () => {
    if (!enableChartData) {
      return
    }

    try {
      const token = localStorage.getItem('access_token')
      const response = await axios.get(`${API_URL}/logs/chart`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setChartData(response.data.chart_data || [])
    } catch (err) {
      setError(err.message)
    }
  }, [enableChartData])

  // Fetch vehicle logs
  const fetchVehicleLogs = useCallback(async (limit = 200) => {
    if (!enableVehicleLogs) {
      return
    }

    try {
      const token = localStorage.getItem('access_token')
      const response = await axios.get(
        `${API_URL}/vehicle-logs?limit=${limit}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      const raw = response.data.data || response.data || []
      const fetchedAt = new Date().toISOString()
      const data = raw.map((item, idx) => ({
        ...item,
        _received_at: fetchedAt,
        _source: 'rest',
        _client_id: item?._client_id || `vehicle-rest-${item?.id ?? fetchedAt}-${idx}`
      }))
      setVehicleLogs(data)
    } catch (err) {}
  }, [enableVehicleLogs])

  // Fetch sensor logs
  const fetchSensorLogs = useCallback(async (limit = 200) => {
    if (!enableSensorLogs) {
      return
    }

    try {
      const token = localStorage.getItem('access_token')
      const response = await axios.get(
        `${API_URL}/sensor-logs?limit=${limit}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      const raw = response.data.data || response.data || []
      const fetchedAt = new Date().toISOString()
      const data = raw.map((item, idx) => ({
        ...item,
        _received_at: fetchedAt,
        _source: 'rest',
        _client_id: item?._client_id || `sensor-rest-${item?.id ?? fetchedAt}-${idx}`
      }))
      setSensorLogs(data)
    } catch (err) {}
  }, [enableSensorLogs])

  // Fetch raw logs
  const fetchRawLogs = useCallback(async (limit = 200) => {
    if (!enableRawLogs) {
      return
    }

    try {
      const token = localStorage.getItem('access_token')
      const response = await axios.get(`${API_URL}/raw-logs?limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      // Handle different response formats
      let data = []
      if (Array.isArray(response.data)) {
        data = response.data
      } else if (response.data && response.data.data) {
        data = response.data.data
      } else {
      }

      const fetchedAt = new Date().toISOString()
      setRawLogs(
        data
          .map((item, idx) => {
            const normalized = normalizeRawLogEntry({
              ...item,
              _received_at: fetchedAt,
              _source: 'rest'
            })
            return {
              ...normalized,
              _client_id: normalized?._client_id || `raw-rest-${item?.id ?? fetchedAt}-${idx}`
            }
          })
          .slice(0, LOG_LIMIT)
      )
    } catch (err) {
      setRawLogs([]) // Set empty array on error
    }
  }, [enableRawLogs])

  // Fetch command logs
  const fetchCommandLogs = useCallback(async (limit = 200) => {
    if (!enableCommandLogs) {
      return
    }

    try {
      const token = localStorage.getItem('access_token')
      const response = await axios.get(`${API_URL}/command-logs?limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = Array.isArray(response.data) ? response.data : (response.data?.data || [])
      const fetchedAt = new Date().toISOString()
      const normalized = data.map((item, idx) => ({
        ...item,
        _client_id: item?._client_id || `command-rest-${item?.id ?? fetchedAt}-${idx}`
      }))
      setCommandLogs(normalized)
    } catch {}
  }, [enableCommandLogs])

  // Fetch waypoint logs
  const fetchWaypointLogs = useCallback(async (limit = 200) => {
    if (!enableWaypointLogs) {
      return
    }

    try {
      const token = localStorage.getItem('access_token')
      const response = await axios.get(`${API_URL}/waypoint-logs?limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = Array.isArray(response.data) ? response.data : (response.data?.data || [])
      const fetchedAt = new Date().toISOString()
      const normalized = data.map((item, idx) => ({
        ...item,
        _client_id: item?._client_id || `waypoint-rest-${item?.id ?? fetchedAt}-${idx}`
      }))
      setWaypointLogs(normalized)
    } catch {}
  }, [enableWaypointLogs])

  // Recalculate stats from current data
  useEffect(() => {
    if (!enableStats) {
      return
    }

    const today = new Date().toDateString()
    const yesterday = new Date(Date.now() - 86400000).toDateString()

    const vehicleToday = vehicleLogs.filter(
      log => new Date(log.created_at).toDateString() === today
    ).length
    const vehicleYesterday = vehicleLogs.filter(
      log => new Date(log.created_at).toDateString() === yesterday
    ).length

    const sensorToday = sensorLogs.filter(
      log => new Date(log.created_at).toDateString() === today
    ).length
    const sensorYesterday = sensorLogs.filter(
      log => new Date(log.created_at).toDateString() === yesterday
    ).length

    const rawToday = rawLogs.filter(
      log => new Date(log.created_at).toDateString() === today
    ).length
    const rawYesterday = rawLogs.filter(
      log => new Date(log.created_at).toDateString() === yesterday
    ).length

    setStats({
      vehicle_logs: {
        today: vehicleToday,
        yesterday: vehicleYesterday,
        total: vehicleLogs.length,
        percentage_change:
          vehicleYesterday > 0
            ? ((vehicleToday - vehicleYesterday) / vehicleYesterday) * 100
            : 0
      },
      sensor_logs: {
        today: sensorToday,
        yesterday: sensorYesterday,
        total: sensorLogs.length,
        percentage_change:
          sensorYesterday > 0
            ? ((sensorToday - sensorYesterday) / sensorYesterday) * 100
            : 0
      },
      raw_logs: {
        today: rawToday,
        yesterday: rawYesterday,
        total: rawLogs.length,
        percentage_change:
          rawYesterday > 0
            ? ((rawToday - rawYesterday) / rawYesterday) * 100
            : 0
      }
    })
  }, [vehicleLogs, sensorLogs, rawLogs, enableStats])

  // Initial data fetch
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true)
      const tasks = []

      if (enableChartData) tasks.push(fetchChartData())
      if (enableVehicleLogs) tasks.push(fetchVehicleLogs())
      if (enableSensorLogs) tasks.push(fetchSensorLogs())
      if (enableRawLogs) tasks.push(fetchRawLogs())
      if (enableCommandLogs) tasks.push(fetchCommandLogs())
      if (enableWaypointLogs) tasks.push(fetchWaypointLogs())
      if (enableBatteryData) tasks.push(fetchBatteryData())

      await Promise.all(tasks)
      setLoading(false)
    }

    fetchAllData()
  }, [
    fetchChartData,
    fetchVehicleLogs,
    fetchSensorLogs,
    fetchRawLogs,
    fetchCommandLogs,
    fetchWaypointLogs,
    fetchBatteryData,
    enableChartData,
    enableVehicleLogs,
    enableSensorLogs,
    enableRawLogs,
    enableCommandLogs,
    enableWaypointLogs,
    enableBatteryData
  ])

  // Periodic token refresh check (every 5 minutes)
  useEffect(() => {
    const checkTokenInterval = setInterval(() => {
      const token = localStorage.getItem('access_token')
      if (token) {
        try {
          // Decode JWT to check expiration
          const payload = JSON.parse(atob(token.split('.')[1]))
          const expiration = payload.exp * 1000
          const now = Date.now()
          const fifteenMinutes = 15 * 60 * 1000

          // If token expires in less than 15 minutes, trigger a refresh via API call
          if (expiration - now < fifteenMinutes) {
            // Make a simple API call to trigger axios interceptor refresh
            fetchStats().catch(() => {})
          }
        } catch (e) {}
      }
    }, 5 * 60 * 1000) // Check every 5 minutes

    return () => clearInterval(checkTokenInterval)
  }, [fetchStats])

  // Batch websocket updates to prevent rerender spikes during high-frequency logs.
  useEffect(() => {
    const interval = setInterval(flushQueues, WS_FLUSH_INTERVAL_MS)

    return () => {
      clearInterval(interval)
      flushQueues()
    }
  }, [flushQueues])

  // WebSocket connection with auto-reconnect
  useEffect(() => {
    if (!enableRealtime || isPollingMode) {
      setWs(null)
      return
    }

    const token = localStorage.getItem('access_token')
    if (!token) {
      return
    }

    let websocket = null
    let reconnectTimeout = null
    let pingInterval = null
    let isIntentionalClose = false

    const connect = () => {
      const wsUrl = `${WS_URL}/ws/logs?token=${token}`

      websocket = new WebSocket(wsUrl)

      websocket.onopen = () => {
        // Send ping every 30 seconds to keep connection alive
        pingInterval = setInterval(() => {
          if (websocket?.readyState === WebSocket.OPEN) {
            websocket.send(JSON.stringify({ type: 'ping' }))
          }
        }, 30000)
      }

      websocket.onmessage = event => {
        try {
          const message = JSON.parse(event.data)

          // Ignore pong messages
          if (message.type === 'pong') return

          if (pauseRealtimeRef.current) {
            return
          }

          if (message.type === 'vehicle_log' && enableVehicleLogs) {
            const receivedAt = new Date().toISOString()
            if (message.data) {
              wsClientSeqRef.current += 1
              vehicleQueueRef.current.push({
                ...message.data,
                _received_at: receivedAt,
                _source: 'ws',
                _client_id: `vehicle-${receivedAt}-${wsClientSeqRef.current}`
              })
            }
          } else if (message.type === 'sensor_log' && enableSensorLogs) {
            const receivedAt = new Date().toISOString()
            if (message.data) {
              wsClientSeqRef.current += 1
              sensorQueueRef.current.push({
                ...message.data,
                _received_at: receivedAt,
                _source: 'ws',
                _client_id: `sensor-${receivedAt}-${wsClientSeqRef.current}`
              })
            }
          } else if (message.type === 'raw_log' && enableRawLogs) {
            const receivedAt = new Date().toISOString()
            if (message.data) {
              rawClientSeqRef.current += 1
              rawQueueRef.current.push(
                normalizeRawLogEntry({
                  ...message.data,
                  _received_at: receivedAt,
                  _source: 'ws',
                  _client_id: `raw-${receivedAt}-${rawClientSeqRef.current}`
                })
              )
            }
          } else if (message.type === 'command_log' && enableCommandLogs) {
            if (message.data) {
              wsClientSeqRef.current += 1
              commandQueueRef.current.push({
                ...message.data,
                _client_id: `command-${new Date().toISOString()}-${wsClientSeqRef.current}`
              })
            }
          } else if (message.type === 'waypoint_log' && enableWaypointLogs) {
            if (message.data) {
              wsClientSeqRef.current += 1
              waypointQueueRef.current.push({
                ...message.data,
                _client_id: `waypoint-${new Date().toISOString()}-${wsClientSeqRef.current}`
              })
            }
          } else if (message.type === 'battery' && enableBatteryData) {
            const { vehicle_id } = message
            if (!vehicle_id) {
              return
            }

            const normalizedBattery = normalizeBatteryRecord(message)

            setBatteryData(prev => {
              const vehicleBatteries = prev[vehicle_id] || { 1: null, 2: null }
              const newData = {
                ...prev,
                [vehicle_id]: {
                  ...vehicleBatteries,
                  [normalizedBattery.battery_id]: normalizedBattery
                }
              }
              // Save to localStorage
              try {
                localStorage.setItem(
                  BATTERY_STORAGE_KEY,
                  JSON.stringify(newData)
                )
              } catch (e) {}
              return newData
            })
          }
        } catch (err) {
          // Failed to parse WebSocket message
        }
      }

      websocket.onerror = error => {}

      websocket.onclose = event => {
        // Clear ping interval
        if (pingInterval) {
          clearInterval(pingInterval)
          pingInterval = null
        }

        // Auto-reconnect after 3 seconds if not intentional close
        if (!isIntentionalClose) {
          reconnectTimeout = setTimeout(() => {
            connect()
          }, 3000)
        }
      }

      setWs(websocket)
    }

    connect()

    return () => {
      isIntentionalClose = true
      if (pingInterval) clearInterval(pingInterval)
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
      if (websocket?.readyState === WebSocket.OPEN) {
        websocket.close()
      }
    }
  }, [enableRealtime, isPollingMode, enableVehicleLogs, enableSensorLogs, enableRawLogs, enableCommandLogs, enableWaypointLogs, enableBatteryData])

  useEffect(() => {
    if (!enableRealtime || !isPollingMode) {
      return
    }

    const interval = setInterval(() => {
      fetchVehicleLogs()
      fetchSensorLogs()
      fetchRawLogs()
      fetchCommandLogs()
      fetchWaypointLogs()
      fetchBatteryData()
    }, REALTIME_POLL_INTERVAL_MS)

    return () => {
      clearInterval(interval)
    }
  }, [
    enableRealtime,
    isPollingMode,
    REALTIME_POLL_INTERVAL_MS,
    fetchVehicleLogs,
    fetchSensorLogs,
    fetchRawLogs,
    fetchCommandLogs,
    fetchWaypointLogs,
    fetchBatteryData
  ])

  return {
    stats,
    chartData,
    vehicleLogs,
    sensorLogs,
    rawLogs,
    commandLogs,
    waypointLogs,
    batteryData,
    loading,
    error,
    ws,
    refetch: () => {
      fetchStats()
      fetchChartData()
      fetchVehicleLogs()
      fetchSensorLogs()
      fetchRawLogs()
      fetchCommandLogs()
      fetchWaypointLogs()
    }
  }
}
