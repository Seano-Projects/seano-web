package route

import (
	"fmt"
	"os"
	"time"

	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	swagger "github.com/gofiber/swagger"
	"gorm.io/gorm"

	_ "go-fiber-pgsql/docs"
	"go-fiber-pgsql/internal/handler"
	"go-fiber-pgsql/internal/middleware"
	"go-fiber-pgsql/internal/repository"
	mqttservice "go-fiber-pgsql/internal/service/mqtt"
	"go-fiber-pgsql/internal/util"
	wsocket "go-fiber-pgsql/internal/websocket"
)

func SetupRoutes(app *fiber.App, db *gorm.DB, wsHub *wsocket.Hub, cmdPublisher *mqttservice.CommandPublisher, rawLogsEnabled bool) {
	// Static file serving for uploads only
	app.Static("/uploads", "./public/uploads")

	// Initialize repositories
	roleRepo := repository.NewRoleRepository(db)
	permissionRepo := repository.NewPermissionRepository(db)
	sensorTypeRepo := repository.NewSensorTypeRepository(db)
	sensorRepo := repository.NewSensorRepository(db)
	vehicleRepo := repository.NewVehicleRepository(db)
	vehicleSensorRepo := repository.NewVehicleSensorRepository(db)
	sensorLogRepo := repository.NewSensorLogRepository(db)
	vehicleLogRepo := repository.NewVehicleLogRepository(db)
	rawLogRepo := repository.NewRawLogRepository(db)
	missionRepo := repository.NewMissionRepository(db)
	alertRepo := repository.NewAlertRepository(db)
	notificationRepo := repository.NewNotificationRepository(db)
	commandLogRepo := repository.NewCommandLogRepository(db)
	waypointLogRepo := repository.NewWaypointLogRepository(db)
	thrusterCommandRepo := repository.NewThrusterCommandRepository(db)
	thrusterLogRepo := repository.NewThrusterLogRepository(db)
	latencyAckRepo := repository.NewLatencyAckRepository(db)
	systemSettingRepo := repository.NewSystemSettingRepository(db)

	// Initialize handlers
	userHandler := &handler.UserHandler{DB: db}
	emailService := util.NewEmailService()
	authHandler := &handler.AuthHandler{
		DB:           db,
		EmailService: emailService,
	}
	roleHandler := handler.NewRoleHandler(roleRepo)
	permissionHandler := handler.NewPermissionHandler(permissionRepo, roleRepo)
	sensorTypeHandler := handler.NewSensorTypeHandler(sensorTypeRepo)
	sensorHandler := handler.NewSensorHandler(sensorRepo, db)
	vehicleHandler := handler.NewVehicleHandler(vehicleRepo, db, wsHub)
	vehicleSensorHandler := handler.NewVehicleSensorHandler(vehicleSensorRepo, vehicleRepo, sensorRepo, db)
	sensorLogHandler := handler.NewSensorLogHandler(sensorLogRepo, vehicleRepo, sensorRepo, db, wsHub)
	vehicleLogHandler := handler.NewVehicleLogHandler(vehicleLogRepo, vehicleRepo, missionRepo, db, wsHub)
	rawLogHandler := handler.NewRawLogHandler(rawLogRepo, vehicleRepo, db, rawLogsEnabled, wsHub)
	logStatsHandler := handler.NewLogStatsHandler(vehicleLogRepo, sensorLogRepo, rawLogRepo, vehicleRepo, db, rawLogsEnabled)
	missionHandler := handler.NewMissionHandler(missionRepo, vehicleRepo, waypointLogRepo, cmdPublisher, db, wsHub, latencyAckRepo)
	alertHandler := handler.NewAlertHandler(alertRepo, vehicleRepo, wsHub, db)
	notificationHandler := handler.NewNotificationHandler(notificationRepo, db)
	controlHandler := handler.NewControlHandler(cmdPublisher, commandLogRepo, vehicleRepo, latencyAckRepo)
	commandLogHandler := handler.NewCommandLogHandler(commandLogRepo, vehicleRepo, db, wsHub)
	commandLogHandler.SetLatencyAckRepo(latencyAckRepo)
	waypointLogHandler := handler.NewWaypointLogHandler(waypointLogRepo, vehicleRepo, db, wsHub, latencyAckRepo)
	thrusterCommandHandler := handler.NewThrusterCommandHandler(thrusterCommandRepo, thrusterLogRepo, vehicleRepo, db, wsHub)
	thrusterLogHandler := handler.NewThrusterLogHandler(thrusterLogRepo, vehicleRepo, db, wsHub)
	publicationRepo := repository.NewPublicationRepository(db)
	publicationHandler := handler.NewPublicationHandler(publicationRepo)
	teamMemberRepo := repository.NewTeamMemberRepository(db)
	teamMemberHandler := handler.NewTeamMemberHandler(teamMemberRepo)
	contactHandler := handler.NewContactHandler(emailService)
	latencyAckHandler := handler.NewLatencyAckHandler(latencyAckRepo)
	wsHandler := wsocket.NewWebSocketHandler(wsHub)

	// Swagger route (disabled in production)
	if os.Getenv("ENVIRONMENT") != "production" {
		app.Get("/swagger/*", swagger.HandlerDefault)
	}

	// Auth routes (public)
	// Rate limiter for auth endpoints
	authLimiter := limiter.New(limiter.Config{
		Max:        10,
		Expiration: 15 * time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(429).JSON(fiber.Map{"error": "Too many requests. Please try again later."})
		},
	})

	auth := app.Group("/auth")
	auth.Post("/register-email", authLimiter, authHandler.RegisterEmail)
	auth.Post("/verify-email", authHandler.VerifyEmail)
	auth.Post("/set-credentials", authHandler.SetCredentials)
	auth.Post("/resend-verification", authLimiter, authHandler.ResendVerification)
	auth.Post("/login", authLimiter, authHandler.Login)
	auth.Post("/refresh", authHandler.RefreshToken)
	auth.Post("/forgot-password", authLimiter, authHandler.ForgotPassword)
	auth.Post("/reset-password", authLimiter, authHandler.ResetPassword)

	// Auth routes (protected)
	auth.Get("/me", middleware.AuthRequired(), authHandler.GetMe)
	auth.Get("/ws-token", middleware.AuthRequired(), authHandler.CreateWebSocketToken)
	auth.Post("/logout", middleware.AuthRequired(), authHandler.Logout)
	auth.Get("/sessions", middleware.AuthRequired(), authHandler.GetActiveSessions)
	auth.Delete("/sessions/:id", middleware.AuthRequired(), authHandler.LogoutSession)

	// User management routes (protected)
	users := app.Group("/users", middleware.AuthRequired())
	users.Post("/", middleware.CheckPermission(db, "users.create"), userHandler.CreateUser)
	users.Get("/", middleware.CheckPermission(db, "users.read"), userHandler.GetAllUsers)
	users.Get("/:user_id", userHandler.GetUserByID) // Ownership check in handler
	users.Put("/:user_id", userHandler.UpdateUser)  // Ownership check in handler
	users.Post("/:user_id/avatar", userHandler.UploadAvatar) // Ownership check in handler
	users.Delete("/:user_id", middleware.CheckPermission(db, "users.delete"), userHandler.DeleteUser)

	// Role management routes (protected, admin only)
	roles := app.Group("/roles", middleware.AuthRequired())
	roles.Post("/", middleware.CheckPermission(db, "roles.manage"), roleHandler.CreateRole)
	roles.Get("/", middleware.CheckPermission(db, "roles.read"), roleHandler.GetAllRoles)
	roles.Get("/:id", middleware.CheckPermission(db, "roles.read"), roleHandler.GetRoleByID)
	roles.Put("/:id", middleware.CheckPermission(db, "roles.manage"), roleHandler.UpdateRole)
	roles.Delete("/:id", middleware.CheckPermission(db, "roles.manage"), roleHandler.DeleteRole)

	// Permission management routes (protected, admin only)
	permissions := app.Group("/permissions", middleware.AuthRequired())
	permissions.Post("/", middleware.CheckPermission(db, "permissions.manage"), permissionHandler.CreatePermission)
	permissions.Get("/", middleware.CheckPermission(db, "permissions.read"), permissionHandler.GetAllPermissions)
	permissions.Get("/:id", middleware.CheckPermission(db, "permissions.read"), permissionHandler.GetPermissionByID)
	permissions.Put("/:id", middleware.CheckPermission(db, "permissions.manage"), permissionHandler.UpdatePermission)
	permissions.Delete("/:id", middleware.CheckPermission(db, "permissions.manage"), permissionHandler.DeletePermission)
	permissions.Post("/assign-to-role", middleware.CheckPermission(db, "permissions.manage"), permissionHandler.AssignPermissionToRole)
	permissions.Delete("/remove-from-role/:role_id/:permission_id", middleware.CheckPermission(db, "permissions.manage"), permissionHandler.RemovePermissionFromRole)

	// Sensor Type management routes (protected, admin only)
	sensorTypes := app.Group("/sensor-types", middleware.AuthRequired())
	sensorTypes.Post("/", middleware.CheckPermission(db, "sensor_types.manage"), sensorTypeHandler.CreateSensorType)
	sensorTypes.Get("/", sensorTypeHandler.GetAllSensorTypes)
	sensorTypes.Get("/:sensor_type_id", sensorTypeHandler.GetSensorTypeByID)
	sensorTypes.Put("/:sensor_type_id", middleware.CheckPermission(db, "sensor_types.manage"), sensorTypeHandler.UpdateSensorType)
	sensorTypes.Delete("/:sensor_type_id", middleware.CheckPermission(db, "sensor_types.manage"), sensorTypeHandler.DeleteSensorType)

	// Sensor master data routes (admin-only for CUD, all users can read)
	sensors := app.Group("/sensors", middleware.AuthRequired())
	sensors.Post("/", middleware.CheckPermission(db, "sensors.manage"), sensorHandler.CreateSensor)
	sensors.Get("/", sensorHandler.GetAllSensors)                    // All users can view sensor master data
	sensors.Get("/status", vehicleSensorHandler.GetAllSensorsStatus) // Get all vehicle-sensor status
	sensors.Get("/:sensor_id", sensorHandler.GetSensorByID)
	sensors.Get("/code/:sensor_code", sensorHandler.GetSensorByCode)
	sensors.Put("/:sensor_id", middleware.CheckPermission(db, "sensors.manage"), sensorHandler.UpdateSensor)
	sensors.Delete("/:sensor_id", middleware.CheckPermission(db, "sensors.manage"), sensorHandler.DeleteSensor)

	// Vehicle management routes (protected, ownership-based)
	vehicles := app.Group("/vehicles", middleware.AuthRequired())
	vehicles.Post("/", vehicleHandler.CreateVehicle)
	vehicles.Get("/", vehicleHandler.GetAllVehicles)                                  // Returns own vehicles for regular users
	vehicles.Get("/batteries", vehicleHandler.GetAllVehicles)                         // For batteries endpoint compatibility
	vehicles.Get("/connection-statuses", vehicleHandler.GetVehicleConnectionStatuses) // Get MQTT LWT connection statuses
	vehicles.Get("/:vehicle_id", vehicleHandler.GetVehicleByID)                       // Ownership check in handler
	vehicles.Put("/:vehicle_id", vehicleHandler.UpdateVehicle)                        // Ownership check in handler
	vehicles.Delete("/:vehicle_id", vehicleHandler.DeleteVehicle)                     // Ownership check in handler
	vehicles.Get("/:vehicle_id/battery", vehicleHandler.GetVehicleBatteryStatus)      // Get latest battery status
	vehicles.Get("/:vehicle_id/battery-logs", vehicleHandler.GetBatteryLogs)          // Get battery history/logs
	vehicles.Get("/:vehicle_id/alerts", vehicleHandler.GetVehicleByID)                // Placeholder for alerts

	// Battery routes
	app.Get("/vehicle-batteries/latest", middleware.AuthRequired(), vehicleHandler.GetAllLatestBatteryStatus)
	app.Get("/vehicle-batteries/export", middleware.AuthRequired(), vehicleHandler.ExportBatteryLogs)
	app.Post("/vehicle-batteries", middleware.AuthRequired(), vehicleHandler.CreateVehicleBatteryStatus)

	// Vehicle status routes
	app.Post("/vehicle-status", middleware.AuthRequired(), vehicleHandler.CreateVehicleStatus)

	// Vehicle-Sensor assignment routes (users can assign sensors to their vehicles)
	vehicles.Post("/:vehicle_id/sensors", vehicleSensorHandler.AssignSensorToVehicle)
	vehicles.Get("/:vehicle_id/sensors", vehicleSensorHandler.GetVehicleSensors)
	vehicles.Get("/:vehicle_id/sensors/status", vehicleSensorHandler.GetVehicleSensorsStatus)
	vehicles.Delete("/:vehicle_id/sensors/:sensor_id", vehicleSensorHandler.RemoveSensorFromVehicle)
	vehicles.Put("/:vehicle_id/sensors/:sensor_id/status", vehicleSensorHandler.UpdateVehicleSensorStatus)

	// Sensor Logs routes
	sensorLogs := app.Group("/sensor-logs")
	sensorLogs.Get("/", middleware.AuthRequired(), sensorLogHandler.GetSensorLogs)           // Query by vehicle_id, sensor_id, time range
	sensorLogs.Get("/export", middleware.AuthRequired(), sensorLogHandler.ExportSensorLogs)  // Export to CSV
	sensorLogs.Post("/import", middleware.AuthRequired(), sensorLogHandler.ImportSensorLogs) // Import from CSV
	sensorLogs.Get("/:id", middleware.AuthRequired(), sensorLogHandler.GetSensorLogByID)

	sensorLogs.Post("/", middleware.AuthRequired(), sensorLogHandler.CreateSensorLog)
	sensorLogs.Delete("/:id", middleware.AuthRequired(), sensorLogHandler.DeleteSensorLog)

	// Vehicle Logs routes
	vehicleLogs := app.Group("/vehicle-logs")
	vehicleLogs.Get("/", middleware.AuthRequired(), vehicleLogHandler.GetVehicleLogs) // Query by vehicle_id, time range

	vehicleLogs.Get("/export", middleware.AuthRequired(), vehicleLogHandler.ExportVehicleLogs)  // Export to CSV
	vehicleLogs.Post("/import", middleware.AuthRequired(), vehicleLogHandler.ImportVehicleLogs) // Import from CSV
	vehicleLogs.Get("/:id", middleware.AuthRequired(), vehicleLogHandler.GetVehicleLogByID)
	vehicleLogs.Get("/latest/:vehicle_id", middleware.AuthRequired(), vehicleLogHandler.GetLatestVehicleLog)
	vehicleLogs.Get("/missions-stats-batch", middleware.AuthRequired(), vehicleLogHandler.GetMissionTelemetryStatsBatch)
	vehicleLogs.Get("/mission-stats/:mission_id", middleware.AuthRequired(), vehicleLogHandler.GetMissionTelemetryStats)
	vehicleLogs.Get("/mission-trajectory/:mission_id", middleware.AuthRequired(), vehicleLogHandler.GetMissionTrajectory)

	vehicleLogs.Post("/", middleware.AuthRequired(), vehicleLogHandler.CreateVehicleLog)
	vehicleLogs.Delete("/:id", middleware.AuthRequired(), vehicleLogHandler.DeleteVehicleLog)

	// Raw Logs routes
	rawLogs := app.Group("/raw-logs")
	rawLogs.Get("/", middleware.AuthRequired(), rawLogHandler.GetRawLogs) // Query by search, time range
	rawLogs.Get("/stats", middleware.AuthRequired(), rawLogHandler.GetRawLogStats)
	rawLogs.Get("/export", middleware.AuthRequired(), rawLogHandler.ExportRawLogs)  // Export to CSV
	rawLogs.Post("/import", middleware.AuthRequired(), rawLogHandler.ImportRawLogs) // Import from CSV
	rawLogs.Get("/:id", middleware.AuthRequired(), rawLogHandler.GetRawLogByID)
	rawLogs.Post("/", middleware.AuthRequired(), rawLogHandler.CreateRawLog)
	rawLogs.Delete("/:id", middleware.AuthRequired(), rawLogHandler.DeleteRawLog)

	// Log Stats routes (protected)
	logs := app.Group("/logs", middleware.AuthRequired())
	logs.Get("/stats", logStatsHandler.GetLogStats)
	logs.Get("/chart", logStatsHandler.GetLogChartData)

	// Mission management routes
	missions := app.Group("/missions")
	missions.Post("/", middleware.AuthRequired(), missionHandler.CreateMission)
	missions.Get("/", middleware.AuthRequired(), missionHandler.GetAllMissions) // Returns own missions for regular users
	missions.Get("/stats", middleware.AuthRequired(), missionHandler.GetMissionStats)
	missions.Get("/ongoing", middleware.AuthRequired(), missionHandler.GetOngoingMissions) // Get all ongoing missions
	// Static routes MUST come before dynamic /:mission_id to avoid being swallowed
	missions.Get("/pending-upload", middleware.AuthRequired(), missionHandler.GetPendingMissionUploads)
	missions.Post("/waypoint-reached", middleware.AuthRequired(), missionHandler.UpdateMissionProgressFromWaypoint) // USV waypoint reached
	missions.Get("/:mission_id", middleware.AuthRequired(), missionHandler.GetMissionByID)                                            // Ownership check in handler
	missions.Put("/:mission_id", middleware.AuthRequired(), missionHandler.UpdateMission)                                             // Ownership check in handler
	missions.Post("/:mission_id/upload-to-vehicle", middleware.AuthRequired(), missionHandler.UploadMissionToVehicle)
	missions.Patch("/:mission_id/clear", middleware.AuthRequired(), missionHandler.ClearMission)
	missions.Put("/:id/progress", middleware.AuthRequired(), missionHandler.UpdateMissionProgress) // Update mission progress
	missions.Delete("/:mission_id", middleware.AuthRequired(), missionHandler.DeleteMission)                                                 // Ownership check in handler

	// Alert management routes
	alerts := app.Group("/alerts")
	alerts.Get("/", middleware.AuthRequired(), alertHandler.GetAlerts)
	alerts.Get("/stats", middleware.AuthRequired(), alertHandler.GetAlertStats)
	alerts.Get("/recent", middleware.AuthRequired(), alertHandler.GetRecentAlerts)
	alerts.Get("/unacknowledged", middleware.AuthRequired(), alertHandler.GetUnacknowledgedAlerts)
	alerts.Get("/export", middleware.AuthRequired(), alertHandler.ExportAlerts)  // Export to CSV
	alerts.Post("/import", middleware.AuthRequired(), alertHandler.ImportAlerts) // Import from CSV
	alerts.Get("/:id", middleware.AuthRequired(), alertHandler.GetAlertByID)
	alerts.Post("/", middleware.AuthRequired(), alertHandler.CreateAlert)
	alerts.Put("/:id", middleware.AuthRequired(), alertHandler.UpdateAlert)
	alerts.Patch("/acknowledge-all", middleware.AuthRequired(), alertHandler.AcknowledgeAllAlerts)
	alerts.Patch("/:id/acknowledge", middleware.AuthRequired(), alertHandler.AcknowledgeAlert)
	alerts.Delete("/clear", middleware.AuthRequired(), alertHandler.ClearAllAlerts)
	alerts.Delete("/:id", middleware.AuthRequired(), alertHandler.DeleteAlert)

	// Notification management routes (protected)
	notifications := app.Group("/notifications", middleware.AuthRequired())
	notifications.Get("/", notificationHandler.GetNotifications)
	notifications.Get("/stats", notificationHandler.GetStats)
	notifications.Get("/:id", notificationHandler.GetNotificationByID)
	notifications.Post("/", notificationHandler.CreateNotification)
	notifications.Patch("/:id", notificationHandler.UpdateNotification)
	notifications.Put("/bulk-read", notificationHandler.BulkMarkAsRead)
	notifications.Put("/read-all", notificationHandler.MarkAllAsRead)
	notifications.Put("/:id/read", notificationHandler.MarkAsRead)
	notifications.Delete("/clear-read", notificationHandler.DeleteAllRead)
	notifications.Delete("/:id", notificationHandler.DeleteNotification)

	// Vehicle control commands via MQTT (protected)
	control := app.Group("/control", middleware.AuthRequired())
	control.Post("/:vehicle_code/command", controlHandler.SendCommand)

	// AI Assistant routes (protected)
	chatRepo := repository.NewChatRepository(db)
	aiHandler := handler.NewAIHandler(chatRepo, systemSettingRepo)
	aiLimiter := limiter.New(limiter.Config{
		Max:        20,
		Expiration: 1 * time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			userID, _ := c.Locals("user_id").(uint)
			return fmt.Sprintf("ai_%d", userID)
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(429).JSON(fiber.Map{"error": "AI rate limit exceeded. Please wait a moment."})
		},
	})
	ai := app.Group("/ai", middleware.AuthRequired())
	ai.Post("/chat", aiLimiter, aiHandler.Chat)
	ai.Post("/chat/stream", aiLimiter, aiHandler.ChatStream)
	ai.Post("/weather-analysis", aiLimiter, aiHandler.WeatherAnalysis)
	ai.Post("/battery-analysis", aiLimiter, aiHandler.BatteryAnalysis)
	ai.Get("/sessions", aiHandler.GetSessions)
	ai.Get("/sessions/:id/messages", aiHandler.GetMessages)
	ai.Delete("/sessions/:id", aiHandler.DeleteSession)

	// Device lock routes (exclusive page lock for control page)
	deviceLockHandler := handler.NewDeviceLockHandler(vehicleRepo)
	deviceLock := app.Group("/device-lock", middleware.AuthRequired())
	deviceLock.Post("/acquire", deviceLockHandler.AcquireLock)
	deviceLock.Post("/heartbeat", deviceLockHandler.Heartbeat)
	deviceLock.Post("/release", deviceLockHandler.ReleaseLock)
	deviceLock.Get("/status", deviceLockHandler.GetLockStatus)

	// Command Logs routes
	commandLogs := app.Group("/command-logs")
	commandLogs.Get("/", middleware.AuthRequired(), commandLogHandler.GetCommandLogs)
	commandLogs.Get("/export", middleware.AuthRequired(), commandLogHandler.ExportCommandLogs)
	commandLogs.Get("/:id", middleware.AuthRequired(), commandLogHandler.GetCommandLogByID)
	commandLogs.Post("/", middleware.AuthRequired(), commandLogHandler.CreateCommandLog)
	commandLogs.Delete("/:id", middleware.AuthRequired(), commandLogHandler.DeleteCommandLog)

	// Command polling routes (API mode)
	app.Get("/commands/pending", middleware.AuthRequired(), commandLogHandler.GetPendingCommands)

	// Command ACK routes
	app.Post("/command-acks", middleware.AuthRequired(), commandLogHandler.CreateCommandAck)

	// Thruster control routes (API mode)
	thrusters := app.Group("/thruster-commands", middleware.AuthRequired())
	thrusters.Post("/", thrusterCommandHandler.CreateThrusterCommand)
	app.Get("/thruster-commands/pending", middleware.AuthRequired(), thrusterCommandHandler.GetPendingThrusterCommand)

	// Thruster Logs routes
	thrusterLogs := app.Group("/thruster-logs")
	thrusterLogs.Get("/", middleware.AuthRequired(), thrusterLogHandler.GetThrusterLogs)
	thrusterLogs.Get("/export", middleware.AuthRequired(), thrusterLogHandler.ExportThrusterLogs)
	thrusterLogs.Get("/:id", middleware.AuthRequired(), thrusterLogHandler.GetThrusterLogByID)
	thrusterLogs.Delete("/:id", middleware.AuthRequired(), thrusterLogHandler.DeleteThrusterLog)

	// Waypoint Logs routes
	waypointLogs := app.Group("/waypoint-logs")
	waypointLogs.Get("/", middleware.AuthRequired(), waypointLogHandler.GetWaypointLogs)
	waypointLogs.Get("/export", middleware.AuthRequired(), waypointLogHandler.ExportWaypointLogs)
	waypointLogs.Get("/:id", middleware.AuthRequired(), waypointLogHandler.GetWaypointLogByID)
	waypointLogs.Post("/", middleware.AuthRequired(), waypointLogHandler.CreateWaypointLog)
	waypointLogs.Delete("/:id", middleware.AuthRequired(), waypointLogHandler.DeleteWaypointLog)

	// Waypoint ACK routes
	app.Post("/waypoint-acks", middleware.AuthRequired(), waypointLogHandler.CreateWaypointAck)

	// Latency acks — records timing data for all log types without touching hypertable rows.
	app.Get("/server-time", latencyAckHandler.ServerTime)
	app.Get("/latency-acks", middleware.AuthRequired(), latencyAckHandler.ListLatencyAcks)
	app.Post("/latency-acks", middleware.AuthRequired(), latencyAckHandler.CreateLatencyAck)
	app.Patch("/latency-acks/by-log/:logType/:logId", middleware.AuthRequired(), latencyAckHandler.UpdateWsReceived)
	app.Delete("/latency-acks/:id", middleware.AuthRequired(), latencyAckHandler.DeleteLatencyAck)
	app.Get("/latency-acks/export", middleware.AuthRequired(), latencyAckHandler.ExportLatencyAcks)

	// Publications routes — GET public, CUD protected
	app.Get("/publications", publicationHandler.GetAll)
	app.Get("/publications/:id", publicationHandler.GetByID)
	publications := app.Group("/publications", middleware.AuthRequired())
	publications.Post("/upload-pdf", middleware.CheckPermission(db, "publications.manage"), publicationHandler.UploadPDF)
	publications.Delete("/upload-pdf/:filename", middleware.CheckPermission(db, "publications.manage"), publicationHandler.DeletePDF)
	publications.Post("/", middleware.CheckPermission(db, "publications.manage"), publicationHandler.Create)
	publications.Put("/:id", middleware.CheckPermission(db, "publications.manage"), publicationHandler.Update)
	publications.Delete("/:id", middleware.CheckPermission(db, "publications.manage"), publicationHandler.Delete)

	// Team Members routes — GET public, CUD protected
	app.Get("/team", teamMemberHandler.GetAll)
	app.Get("/team/:id", teamMemberHandler.GetByID)
	team := app.Group("/team", middleware.AuthRequired())
	team.Post("/upload-photo", middleware.CheckPermission(db, "team.manage"), teamMemberHandler.UploadPhoto)
	team.Delete("/upload-photo/:filename", middleware.CheckPermission(db, "team.manage"), teamMemberHandler.DeletePhoto)
	team.Post("/", middleware.CheckPermission(db, "team.manage"), teamMemberHandler.Create)
	team.Put("/:id", middleware.CheckPermission(db, "team.manage"), teamMemberHandler.Update)
	team.Delete("/:id", middleware.CheckPermission(db, "team.manage"), teamMemberHandler.Delete)

	// System Settings routes — third-party credentials & feature toggles (System Management)
	systemSettingHandler := handler.NewSystemSettingHandler(systemSettingRepo)
	systemSettings := app.Group("/system-settings", middleware.AuthRequired())
	systemSettings.Get("/", systemSettingHandler.GetSettings)
	systemSettings.Put("/", middleware.CheckPermission(db, "system.manage"), systemSettingHandler.UpdateSettings)

	// Contact route — public, rate limited
	contactLimiter := limiter.New(limiter.Config{
		Max:        5,
		Expiration: 15 * time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(429).JSON(fiber.Map{"error": "Too many requests. Please try again later."})
		},
	})
	app.Post("/contact", contactLimiter, contactHandler.Send)

	// WebSocket routes — token validated from ?token= query param (WS can't set custom headers)
	wsAuth := middleware.WSAuthRequired()
	app.Get("/ws/stats", middleware.AuthRequired(), wsHandler.GetStats)
	app.Get("/ws/sensor-data", wsAuth, websocket.New(wsHandler.HandleWebSocket))
	app.Get("/ws/logs", wsAuth, websocket.New(wsHandler.HandleWebSocket))
	app.Get("/ws/alerts", wsAuth, websocket.New(wsHandler.HandleWebSocket))
	app.Get("/ws/missions", wsAuth, websocket.New(wsHandler.HandleWebSocket))
}
