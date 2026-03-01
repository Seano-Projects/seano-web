/**
 * Vehicle Status Utility
 *
 * Implements best practices for online/offline indicator logic:
 * 1. Multiple status states (online, idle, offline)
 * 2. Configurable timeout thresholds
 * 3. Debouncing to prevent status flapping
 * 4. Grace periods for connectivity issues
 * 5. Heartbeat/ping consideration
 */

// Status constants
export const VEHICLE_STATUS = {
  ONLINE: 'online', // Actively receiving data
  IDLE: 'idle', // Connected but no recent data
  OFFLINE: 'offline', // No connection or stale data
  UNKNOWN: 'unknown' // Cannot determine status
}

// Timeout thresholds (in milliseconds)
export const STATUS_THRESHOLDS = {
  // Data is considered fresh if received within this time
  ONLINE_THRESHOLD: 15 * 1000, // 15 seconds

  // After this time without data, vehicle is considered idle
  IDLE_THRESHOLD: 60 * 1000, // 60 seconds (1 minute)

  // After this time, vehicle is considered offline
  OFFLINE_THRESHOLD: 180 * 1000, // 180 seconds (3 minutes)

  // Grace period to prevent flapping between states
  GRACE_PERIOD: 5 * 1000, // 5 seconds

  // Heartbeat interval (expected ping frequency)
  HEARTBEAT_INTERVAL: 30 * 1000 // 30 seconds
}

/**
 * Determine vehicle connection status based on last data received
 *
 * @param {Object} params - Parameters for status determination
 * @param {Date|string|number} params.lastDataTime - Timestamp of last received data
 * @param {WebSocket} params.websocket - WebSocket connection object (optional)
 * @param {Date|string|number} params.currentTime - Current time (defaults to now)
 * @returns {string} - One of VEHICLE_STATUS values
 */
export const determineVehicleStatus = ({
  lastDataTime,
  websocket = null,
  currentTime = Date.now()
}) => {
  // If no data time provided, cannot determine status
  if (!lastDataTime) {
    return VEHICLE_STATUS.UNKNOWN
  }

  // Convert timestamps to milliseconds
  const lastDataMs = new Date(lastDataTime).getTime()
  const currentMs = new Date(currentTime).getTime()

  // Check if timestamps are valid
  if (isNaN(lastDataMs) || isNaN(currentMs)) {
    return VEHICLE_STATUS.UNKNOWN
  }

  // Calculate time since last data
  const timeSinceLastData = currentMs - lastDataMs

  // Check WebSocket connection status
  const wsConnected = websocket && websocket.readyState === WebSocket.OPEN

  // Status determination logic with multiple thresholds
  if (timeSinceLastData < STATUS_THRESHOLDS.ONLINE_THRESHOLD) {
    // Data is fresh - vehicle is online
    return VEHICLE_STATUS.ONLINE
  } else if (timeSinceLastData < STATUS_THRESHOLDS.IDLE_THRESHOLD) {
    // No recent data but still within acceptable range
    // Check WebSocket connection to determine if idle or offline
    return wsConnected ? VEHICLE_STATUS.IDLE : VEHICLE_STATUS.OFFLINE
  } else if (timeSinceLastData < STATUS_THRESHOLDS.OFFLINE_THRESHOLD) {
    // Extended period without data - likely offline but keep as idle if WS connected
    // This provides grace period for temporary connectivity issues
    return wsConnected ? VEHICLE_STATUS.IDLE : VEHICLE_STATUS.OFFLINE
  } else {
    // Data is very stale - vehicle is offline
    return VEHICLE_STATUS.OFFLINE
  }
}

/**
 * Get status color based on vehicle status
 * Follows consistent color scheme across the application
 *
 * @param {string} status - Vehicle status
 * @returns {string} - Tailwind CSS classes for status color
 */
export const getVehicleStatusColor = status => {
  switch (status) {
    case VEHICLE_STATUS.ONLINE:
    case 'on_mission':
      return 'bg-green-500'
    case VEHICLE_STATUS.IDLE:
      return 'bg-yellow-500'
    case VEHICLE_STATUS.OFFLINE:
      return 'bg-red-500'
    case 'maintenance':
      return 'bg-orange-500'
    case VEHICLE_STATUS.UNKNOWN:
    default:
      return 'bg-gray-500'
  }
}

/**
 * Get status text color (for text instead of backgrounds)
 *
 * @param {string} status - Vehicle status
 * @returns {string} - Tailwind CSS classes for text color
 */
