import axios from 'axios'
import { API_ENDPOINTS } from '../config'

// Create axios instance
const axiosInstance = axios.create()

// Decode JWT to get expiration time
function getTokenExpiration (token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000 // Convert to milliseconds
  } catch {
    return null
  }
}

// Check if token will expire soon (within 6 hours)
function shouldRefreshToken (token) {
  const expiration = getTokenExpiration(token)
  if (!expiration) return false

  const now = Date.now()
  const sixHours = 6 * 60 * 60 * 1000 // 6 hours in milliseconds
  return expiration - now < sixHours
}

// Refresh token function
let refreshPromise = null
async function refreshAccessToken () {
  // Prevent multiple simultaneous refresh calls
  if (refreshPromise) {
    return refreshPromise
  }

  refreshPromise = (async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token')
      if (!refreshToken) {
        throw new Error('No refresh token available')
      }

      const response = await axios.post(
        API_ENDPOINTS.AUTH.REFRESH,
        { refresh_token: refreshToken },
        {
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true
        }
      )

      const { access_token, refresh_token: newRefreshToken } = response.data

      // Always save the new access token
      if (access_token) {
        localStorage.setItem('access_token', access_token)
      }

      // Always save the new refresh token if provided
      if (newRefreshToken) {
        localStorage.setItem('refresh_token', newRefreshToken)
      }

      return access_token
    } catch (error) {
      // Clear tokens and redirect to login
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
      window.location.href = '/auth/login'
      throw error
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

// Request interceptor - add token and check if refresh needed
axiosInstance.interceptors.request.use(
  async config => {
    const token = localStorage.getItem('access_token')

    if (token) {
      // Check if token needs refresh before making request
      if (shouldRefreshToken(token)) {
        try {
          const newToken = await refreshAccessToken()
          config.headers.Authorization = `Bearer ${newToken}`
        } catch {
          // If refresh fails, continue with old token and let response interceptor handle it
          config.headers.Authorization = `Bearer ${token}`
        }
      } else {
        config.headers.Authorization = `Bearer ${token}`
      }
    }

    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// Response interceptor - handle 401 errors
axiosInstance.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config

    // If 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        // Try to refresh token
        const newToken = await refreshAccessToken()

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return axiosInstance(originalRequest)
      } catch (refreshError) {
        // Refresh already handled logout in refreshAccessToken function
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export default axiosInstance
