import { useState, useEffect } from 'react'
import { API_ENDPOINTS } from '../config'

const useUserData = () => {
  const [userData, setUserData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Get auth token
  const getAuthHeaders = () => {
    const token = localStorage.getItem('access_token')
    return {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : ''
    }
  }

  // Stats derived from user data
  const getUserStats = () => {
    const total = userData.length
    const verified = userData.filter(user => user.is_verified).length
    const unverified = total - verified

    // Email domain distribution
    const domainCounts = userData.reduce((acc, user) => {
      if (user.email) {
        const domain = user.email.split('@')[1] || 'unknown'
        acc[domain] = (acc[domain] || 0) + 1
      }
      return acc
    }, {})

    const topDomain = Object.entries(domainCounts).sort(
      (a, b) => b[1] - a[1]
    )[0]

    return {
      total,
      verified,
      unverified,
      topDomain: topDomain ? topDomain[0] : 'N/A',
      verifiedRate: total > 0 ? ((verified / total) * 100).toFixed(1) : '0'
    }
  }

  // Fetch user data
  const fetchUserData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(API_ENDPOINTS.USERS.LIST, {
        headers: getAuthHeaders()
      })

      if (!response.ok) {
        // Handle 401/403 - user not authenticated
        if (response.status === 401 || response.status === 403) {
          // Clear invalid token
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          throw new Error('Authentication required. Please login again.')
        }
        
        // Try to parse error response
        let errorMessage = 'Failed to fetch users'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.detail || errorMessage
        } catch (parseError) {
          // If can't parse JSON, use status text
          errorMessage = response.statusText || errorMessage
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      setUserData(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message)
      setUserData([])
    } finally {
      setLoading(false)
    }
  }

  // Add new user
  const addUser = async userData => {
    try {
      const response = await fetch(API_ENDPOINTS.USERS.CREATE, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(userData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create user')
      }

      const newUser = await response.json()
      setUserData(prev => [...prev, newUser])
      return { success: true, data: newUser }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // Update user
  const updateUser = async (userId, userData) => {
    try {
      const response = await fetch(API_ENDPOINTS.USERS.UPDATE(userId), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(userData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update user')
      }

      const updatedUser = await response.json()
      setUserData(prev =>
        prev.map(user => (user.id === userId ? updatedUser : user))
      )
      return { success: true, data: updatedUser }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // Delete user
  const deleteUser = async userId => {
    try {
      const response = await fetch(API_ENDPOINTS.USERS.DELETE(userId), {
        method: 'DELETE',
        headers: getAuthHeaders()
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete user')
      }

      setUserData(prev => prev.filter(user => user.id !== userId))
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // Refresh data
  const refreshData = () => {
    fetchUserData()
  }

  useEffect(() => {
    fetchUserData()
  }, [])

  return {
    userData,
    loading,
    error,
    stats: getUserStats(),
    actions: {
      addUser,
      updateUser,
      deleteUser,
      refreshData
    }
  }
}

export default useUserData
