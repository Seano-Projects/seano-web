import { useState, useEffect } from 'react'
import { API_ENDPOINTS } from '../config'
import axios from '../utils/axiosConfig'

const useSensorsData = () => {
  const [sensors, setSensors] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalSensors: 0,
    activeSensors: 0,
    inactiveSensors: 0,
    hidrografiSensors: 0,
    oseanografiSensors: 0
  })

  const fetchSensors = async () => {
    setLoading(true)

    try {
      const response = await axios.get(API_ENDPOINTS.SENSORS.LIST)
      const data = Array.isArray(response.data) ? response.data : []
      setSensors(data)
      calculateStats(data)
    } catch (error) {
      setSensors([])
      calculateStats([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSensors()
  }, [])

  const calculateStats = sensorData => {
    const totalSensors = sensorData.length
    const activeSensors = sensorData.filter(s => s.is_active).length
    const inactiveSensors = totalSensors - activeSensors
    const hidrografiSensors = sensorData.filter(
      s => s.sensor_type_id === 'hidrografi' || s.type === 'hidrografi'
    ).length
    const oseanografiSensors = sensorData.filter(
      s => s.sensor_type_id === 'oseanografi' || s.type === 'oseanografi'
    ).length

    setStats({
      totalSensors,
      activeSensors,
      inactiveSensors,
      hidrografiSensors,
      oseanografiSensors
    })
  }

  const addSensor = newSensor => {
    const sensor = {
      ...newSensor,
      id: sensors.length + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const updatedSensors = [...sensors, sensor]
    setSensors(updatedSensors)

    // Recalculate stats with new sensor
    calculateStats(updatedSensors)
  }

  return {
    sensors,
    loading,
    stats,
    fetchSensors
  }
}

export default useSensorsData
