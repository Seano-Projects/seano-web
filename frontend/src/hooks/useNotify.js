import { toast } from '../components/ui'
import {
  createNotification,
  NOTIFICATION_ACTIONS
} from '../utils/notificationService'

/**
 * Enhanced toast hook that automatically creates database notifications
 * @returns {Object} Enhanced toast functions with ACTIONS
 */
const useNotify = () => {
  /**
   * Show success toast and create notification
   * @param {string} message - Toast message
   * @param {Object} options - Options
   * @param {string} options.title - Notification title (auto-generated if not provided)
   * @param {string} options.action - Action identifier
   * @param {number} options.vehicleId - Related vehicle ID
   * @param {boolean} options.persist - Whether to save to database (default: true)
   * @param {Object} options.toastOptions - Additional toast options
   */
  const success = async (message, options = {}) => {
    console.log('🎯 useNotify.success CALLED!', { message, options })

    const {
      title,
      action,
      vehicleId,
      persist = true,
      toastOptions = {}
    } = options

    // Show toast
    toast.success(message, toastOptions)
    console.log('✅ Toast shown, persist=', persist)

    // Create notification
    if (persist) {
      console.log('💾 Attempting to create notification...')
      const notificationTitle = title || generateTitle(message, 'success')
      await createNotification({
        type: 'success',
        title: notificationTitle,
        message,
        action: action || '',
        vehicleId: vehicleId || null,
        source: 'user'
      })
    }
  }

  /**
   * Show error toast and create notification
   * @param {string} message - Toast message
   * @param {Object} options - Options
   */
  const error = async (message, options = {}) => {
    console.log('❌ useNotify.error CALLED!', { message, options })

    const {
      title,
      action,
      vehicleId,
      persist = true,
      toastOptions = {}
    } = options

    // Show toast
    toast.error(message, toastOptions)

    // Create notification
    if (persist) {
      const notificationTitle = title || generateTitle(message, 'error')
      await createNotification({
        type: 'error',
        title: notificationTitle,
        message,
        action: action || '',
        vehicleId: vehicleId || null,
        source: 'user'
      })
    }
  }

  /**
   * Show warning toast and create notification
   * @param {string} message - Toast message
   * @param {Object} options - Options
   */
  const warning = async (message, options = {}) => {
    const {
      title,
      action,
      vehicleId,
      persist = true,
      toastOptions = {}
    } = options

    // Show toast
    toast.warning(message, toastOptions)

    // Create notification
    if (persist) {
      const notificationTitle = title || generateTitle(message, 'warning')
      await createNotification({
        type: 'warning',
        title: notificationTitle,
        message,
        action: action || '',
        vehicleId: vehicleId || null,
        source: 'user'
      })
    }
  }

  /**
   * Show info toast (typically without persistence)
   * @param {string} message - Toast message
   * @param {Object} options - Options
   */
  const info = async (message, options = {}) => {
    const {
      title,
      action,
      vehicleId,
      persist = false, // Info toasts typically don't persist
      toastOptions = {}
    } = options

    // Show toast
    toast.info(message, toastOptions)

    // Create notification only if explicitly requested
    if (persist) {
      const notificationTitle = title || generateTitle(message, 'info')
      await createNotification({
        type: 'info',
        title: notificationTitle,
        message,
        action: action || '',
        vehicleId: vehicleId || null,
        source: 'user'
      })
    }
  }

  return {
    success,
    error,
    warning,
    info,
    ACTIONS: NOTIFICATION_ACTIONS
  }
}

/**
 * Generate a title from a message
 * @param {string} message - The message
 * @param {string} type - Notification type
 * @returns {string} Generated title
 */
const generateTitle = (message, type) => {
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

export default useNotify
