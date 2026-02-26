import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

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

/**
 * Custom hook untuk mengelola data alerts dari USV via WebSocket
 * Alert ini berbeda dengan notification - alert datang dari USV via MQTT -> WebSocket
 * Notification datang dari web application itu sendiri
 */
export const useAlertData = () => {
  const [alerts, setAlerts] = useState([])
  const [stats, setStats] = useState({
    critical: 0,
    warning: 0,
    info: 0,
    total: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [ws, setWs] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState('disconnected')

  // Calculate statistics from alerts
  const calculateStats = useCallback(alertsData => {
    const stats = {
      critical: 0,
      warning: 0,
      info: 0,
      total: alertsData.length
    }

    alertsData.forEach(alert => {
      const severity = alert.severity?.toLowerCase() || 'info'
      if (severity === 'critical' || severity === 'error') {
        stats.critical++
      } else if (severity === 'warning' || severity === 'warn') {
        stats.warning++
      } else {
        stats.info++
      }
    })

    setStats(stats)
  }, [])

  // Fetch alerts dari API untuk historical data
  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('access_token')
      const response = await axios.get(`${API_URL}/api/alerts`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      const alertsData = Array.isArray(response.data)
        ? response.data
        : response.data.data || []

      // Transform alerts data
      const transformedAlerts = alertsData.map(alert => ({
        id: alert.id || Math.random(),
        vehicle_id: alert.vehicle_id,
        vehicle_name: alert.vehicle_name || alert.vehicle?.name || 'Unknown',
        severity: alert.severity || alert.type || 'info',
        type: alert.alert_type || alert.category || 'System',
        message: alert.message || alert.description || '',
        timestamp:
          alert.timestamp || alert.created_at || new Date().toISOString(),
        acknowledged: alert.acknowledged || false,
        source: 'USV',
        location: alert.location || null,
        sensor_id: alert.sensor_id || null
      }))

      // Sort by timestamp, newest first
      const sortedAlerts = transformedAlerts.sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      )

      setAlerts(sortedAlerts)
      calculateStats(sortedAlerts)
      setError(null)
    } catch (err) {
      setError('Failed to load alerts')
      setAlerts([])
    } finally {
      setLoading(false)
    }
  }, [calculateStats])

  // Setup WebSocket connection untuk real-time alerts
  useEffect(() => {
    let websocket = null
    let reconnectTimeout = null
    let reconnectAttempts = 0
    const maxReconnectAttempts = 5
    const reconnectDelay = 3000

    const connectWebSocket = () => {
      try {
        const token = localStorage.getItem('access_token')
        if (!token) {
          setConnectionStatus('disconnected')
          return
        }

        // Connect to WebSocket - alerts endpoint
        websocket = new WebSocket(`${WS_URL}/ws/alerts?token=${token}`)

        websocket.onopen = () => {
          setConnectionStatus('connected')
          setWs(websocket)
          reconnectAttempts = 0
        }

        websocket.onmessage = event => {
          try {
            const data = JSON.parse(event.data)

            // Handle different message types
            if (data.type === 'alert') {
              const newAlert = {
                id: data.id || Date.now(),
                vehicle_id: data.vehicle_id,
                vehicle_name: data.vehicle_name || 'Unknown',
                severity: data.severity || 'info',
                type: data.alert_type || 'System',
                message: data.message || '',
                timestamp: data.timestamp || new Date().toISOString(),
                acknowledged: false,
                source: 'USV',
                location: data.location || null,
                sensor_id: data.sensor_id || null
              }

              // Add new alert to the beginning of the list
              setAlerts(prev => {
                const updated = [newAlert, ...prev]
                calculateStats(updated)
                return updated
              })
            } else if (data.type === 'alert_update') {
              // Update existing alert (e.g., acknowledged)
              setAlerts(prev => {
                const updated = prev.map(alert =>
                  alert.id === data.id ? { ...alert, ...data.updates } : alert
                )
                calculateStats(updated)
                return updated
              })
            }
          } catch (err) {}
        }

        websocket.onerror = error => {
          setConnectionStatus('error')
        }

        websocket.onclose = () => {
          setConnectionStatus('disconnected')
          setWs(null)

          // Attempt to reconnect
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++
            reconnectTimeout = setTimeout(connectWebSocket, reconnectDelay)
          }
        }
      } catch (err) {
        setConnectionStatus('error')
      }
    }

    // Initial connection
    connectWebSocket()

    // Cleanup
    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
      if (websocket) {
        websocket.close()
      }
    }
  }, [calculateStats])

  // Fetch initial data
  useEffect(() => {
    fetchAlerts()
  }, [fetchAlerts])

  // Acknowledge alert
  const acknowledgeAlert = useCallback(async alertId => {
    try {
      const token = localStorage.getItem('access_token')
      await axios.patch(
        `${API_URL}/api/alerts/${alertId}/acknowledge`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      // Update local state
      setAlerts(prev =>
        prev.map(alert =>
          alert.id === alertId ? { ...alert, acknowledged: true } : alert
        )
      )

      return true
    } catch (err) {
      return false
    }
  }, [])

  // Clear all alerts
  const clearAllAlerts = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token')
      await axios.delete(`${API_URL}/api/alerts/clear`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      setAlerts([])
      setStats({ critical: 0, warning: 0, info: 0, total: 0 })
      return true
    } catch (err) {
      return false
    }
  }, [])

  return {
    alerts,
    stats,
    loading,
    error,
    ws,
    connectionStatus,
    refreshData: fetchAlerts,
    acknowledgeAlert,
    clearAllAlerts
  }
}
