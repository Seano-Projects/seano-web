import { useState, useCallback, useEffect } from 'react'
import { API_BASE_URL } from '../config'

const getHeaders = () => {
  const token = localStorage.getItem('access_token')
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  }
}

const useAIChat = () => {
  const [messages, setMessages] = useState([])
  const [sessions, setSessions] = useState([])
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [loading, setLoading] = useState(false)

  // Fetch all sessions
  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/ai/sessions`, { headers: getHeaders() })
      if (res.ok) {
        const data = await res.json()
        setSessions(data || [])
      }
    } catch { /* silent */ }
  }, [])

  // Load messages for a session
  const loadSession = useCallback(async (sessionId) => {
    setActiveSessionId(sessionId)
    try {
      const res = await fetch(`${API_BASE_URL}/ai/sessions/${sessionId}/messages`, { headers: getHeaders() })
      if (res.ok) {
        const data = await res.json()
        setMessages((data || []).map(m => ({ role: m.role, content: m.content })))
      }
    } catch { /* silent */ }
  }, [])

  // Start new chat
  const newChat = useCallback(() => {
    setActiveSessionId(null)
    setMessages([])
  }, [])

  // Send message
  const sendMessage = useCallback(async (text) => {
    const userMsg = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE_URL}/ai/chat`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ message: text, session_id: activeSessionId })
      })

      const data = await res.json()

      if (res.ok) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
        if (data.session_id && data.session_id !== activeSessionId) {
          setActiveSessionId(data.session_id)
          fetchSessions()
        }
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.error || 'AI service unavailable.' }])
        if (data.session_id) setActiveSessionId(data.session_id)
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Maaf, AI assistant sedang tidak tersedia.' }])
    } finally {
      setLoading(false)
    }
  }, [activeSessionId, fetchSessions])

  // Delete session
  const deleteSession = useCallback(async (sessionId) => {
    try {
      await fetch(`${API_BASE_URL}/ai/sessions/${sessionId}`, { method: 'DELETE', headers: getHeaders() })
      setSessions(prev => prev.filter(s => s.id !== sessionId))
      if (activeSessionId === sessionId) {
        setActiveSessionId(null)
        setMessages([])
      }
    } catch { /* silent */ }
  }, [activeSessionId])

  useEffect(() => { fetchSessions() }, [fetchSessions])

  return { messages, sessions, activeSessionId, loading, sendMessage, loadSession, newChat, deleteSession, fetchSessions }
}

export default useAIChat
