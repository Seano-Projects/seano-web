package config

import (
	"fmt"
	"os"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func ConnectDB() (*gorm.DB, error) {
	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=disable",
		os.Getenv("DB_HOST"),
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"),
		os.Getenv("DB_PORT"),
	)

	logLevel := logger.Warn
	if os.Getenv("DB_LOG_LEVEL") == "info" {
		logLevel = logger.Info
	}

	var db *gorm.DB
	var err error

	for i := 1; i <= 10; i++ {
		db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
			Logger: logger.Default.LogMode(logLevel),
		})
		if err == nil {
			// Configure connection pool
			sqlDB, poolErr := db.DB()
			if poolErr == nil {
				sqlDB.SetMaxOpenConns(50)
				sqlDB.SetMaxIdleConns(10)
				sqlDB.SetConnMaxLifetime(30 * time.Minute)
				sqlDB.SetConnMaxIdleTime(5 * time.Minute)
			}
			return db, nil
		}
		time.Sleep(2 * time.Second)
	}

	return nil, err
}

func MigrateDB(db *gorm.DB, models ...interface{}) error {
	err := db.AutoMigrate(models...)
	if err != nil {
		return err
	}
	return nil
}
