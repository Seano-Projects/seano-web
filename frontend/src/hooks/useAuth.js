import { useState } from 'react'
import axios from 'axios'
import { API_ENDPOINTS } from '../config'

const useAuth = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Login function
  const login = async (email, password) => {
    setLoading(true)
    setError('')

    try {
      const res = await axios.post(API_ENDPOINTS.AUTH.LOGIN, {
        email,
        password
      })

      localStorage.setItem('access_token', res.data.access_token)
      localStorage.setItem('user', JSON.stringify(res.data.user))

      return { success: true, data: res.data }
    } catch (err) {
      let errorMessage = 'Something went wrong. Please try again.'

      if (err.response?.status === 401) {
        errorMessage =
          err.response.data.detail ||
          err.response.data.error ||
          'Invalid credentials.'
      }

      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  // Register email function
  const registerEmail = async email => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(API_ENDPOINTS.AUTH.REGISTER_EMAIL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (response.ok) {
        return {
          success: true,
          message:
            data.message || 'Verification email sent successfully! Please check your inbox.'
        }
      } else {
        // Handle different error formats from backend (error, detail, message)
        const errorMsg = data.error || data.detail || data.message || 'Failed to register email. Please try again.'
        setError(errorMsg)
        return {
          success: false,
          error: errorMsg
        }
      }
    } catch (err) {
      const errorMessage = 'Unable to connect to server. Please check your internet connection and try again.'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  // Verify email function
  const verifyEmail = async token => {
    setLoading(true)
    setError('')

    try {
      const res = await fetch(API_ENDPOINTS.AUTH.VERIFY_EMAIL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })

      const data = await res.json()

      if (res.ok) {
        return {
          success: true,
          message: data.message || 'Email verified successfully!',
          token: data.set_credentials_token
        }
      } else {
        setError(data.detail || 'Verification failed')
        return {
          success: false,
          error: data.detail || 'Verification failed'
        }
      }
    } catch (err) {
      const errorMessage = 'Server error. Please try again later.'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  // Set credentials function
  const setCredentials = async (token, username, password) => {
    setLoading(true)
    setError('')

    try {
      const res = await fetch(API_ENDPOINTS.AUTH.SET_CREDENTIALS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          username,
          password
        })
      })

      const data = await res.json()

      if (res.ok) {
        return {
          success: true,
          message: data.message || 'Account activated successfully! Redirecting...'
        }
      } else {
        const errorMsg = data.error || data.detail || 'Failed to activate account. Please try again.'
        setError(errorMsg)
        return {
          success: false,
          error: errorMsg
        }
      }
    } catch (err) {
      const errorMessage = 'Unable to connect to server. Please check your internet connection.'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  // Logout function
  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
  }

  // Get current user
  const getCurrentUser = () => {
    try {
      const user = localStorage.getItem('user')
      return user ? JSON.parse(user) : null
    } catch (err) {
      return null
    }
  }

  // Check if authenticated
  const isAuthenticated = () => {
    return !!localStorage.getItem('access_token')
  }

  return {
    loading,
    error,
    login,
    registerEmail,
    verifyEmail,
    setCredentials,
    logout,
    getCurrentUser,
    isAuthenticated
  }
}

export default useAuth
