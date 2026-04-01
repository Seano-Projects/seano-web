import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

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

export const useLogData = () => {
  const [stats, setStats] = useState({
    vehicle_logs: { today: 0, yesterday: 0, total: 0, percentage_change: 0 },
    sensor_logs: { today: 0, yesterday: 0, total: 0, percentage_change: 0 },
    raw_logs: { today: 0, yesterday: 0, total: 0, percentage_change: 0 }
  })

  const [chartData, setChartData] = useState([])

  const [vehicleLogs, setVehicleLogs] = useState([])
  const [sensorLogs, setSensorLogs] = useState([])
  const [rawLogs, setRawLogs] = useState([])
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

  // Fetch latest battery data from API
  const fetchBatteryData = useCallback(async () => {
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
  }, [])

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token')
      const response = await axios.get(`${API_URL}/logs/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setStats(response.data)
    } catch (err) {
      setError(err.message)
    }
  }, [])

  // Fetch chart data
  const fetchChartData = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token')
      const response = await axios.get(`${API_URL}/logs/chart`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setChartData(response.data.chart_data || [])
    } catch (err) {
      setError(err.message)
    }
  }, [])

  // Fetch vehicle logs
  const fetchVehicleLogs = useCallback(async (limit = 200) => {
    try {
      const token = localStorage.getItem('access_token')
      const response = await axios.get(
        `${API_URL}/vehicle-logs?limit=${limit}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      const data = response.data.data || response.data || []
      setVehicleLogs(data)
    } catch (err) {}
  }, [])

  // Fetch sensor logs
  const fetchSensorLogs = useCallback(async (limit = 200) => {
    try {
      const token = localStorage.getItem('access_token')
      const response = await axios.get(
        `${API_URL}/sensor-logs?limit=${limit}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      const data = response.data.data || response.data || []
      setSensorLogs(data)
    } catch (err) {}
  }, [])

  // Fetch raw logs
  const fetchRawLogs = useCallback(async (limit = 200) => {
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

      setRawLogs(data)
    } catch (err) {
      setRawLogs([]) // Set empty array on error
    }
  }, [])

  // Recalculate stats from current data
  useEffect(() => {
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
  }, [vehicleLogs, sensorLogs, rawLogs])

  // Initial data fetch
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true)
      await Promise.all([
        fetchChartData(),
        fetchVehicleLogs(),
        fetchSensorLogs(),
        fetchRawLogs(),
        fetchBatteryData() // Fetch battery data from API
      ])
      setLoading(false)
    }

    fetchAllData()
  }, [
    fetchChartData,
    fetchVehicleLogs,
    fetchSensorLogs,
    fetchRawLogs,
    fetchBatteryData
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

  // WebSocket connection with auto-reconnect
  useEffect(() => {
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

          if (message.type === 'vehicle_log') {
            setVehicleLogs(prev => [message.data, ...prev].slice(0, 200))
            setStats(prev => ({
              ...prev,
              vehicle_logs: {
                ...prev.vehicle_logs,
                today: prev.vehicle_logs.today + 1,
                total: prev.vehicle_logs.total + 1
              }
            }))
          } else if (message.type === 'sensor_log') {
            setSensorLogs(prev => [message.data, ...prev].slice(0, 200))
            setStats(prev => ({
              ...prev,
              sensor_logs: {
                ...prev.sensor_logs,
                today: prev.sensor_logs.today + 1,
                total: prev.sensor_logs.total + 1
              }
            }))
          } else if (message.type === 'raw_log') {
            setRawLogs(prev => [message.data, ...prev].slice(0, 200))
            setStats(prev => ({
              ...prev,
              raw_logs: {
                ...prev.raw_logs,
                today: prev.raw_logs.today + 1,
                total: prev.raw_logs.total + 1
              }
            }))
          } else if (message.type === 'battery') {
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
  }, [])

  return {
    stats,
    chartData,
    vehicleLogs,
    sensorLogs,
    rawLogs,
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
    }
  }
}
