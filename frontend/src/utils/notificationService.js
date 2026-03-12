import { API_BASE_URL } from '../config'

/**
 * Notification Service
 * Creates database notifications for user actions/events
 */

// Toast type to notification type mapping
const TOAST_TYPE_MAP = {
  success: 'success',
  error: 'error',
  warning: 'warning',
  info: 'info'
}

/**
 * Create a notification in the database
 * @param {Object} params - Notification parameters
 * @param {string} params.type - Type of notification (success, error, warning, info)
 * @param {string} params.title - Notification title
 * @param {string} params.message - Notification message
 * @param {string} params.action - Action that triggered the notification (optional)
 * @param {number} params.vehicleId - Related vehicle ID (optional)
 * @param {string} params.source - Source of notification (default: 'system')
 */
export const createNotification = async ({
  type,
  title,
  message,
  action,
  vehicleId,
  source = 'system'
}) => {
  console.log('🔔 createNotification called with:', {
    type,
    title,
    message,
    action,
    vehicleId,
    source
  })

  try {
    const token = localStorage.getItem('access_token')
    const userStr = localStorage.getItem('user')

    console.log('📦 Token exists:', !!token, 'User data exists:', !!userStr)

    if (!token || !userStr) {
      console.warn(
        '❌ No auth token or user data found. Skipping notification creation.'
      )
      return null
    }

    let userId
    try {
      const user = JSON.parse(userStr)
      userId = user?.id
      console.log('👤 Parsed user:', user, 'User ID:', userId)

      if (!userId) {
        console.warn(
          '❌ User ID not found in user object. Skipping notification creation.'
        )
        return null
      }
    } catch (e) {
      console.error('❌ Failed to parse user data:', e)
      return null
    }

    const payload = {
      user_id: parseInt(userId),
      vehicle_id: vehicleId || null,
      type: TOAST_TYPE_MAP[type] || 'info',
      title,
      message,
      action: action || '',
      source
    }

    console.log('🚀 Sending notification to backend:', payload)

    const response = await fetch(`${API_BASE_URL}/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    })

    console.log('📡 Response status:', response.status, response.statusText)

    if (!response.ok) {
      const errorData = await response.text()
      console.error(
        '❌ Failed to create notification:',
        response.status,
        errorData
      )
      return null
    }

    const data = await response.json()
    console.log('✅ Notification created successfully:', data)
    return data
  } catch (error) {
    console.error('❌ Error creating notification:', error)
    return null
  }
}

/**
 * Enhanced toast function that also creates a database notification
 * @param {import('../components/ui').toast} toast - Toast instance
 * @param {string} type - Toast type (success, error, warning, info)
 * @param {string} message - Toast message
 * @param {Object} options - Additional options
 * @param {boolean} options.persist - Whether to persist to database (default: true)
 * @param {string} options.title - Custom title for database notification
 * @param {string} options.action - Action that triggered the notification
 * @param {number} options.vehicleId - Related vehicle ID
 * @param {Object} options.toastOptions - Additional toast options
 */
export const notifyWithToast = async (toast, type, message, options = {}) => {
  const {
    persist = true,
    title,
    action,
    vehicleId,
    toastOptions = {}
  } = options

  // Show toast
  toast[type](message, toastOptions)

  // Persist to database if enabled
  if (persist) {
    // Generate title from message if not provided
    const notificationTitle = title || generateTitleFromMessage(message, type)

    await createNotification({
      type,
      title: notificationTitle,
      message,
      action,
      vehicleId,
      source: 'user'
    })
  }
}

/**
 * Generate a title from a message
 * @param {string} message - The message to generate title from
 * @param {string} type - Type of notification
 * @returns {string} Generated title
 */
const generateTitleFromMessage = (message, type) => {
  // Extract first sentence or first 50 characters
  const firstSentence = message.split(/[.!?]/)[0].trim()
  const title =
    firstSentence.length > 50
      ? firstSentence.substring(0, 50) + '...'
      : firstSentence

  if (!title) {
    // Fallback titles based on type
    const fallbackTitles = {
      success: 'Success',
      error: 'Error',
      warning: 'Warning',
      info: 'Information'
    }
    return fallbackTitles[type] || 'Notification'
  }

  return title
}

/**
 * Predefined notification actions for consistency
 */
export const NOTIFICATION_ACTIONS = {
  // Mission actions
  MISSION_CREATED: 'mission_created',
  MISSION_UPDATED: 'mission_updated',
  MISSION_DELETED: 'mission_deleted',
  MISSION_SAVED: 'mission_saved',
  MISSION_UPLOADED: 'mission_uploaded',

  // Vehicle actions
  VEHICLE_SELECTED: 'vehicle_selected',
  VEHICLE_CREATED: 'vehicle_created',
  VEHICLE_UPDATED: 'vehicle_updated',
  VEHICLE_DELETED: 'vehicle_deleted',

  // User actions
  USER_CREATED: 'user_created',
  USER_UPDATED: 'user_updated',
  USER_DELETED: 'user_deleted',
  LOGIN: 'login',
  LOGOUT: 'logout',

  // Role actions
  ROLE_CREATED: 'role_created',
  ROLE_UPDATED: 'role_updated',
  ROLE_DELETED: 'role_deleted',

  // Sensor actions
  SENSOR_CREATED: 'sensor_created',
  SENSOR_UPDATED: 'sensor_updated',
  SENSOR_DELETED: 'sensor_deleted',

  // Alert actions
  ALERT_ACKNOWLEDGED: 'alert_acknowledged',
  ALERTS_CLEARED: 'alerts_cleared',

  // Permission actions
  PERMISSION_CREATED: 'permission_created',
  PERMISSION_UPDATED: 'permission_updated',
  PERMISSION_DELETED: 'permission_deleted'
}

/**
 * Actions that should NOT create database notifications
 * These are typically informational toasts or ones that would create too much noise
 */
export const SKIP_NOTIFICATION_ACTIONS = [
  'viewing',
  'searching',
  'loading',
  'info_display'
]

/**
 * Check if an action should create a database notification
 * @param {string} action - Action name
 * @returns {boolean} Whether to create notification
 */
export const shouldCreateNotification = action => {
  if (!action) return true // Default to creating notification
  return !SKIP_NOTIFICATION_ACTIONS.some(skip => action.includes(skip))
}

export default {
  createNotification,
  notifyWithToast,
  NOTIFICATION_ACTIONS,
  SKIP_NOTIFICATION_ACTIONS,
  shouldCreateNotification
}
