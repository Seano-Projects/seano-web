import { useState, useEffect } from 'react'
import { API_BASE_URL } from '../config'

// Raw Log data hook for real API integration
const useRawLogData = () => {
  const [rawLogsStats, setRawLogsStats] = useState({
    totalRecords: 0,
    totalSize: 0,
    lastSync: new Date().toISOString(),
    quality: 0,
    todayRecords: 0,
    weeklyGrowth: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let interval
    let loadingTimeout

    // Set maximum loading time of 5 seconds
    loadingTimeout = setTimeout(() => {
      setLoading(false)
    }, 5000)

    const fetchRawLogsStats = async () => {
      try {
        setLoading(true)
        setError(null)

        // Get token from localStorage
        const token = localStorage.getItem('access_token')

        // Fetch raw logs statistics
        const response = await fetch(`${API_BASE_URL}/raw-logs/stats`, {
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            : {
                'Content-Type': 'application/json'
              }
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()

        setRawLogsStats({
          totalRecords: data.total_records || 0,
          totalSize: data.total_size || 0,
          lastSync: data.last_sync || new Date().toISOString(),
          quality: data.quality_percentage || 0,
          todayRecords: data.today_records || 0,
          weeklyGrowth: data.weekly_growth || 0
        })

        // Clear the loading timeout since we got data
        if (loadingTimeout) {
          clearTimeout(loadingTimeout)
        }
        setLoading(false)
      } catch (err) {
        setError(err.message)

        // Set empty state when API fails
        setRawLogsStats({
          totalRecords: 0,
          totalSize: 0,
          lastSync: new Date().toISOString(),
          quality: 0,
          todayRecords: 0,
          weeklyGrowth: 0
        })

        // Clear timeout on error
        if (loadingTimeout) {
          clearTimeout(loadingTimeout)
        }
        setLoading(false)
      }
    }

    // Initial fetch
    fetchRawLogsStats()

    // Set up polling every 30 seconds for real-time updates
    interval = setInterval(() => {
      fetchRawLogsStats()
    }, 30000)

    // Cleanup function
    return () => {
      if (interval) {
        clearInterval(interval)
      }
      if (loadingTimeout) {
        clearTimeout(loadingTimeout)
      }
    }
  }, []) // Empty dependency array is intentional - we only want to run once on mount

  // Manual refresh function
  const refreshStats = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get token from localStorage
      const token = localStorage.getItem('access_token')

      const response = await fetch(`${API_BASE_URL}/raw-logs/stats`, {
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          : {
              'Content-Type': 'application/json'
            }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      setRawLogsStats({
        totalRecords: data.total_records || 0,
        totalSize: data.total_size || 0,
        lastSync: data.last_sync || new Date().toISOString(),
        quality: data.quality_percentage || 0,
        todayRecords: data.today_records || 0,
        weeklyGrowth: data.weekly_growth || 0
      })

      setLoading(false)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return {
    rawLogsStats,
    loading,
    error,
    refreshStats
  }
}

export default useRawLogData
