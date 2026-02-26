import { useState, useEffect } from 'react'
import { API_ENDPOINTS } from '../config'

const usePermissionData = () => {
  const [permissionData, setPermissionData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Get auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('access_token')
    return {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : ''
    }
  }

  // Stats derived from permission data
  const getPermissionStats = () => {
    const total = permissionData.length

    // Permission types based on common patterns
    const readPermissions = permissionData.filter(
      permission =>
        permission.name?.toLowerCase().includes('read') ||
        permission.name?.toLowerCase().includes('view') ||
        permission.name?.toLowerCase().includes('get')
    ).length

    const writePermissions = permissionData.filter(
      permission =>
        permission.name?.toLowerCase().includes('write') ||
        permission.name?.toLowerCase().includes('create') ||
        permission.name?.toLowerCase().includes('update') ||
        permission.name?.toLowerCase().includes('edit')
    ).length

    const deletePermissions = permissionData.filter(
      permission =>
        permission.name?.toLowerCase().includes('delete') ||
        permission.name?.toLowerCase().includes('remove')
    ).length

    // Recent permissions (created in last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const recent = permissionData.filter(permission => {
      if (!permission.created_at) return false
      const createdDate = new Date(permission.created_at)
      return createdDate >= sevenDaysAgo
    }).length

    // Permissions with descriptions
    const withDescription = permissionData.filter(
      permission =>
        permission.description && permission.description.trim().length > 0
    ).length

    return {
      total,
      recent,
      readPermissions,
      writePermissions,
      deletePermissions,
      withDescription,
      withoutDescription: total - withDescription
    }
  }

  // Fetch permission data
  const fetchPermissionData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(API_ENDPOINTS.PERMISSIONS.LIST, {
        headers: getAuthHeaders()
      })

      if (!response.ok) {
        // Handle 401/403 - user not authenticated
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          throw new Error('Authentication required. Please login again.')
        }
        
        let errorMessage = 'Failed to fetch permissions'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.detail || errorMessage
        } catch (parseError) {
          errorMessage = response.statusText || errorMessage
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      setPermissionData(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message)
      setPermissionData([])
    } finally {
      setLoading(false)
    }
  }

  // Add new permission
  const addPermission = async permissionData => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(API_ENDPOINTS.PERMISSIONS.CREATE, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(permissionData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create permission')
      }

      const newPermission = await response.json()
      setPermissionData(prev => [newPermission, ...prev])

      return { success: true, message: 'Permission added successfully!' }
    } catch (err) {
      setError(err.message)
      return { success: false, message: err.message }
    } finally {
      setLoading(false)
    }
  }

  // Update permission
  const updatePermission = async (id, updatedData) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(API_ENDPOINTS.PERMISSIONS.UPDATE(id), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updatedData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update permission')
      }

      const updatedPermission = await response.json()
      setPermissionData(prev =>
        prev.map(permission =>
          permission.id === id ? updatedPermission : permission
        )
      )

      return { success: true, message: 'Permission updated successfully!' }
    } catch (err) {
      setError(err.message)
      return { success: false, message: err.message }
    } finally {
      setLoading(false)
    }
  }

  // Delete permission
  const deletePermission = async id => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(API_ENDPOINTS.PERMISSIONS.DELETE(id), {
        method: 'DELETE',
        headers: getAuthHeaders()
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete permission')
      }

      setPermissionData(prev => prev.filter(permission => permission.id !== id))

      return { success: true, message: 'Permission deleted successfully!' }
    } catch (err) {
      setError(err.message)
      return { success: false, message: err.message }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPermissionData()
  }, [])

  const stats = getPermissionStats()

  return {
    permissionData,
    loading,
    error,
    stats,
    actions: {
      addPermission,
      updatePermission,
      deletePermission,
      refreshData: fetchPermissionData
    }
  }
}

export default usePermissionData
