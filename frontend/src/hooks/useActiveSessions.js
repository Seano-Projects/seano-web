import { useState, useEffect } from 'react'
import axiosInstance from '../utils/axiosConfig'

const useActiveSessions = (shouldFetch = true) => {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchSessions = async () => {
    if (!shouldFetch) {
      setSessions([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const response = await axiosInstance.get('/api/auth/sessions')
      setSessions(response.data || [])
    } catch (err) {
      // Don't treat 403 (forbidden) as a critical error - user just doesn't have admin access
      if (err.response?.status === 403) {
        setError('Admin access required to view sessions')
        setSessions([])
      } else if (err.response?.status === 401) {
        // Don't clear tokens here, let axios interceptor handle it
        setError('Authentication required')
        setSessions([])
      } else {
        setError(err.response?.data?.error || 'Failed to fetch sessions')
        setSessions([])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [shouldFetch])

  return {
    sessions,
    loading,
    error,
    refetch: fetchSessions
  }
}

export default useActiveSessions