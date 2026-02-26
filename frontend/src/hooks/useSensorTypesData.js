import { useState, useEffect } from 'react'
import { API_ENDPOINTS } from '../config'
import axios from '../utils/axiosConfig'

const useSensorTypesData = () => {
  const [sensorTypes, setSensorTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalSensorTypes: 0,
    activeSensorTypes: 0,
    inactiveSensorTypes: 0,
    hidrografiTypes: 0,
    oseanografiTypes: 0
  })

  const fetchSensorTypes = async () => {
    setLoading(true)

    try {
      const response = await axios.get(API_ENDPOINTS.SENSOR_TYPES.LIST)
      const data = Array.isArray(response.data) ? response.data : []
      setSensorTypes(data)
      calculateStats(data)
    } catch (error) {
      setSensorTypes([])
      calculateStats([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSensorTypes()
  }, [])

  const calculateStats = sensorTypeData => {
    const totalSensorTypes = sensorTypeData.length
    const activeSensorTypes = sensorTypeData.filter(st => st.is_active).length
    const inactiveSensorTypes = totalSensorTypes - activeSensorTypes
    const hidrografiTypes = sensorTypeData.filter(st =>
      (st.name || '').toLowerCase().includes('hidrografi')
    ).length
    const oseanografiTypes = sensorTypeData.filter(st =>
      (st.name || '').toLowerCase().includes('oseanografi')
    ).length

    setStats({
      totalSensorTypes,
      activeSensorTypes,
      inactiveSensorTypes,
      hidrografiTypes,
      oseanografiTypes
    })
  }

  return {
    sensorTypes,
    loading,
    stats,
    fetchSensorTypes
  }
}

export default useSensorTypesData
