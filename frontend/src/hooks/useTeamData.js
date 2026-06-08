import { useState, useEffect, useCallback } from 'react'
import { API_ENDPOINTS } from '../config'

const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('access_token')}`,
})

const useTeamData = () => {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(API_ENDPOINTS.TEAM.LIST, { headers: getAuthHeaders() })
      if (!res.ok) throw new Error('Failed to fetch team members')
      const data = await res.json()
      setMembers(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  const addMember = async (payload) => {
    try {
      const res = await fetch(API_ENDPOINTS.TEAM.CREATE, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) return { success: false, message: data.error || 'Failed to create' }
      setMembers(prev => [...prev, data].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id))
      return { success: true, data }
    } catch (err) {
      return { success: false, message: err.message }
    }
  }

  const updateMember = async (id, payload) => {
    try {
      const res = await fetch(API_ENDPOINTS.TEAM.UPDATE(id), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) return { success: false, message: data.error || 'Failed to update' }
      setMembers(prev => prev.map(m => (m.id === id ? data : m)).sort((a, b) => a.sort_order - b.sort_order || a.id - b.id))
      return { success: true, data }
    } catch (err) {
      return { success: false, message: err.message }
    }
  }

  const deleteMember = async (id) => {
    try {
      const res = await fetch(API_ENDPOINTS.TEAM.DELETE(id), {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
      if (!res.ok) {
        const data = await res.json()
        return { success: false, message: data.error || 'Failed to delete' }
      }
      setMembers(prev => prev.filter(m => m.id !== id))
      return { success: true }
    } catch (err) {
      return { success: false, message: err.message }
    }
  }

  const deletePhoto = async (url) => {
    if (!url?.startsWith('/uploads/')) return
    const filename = url.split('/').pop()
    try {
      await fetch(API_ENDPOINTS.TEAM.DELETE_PHOTO(filename), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      })
    } catch { /* best-effort */ }
  }

  const uploadPhoto = async (file) => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(API_ENDPOINTS.TEAM.UPLOAD_PHOTO, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) return { success: false, message: data.error || 'Upload failed' }
      return { success: true, url: data.url }
    } catch (err) {
      return { success: false, message: err.message }
    }
  }

  return { members, loading, error, fetchMembers, addMember, updateMember, deleteMember, uploadPhoto, deletePhoto }
}

export default useTeamData
