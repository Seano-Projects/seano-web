import { useState, useEffect } from 'react'
import axios from 'axios'
import { API_ENDPOINTS } from '../config'

const useSensorData = selectedVehicle => {
  const [sensorData, setSensorData] = useState([])

  useEffect(() => {
    let interval
    if (selectedVehicle) {
      const fetchLogs = async () => {
        try {
          const res = await axios.get(
            API_ENDPOINTS.SENSOR_LOGS.BY_VEHICLE(selectedVehicle)
          )
          const data = res.data

          const mapped = (Array.isArray(data) ? data : []).map(d => ({
            created_at: d.created_at,
            temperature: d.data?.temperature ?? null,
            humidity: d.data?.humidity ?? null
          }))

          const sorted = mapped.sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
          )

          const latest = sorted.slice(0, 10)

          setSensorData(latest)
        } catch (err) {
          setSensorData([])
        }
      }

      fetchLogs()
      interval = setInterval(fetchLogs, 5000)
    }

    return () => clearInterval(interval)
  }, [selectedVehicle])

  return { sensorData }
}

export default useSensorData