export const getVehicleStatusTextColor = status => {
  switch (status) {
    case VEHICLE_STATUS.ONLINE:
    case 'on_mission':
      return 'text-green-500'
    case VEHICLE_STATUS.IDLE:
      return 'text-yellow-500'
    case VEHICLE_STATUS.OFFLINE:
      return 'text-red-500'
    case 'maintenance':
      return 'text-orange-500'
    case VEHICLE_STATUS.UNKNOWN:
    default:
      return 'text-gray-500'
  }
}

/**
 * Get human-readable status label
 *
 * @param {string} status - Vehicle status
 * @returns {string} - Human-readable status label
 */
export const getVehicleStatusLabel = status => {
  switch (status) {
    case VEHICLE_STATUS.ONLINE:
      return 'Online'
    case VEHICLE_STATUS.IDLE:
      return 'Idle'
    case VEHICLE_STATUS.OFFLINE:
      return 'Offline'
    case 'on_mission':
      return 'On Mission'
    case 'maintenance':
      return 'Maintenance'
    case VEHICLE_STATUS.UNKNOWN:
    default:
      return 'Unknown'
  }
}

/**
 * Debounced status tracker to prevent rapid status changes
 * Use this class to maintain stable status across rapid updates
 */
export class DebouncedStatusTracker {
  constructor (gracePeriod = STATUS_THRESHOLDS.GRACE_PERIOD) {
    this.currentStatus = VEHICLE_STATUS.UNKNOWN
    this.statusChangeTime = Date.now()
    this.gracePeriod = gracePeriod
  }

  /**
   * Update status with debouncing
   * Only changes status if new status persists for grace period
   *
   * @param {string} newStatus - New status to potentially apply
   * @returns {string} - Current stable status
   */
  updateStatus (newStatus) {
    const now = Date.now()

    // If status is different from current
    if (newStatus !== this.currentStatus) {
      // Check if enough time has passed since last status change
      if (now - this.statusChangeTime >= this.gracePeriod) {
        // Apply new status after grace period
        this.currentStatus = newStatus
        this.statusChangeTime = now
      }
      // Otherwise, keep current status (within grace period)
    } else {
      // Status is same, reset timer
      this.statusChangeTime = now
    }

    return this.currentStatus
  }

  /**
   * Force set status (bypass debouncing)
   *
   * @param {string} status - Status to set
   */
  forceSetStatus (status) {
    this.currentStatus = status
    this.statusChangeTime = Date.now()
  }

  /**
   * Get current status
   *
   * @returns {string} - Current status
   */
  getStatus () {
    return this.currentStatus
  }

  /**
   * Reset tracker
   */
  reset () {
    this.currentStatus = VEHICLE_STATUS.UNKNOWN
    this.statusChangeTime = Date.now()
  }
}

/**
 * Check if vehicle has recent heartbeat
 *
 * @param {Date|string|number} lastHeartbeat - Last heartbeat timestamp
 * @param {Date|string|number} currentTime - Current time (defaults to now)
 * @returns {boolean} - True if heartbeat is recent
 */
export const hasRecentHeartbeat = (lastHeartbeat, currentTime = Date.now()) => {
  if (!lastHeartbeat) return false

  const lastMs = new Date(lastHeartbeat).getTime()
  const currentMs = new Date(currentTime).getTime()

  if (isNaN(lastMs) || isNaN(currentMs)) return false

  const timeSinceHeartbeat = currentMs - lastMs
  return timeSinceHeartbeat < STATUS_THRESHOLDS.HEARTBEAT_INTERVAL * 2
}

/**
 * Format time since last data for display
 *
 * @param {Date|string|number} lastDataTime - Last data timestamp
 * @returns {string} - Human-readable time string
 */
export const formatTimeSinceLastData = lastDataTime => {
  if (!lastDataTime) return 'Never'

  const lastMs = new Date(lastDataTime).getTime()
  const now = Date.now()

  if (isNaN(lastMs)) return 'Unknown'

  const seconds = Math.floor((now - lastMs) / 1000)

  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export default {
  VEHICLE_STATUS,
  STATUS_THRESHOLDS,
  determineVehicleStatus,
  getVehicleStatusColor,
  getVehicleStatusTextColor,
  getVehicleStatusLabel,
  DebouncedStatusTracker,
  hasRecentHeartbeat,
  formatTimeSinceLastData
}
