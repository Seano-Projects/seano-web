package util

import (
	"os"
	"strconv"
	"syscall"
)

// GetMaxStorageSize returns the maximum storage size for the database
// Priority: 1) Environment variable, 2) Detected filesystem size, 3) Default 100GB
func GetMaxStorageSize() int64 {
	// Try to get from environment variable first
	if envSize := os.Getenv("MAX_STORAGE_SIZE"); envSize != "" {
		if size, err := strconv.ParseInt(envSize, 10, 64); err == nil && size > 0 {
			return size
		}
	}

	// Try to detect from filesystem (where PostgreSQL data is stored)
	// Default PostgreSQL data path in Docker container
	dataPath := os.Getenv("PGDATA")
	if dataPath == "" {
		dataPath = "/var/lib/postgresql/data"
	}

	// Use syscall.Statfs to get filesystem stats
	var stat syscall.Statfs_t
	if err := syscall.Statfs(dataPath, &stat); err == nil {
		// Total available space = blocks * block size
		// Use 80% of total space as max storage to leave room for system
		totalSpace := int64(stat.Blocks) * int64(stat.Bsize)
		return int64(float64(totalSpace) * 0.8)
	}

	// Fallback to 100GB if detection fails
	return 107374182400 // 100 GB in bytes
}

// GetAvailableStorageSize returns current available storage on filesystem
func GetAvailableStorageSize() int64 {
	dataPath := os.Getenv("PGDATA")
	if dataPath == "" {
		dataPath = "/var/lib/postgresql/data"
	}

	var stat syscall.Statfs_t
	if err := syscall.Statfs(dataPath, &stat); err == nil {
		// Available space for non-root users
		return int64(stat.Bavail) * int64(stat.Bsize)
	}

	return 0
}
