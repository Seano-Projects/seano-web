import { useState, useEffect, useCallback } from 'react'
import { API_ENDPOINTS } from '../config'

const useNotificationData = () => {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Get token from localStorage
      const token = localStorage.getItem('access_token')

      // Use alerts as notification source.
      const response = await fetch(API_ENDPOINTS.ALERTS.LIST, {
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

      // Pastikan data adalah array
      const notificationsArray = Array.isArray(data) ? data : data.data || []

      // Transform alerts into notification-like rows.
      const transformedData = notificationsArray.map(notification => ({
        id: notification.id || Math.random(),
        type:
          notification.alert_type ||
          notification.type ||
          notification.severity ||
          'info',
        title:
          notification.title ||
          notification.alert_type ||
          notification.subject ||
          'Alert',
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
        read: notification.read || notification.acknowledged || false
      }))

      // Sort by timestamp, newest first
      const sortedData = transformedData.sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      )

      setNotifications(sortedData)
      setLastUpdated(new Date())
    } catch {
      setError('Failed to load notifications')
      setNotifications([])
      setLastUpdated(new Date())
    } finally {
      setLoading(false)
    }
  }, [])

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

  // Statistics
  const stats = {
    total: notifications.length,
    unread: getUnreadAlerts().length,
    critical: getAlertsByType('critical').length,
    warning: getAlertsByType('warning').length,
    info: getAlertsByType('info').length,
    success: getAlertsByType('success').length
  }

  return {
    notifications,
    loading,
    error,
    lastUpdated,
    refreshData,
    getLatestAlerts,
    getAlertsByType,
    getUnreadAlerts,
    stats
  }
}

export default useNotificationData
