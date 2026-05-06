package config

import (
	"log"

	"gorm.io/gorm"
)

func SetupHypertables(db *gorm.DB, includeRawLogs bool) error {
	if err := db.Exec("CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;").Error; err != nil {
		log.Printf("Warning: Could not create timescaledb extension (might already exist): %v", err)
	}

	// Ensure created_at is NOT NULL (required by TimescaleDB time dimension)
	// and that the primary key is composite (id, created_at) — required for hypertable unique indexes.
	pkFixQueries := []string{
		`ALTER TABLE vehicle_logs ALTER COLUMN created_at SET NOT NULL;`,
		`ALTER TABLE sensor_logs ALTER COLUMN created_at SET NOT NULL;`,
		`DO $$ BEGIN
			IF EXISTS (
				SELECT 1 FROM pg_constraint
				WHERE conname = 'vehicle_logs_pkey'
				  AND array_length(conkey, 1) = 1
			) THEN
				ALTER TABLE vehicle_logs DROP CONSTRAINT vehicle_logs_pkey;
				ALTER TABLE vehicle_logs ADD PRIMARY KEY (id, created_at);
			END IF;
		END $$;`,
		`DO $$ BEGIN
			IF EXISTS (
				SELECT 1 FROM pg_constraint
				WHERE conname = 'sensor_logs_pkey'
				  AND array_length(conkey, 1) = 1
			) THEN
				ALTER TABLE sensor_logs DROP CONSTRAINT sensor_logs_pkey;
				ALTER TABLE sensor_logs ADD PRIMARY KEY (id, created_at);
			END IF;
		END $$;`,
	}
	for _, q := range pkFixQueries {
		if err := db.Exec(q).Error; err != nil {
			log.Printf("Warning: PK/NOT NULL fix: %v", err)
		}
	}

	if err := db.Exec(`
		SELECT create_hypertable('sensor_logs', 'created_at', 
			if_not_exists => TRUE,
			migrate_data => TRUE
		);
	`).Error; err != nil {
		log.Printf("Warning: Could not create hypertable for sensor_logs: %v", err)
	} else {
		log.Println("✓ Hypertable created: sensor_logs")
	}

	if err := db.Exec(`
		SELECT create_hypertable('vehicle_logs', 'created_at', 
			if_not_exists => TRUE,
			migrate_data => TRUE
		);
	`).Error; err != nil {
		log.Printf("Warning: Could not create hypertable for vehicle_logs: %v", err)
	} else {
		log.Println("✓ Hypertable created: vehicle_logs")
	}

	chunkQueries := []string{
		`SELECT set_chunk_time_interval('vehicle_logs', INTERVAL '1 day');`,
		`SELECT set_chunk_time_interval('sensor_logs', INTERVAL '12 hours');`,
	}

	if includeRawLogs {
		if err := db.Exec(`
			SELECT create_hypertable('raw_logs', 'created_at', 
				if_not_exists => TRUE,
				migrate_data => TRUE
			);
		`).Error; err != nil {
			log.Printf("Warning: Could not create hypertable for raw_logs: %v", err)
		} else {
			log.Println("✓ Hypertable created: raw_logs")
		}

		chunkQueries = append(chunkQueries, `SELECT set_chunk_time_interval('raw_logs', INTERVAL '1 day');`)
	}

	for _, query := range chunkQueries {
		if err := db.Exec(query).Error; err != nil {
			log.Printf("Warning: Chunk interval setup: %v", err)
		}
	}

	compressionQueries := []string{
		`ALTER TABLE sensor_logs SET (
			timescaledb.compress,
			timescaledb.compress_segmentby = 'vehicle_id, sensor_id',
			timescaledb.compress_orderby = 'created_at DESC'
		);`,
		`ALTER TABLE vehicle_logs SET (
			timescaledb.compress,
			timescaledb.compress_segmentby = 'vehicle_id',
			timescaledb.compress_orderby = 'created_at DESC'
		);`,
		`SELECT remove_compression_policy('sensor_logs', if_exists => TRUE);`,
		`SELECT remove_compression_policy('vehicle_logs', if_exists => TRUE);`,

		`SELECT add_compression_policy('sensor_logs', INTERVAL '7 days', if_not_exists => TRUE);`,
		`SELECT add_compression_policy('vehicle_logs', INTERVAL '14 days', if_not_exists => TRUE);`,
	}

	if includeRawLogs {
		compressionQueries = append(compressionQueries,
			`ALTER TABLE raw_logs SET (
				timescaledb.compress,
				timescaledb.compress_segmentby = 'vehicle_id',
				timescaledb.compress_orderby = 'created_at DESC'
			);`,
			`SELECT remove_compression_policy('raw_logs', if_exists => TRUE);`,
			`SELECT add_compression_policy('raw_logs', INTERVAL '7 days', if_not_exists => TRUE);`,
		)
	}

	for _, query := range compressionQueries {
		if err := db.Exec(query).Error; err != nil {
			log.Printf("Warning: Compression policy setup: %v", err)
		}
	}

	log.Println("✓ Hypertable compression policies configured")

	retentionQueries := []string{
		`SELECT remove_retention_policy('sensor_logs', if_exists => TRUE);`,
		`SELECT remove_retention_policy('vehicle_logs', if_exists => TRUE);`,
	}

	if includeRawLogs {
		retentionQueries = append(retentionQueries, `SELECT remove_retention_policy('raw_logs', if_exists => TRUE);`)
	}

	for _, query := range retentionQueries {
		if err := db.Exec(query).Error; err != nil {
			log.Printf("Warning: Retention policy setup: %v", err)
		}
	}

	log.Println("✓ Hypertable retention policies removed (full history preserved)")

	return nil
}

