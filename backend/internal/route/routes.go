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

func SetupRoutes(app *fiber.App, db *gorm.DB, wsHub *wsocket.Hub, cmdPublisher *mqttservice.CommandPublisher) {
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
	vehicleHandler := handler.NewVehicleHandler(vehicleRepo, db)
	vehicleSensorHandler := handler.NewVehicleSensorHandler(vehicleSensorRepo, vehicleRepo, sensorRepo, db)
	sensorLogHandler := handler.NewSensorLogHandler(sensorLogRepo, vehicleRepo, db)
	vehicleLogHandler := handler.NewVehicleLogHandler(vehicleLogRepo, vehicleRepo, db)
	rawLogHandler := handler.NewRawLogHandler(rawLogRepo, vehicleRepo, db)
	logStatsHandler := handler.NewLogStatsHandler(vehicleLogRepo, sensorLogRepo, rawLogRepo)
	missionHandler := handler.NewMissionHandler(missionRepo, db)
	alertHandler := handler.NewAlertHandler(alertRepo, vehicleRepo, wsHub, db)
	controlHandler := handler.NewControlHandler(cmdPublisher)
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
	vehicles.Get("/:vehicle_id", vehicleHandler.GetVehicleByID)         // Ownership check in handler
	vehicles.Put("/:vehicle_id", vehicleHandler.UpdateVehicle)          // Ownership check in handler
	vehicles.Delete("/:vehicle_id", vehicleHandler.DeleteVehicle)       // Ownership check in handler
	vehicles.Get("/:vehicle_id/battery", vehicleHandler.GetVehicleBatteryStatus)  // Get latest battery status
	vehicles.Get("/:vehicle_id/battery-logs", vehicleHandler.GetBatteryLogs)      // Get battery history/logs
	vehicles.Get("/:vehicle_id/alerts", vehicleHandler.GetVehicleByID)  // Placeholder for alerts
	
	// Battery routes
	app.Get("/vehicle-batteries/latest", middleware.AuthRequired(), vehicleHandler.GetAllLatestBatteryStatus)
	
	// Vehicle-Sensor assignment routes (users can assign sensors to their vehicles)
	vehicles.Post("/:vehicle_id/sensors", vehicleSensorHandler.AssignSensorToVehicle)
	vehicles.Get("/:vehicle_id/sensors", vehicleSensorHandler.GetVehicleSensors)
	vehicles.Get("/:vehicle_id/sensors/status", vehicleSensorHandler.GetVehicleSensorsStatus)
	vehicles.Delete("/:vehicle_id/sensors/:sensor_id", vehicleSensorHandler.RemoveSensorFromVehicle)
	vehicles.Put("/:vehicle_id/sensors/:sensor_id/status", vehicleSensorHandler.UpdateVehicleSensorStatus)

	// Sensor Logs routes (protected)
	sensorLogs := app.Group("/sensor-logs", middleware.AuthRequired())
	sensorLogs.Get("/", sensorLogHandler.GetSensorLogs) // Query by vehicle_id, sensor_id, time range
	sensorLogs.Get("/:id", sensorLogHandler.GetSensorLogByID)
	sensorLogs.Post("/", sensorLogHandler.CreateSensorLog)
	sensorLogs.Delete("/:id", sensorLogHandler.DeleteSensorLog)

	// Vehicle Logs routes (protected)
	vehicleLogs := app.Group("/vehicle-logs", middleware.AuthRequired())
	vehicleLogs.Get("/", vehicleLogHandler.GetVehicleLogs) // Query by vehicle_id, time range
	vehicleLogs.Get("/:id", vehicleLogHandler.GetVehicleLogByID)
	vehicleLogs.Get("/latest/:vehicle_id", vehicleLogHandler.GetLatestVehicleLog)
	vehicleLogs.Post("/", vehicleLogHandler.CreateVehicleLog)
	vehicleLogs.Delete("/:id", vehicleLogHandler.DeleteVehicleLog)

	// Raw Logs routes (protected)
	rawLogs := app.Group("/raw-logs", middleware.AuthRequired())
	rawLogs.Get("/", rawLogHandler.GetRawLogs) // Query by search, time range
	rawLogs.Get("/stats", rawLogHandler.GetRawLogStats)
	rawLogs.Get("/:id", rawLogHandler.GetRawLogByID)
	rawLogs.Post("/", rawLogHandler.CreateRawLog)
	rawLogs.Delete("/:id", rawLogHandler.DeleteRawLog)

	// Log Stats routes (protected)
	logs := app.Group("/logs", middleware.AuthRequired())
	logs.Get("/stats", logStatsHandler.GetLogStats)
	logs.Get("/chart", logStatsHandler.GetLogChartData)

	// Mission management routes (protected, ownership-based)
	missions := app.Group("/missions", middleware.AuthRequired())
	missions.Post("/", missionHandler.CreateMission)
	missions.Get("/", missionHandler.GetAllMissions)                  // Returns own missions for regular users
	missions.Get("/stats", missionHandler.GetMissionStats)
	missions.Get("/ongoing", missionHandler.GetOngoingMissions)       // Get all ongoing missions
	missions.Get("/:mission_id", missionHandler.GetMissionByID)       // Ownership check in handler
	missions.Put("/:mission_id", missionHandler.UpdateMission)        // Ownership check in handler
	missions.Put("/:id/progress", missionHandler.UpdateMissionProgress) // Update mission progress
	missions.Delete("/:mission_id", missionHandler.DeleteMission)     // Ownership check in handler

	// Alert management routes (protected)
	alerts := app.Group("/api/alerts", middleware.AuthRequired())
	alerts.Get("/", alertHandler.GetAlerts)
	alerts.Get("/stats", alertHandler.GetAlertStats)
	alerts.Get("/recent", alertHandler.GetRecentAlerts)
	alerts.Get("/unacknowledged", alertHandler.GetUnacknowledgedAlerts)
	alerts.Get("/:id", alertHandler.GetAlertByID)
	alerts.Post("/", alertHandler.CreateAlert)
	alerts.Put("/:id", alertHandler.UpdateAlert)
	alerts.Patch("/:id/acknowledge", alertHandler.AcknowledgeAlert)
	alerts.Delete("/:id", alertHandler.DeleteAlert)
	alerts.Delete("/clear", alertHandler.ClearAllAlerts)

	// Vehicle control commands via MQTT (protected)
	control := app.Group("/api/control", middleware.AuthRequired())
	control.Post("/:vehicle_code/command", controlHandler.SendCommand)

	// WebSocket routes (no middleware, auth checked inside WebSocket handler via query param)
	app.Get("/ws/stats", middleware.AuthRequired(), wsHandler.GetStats)
	app.Get("/ws/sensor-data", websocket.New(wsHandler.HandleWebSocket))
	app.Get("/ws/logs", websocket.New(wsHandler.HandleWebSocket)) // Reuse existing handler
	app.Get("/ws/alerts", websocket.New(wsHandler.HandleWebSocket)) // Alerts WebSocket
	app.Get("/ws/missions", websocket.New(wsHandler.HandleWebSocket)) // Mission progress WebSocket
}
