-- Optimize sensor_logs queries that filter by sensor_type (via sensors table)
-- This covers the monitoring pages (ADCP, CTD) which do:
--   JOIN sensors ON sensors.id = sensor_logs.sensor_id
--   JOIN sensor_types ON sensor_types.id = sensors.sensor_type_id
--   WHERE LOWER(sensor_types.name) = 'adcp'
--   ORDER BY sensor_logs.created_at DESC LIMIT N

-- Composite index on (sensor_id, created_at DESC) allows the planner to
-- efficiently find recent logs for a known set of sensor IDs.
-- Note: TimescaleDB hypertables do not support CONCURRENTLY.
CREATE INDEX IF NOT EXISTS idx_sensor_logs_sensor_id_created_at_desc
    ON sensor_logs (sensor_id, created_at DESC);

-- Index on sensors.sensor_type_id to speed up the join from sensors to sensor_types
CREATE INDEX IF NOT EXISTS idx_sensors_sensor_type_id
    ON sensors (sensor_type_id);
