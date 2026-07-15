package main

import (
	"log"
	"os"
	"strings"
	"time"

	mqtt "github.com/eclipse/paho.mqtt.golang"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/helmet"
	"github.com/gofiber/fiber/v2/middleware/recover"

	"go-fiber-pgsql/internal/config"
	"go-fiber-pgsql/internal/model"
	"go-fiber-pgsql/internal/repository"
	"go-fiber-pgsql/internal/route"
	"go-fiber-pgsql/internal/seeder"
	"go-fiber-pgsql/internal/service/ctd/midas3000"
	mqttservice "go-fiber-pgsql/internal/service/mqtt"
	wsocket "go-fiber-pgsql/internal/websocket"
)

// @title User Management API with Authentication
// @version 1.0
// @description Complete API with JWT authentication, email verification, and CRUD operations
// @termsOfService http://swagger.io/terms/

// @contact.name API Support
// @contact.email support@example.com

// @license.name MIT
// @license.url https://opensource.org/licenses/MIT

// @host api.seano.cloud
// @BasePath /
// @schemes https

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Enter your JWT token (Bearer prefix will be added automatically)
func main() {
	saveRawLogsToDB := getEnvBool("RAW_LOG_SAVE_TO_DB", false)

	db, err := config.ConnectDB()
	if err != nil {
		log.Fatal(err)
	}

	models := []interface{}{
		&model.User{},
		&model.Role{},
		&model.Permission{},
		&model.SensorType{},
		&model.Sensor{},
		&model.Vehicle{},
		&model.VehicleBattery{},
		&model.VehicleSensor{},
		&model.SensorLog{},
		&model.VehicleLog{},
		&model.Alert{},
		&model.Mission{},
		&model.CommandLog{},
		&model.WaypointLog{},
		&model.ThrusterCommand{},
		&model.ThrusterLog{},
		&model.ChatSession{},
		&model.ChatMessage{},
		&model.Publication{},
		&model.TeamMember{},
		&model.SystemSetting{},
	}

	if saveRawLogsToDB {
		models = append(models, &model.RawLog{})
	}

	if err := config.MigrateDB(db, models...); err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	if err := config.SetupHypertables(db, saveRawLogsToDB); err != nil {
		log.Printf("Warning: Failed to setup hypertables: %v", err)
	}

	seeder.SeedRolesAndPermissions(db)

	seeder.SeedAdminUser(db)

	seeder.SeedRegularUser(db)

	seeder.SeedSensorTypes(db)

	seeder.SeedSensors(db)

	wsHub := wsocket.NewHub()
	go wsHub.Run()
	log.Println("WebSocket Hub started")

	sensorLogRepo := repository.NewSensorLogRepository(db)
	vehicleLogRepo := repository.NewVehicleLogRepository(db)
	rawLogRepo := repository.NewRawLogRepository(db)
	alertRepo := repository.NewAlertRepository(db)
	vehicleSensorRepo := repository.NewVehicleSensorRepository(db)
	vehicleRepo := repository.NewVehicleRepository(db)
	sensorRepo := repository.NewSensorRepository(db)
	missionRepo := repository.NewMissionRepository(db)
	commandLogRepo := repository.NewCommandLogRepository(db)
	thrusterLogRepo := repository.NewThrusterLogRepository(db)
	latencyAckRepo := repository.NewLatencyAckRepository(db)
	waypointLogRepo := repository.NewWaypointLogRepository(db)

	// MIDAS 3000 handler (legacy)
	midas3000Handler := midas3000.NewDataHandler(sensorLogRepo, vehicleSensorRepo, wsHub)

	realtimeMode := strings.TrimSpace(strings.ToLower(getEnv("REALTIME_MODE", "mqtt")))
	mqttEnabled := realtimeMode != "api"

	mqttBroker := getEnv("MQTT_BROKER", "")
	mqttPort := getEnv("MQTT_PORT", "1883")
	mqttUseTLS := getEnv("MQTT_USE_TLS", "false")
	mqttProtocol := strings.TrimSpace(getEnv("MQTT_PROTOCOL", ""))  // tcp | ssl | ws | wss
	mqttPath := getEnv("MQTT_PATH", "")                             // e.g. /mqtt (for ws/wss)

	var brokerURL string
	if mqttEnabled && mqttBroker != "" {
		if mqttProtocol != "" {
			// Explicit protocol overrides MQTT_USE_TLS
			brokerURL = mqttProtocol + "://" + mqttBroker + ":" + mqttPort + mqttPath
		} else if mqttUseTLS == "true" {
			brokerURL = "ssl://" + mqttBroker + ":" + mqttPort
		} else {
			brokerURL = "tcp://" + mqttBroker + ":" + mqttPort
		}
	}

	mqttConfig := midas3000.MQTTConfig{
		BrokerURL:     brokerURL,
		ClientID:      getEnv("MQTT_CLIENT_ID", "go-fiber-server"),
		Username:      getEnv("MQTT_USERNAME", ""),
		Password:      getEnv("MQTT_PASSWORD", ""),
		TopicPrefix:   getEnv("MQTT_TOPIC_PREFIX", "seano"),
		TLSInsecure:   getEnv("MQTT_TLS_INSECURE", "false") == "true",
		TLSCACertPath: getEnv("MQTT_CA_CERT_PATH", ""),
	}

	var cmdPublisher *mqttservice.CommandPublisher

	if brokerURL != "" {
		mqttListener, err := midas3000.NewMQTTListener(mqttConfig, midas3000Handler)
		if err != nil {
			log.Printf("Warning: Failed to create MQTT listener: %v", err)
		} else {
			if err := mqttListener.Connect(); err != nil {
				log.Printf("Warning: Failed to connect to MQTT broker: %v", err)
			} else {
				// Subscribe to legacy MIDAS 3000 topic
				if err := mqttListener.Subscribe(); err != nil {
					log.Printf("Warning: Failed to subscribe to MQTT topics: %v", err)
				} else {
					log.Println("MQTT Listener started and subscribed to topics")
				}

				// Get shared MQTT client for all listeners
				mqttClient := mqttListener.GetClient()

				// Vehicle Log Listener
				vehicleLogListener := mqttservice.NewVehicleLogListener(mqttClient, vehicleLogRepo, vehicleRepo, missionRepo, wsHub, latencyAckRepo)
				if err := vehicleLogListener.Start(); err != nil {
					log.Printf("Warning: Failed to start vehicle log listener: %v", err)
				}

				// Sensor Log Listener
				sensorLogListener := mqttservice.NewSensorLogListener(mqttClient, sensorLogRepo, vehicleRepo, sensorRepo, missionRepo, wsHub, latencyAckRepo)
				if err := sensorLogListener.Start(); err != nil {
					log.Printf("Warning: Failed to start sensor log listener: %v", err)
				}

				// Raw Log Listener
				rawLogListener := mqttservice.NewRawLogListener(mqttClient, rawLogRepo, vehicleRepo, wsHub, saveRawLogsToDB)
				if err := rawLogListener.Start(); err != nil {
					log.Printf("Warning: Failed to start raw log listener: %v", err)
				}
				if saveRawLogsToDB {
					log.Println("✓ Raw log persistence to DB: ENABLED")
				} else {
					log.Println("✓ Raw log persistence to DB: DISABLED")
				}

				// Battery Listener
				batteryListener := mqttservice.NewBatteryListener(mqttClient, vehicleRepo, wsHub)
				if err := batteryListener.Start(); err != nil {
					log.Printf("Warning: Failed to start battery listener: %v", err)
				}

				// Alert Listener (anti-theft/failsafe)
				alertListener := mqttservice.NewAlertListener(mqttClient, alertRepo, vehicleRepo, wsHub)
				if err := alertListener.Start(); err != nil {
					log.Printf("Warning: Failed to start alert listener: %v", err)
				}

				// Status Listener (MQTT LWT for online/offline)
				statusListener := mqttservice.NewStatusListener(mqttClient, vehicleRepo, wsHub)
				if err := statusListener.Start(); err != nil {
					log.Printf("Warning: Failed to start status listener: %v", err)
				}

				// Thruster Listener (logs MQTT thruster commands to DB)
				thrusterListener := mqttservice.NewThrusterListener(mqttClient, thrusterLogRepo, vehicleRepo, wsHub, latencyAckRepo)
				if err := thrusterListener.Start(); err != nil {
					log.Printf("Warning: Failed to start thruster listener: %v", err)
				}

				// Command Publisher (for control commands arm/disarm/mode)
				cmdPublisher = mqttservice.NewCommandPublisher(mqttClient, commandLogRepo, wsHub, latencyAckRepo)
				if err := cmdPublisher.SubscribeACK(); err != nil {
					log.Printf("Warning: Failed to subscribe to ACK topic: %v", err)
				}
				log.Println("✓ Command Publisher ready")

				// Waypoint Listener (mission progress from USV)
				waypointListener := mqttservice.NewWaypointListener(mqttClient, vehicleRepo, missionRepo, wsHub)
				if err := waypointListener.Start(); err != nil {
					log.Printf("Warning: Failed to start waypoint listener: %v", err)
				}

				// Waypoint ACK Listener (upload ACK from USV via seano/+/waypoint/response)
				waypointAckListener := mqttservice.NewWaypointAckListener(mqttClient, waypointLogRepo, vehicleRepo, latencyAckRepo, wsHub)
				if err := waypointAckListener.Start(); err != nil {
					log.Printf("Warning: Failed to start waypoint ACK listener: %v", err)
				}

				// Waypoint Clear Listener (clear response from USV via seano/+/waypoint/clear/response)
				waypointClearListener := mqttservice.NewWaypointClearListener(mqttClient, wsHub)
				if err := waypointClearListener.Start(); err != nil {
					log.Printf("Warning: Failed to start waypoint clear listener: %v", err)
				}

				// Offline Watchdog: fallback for missing LWT — marks vehicle offline
				// after 3 minutes of no vehicle_log data, checks every 60 seconds.
				watchdog := mqttservice.NewOfflineWatchdog(db, vehicleRepo, wsHub, 3*time.Minute, 60*time.Second)
				watchdog.Start()

				// Register reconnect callbacks so all listeners re-subscribe after MQTT reconnect.
				// With CleanSession=true, the broker discards subscriptions on disconnect.
				mqttListener.RegisterReconnectCallback(func(_ mqtt.Client) {
					log.Println("🔄 Re-subscribing all MQTT listeners after reconnect...")
					if err := vehicleLogListener.Start(); err != nil {
						log.Printf("❌ Failed to re-subscribe vehicle log listener: %v", err)
					}
					if err := sensorLogListener.Start(); err != nil {
						log.Printf("❌ Failed to re-subscribe sensor log listener: %v", err)
					}
					if err := rawLogListener.Start(); err != nil {
						log.Printf("❌ Failed to re-subscribe raw log listener: %v", err)
					}
					if err := batteryListener.Start(); err != nil {
						log.Printf("❌ Failed to re-subscribe battery listener: %v", err)
					}
					if err := alertListener.Start(); err != nil {
						log.Printf("❌ Failed to re-subscribe alert listener: %v", err)
					}
					if err := statusListener.Start(); err != nil {
						log.Printf("❌ Failed to re-subscribe status listener: %v", err)
					}
					if err := cmdPublisher.SubscribeACK(); err != nil {
						log.Printf("❌ Failed to re-subscribe command ACK: %v", err)
					}
					if err := waypointListener.Start(); err != nil {
						log.Printf("❌ Failed to re-subscribe waypoint listener: %v", err)
					}
					if err := waypointAckListener.Start(); err != nil {
						log.Printf("❌ Failed to re-subscribe waypoint ACK listener: %v", err)
					}
					if err := waypointClearListener.Start(); err != nil {
						log.Printf("❌ Failed to re-subscribe waypoint clear listener: %v", err)
					}
					log.Println("✓ All MQTT listeners re-subscribed successfully")
				})

				log.Println("✓ All MQTT listeners started successfully")
			}
		}
	} else if !mqttEnabled {
		log.Println("MQTT disabled by REALTIME_MODE=api")
	} else {
		log.Println("MQTT not configured, skipping MQTT listener")
	}

	app := fiber.New(fiber.Config{
		BodyLimit: 25 * 1024 * 1024, // 25MB — allow PDF uploads up to 20MB + overhead
	})

	app.Use(recover.New())
	app.Use(helmet.New(helmet.Config{
		XFrameOptions:      "SAMEORIGIN",
		ContentTypeNosniff: "nosniff",
		ReferrerPolicy:     "strict-origin-when-cross-origin",
		PermissionPolicy:   "geolocation=(self), camera=(), microphone=()",
		ContentSecurityPolicy: "default-src 'self'; " +
			"script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
			"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
			"font-src 'self' https://fonts.gstatic.com data:; " +
			"img-src 'self' data: blob: https://*.tile.openstreetmap.org https://*.tile.opentopomap.org https://tile.openstreetmap.bzh https://server.arcgisonline.com https://services.arcgisonline.com; " +
			"connect-src 'self' https://api.seano.cloud wss://api.seano.cloud ws://localhost:3000; " +
			"worker-src blob:; " +
			"frame-ancestors 'none';",
		HSTSMaxAge:         31536000,
		HSTSPreloadEnabled: true,
	}))
	app.Use(cors.New(cors.Config{
		AllowOrigins:     "http://localhost:5173,http://localhost:5177,https://seano.cloud,https://api.seano.cloud",
		AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS",
		AllowHeaders:     "Origin,Content-Type,Accept,Authorization",
		AllowCredentials: true,
	}))

	route.SetupRoutes(app, db, wsHub, cmdPublisher, saveRawLogsToDB)
	app.Listen(":3000")
}

func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}

func getEnvBool(key string, defaultValue bool) bool {
	value := strings.TrimSpace(strings.ToLower(os.Getenv(key)))
	if value == "" {
		return defaultValue
	}

	return value == "1" || value == "true" || value == "yes" || value == "on"
}
