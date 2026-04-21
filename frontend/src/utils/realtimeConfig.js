const normalizeMode = value =>
  typeof value === 'string' ? value.trim().toLowerCase() : ''

const rawMode = normalizeMode(import.meta.env.VITE_REALTIME_MODE)

export const REALTIME_MODE = rawMode === 'api' ? 'api' : 'mqtt'

const parseInterval = value => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5000
}

export const REALTIME_POLL_INTERVAL_MS = parseInterval(
  import.meta.env.VITE_REALTIME_POLL_INTERVAL_MS
)
