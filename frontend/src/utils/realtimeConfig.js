// Realtime mode is fixed to MQTT/WebSocket.
// API Polling mode has been removed — use REST API only for historical data.
localStorage.removeItem('realtimeMode')

export const REALTIME_MODE = 'mqtt'
export const REALTIME_POLL_INTERVAL_MS = 5000
