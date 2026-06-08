import { useState, useEffect, useCallback } from 'react'
import { API_ENDPOINTS } from '../config'

const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('access_token')}`,
})

const getAuthHeadersNoContentType = () => ({
  Authorization: `Bearer ${localStorage.getItem('access_token')}`,
})

const usePublicationData = () => {
  const [publications, setPublications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchPublications = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(API_ENDPOINTS.PUBLICATIONS.LIST, { headers: getAuthHeaders() })
      if (!res.ok) throw new Error('Failed to fetch publications')
      const data = await res.json()
      setPublications(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPublications() }, [fetchPublications])

  const addPublication = async (payload) => {
    try {
      const res = await fetch(API_ENDPOINTS.PUBLICATIONS.CREATE, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) return { success: false, message: data.error || 'Failed to create' }
      setPublications(prev => [data, ...prev])
      return { success: true, data }
    } catch (err) {
      return { success: false, message: err.message }
    }
  }

  const updatePublication = async (id, payload) => {
    try {
      const res = await fetch(API_ENDPOINTS.PUBLICATIONS.UPDATE(id), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) return { success: false, message: data.error || 'Failed to update' }
      setPublications(prev => prev.map(p => (p.id === id ? data : p)))
      return { success: true, data }
    } catch (err) {
      return { success: false, message: err.message }
    }
  }

  const uploadPDF = async (file) => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(API_ENDPOINTS.PUBLICATIONS.UPLOAD_PDF, {
        method: 'POST',
        headers: getAuthHeadersNoContentType(),
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) return { success: false, message: data.error || 'Upload gagal' }
      return { success: true, url: data.url }
    } catch (err) {
      return { success: false, message: err.message }
    }
  }

  const deletePDF = async (filename) => {
    try {
      const res = await fetch(API_ENDPOINTS.PUBLICATIONS.DELETE_PDF(filename), {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
      if (!res.ok) {
        const data = await res.json()
        return { success: false, message: data.error || 'Hapus file gagal' }
      }
      return { success: true }
    } catch (err) {
      return { success: false, message: err.message }
    }
  }

  const deletePublication = async (id) => {
    try {
      const res = await fetch(API_ENDPOINTS.PUBLICATIONS.DELETE(id), {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
      if (!res.ok) {
        const data = await res.json()
        return { success: false, message: data.error || 'Failed to delete' }
      }
      setPublications(prev => prev.filter(p => p.id !== id))
      return { success: true }
    } catch (err) {
      return { success: false, message: err.message }
    }
  }

  return {
    publications,
    loading,
    error,
    refetch: fetchPublications,
    actions: { addPublication, updatePublication, deletePublication, uploadPDF, deletePDF },
  }
}

export default usePublicationData
