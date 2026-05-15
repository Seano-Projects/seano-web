const normalizeMode = value =>
  typeof value === 'string' ? value.trim().toLowerCase() : ''

const savedMode = normalizeMode(localStorage.getItem('realtimeMode'))
const envMode = normalizeMode(import.meta.env.VITE_REALTIME_MODE)
const rawMode = savedMode || envMode

export const REALTIME_MODE = rawMode === 'api' ? 'api' : 'mqtt'

const parseInterval = value => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5000
}

export const REALTIME_POLL_INTERVAL_MS = parseInterval(
  import.meta.env.VITE_REALTIME_POLL_INTERVAL_MS
)
