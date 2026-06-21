package mqtt

import (
	"encoding/json"
	"log"
	"strings"
	"time"

	"go-fiber-pgsql/internal/repository"
	wsocket "go-fiber-pgsql/internal/websocket"

	"gorm.io/gorm"
)

// OfflineWatchdog periodically checks for vehicles that have stopped sending data
// and marks them offline if no vehicle_log has been received within the timeout window.
// This is the fallback for when MQTT LWT is not configured on the USV or
// the connection is dropped in a way that doesn't trigger LWT delivery.
type OfflineWatchdog struct {
	db          *gorm.DB
	vehicleRepo *repository.VehicleRepository
	wsHub       *wsocket.Hub
	timeout     time.Duration
	interval    time.Duration
	stop        chan struct{}
}

// NewOfflineWatchdog creates a watchdog that marks vehicles offline after `timeout`
// of inactivity (no vehicle_log rows). It checks every `interval`.
func NewOfflineWatchdog(db *gorm.DB, vehicleRepo *repository.VehicleRepository, wsHub *wsocket.Hub, timeout, interval time.Duration) *OfflineWatchdog {
	return &OfflineWatchdog{
		db:          db,
		vehicleRepo: vehicleRepo,
		wsHub:       wsHub,
		timeout:     timeout,
		interval:    interval,
		stop:        make(chan struct{}),
	}
}

// Start launches the watchdog in a background goroutine.
func (w *OfflineWatchdog) Start() {
	go w.run()
	log.Printf("✓ Offline watchdog started (timeout=%s, interval=%s)", w.timeout, w.interval)
}

// Stop signals the watchdog goroutine to exit.
func (w *OfflineWatchdog) Stop() {
	close(w.stop)
}

func (w *OfflineWatchdog) run() {
	ticker := time.NewTicker(w.interval)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			w.check()
		case <-w.stop:
			return
		}
	}
}

type staleVehicle struct {
	ID          uint
	Code        string
	LastLogTime *time.Time
}

func (w *OfflineWatchdog) check() {
	cutoff := time.Now().Add(-w.timeout)

	// Find vehicles that are currently marked online but have no vehicle_log
	// received within the timeout window.
	var stale []staleVehicle
	err := w.db.Raw(`
		SELECT v.id, v.code,
		       MAX(vl.created_at) AS last_log_time
		FROM vehicles v
		LEFT JOIN vehicle_logs vl ON vl.vehicle_id = v.id
		WHERE LOWER(v.connection_status) = 'online'
		GROUP BY v.id, v.code
		HAVING MAX(vl.created_at) IS NULL OR MAX(vl.created_at) < ?
	`, cutoff).Scan(&stale).Error
	if err != nil {
		log.Printf("⚠️  Watchdog DB query error: %v", err)
		return
	}

	for _, sv := range stale {
		log.Printf("⏱  Watchdog: vehicle %s has been silent >%s — marking offline", sv.Code, w.timeout)
		if err := w.vehicleRepo.UpdateConnectionStatus(sv.Code, "offline"); err != nil {
			log.Printf("❌ Watchdog: failed to update status for %s: %v", sv.Code, err)
			continue
		}
		w.broadcast(sv.Code)
	}
}

func (w *OfflineWatchdog) broadcast(vehicleCode string) {
	msg := map[string]interface{}{
		"type":         "vehicle_status",
		"vehicle_code": vehicleCode,
		"status":       "offline",
		"timestamp":    time.Now().Format(time.RFC3339),
		"source":       "watchdog",
	}
	b, err := json.Marshal(msg)
	if err != nil {
		return
	}
	w.wsHub.Broadcast(b)
	log.Printf("✓ Watchdog broadcasted offline for %s", strings.TrimSpace(vehicleCode))
}
