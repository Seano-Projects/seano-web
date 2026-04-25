import { useState, useEffect, useRef } from 'react'
import { API_ENDPOINTS } from '../config'
import axios from '../utils/axiosConfig'
import config from '../config'
import useNotify from './useNotify'
import { NOTIFICATION_ACTIONS } from '../utils/notificationService'
import {
  REALTIME_MODE,
  REALTIME_POLL_INTERVAL_MS
} from '../utils/realtimeConfig'

const useMissionData = () => {
  const notify = useNotify()
  const isPollingMode = REALTIME_MODE === 'api'
  const [missionData, setMissionData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [stats, setStats] = useState({
    total_missions: 0,
    draft_missions: 0,
    ongoing_missions: 0,
    completed_missions: 0,
    failed_missions: 0
  })
  const wsRef = useRef(null)

  const activeMissionStatuses = ['active', 'running', 'in_progress', 'ongoing']

  const fetchMissionData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Use axios with config
      const response = await axios.get(API_ENDPOINTS.MISSIONS.LIST)
      const data = response.data

      // Pastikan data adalah array
      const missionsArray = Array.isArray(data) ? data : data.data || []

      // Transform data jika perlu
      const transformedData = missionsArray.map(mission => ({
        // Keep ALL original API fields first
        ...mission,
        // Override / add computed fields
        id: mission.id || Math.random(),
        name: mission.name || mission.title || 'Unnamed Mission',
        title: mission.name || mission.title || 'Unnamed Mission',
        vehicle: mission.vehicle_name || mission.vehicle || 'Unknown Vehicle',
        progress: Math.min(100, Math.max(0, mission.progress || 0)),
        status: mission.status || 'Unknown',
        statusColor: getStatusColor(mission.status),
        startTime:
          mission.start_time || mission.created_at || new Date().toISOString(),
        start_time: mission.start_time,
        created_at: mission.created_at,
        endTime: mission.end_time,
        waypoints: mission.waypoints || [],
        home_location: mission.home_location || null,
        current_waypoint: mission.current_waypoint || 0,
        completed_waypoint: mission.completed_waypoint || 0,
        total_waypoints: mission.total_waypoints ||
          (Array.isArray(mission.waypoints) ? mission.waypoints.length : 0),
        total_distance: mission.total_distance || 0,
        estimated_time: mission.estimated_time || 0,
        distance: mission.total_distance || mission.distance || 0,
        duration: mission.duration || 0
      }))

      setMissionData(transformedData)
      setLastUpdated(new Date())
    } catch {
      setError('Failed to load mission data')
      setMissionData([])
      setLastUpdated(new Date())
    } finally {
      setLoading(false)
    }
  }

  // Helper function untuk menentukan warna status
  const getStatusColor = status => {
    if (!status) return 'gray'

    const statusLower = status.toLowerCase()
    switch (statusLower) {
      case 'active':
      case 'running':
      case 'in_progress':
      case 'ongoing':
        return 'green'
      case 'completed':
      case 'finished':
      case 'success':
        return 'blue'
      case 'paused':
      case 'pending':
        return 'yellow'
      case 'failed':
      case 'error':
      case 'cancelled':
        return 'red'
      default:
        return 'gray'
    }
  }

  // Fetch mission stats
  const fetchMissionStats = async () => {
    try {
      const response = await axios.get(
        API_ENDPOINTS.MISSIONS.STATS || '/missions/stats'
      )
      setStats(response.data)
    } catch (err) {}
  }

  // Format time elapsed
  const formatTimeElapsed = seconds => {
    if (!seconds) return '00h 00m 00s'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(
      2,
      '0'
    )}m ${String(secs).padStart(2, '0')}s`
  }

  // Calculate energy status
  const getEnergyStatus = mission => {
    if (!mission.energy_budget) return 'N/A'

    if (mission.status === 'Completed' || mission.status === 'Failed') {
      return `${mission.energy_consumed?.toFixed(1) || 0} kWh used`
    }

    return `${mission.energy_consumed?.toFixed(1) || 0}/${
      mission.energy_budget?.toFixed(1) || 0
    } kWh`
  }

  // Fetch data saat hook pertama kali dimuat dan setup WebSocket
  useEffect(() => {
    fetchMissionData()
    fetchMissionStats()

    if (isPollingMode) {
      const interval = setInterval(() => {
        fetchMissionData()
        fetchMissionStats()
      }, REALTIME_POLL_INTERVAL_MS)

      return () => clearInterval(interval)
    }

    // Setup WebSocket untuk real-time updates
    const connectWebSocket = () => {
      const token =
        localStorage.getItem('access_token') || localStorage.getItem('token')
      if (!token) return

      const wsUrl = `${
        config.wsBaseUrl || 'ws://localhost:8080'
      }/ws/missions?token=${token}`

      wsRef.current = new WebSocket(wsUrl)

      wsRef.current.onopen = () => {}

      wsRef.current.onmessage = event => {
        try {
          const data = JSON.parse(event.data)

          if (data.message_type === 'mission_progress') {
            // Update mission in the list (robust matching: mission id and vehicle code)
            let matchedMission = false
            setMissionData(prevMissions =>
              prevMissions.map(mission => {
                const sameMissionId =
                  String(mission.id) === String(data.mission_id)
                const missionVehicleCode =
                  mission.vehicle_code ||
                  mission.vehicle?.code ||
                  (typeof mission.vehicle === 'string' ? mission.vehicle : '')
                const sameVehicle =
                  String(missionVehicleCode || '').toLowerCase() ===
                  String(data.vehicle_code || '').toLowerCase()
                const isLikelyActiveMission = activeMissionStatuses.includes(
                  String(mission.status || '').toLowerCase()
                )

                const shouldUpdate =
                  sameMissionId || (sameVehicle && isLikelyActiveMission)
                if (!shouldUpdate) return mission

                matchedMission = true
                return {
                  ...mission,
                  progress: data.progress,
                  energy_consumed: data.energy_consumed,
                  time_elapsed: data.time_elapsed,
                  current_waypoint: data.current_waypoint,
                  completed_waypoint: data.completed_waypoint,
                  status: data.status,
                  statusColor: getStatusColor(data.status),
                  last_update_time: data.timestamp
                }
              })
            )

            // If no mission matched locally (e.g. stale tab), refresh once from API.
            if (!matchedMission) {
              fetchMissionData()
            }

            // Refresh stats if status changed
            if (
              String(data.status).toLowerCase() === 'completed' ||
              String(data.status).toLowerCase() === 'failed'
            ) {
              fetchMissionStats()
            }
          }
        } catch (err) {}
      }

      wsRef.current.onerror = error => {}

      wsRef.current.onclose = () => {
        setTimeout(connectWebSocket, 3000)
      }
    }

    connectWebSocket()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Function untuk manual refresh
  const refreshData = () => {
    fetchMissionData()
    fetchMissionStats()
  }

  // Function untuk create mission
  const createMission = async missionData => {
    try {
      const response = await axios.post(
        API_ENDPOINTS.MISSIONS.CREATE,
        missionData
      )
      await fetchMissionData() // Refresh data
      return response.data
    } catch (error) {
      console.error('Error creating mission:', error)
      console.error('Error response:', error.response?.data)
      console.error('Error status:', error.response?.status)

      // Re-throw with better error info
      if (error.response) {
        const errorMessage =
          error.response.data?.detail ||
          error.response.data?.message ||
          error.response.data?.error ||
          `Server error: ${error.response.status}`
        throw new Error(errorMessage)
      } else if (error.request) {
        throw new Error(
          'No response from server. Please check your connection.'
        )
      } else {
        throw new Error(error.message || 'Failed to create mission')
      }
    }
  }

  // Function untuk update mission
  const updateMission = async (id, missionData) => {
    try {
      const response = await axios.put(
        API_ENDPOINTS.MISSIONS.UPDATE(id),
        missionData
      )

      await fetchMissionData() // Refresh data

      // Show success notification
      await notify.success('Mission has been updated successfully', {
        title: 'Mission Updated',
        action: NOTIFICATION_ACTIONS.MISSION_UPDATED,
        persist: true
      })

      return response.data
    } catch (error) {
      console.error('❌ MISSION UPDATE: Failed', error)

      // Show error notification
      await notify.error('Failed to update mission. Please try again.', {
        title: 'Update Mission Failed',
        action: NOTIFICATION_ACTIONS.MISSION_UPDATED,
        persist: true
      })

      throw error
    }
  }

  // Function untuk delete mission
  const deleteMission = async id => {
    try {
      await axios.delete(API_ENDPOINTS.MISSIONS.DELETE(id))

      await fetchMissionData() // Refresh data

      // Show success notification
      await notify.success('Mission has been deleted successfully', {
        title: 'Mission Deleted',
        action: NOTIFICATION_ACTIONS.MISSION_DELETED,
        persist: true
      })
    } catch (error) {
      console.error('❌ MISSION DELETE: Failed', error)

      // Show error notification
      await notify.error('Failed to delete mission. Please try again.', {
        title: 'Delete Mission Failed',
        action: NOTIFICATION_ACTIONS.MISSION_DELETED,
        persist: true
      })

      throw error
    }
  }

  // Function untuk mendapatkan recent missions (limit 5)
  const getRecentMissions = (limit = 5) => {
    return missionData
      .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
      .slice(0, limit)
  }

  // Function untuk mendapatkan active missions
  const getActiveMissions = () => {
    return missionData.filter(mission =>
      ['active', 'running', 'in_progress', 'ongoing'].includes(
        mission.status.toLowerCase()
      )
    )
  }

  // Function untuk mendapatkan completed missions
  const getCompletedMissions = () => {
    return missionData.filter(mission =>
      ['completed', 'finished', 'success'].includes(
        mission.status.toLowerCase()
      )
    )
  }

  // Function untuk mendapatkan failed missions
  const getFailedMissions = () => {
    return missionData.filter(mission =>
      ['failed', 'error', 'cancelled'].includes(mission.status.toLowerCase())
    )
  }

  // Function untuk analytics per vehicle
  const getVehicleAnalytics = () => {
    const vehicleStats = {}

    missionData.forEach(mission => {
      // Handle vehicle as object or string
      const vehicle =
        typeof mission.vehicle === 'string'
          ? mission.vehicle
          : mission.vehicle?.name || mission.vehicle?.code || 'Unknown Vehicle'

      if (!vehicleStats[vehicle]) {
        vehicleStats[vehicle] = {
          total: 0,
          completed: 0,
          failed: 0,
          active: 0
        }
      }

      vehicleStats[vehicle].total++

      const status = mission.status.toLowerCase()
      if (['completed', 'finished', 'success'].includes(status)) {
        vehicleStats[vehicle].completed++
      } else if (['failed', 'error', 'cancelled'].includes(status)) {
        vehicleStats[vehicle].failed++
      } else if (activeMissionStatuses.includes(status)) {
        vehicleStats[vehicle].active++
      }
    })

    return Object.entries(vehicleStats).map(([vehicle, stats]) => ({
      vehicle,
      ...stats,
      successRate:
        stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
    }))
  }

  // Statistics (combine API stats with calculated stats)
  const combinedStats = {
    total: stats.total_missions || missionData.length,
    draft: stats.draft_missions || 0,
    ongoing: stats.ongoing_missions || getActiveMissions().length,
    completed: stats.completed_missions || getCompletedMissions().length,
    failed: stats.failed_missions || getFailedMissions().length,
    active: getActiveMissions().length,
    totalDistance: missionData.reduce(
      (sum, mission) => sum + (mission.distance || 0),
      0
    ),
    totalDuration: missionData.reduce(
      (sum, mission) => sum + (mission.duration || 0),
      0
    ),
    averageProgress:
      missionData.length > 0
        ? Math.round(
            missionData.reduce((sum, mission) => sum + mission.progress, 0) /
              missionData.length
          )
        : 0
  }

  return {
    missionData,
    loading,
    error,
    lastUpdated,
    fetchMissionData,
    refreshData,
    createMission,
    updateMission,
    deleteMission,
    getRecentMissions,
    getActiveMissions,
    getCompletedMissions,
    getFailedMissions,
    getVehicleAnalytics,
    stats: combinedStats,
    formatTimeElapsed,
    getEnergyStatus
  }
}

export default useMissionData
