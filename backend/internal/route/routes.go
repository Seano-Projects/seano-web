package route

import (
	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
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
	// Serve static files (index.html for WebSocket testing)
	app.Static("/", "./public")

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
	sensorLogHandler := handler.NewSensorLogHandler(sensorLogRepo, vehicleRepo, sensorRepo, db)
	vehicleLogHandler := handler.NewVehicleLogHandler(vehicleLogRepo, vehicleRepo, missionRepo, db)
	rawLogHandler := handler.NewRawLogHandler(rawLogRepo, vehicleRepo, db, rawLogsEnabled, wsHub)
	logStatsHandler := handler.NewLogStatsHandler(vehicleLogRepo, sensorLogRepo, rawLogRepo, vehicleRepo, db, rawLogsEnabled)
	missionHandler := handler.NewMissionHandler(missionRepo, vehicleRepo, waypointLogRepo, cmdPublisher, db, wsHub)
	alertHandler := handler.NewAlertHandler(alertRepo, vehicleRepo, wsHub, db)
	notificationHandler := handler.NewNotificationHandler(notificationRepo, db)
	controlHandler := handler.NewControlHandler(cmdPublisher, commandLogRepo, vehicleRepo)
	commandLogHandler := handler.NewCommandLogHandler(commandLogRepo, vehicleRepo, db, wsHub)
	waypointLogHandler := handler.NewWaypointLogHandler(waypointLogRepo, vehicleRepo, db, wsHub)
	thrusterCommandHandler := handler.NewThrusterCommandHandler(thrusterCommandRepo, vehicleRepo, db)
	wsHandler := wsocket.NewWebSocketHandler(wsHub)

	// Swagger route
	app.Get("/swagger/*", swagger.HandlerDefault)

	// Auth routes (public)
	auth := app.Group("/auth")
	auth.Post("/register-email", authHandler.RegisterEmail)
	auth.Post("/verify-email", authHandler.VerifyEmail)
	auth.Post("/set-credentials", authHandler.SetCredentials)
	auth.Post("/resend-verification", authHandler.ResendVerification)
	auth.Post("/login", authHandler.Login)
	auth.Post("/refresh", authHandler.RefreshToken)

	// Auth routes (protected)
	auth.Get("/me", middleware.AuthRequired(), authHandler.GetMe)
	auth.Post("/logout", middleware.AuthRequired(), authHandler.Logout)

	// User management routes (protected)
	users := app.Group("/users", middleware.AuthRequired())
	users.Post("/", middleware.CheckPermission(db, "users.create"), userHandler.CreateUser)
	users.Get("/", middleware.CheckPermission(db, "users.read"), userHandler.GetAllUsers)
	users.Get("/:user_id", userHandler.GetUserByID)    // Ownership check in handler
	users.Put("/:user_id", userHandler.UpdateUser)     // Ownership check in handler
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
	sensors.Get("/", sensorHandler.GetAllSensors) // All users can view sensor master data
	sensors.Get("/status", vehicleSensorHandler.GetAllSensorsStatus) // Get all vehicle-sensor status
	sensors.Get("/:sensor_id", sensorHandler.GetSensorByID)
	sensors.Get("/code/:sensor_code", sensorHandler.GetSensorByCode)
	sensors.Put("/:sensor_id", middleware.CheckPermission(db, "sensors.manage"), sensorHandler.UpdateSensor)
	sensors.Delete("/:sensor_id", middleware.CheckPermission(db, "sensors.manage"), sensorHandler.DeleteSensor)

	// Vehicle management routes (protected, ownership-based)
	vehicles := app.Group("/vehicles", middleware.AuthRequired())
	vehicles.Post("/", vehicleHandler.CreateVehicle)
	vehicles.Get("/", vehicleHandler.GetAllVehicles)                    // Returns own vehicles for regular users
	vehicles.Get("/batteries", vehicleHandler.GetAllVehicles)           // For batteries endpoint compatibility
	vehicles.Get("/connection-statuses", vehicleHandler.GetVehicleConnectionStatuses) // Get MQTT LWT connection statuses
	vehicles.Get("/:vehicle_id", vehicleHandler.GetVehicleByID)         // Ownership check in handler
	vehicles.Put("/:vehicle_id", vehicleHandler.UpdateVehicle)          // Ownership check in handler
	vehicles.Post("/:vehicle_id/api-key", vehicleHandler.GenerateVehicleAPIKey) // Generate per-vehicle API key
	vehicles.Delete("/:vehicle_id", vehicleHandler.DeleteVehicle)       // Ownership check in handler
	vehicles.Get("/:vehicle_id/battery", vehicleHandler.GetVehicleBatteryStatus)  // Get latest battery status
	vehicles.Get("/:vehicle_id/battery-logs", vehicleHandler.GetBatteryLogs)      // Get battery history/logs
	vehicles.Get("/:vehicle_id/alerts", vehicleHandler.GetVehicleByID)  // Placeholder for alerts
	
	// Battery routes
	app.Get("/vehicle-batteries/latest", middleware.AuthRequired(), vehicleHandler.GetAllLatestBatteryStatus)
	app.Post("/vehicle-batteries", middleware.AuthOrVehicleAPIKey(vehicleRepo), vehicleHandler.CreateVehicleBatteryStatus)

	// Vehicle status routes
	app.Post("/vehicle-status", middleware.AuthOrVehicleAPIKey(vehicleRepo), vehicleHandler.CreateVehicleStatus)
	
	// Vehicle-Sensor assignment routes (users can assign sensors to their vehicles)
	vehicles.Post("/:vehicle_id/sensors", vehicleSensorHandler.AssignSensorToVehicle)
	vehicles.Get("/:vehicle_id/sensors", vehicleSensorHandler.GetVehicleSensors)
	vehicles.Get("/:vehicle_id/sensors/status", vehicleSensorHandler.GetVehicleSensorsStatus)
	vehicles.Delete("/:vehicle_id/sensors/:sensor_id", vehicleSensorHandler.RemoveSensorFromVehicle)
	vehicles.Put("/:vehicle_id/sensors/:sensor_id/status", vehicleSensorHandler.UpdateVehicleSensorStatus)

	// Sensor Logs routes
	sensorLogs := app.Group("/sensor-logs")
	sensorLogs.Get("/", middleware.AuthRequired(), sensorLogHandler.GetSensorLogs) // Query by vehicle_id, sensor_id, time range
	sensorLogs.Get("/:id", middleware.AuthRequired(), sensorLogHandler.GetSensorLogByID)
	sensorLogs.Get("/export", middleware.AuthRequired(), sensorLogHandler.ExportSensorLogs) // Export to CSV
	sensorLogs.Post("/import", middleware.AuthRequired(), sensorLogHandler.ImportSensorLogs) // Import from CSV
	sensorLogs.Post("/", middleware.AuthOrVehicleAPIKey(vehicleRepo), sensorLogHandler.CreateSensorLog)
	sensorLogs.Delete("/:id", middleware.AuthRequired(), sensorLogHandler.DeleteSensorLog)

	// Vehicle Logs routes
	vehicleLogs := app.Group("/vehicle-logs")
	vehicleLogs.Get("/", middleware.AuthRequired(), vehicleLogHandler.GetVehicleLogs) // Query by vehicle_id, time range

	vehicleLogs.Get("/export", middleware.AuthRequired(), vehicleLogHandler.ExportVehicleLogs) // Export to CSV
	vehicleLogs.Post("/import", middleware.AuthRequired(), vehicleLogHandler.ImportVehicleLogs) // Import from CSV
	vehicleLogs.Get("/:id", middleware.AuthRequired(), vehicleLogHandler.GetVehicleLogByID)
	vehicleLogs.Get("/latest/:vehicle_id", middleware.AuthRequired(), vehicleLogHandler.GetLatestVehicleLog)
	vehicleLogs.Post("/", middleware.AuthOrVehicleAPIKey(vehicleRepo), vehicleLogHandler.CreateVehicleLog)
	vehicleLogs.Delete("/:id", middleware.AuthRequired(), vehicleLogHandler.DeleteVehicleLog)

	// Raw Logs routes
	rawLogs := app.Group("/raw-logs")
	rawLogs.Get("/", middleware.AuthRequired(), rawLogHandler.GetRawLogs) // Query by search, time range
	rawLogs.Get("/stats", middleware.AuthRequired(), rawLogHandler.GetRawLogStats)
	rawLogs.Get("/export", middleware.AuthRequired(), rawLogHandler.ExportRawLogs) // Export to CSV
	rawLogs.Post("/import", middleware.AuthRequired(), rawLogHandler.ImportRawLogs) // Import from CSV
	rawLogs.Get("/:id", middleware.AuthRequired(), rawLogHandler.GetRawLogByID)
	rawLogs.Post("/", middleware.AuthOrVehicleAPIKey(vehicleRepo), rawLogHandler.CreateRawLog)
	rawLogs.Delete("/:id", middleware.AuthRequired(), rawLogHandler.DeleteRawLog)

	// Log Stats routes (protected)
	logs := app.Group("/logs", middleware.AuthRequired())
	logs.Get("/stats", logStatsHandler.GetLogStats)
	logs.Get("/chart", logStatsHandler.GetLogChartData)

	// Mission management routes
	missions := app.Group("/missions")
	missions.Post("/", middleware.AuthRequired(), missionHandler.CreateMission)
	missions.Get("/", middleware.AuthRequired(), missionHandler.GetAllMissions)                  // Returns own missions for regular users
	missions.Get("/stats", middleware.AuthRequired(), missionHandler.GetMissionStats)
	missions.Get("/ongoing", middleware.AuthRequired(), missionHandler.GetOngoingMissions)       // Get all ongoing missions
	missions.Get("/:mission_id", middleware.AuthRequired(), missionHandler.GetMissionByID)       // Ownership check in handler
	missions.Put("/:mission_id", middleware.AuthRequired(), missionHandler.UpdateMission)        // Ownership check in handler
	missions.Post("/:mission_id/upload-to-vehicle", middleware.AuthRequired(), missionHandler.UploadMissionToVehicle)
	missions.Get("/pending-upload", middleware.AuthOrVehicleAPIKeyFromQuery(vehicleRepo), missionHandler.GetPendingMissionUploads)
	missions.Put("/:id/progress", middleware.AuthOrVehicleAPIKeyByMissionID(missionRepo, vehicleRepo), missionHandler.UpdateMissionProgress) // Update mission progress
	missions.Post("/waypoint-reached", middleware.AuthOrVehicleAPIKey(vehicleRepo), missionHandler.UpdateMissionProgressFromWaypoint) // USV waypoint reached
	missions.Delete("/:mission_id", middleware.AuthRequired(), missionHandler.DeleteMission)     // Ownership check in handler

	// Alert management routes
	alerts := app.Group("/alerts")
	alerts.Get("/", middleware.AuthRequired(), alertHandler.GetAlerts)
	alerts.Get("/stats", middleware.AuthRequired(), alertHandler.GetAlertStats)
	alerts.Get("/recent", middleware.AuthRequired(), alertHandler.GetRecentAlerts)
	alerts.Get("/unacknowledged", middleware.AuthRequired(), alertHandler.GetUnacknowledgedAlerts)
	alerts.Get("/export", middleware.AuthRequired(), alertHandler.ExportAlerts) // Export to CSV
	alerts.Post("/import", middleware.AuthRequired(), alertHandler.ImportAlerts) // Import from CSV
	alerts.Get("/:id", middleware.AuthRequired(), alertHandler.GetAlertByID)
	alerts.Post("/", middleware.AuthOrVehicleAPIKey(vehicleRepo), alertHandler.CreateAlert)
	alerts.Put("/:id", middleware.AuthRequired(), alertHandler.UpdateAlert)
	alerts.Patch("/:id/acknowledge", middleware.AuthRequired(), alertHandler.AcknowledgeAlert)
	alerts.Delete("/:id", middleware.AuthRequired(), alertHandler.DeleteAlert)
	alerts.Delete("/clear", middleware.AuthRequired(), alertHandler.ClearAllAlerts)

	// Notification management routes (protected)
	notifications := app.Group("/notifications", middleware.AuthRequired())
	notifications.Get("/", notificationHandler.GetNotifications)
	notifications.Get("/stats", notificationHandler.GetStats)
	notifications.Get("/:id", notificationHandler.GetNotificationByID)
	notifications.Post("/", notificationHandler.CreateNotification)
	notifications.Patch("/:id", notificationHandler.UpdateNotification)
	notifications.Put("/:id/read", notificationHandler.MarkAsRead)
	notifications.Put("/bulk-read", notificationHandler.BulkMarkAsRead)
	notifications.Put("/read-all", notificationHandler.MarkAllAsRead)
	notifications.Delete("/:id", notificationHandler.DeleteNotification)
	notifications.Delete("/clear-read", notificationHandler.DeleteAllRead)

	// Vehicle control commands via MQTT (protected)
	control := app.Group("/control", middleware.AuthRequired())
	control.Post("/:vehicle_code/command", controlHandler.SendCommand)

	// Command Logs routes
	commandLogs := app.Group("/command-logs")
	commandLogs.Get("/", middleware.AuthRequired(), commandLogHandler.GetCommandLogs)
	commandLogs.Get("/:id", middleware.AuthRequired(), commandLogHandler.GetCommandLogByID)
	commandLogs.Post("/", middleware.AuthOrVehicleAPIKey(vehicleRepo), commandLogHandler.CreateCommandLog)
	commandLogs.Delete("/:id", middleware.AuthRequired(), commandLogHandler.DeleteCommandLog)

	// Command polling routes (API mode)
	app.Get("/commands/pending", middleware.AuthOrVehicleAPIKeyFromQuery(vehicleRepo), commandLogHandler.GetPendingCommands)

	// Command ACK routes
	app.Post("/command-acks", middleware.AuthOrVehicleAPIKey(vehicleRepo), commandLogHandler.CreateCommandAck)

	// Thruster control routes (API mode)
	thrusters := app.Group("/thruster-commands", middleware.AuthRequired())
	thrusters.Post("/", thrusterCommandHandler.CreateThrusterCommand)
	app.Get("/thruster-commands/pending", middleware.AuthOrVehicleAPIKeyFromQuery(vehicleRepo), thrusterCommandHandler.GetPendingThrusterCommand)

	// Waypoint Logs routes
	waypointLogs := app.Group("/waypoint-logs")
	waypointLogs.Get("/", middleware.AuthRequired(), waypointLogHandler.GetWaypointLogs)
	waypointLogs.Get("/:id", middleware.AuthRequired(), waypointLogHandler.GetWaypointLogByID)
	waypointLogs.Post("/", middleware.AuthOrVehicleAPIKey(vehicleRepo), waypointLogHandler.CreateWaypointLog)
	waypointLogs.Delete("/:id", middleware.AuthRequired(), waypointLogHandler.DeleteWaypointLog)

	// Waypoint ACK routes
	app.Post("/waypoint-acks", middleware.AuthOrVehicleAPIKey(vehicleRepo), waypointLogHandler.CreateWaypointAck)

	// WebSocket routes (no middleware, auth checked inside WebSocket handler via query param)
	app.Get("/ws/stats", middleware.AuthRequired(), wsHandler.GetStats)
	app.Get("/ws/sensor-data", websocket.New(wsHandler.HandleWebSocket))
	app.Get("/ws/logs", websocket.New(wsHandler.HandleWebSocket)) // Reuse existing handler
	app.Get("/ws/alerts", websocket.New(wsHandler.HandleWebSocket)) // Alerts WebSocket
	app.Get("/ws/missions", websocket.New(wsHandler.HandleWebSocket)) // Mission progress WebSocket
}
