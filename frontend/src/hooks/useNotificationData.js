import { useState, useEffect, useCallback } from 'react'
import { API_ENDPOINTS } from '../config'

const useNotificationData = () => {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const applyStatsFallback = useCallback(currentNotifications => {
    const unread = currentNotifications.filter(item => !item.read).length
    const countByType = type =>
      currentNotifications.filter(
        item => String(item.type || '').toLowerCase() === type
      ).length

    return {
      total: currentNotifications.length,
      unread,
      critical: countByType('error'),
      warning: countByType('warning'),
      info: countByType('info'),
      success: countByType('success')
    }
  }, [])

  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    critical: 0,
    warning: 0,
    info: 0,
    success: 0
  })

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Get token from localStorage
      const token = localStorage.getItem('access_token')

      const response = await fetch(API_ENDPOINTS.NOTIFICATIONS.LIST, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        // Add timeout
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })

      if (!response.ok) {
        // Silently fail for 404 (endpoint may not exist yet)
        if (response.status === 404) {
          setNotifications([])
          setLastUpdated(new Date())
          setLoading(false)
          return
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      const notificationsArray = Array.isArray(data) ? data : data.data || []

      const transformedData = notificationsArray.map(notification => ({
        id: notification.id || Math.random(),
        type: notification.type || 'info',
        title: notification.title || notification.subject || 'Notification',
        message:
          notification.message ||
          notification.description ||
          notification.content ||
          '',
        timestamp:
          notification.timestamp ||
          notification.created_at ||
          new Date().toISOString(),
        badge: getBadgeText(notification.type || notification.severity),
        vehicle:
          notification.vehicle_name ||
          notification.vehicle?.name ||
          notification.vehicle ||
          null,
        priority: notification.priority || 'normal',
        read: Boolean(notification.read)
      }))

      // Sort by timestamp, newest first
      const sortedData = transformedData.sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      )

      setNotifications(sortedData)
      const serverStats = data?.stats
      if (serverStats) {
        setStats({
          total: serverStats.total || sortedData.length,
          unread: serverStats.unread || 0,
          critical: serverStats.critical || 0,
          warning: serverStats.warning || 0,
          info: serverStats.info || 0,
          success: serverStats.success || 0
        })
      } else {
        setStats(applyStatsFallback(sortedData))
      }
      setLastUpdated(new Date())
    } catch {
      setError('Failed to load notifications')
      setNotifications([])
      setStats({
        total: 0,
        unread: 0,
        critical: 0,
        warning: 0,
        info: 0,
        success: 0
      })
      setLastUpdated(new Date())
    } finally {
      setLoading(false)
    }
  }, [applyStatsFallback])

  // Helper function untuk badge text
  const getBadgeText = type => {
    switch (type?.toLowerCase()) {
      case 'critical':
      case 'error':
        return 'Critical'
      case 'warning':
      case 'warn':
        return 'Warning'
      case 'info':
      case 'information':
        return 'Info'
      case 'success':
        return 'Success'
      default:
        return 'Info'
    }
  }

  // Fetch data saat hook pertama kali dimuat
  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Function untuk manual refresh
  const refreshData = useCallback(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Function untuk mendapatkan latest alerts (limit)
  const getLatestAlerts = (limit = 5) => {
    return notifications.slice(0, limit)
  }

  // Function untuk filter berdasarkan type
  const getAlertsByType = type => {
    return notifications.filter(
      notification => notification.type.toLowerCase() === type.toLowerCase()
    )
  }

  // Function untuk mendapatkan unread notifications
  const getUnreadAlerts = () => {
    return notifications.filter(notification => !notification.read)
  }

  const markAsRead = useCallback(
    async id => {
      try {
        const token = localStorage.getItem('access_token')
        const response = await fetch(API_ENDPOINTS.NOTIFICATIONS.MARK_READ(id), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` })
          }
        })

        if (!response.ok) {
          throw new Error('Failed to mark notification as read')
        }

        setNotifications(prev => {
          const updated = prev.map(item =>
            item.id === id ? { ...item, read: true } : item
          )
          setStats(applyStatsFallback(updated))
          return updated
        })

        return { success: true }
      } catch {
        return { success: false }
      }
    },
    [applyStatsFallback]
  )

  const markAllAsRead = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(API_ENDPOINTS.NOTIFICATIONS.READ_ALL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        }
      })

      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read')
      }

      setNotifications(prev => {
        const updated = prev.map(item => ({ ...item, read: true }))
        setStats(applyStatsFallback(updated))
        return updated
      })

      return { success: true }
    } catch {
      return { success: false }
    }
  }, [applyStatsFallback])

  const clearRead = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(API_ENDPOINTS.NOTIFICATIONS.CLEAR_READ, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        }
      })

      if (!response.ok) {
        throw new Error('Failed to clear read notifications')
      }

      setNotifications(prev => {
        const updated = prev.filter(item => !item.read)
        setStats(applyStatsFallback(updated))
        return updated
      })

      return { success: true }
    } catch {
      return { success: false }
    }
  }, [applyStatsFallback])

  return {
    notifications,
    loading,
    error,
    lastUpdated,
    refreshData,
    markAsRead,
    markAllAsRead,
    clearRead,
    getLatestAlerts,
    getAlertsByType,
    getUnreadAlerts,
    stats
  }
}

export default useNotificationData
