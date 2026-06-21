import axios from 'axios'
import { API_ENDPOINTS } from '../config'
import { clearCachedWebSocketToken } from './wsAuth'

// Create axios instance
const axiosInstance = axios.create()
axiosInstance.defaults.withCredentials = true

// Decode JWT to get expiration time
function getTokenExpiration (token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000 // Convert to milliseconds
  } catch {
    return null
  }
}

// Check if token will expire soon (within 5 minutes)
function shouldRefreshToken (token) {
  const expiration = getTokenExpiration(token)
  if (!expiration) return false

  const now = Date.now()
  const fiveMinutes = 5 * 60 * 1000
  return expiration - now < fiveMinutes
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
      const response = await axios.post(
        API_ENDPOINTS.AUTH.REFRESH,
        {},
        {
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true
        }
      )

      const { access_token } = response.data

      // Always save the new access token
      if (access_token) {
        localStorage.setItem('access_token', access_token)
      }

      return access_token
    } catch (error) {
      // Only clear tokens and redirect if it's not a sessions endpoint
      // Sessions endpoint might return 401 for non-admin users, which is expected
      const isSessionsEndpoint =
        window.location.pathname.includes('/user') ||
        error.config?.url?.includes('/auth/sessions')

      // If the current access token is still valid (not yet expired), don't
      // force-logout. This prevents logouts when multiple devices share an
      // account and one device consumes the refresh token first (rotating-refresh
      // token scenario). The request will proceed with the existing token.
      const existingToken = localStorage.getItem('access_token')
      const tokenStillValid =
        existingToken && getTokenExpiration(existingToken) > Date.now()

      if (!isSessionsEndpoint && !tokenStillValid) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('user')
        clearCachedWebSocketToken()
        // Dispatch event agar AuthContext bisa handle redirect via React Router
        window.dispatchEvent(new Event('auth:logout'))
      }
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
    // Skip token handling for auth endpoints
    const isAuthEndpoint =
      config.url?.includes('/auth/login') ||
      config.url?.includes('/auth/register') ||
      config.url?.includes('/auth/refresh') ||
      config.url?.includes('/register-email') ||
      config.url?.includes('/verify-email') ||
      config.url?.includes('/set-credentials') ||
      config.url?.includes('/forgot-password') ||
      config.url?.includes('/reset-password')

    if (isAuthEndpoint) {
      return config
    }

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

    // Skip refresh for auth endpoints
    const isAuthEndpoint =
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/register') ||
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/register-email') ||
      originalRequest.url?.includes('/verify-email') ||
      originalRequest.url?.includes('/set-credentials') ||
      originalRequest.url?.includes('/forgot-password') ||
      originalRequest.url?.includes('/reset-password')

    // If 401 and we haven't tried to refresh yet (and not an auth endpoint)
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthEndpoint
    ) {
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
