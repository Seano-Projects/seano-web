import { useState, useEffect } from 'react'
import { API_ENDPOINTS } from '../config'

const useRoleData = () => {
  const [roleData, setRoleData] = useState([])
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

  // Stats derived from role data
  const getRoleStats = () => {
    const total = roleData.length

    // Most common description length
    const descriptionLengths = roleData.map(role =>
      role.description ? role.description.length : 0
    )
    const avgDescLength =
      descriptionLengths.length > 0
        ? Math.round(
            descriptionLengths.reduce((a, b) => a + b, 0) /
              descriptionLengths.length
          )
        : 0

    // Recent roles (created in last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const recent = roleData.filter(role => {
      if (!role.created_at) return false
      const createdDate = new Date(role.created_at)
      return createdDate >= sevenDaysAgo
    }).length

    // Roles with descriptions
    const withDescription = roleData.filter(
      role => role.description && role.description.trim().length > 0
    ).length

    return {
      total,
      recent,
      withDescription,
      withoutDescription: total - withDescription,
      avgDescLength
    }
  }

  // Fetch role data
  const fetchRoleData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(API_ENDPOINTS.ROLES.LIST, {
        headers: getAuthHeaders()
      })

      if (!response.ok) {
        // Handle 401/403 - user not authenticated
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          throw new Error('Authentication required. Please login again.')
        }
        
        let errorMessage = 'Failed to fetch roles'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.detail || errorMessage
        } catch (parseError) {
          errorMessage = response.statusText || errorMessage
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      setRoleData(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message)
      setRoleData([])
    } finally {
      setLoading(false)
    }
  }

  // Add new role
  const addRole = async roleData => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(API_ENDPOINTS.ROLES.CREATE, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(roleData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create role')
      }

      const newRole = await response.json()
      setRoleData(prev => [newRole, ...prev])

      return { success: true, message: 'Role added successfully!', data: newRole }
    } catch (err) {
      setError(err.message)
      return { success: false, message: err.message }
    } finally {
      setLoading(false)
    }
  }

  // Update role
  const updateRole = async (id, updatedData) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(API_ENDPOINTS.ROLES.UPDATE(id), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updatedData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update role')
      }

      const updatedRole = await response.json()
      setRoleData(prev =>
        prev.map(role => (role.id === id ? updatedRole : role))
      )

      return { success: true, message: 'Role updated successfully!' }
    } catch (err) {
      setError(err.message)
      return { success: false, message: err.message }
    } finally {
      setLoading(false)
    }
  }

  // Delete role
  const deleteRole = async id => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(API_ENDPOINTS.ROLES.DELETE(id), {
        method: 'DELETE',
        headers: getAuthHeaders()
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete role')
      }

      setRoleData(prev => prev.filter(role => role.id !== id))

      return { success: true, message: 'Role deleted successfully!' }
    } catch (err) {
      setError(err.message)
      return { success: false, message: err.message }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRoleData()
  }, [])

  const stats = getRoleStats()

  return {
    roleData,
    loading,
    error,
    stats,
    actions: {
      addRole,
      updateRole,
      deleteRole,
      refreshData: fetchRoleData
    }
  }
}

export default useRoleData
