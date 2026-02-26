import { useState, useEffect, useCallback } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// Auto-detect WebSocket URL from API URL
const getWsUrl = () => {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL
  }
  const apiUrl = API_URL.replace('https://', 'wss://').replace(
    'http://',
    'ws://'
  )
  return apiUrl
}
const WS_URL = getWsUrl()

export const useCTDData = (vehicleCode = null) => {
  const [ctdData, setCTDData] = useState([])
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState(null)
  const [ws, setWs] = useState(null)

  const connectWebSocket = useCallback(() => {
    const token = localStorage.getItem('access_token')

    if (!token) {
      return
    }

    let websocket = null
    const maxReconnectDelay = 30000
    let reconnectDelay = 1000

    const connect = () => {
      const wsUrl = `${WS_URL}/ws/sensor-data?token=${token}`

      websocket = new WebSocket(wsUrl)

      websocket.onopen = () => {
        setIsConnected(true)
        setError(null)
        reconnectDelay = 1000

        // Send subscription for CTD sensor type
        const subscribeMessage = {
          type: 'subscribe',
          sensor_type: 'ctd_midas3000'
        }

        // Add vehicle filter if provided
        if (vehicleCode) {
          subscribeMessage.vehicle_code = vehicleCode
        }

        if (websocket?.readyState === WebSocket.OPEN) {
          websocket.send(JSON.stringify(subscribeMessage))
        }

        // Ping to keep connection alive
        const pingInterval = setInterval(() => {
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

          if (data.type === 'sensor_data' && data.data) {
            // Add to CTD data array
            setCTDData(prevData => {
              const newData = [...prevData, data.data]
              // Keep only last 1000 readings to avoid memory issues
              return newData.slice(-1000)
            })
          } else if (data.type === 'pong') {
          } else if (data.type === 'error') {
            setError(data.message)
          }
        } catch (err) {}
      }

      websocket.onerror = error => {
        setIsConnected(false)
        setError('WebSocket connection error')
      }

      websocket.onclose = event => {
        setIsConnected(false)

        // Reconnect with exponential backoff
        setTimeout(() => {
          reconnectDelay = Math.min(reconnectDelay * 2, maxReconnectDelay)
          connect()
        }, reconnectDelay)
      }

      setWs(websocket)
    }

    connect()

    // Cleanup
    return () => {
      if (websocket?.readyState === WebSocket.OPEN) {
        websocket.close()
      }
    }
  }, [vehicleCode])

  useEffect(() => {
    const cleanup = connectWebSocket()
    return cleanup
  }, [connectWebSocket])

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
