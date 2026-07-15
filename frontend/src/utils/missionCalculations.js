/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {Object} coord1 - {lat, lng}
 * @param {Object} coord2 - {lat, lng}
 * @returns {number} Distance in meters
 */
export const calculateDistance = (coord1, coord2) => {
  const R = 6371e3 // Earth radius in meters
  const φ1 = (coord1.lat * Math.PI) / 180
  const φ2 = (coord2.lat * Math.PI) / 180
  const Δφ = ((coord2.lat - coord1.lat) * Math.PI) / 180
  const Δλ = ((coord2.lng - coord1.lng) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // Distance in meters
}

/**
 * Calculate total mission distance including home location
 * @param {Array} waypoints - Array of waypoint objects {lat, lng, type}
 * @param {Object} homeLocation - {lat, lng}
 * @returns {number} Total distance in meters
 */
export const calculateTotalDistance = (waypoints, homeLocation) => {
  const pathWaypoints = waypoints.filter(wp => wp.type === 'path')

  if (pathWaypoints.length === 0) return 0

  let totalDistance = 0

  // Distance from home to first waypoint
  if (homeLocation) {
    totalDistance += calculateDistance(homeLocation, pathWaypoints[0])
  }

  // Distance between consecutive waypoints
  for (let i = 0; i < pathWaypoints.length - 1; i++) {
    totalDistance += calculateDistance(pathWaypoints[i], pathWaypoints[i + 1])
  }

  // Distance from last waypoint back to home (RTL)
  if (homeLocation && pathWaypoints.length > 0) {
    totalDistance += calculateDistance(
      pathWaypoints[pathWaypoints.length - 1],
      homeLocation
    )
  }

  return totalDistance
}

/**
 * Calculate estimated time based on distance and speed
 * @param {number} distanceMeters - Total distance in meters
 * @param {number} speedMs - Speed in m/s
 * @returns {number} Time in minutes
 */
export const calculateEstimatedTime = (distanceMeters, speedMs) => {
  if (!speedMs || speedMs <= 0) return 0
  const timeSeconds = distanceMeters / speedMs
  return timeSeconds / 60 // Convert to minutes
}

/**
 * Calculate battery usage estimation for USV
 * Based on time and average power consumption
 * @param {number} timeMinutes - Estimated time in minutes
 * @param {number} batteryCapacityWh - Battery capacity in Wh (default 1000Wh)
 * @param {number} avgPowerW - Average power consumption in Watts (default 200W)
 * @returns {number} Battery usage percentage
 */
export const calculateBatteryUsage = (
  timeMinutes,
  batteryCapacityWh = 1000,
  avgPowerW = 200
) => {
  const timeHours = timeMinutes / 60
  const energyUsedWh = avgPowerW * timeHours
  const percentage = (energyUsedWh / batteryCapacityWh) * 100

  return Math.min(100, Math.max(0, percentage)) // Clamp between 0-100
}

/**
 * Format distance for display
 * @param {number} meters - Distance in meters
 * @returns {string} Formatted distance (e.g., "1.2 km" or "350 m")
 */
export const formatDistance = meters => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`
  }
  return `${Math.round(meters)} m`
}

/**
 * Format time for display
 * @param {number} minutes - Time in minutes
 * @returns {string} Formatted time (e.g., "1h 30m" or "8 min")
 */
export const formatTime = minutes => {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    return `${hours}h ${mins}m`
  }
  if (minutes < 1) {
    return `${Math.round(minutes * 60)} sec`
  }
  return `${Math.round(minutes)} min`
}
