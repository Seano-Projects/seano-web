/**
 * Permission utility functions
 */

/**
 * Check if user has permission (client-side only, not secure!)
 * This is just for UI - always check permissions on backend!
 */
export const hasPermission = (permissions, permissionName) => {
  return permissions?.includes(permissionName) ?? false
}

/**
 * Check if user has any of the given permissions
 */
export const hasAnyPermission = (permissions, permissionNames) => {
  return permissionNames?.some(p => permissions?.includes(p)) ?? false
}

/**
 * Check if user has all of the given permissions
 */
export const hasAllPermissions = (permissions, permissionNames) => {
  return permissionNames?.every(p => permissions?.includes(p)) ?? false
}

/**
 * Check if user is admin (has users.read permission)
 */
export const isAdmin = permissions => {
  return permissions?.includes('users.read') ?? false
}

/**
 * Permission constants — single source of truth on frontend.
 * These MUST match the names seeded in backend/internal/seeder/seed.go.
 * Convention: <resource>.<action>  |  actions: read | create | update | delete | manage | access
 */
export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_ACCESS: 'dashboard.access',

  // User Management
  USERS_READ: 'users.read',
  USERS_CREATE: 'users.create',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',

  // Role Management (.manage = create + update + delete)
  ROLES_READ: 'roles.read',
  ROLES_MANAGE: 'roles.manage',

  // Permission Management
  PERMISSIONS_READ: 'permissions.read',
  PERMISSIONS_MANAGE: 'permissions.manage',

  // Vehicle Management
  VEHICLES_READ: 'vehicles.read',
  VEHICLES_CREATE: 'vehicles.create',
  VEHICLES_UPDATE: 'vehicles.update',
  VEHICLES_DELETE: 'vehicles.delete',

  // Sensor Management
  SENSORS_READ: 'sensors.read',
  SENSORS_MANAGE: 'sensors.manage',

  // Sensor Type Management
  SENSOR_TYPES_READ: 'sensor_types.read',
  SENSOR_TYPES_MANAGE: 'sensor_types.manage',

  // Data Operations
  TRACKING_READ: 'tracking.read',
  CONTROL_READ: 'control.read',
  CAM_READ: 'cam.read',
  TELEMETRY_READ: 'telemetry.read',

  // Mission Management
  MISSIONS_READ: 'missions.read',
  MISSIONS_CREATE: 'missions.create',
  MISSIONS_UPDATE: 'missions.update',
  MISSIONS_DELETE: 'missions.delete',

  // Data Monitoring
  BATTERY_READ: 'battery.read',
  LOGS_READ: 'logs.read',
  ALERTS_READ: 'alerts.read',
  NOTIFICATIONS_READ: 'notifications.read',
  SENSOR_MONITORING_READ: 'sensor-monitoring.read',

  // Data Records
  SENSOR_LOGS_READ: 'sensor_logs.read',
  RAW_LOGS_READ: 'raw_logs.read',
  RAW_LOGS_DELETE: 'raw_logs.delete'
}

export default {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  isAdmin,
  PERMISSIONS
}
