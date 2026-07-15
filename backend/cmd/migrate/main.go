package main

import (
	"log"

	"go-fiber-pgsql/internal/config"
	"go-fiber-pgsql/internal/model"
)

func main() {
	log.Println("Starting fresh migration...")

	// Membuka koneksi database
	db, err := config.ConnectDB()
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Drop tabel yang sudah ada (in reverse order to avoid FK issues)
	log.Println("Dropping existing tables...")
	dropOrder := []interface{}{
		&model.CommandLog{},
		&model.WaypointLog{},
		&model.RawLog{},
		&model.VehicleLog{},
		&model.SensorLog{},
		&model.Alert{},
		&model.Notification{},
		&model.Mission{},
		&model.VehicleSensor{},
		&model.VehicleBattery{},
		&model.Sensor{},
		&model.Vehicle{},
		&model.SensorType{},
		&model.User{},
		// Drop junction table separately
		"role_permissions",
		&model.Permission{},
		&model.Role{},
	}
	
	for _, table := range dropOrder {
		if err := db.Migrator().DropTable(table); err != nil {
			log.Printf("Warning: Failed to drop table %v: %v", table, err)
		}
	}
	
	// Membuat ulang tabel berdasarkan model (in correct order)
	log.Println("Creating tables...")
	
	// Step 1: Create base tables first
	if err := db.AutoMigrate(&model.Role{}, &model.Permission{}); err != nil {
		log.Fatal("Failed to create roles/permissions:", err)
	}
	
	// Step 2: Create rest of tables (junction tables will be auto-created)
	if err := config.MigrateDB(db,
		&model.User{},
		&model.SensorType{},
		&model.Sensor{},
		&model.Vehicle{},
		&model.VehicleBattery{},
		&model.VehicleSensor{},
		&model.Mission{},
		&model.Alert{},
		&model.Notification{},
		&model.SensorLog{},
		&model.VehicleLog{},
		&model.RawLog{},
		&model.CommandLog{},
		&model.WaypointLog{},
		&model.LatencyAck{},
		&model.SystemSetting{},
	); err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	// Additive column migrations for existing latency_acks table (idempotent).
	alterStmts := []string{
		`ALTER TABLE latency_acks ADD COLUMN IF NOT EXISTS initiated_at TIMESTAMPTZ`,
		`ALTER TABLE latency_acks ADD COLUMN IF NOT EXISTS mqtt_published_at TIMESTAMPTZ`,
		`ALTER TABLE latency_acks ADD COLUMN IF NOT EXISTS usv_ack_at TIMESTAMPTZ`,
		`ALTER TABLE latency_acks ADD COLUMN IF NOT EXISTS ack_received_at TIMESTAMPTZ`,
		// Remove latency-only columns from command_logs (now tracked in latency_acks)
		`ALTER TABLE command_logs DROP COLUMN IF EXISTS ws_sent_at`,
		`ALTER TABLE command_logs DROP COLUMN IF EXISTS ws_received_at`,
		// Remove ws_received_at from waypoint_logs (now tracked in latency_acks)
		`ALTER TABLE waypoint_logs DROP COLUMN IF EXISTS ws_received_at`,
	}
	for _, stmt := range alterStmts {
		if err := db.Exec(stmt).Error; err != nil {
			log.Printf("Warning: ALTER TABLE failed: %v | stmt: %s", err, stmt)
		}
	}

	log.Println("Fresh migration completed successfully!")
}
