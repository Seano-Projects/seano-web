import { useState, useEffect, useMemo } from 'react'
import { API_BASE_URL } from '../config'

const useVehicleData = () => {
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedVehicleId, setSelectedVehicleId] = useState('')

  useEffect(() => {
    let loadingTimeout

    loadingTimeout = setTimeout(() => {
      setLoading(false)
    }, 5000)

    const fetchVehicles = async () => {
      // Get token from localStorage
      const token = localStorage.getItem('access_token')

      // Skip fetch if no token (not logged in)
      if (!token) {
        setVehicles([])
        setLoading(false)
        return
      }

      try {
        setLoading(true)

        const response = await fetch(`${API_BASE_URL}/vehicles`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(
            `HTTP error! status: ${response.status}, message: ${errorText}`
          )
        }

        const data = await response.json()

        // Handle different response formats
        let vehiclesArray = []
        if (Array.isArray(data)) {
          vehiclesArray = data
        } else if (data && Array.isArray(data.data)) {
          vehiclesArray = data.data
        } else if (data && data.vehicles && Array.isArray(data.vehicles)) {
          vehiclesArray = data.vehicles
        }

        // Process and validate API data
        const processedVehicles = vehiclesArray.map(vehicle => ({
          id: vehicle.id,
          name: vehicle.name || `Vehicle ${vehicle.id}`,
          code: vehicle.code || `USV-${String(vehicle.id).padStart(3, '0')}`,
          type: vehicle.type || 'USV',
          role: vehicle.role || 'Patrol',
          status: vehicle.status || 'offline',
          battery_level: vehicle.battery_level || 0,
          latitude: vehicle.latitude || null,
          longitude: vehicle.longitude || null,
          created_at: vehicle.created_at || new Date().toISOString()
        }))

        // Only update state if data actually changed
        setVehicles(prevVehicles => {
          const hasChanged =
            JSON.stringify(prevVehicles) !== JSON.stringify(processedVehicles)
          return hasChanged ? processedVehicles : prevVehicles
        })
      } catch {
        // Set empty array on error instead of dummy data
        setVehicles([])
      } finally {
        setLoading(false)
        // Clear loading timeout since we got a response
        if (loadingTimeout) clearTimeout(loadingTimeout)
      }
    }

    // Fetch vehicles on mount and when component re-mounts
    fetchVehicles()

    // Re-fetch when user logs in
    const handleUserLogin = () => {
      fetchVehicles()
    }

    window.addEventListener('userLoggedIn', handleUserLogin)

    return () => {
      if (loadingTimeout) clearTimeout(loadingTimeout)
      window.removeEventListener('userLoggedIn', handleUserLogin)
    }
  }, [])

  // Calculate widget data with useMemo to prevent unnecessary recalculations
  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

    const vehiclesToday = vehicles.filter(v => v.created_at.startsWith(today))
    const vehiclesYesterday = vehicles.filter(v =>
      v.created_at.startsWith(yesterday)
    )

    const totalToday = vehiclesToday.length
    const totalYesterday = vehiclesYesterday.length

    const onMissionToday = vehiclesToday.filter(
      v => v.status === 'on_mission'
    ).length
    const onMissionYesterday = vehiclesYesterday.filter(
      v => v.status === 'on_mission'
    ).length

    const onlineToday = vehiclesToday.filter(
      v =>
        v.status === 'online' ||
        v.status === 'idle' ||
        v.status === 'on_mission'
    ).length
    const onlineYesterday = vehiclesYesterday.filter(
      v =>
        v.status === 'online' ||
        v.status === 'idle' ||
        v.status === 'on_mission'
    ).length

    const offlineToday = vehiclesToday.filter(
      v => v.status === 'offline'
    ).length
    const offlineYesterday = vehiclesYesterday.filter(
      v => v.status === 'offline'
    ).length

    const maintenanceToday = vehiclesToday.filter(
      v => v.status === 'maintenance'
    ).length
    const maintenanceYesterday = vehiclesYesterday.filter(
      v => v.status === 'maintenance'
    ).length

    return {
      totalToday,
      totalYesterday,
      onMissionToday,
      onMissionYesterday,
      onlineToday,
      onlineYesterday,
      offlineToday,
      offlineYesterday,
      maintenanceToday,
      maintenanceYesterday
    }
  }, [vehicles])

  return {
    vehicles,
    loading,
    selectedVehicleId,
    setSelectedVehicleId,
    stats
  }
}

export default useVehicleData
