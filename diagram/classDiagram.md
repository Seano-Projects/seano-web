classDiagram
direction TB
    class User {
	    +ID: uint
	    +Username: string
	    +Email: string
	    +PasswordHash: string
	    +RoleID: uint?
	    +IsVerified: bool
	    +VerificationToken: string
	    +VerificationExpiry: time.Time
	    +RefreshToken: string
	    +CreatedAt: time.Time
	    +UpdatedAt: time.Time
	    +RegisterEmail()
	    +VerifyEmail()
	    +SetCredentials()
	    +ResendVerification()
	    +Login()
	    +RefreshToken()
	    +GetMe()
	    +Logout()
	    +CreateUser()
	    +GetAllUsers()
	    +GetUserByID()
	    +UpdateUser()
	    +DeleteUser()
    }

    class Role {
	    +ID: uint
	    +Name: string
	    +Description: string
	    +CreatedAt: time.Time
	    +UpdatedAt: time.Time
	    +CreateRole()
	    +GetAllRoles()
	    +GetRoleByID()
	    +UpdateRole()
	    +DeleteRole()
    }

    class Permission {
	    +ID: uint
	    +Name: string
	    +Description: string
	    +CreatedAt: time.Time
	    +UpdatedAt: time.Time
	    +CreatePermission()
	    +GetAllPermissions()
	    +GetPermissionByID()
	    +UpdatePermission()
	    +DeletePermission()
	    +AssignPermissionToRole()
	    +RemovePermissionFromRole()
    }

    class Vehicle {
	    +ID: uint
	    +Code: string
	    +Name: string
	    +Description: string
	    +BatteryCount: int
	    +BatteryTotalCapacityAh: float64
	    +Status: string
	    +ConnectionStatus: string
	    +LastConnected: time.Time?
	    +UserID: uint
	    +BatteryLevel: float64?
	    +SignalStrength: float64?
	    +Latitude: float64?
	    +Longitude: float64?
	    +Temperature: string?
	    +LastSeen: time.Time?
	    +CreatedAt: time.Time
	    +UpdatedAt: time.Time
	    +CreateVehicle()
	    +GetAllVehicles()
	    +GetVehicleByID()
	    +UpdateVehicle()
	    +DeleteVehicle()
	    +GetVehicleBatteryStatus()
	    +GetAllLatestBatteryStatus()
	    +GetBatteryLogs()
	    +GetVehicleConnectionStatuses()
	    +SendCommand()
    }

    class VehicleBattery {
	    +ID: uint
	    +VehicleID: uint
	    +BatteryID: int
	    +Percentage: float64
	    +Voltage: float64
	    +Current: float64
	    +Status: string
	    +Temperature: float64
	    +CellVoltages: json
	    +Metadata: json
	    +CreatedAt: time.Time
    }

    class SensorType {
	    +ID: uint
	    +Name: string
	    +Description: string
	    +CreatedAt: time.Time
	    +UpdatedAt: time.Time
	    +CreateSensorType()
	    +GetAllSensorTypes()
	    +GetSensorTypeByID()
	    +UpdateSensorType()
	    +DeleteSensorType()
    }

    class Sensor {
	    +ID: uint
	    +Brand: string
	    +Model: string
	    +Code: string
	    +SensorTypeID: uint
	    +Description: string
	    +IsActive: bool
	    +CreatedAt: time.Time
	    +UpdatedAt: time.Time
	    +CreateSensor()
	    +GetAllSensors()
	    +GetSensorByID()
	    +GetSensorByCode()
	    +UpdateSensor()
	    +DeleteSensor()
    }

    class VehicleSensor {
	    +ID: uint
	    +VehicleID: uint
	    +SensorID: uint
	    +Status: string
	    +LastReading: string
	    +LastReadingTime: time.Time?
	    +CreatedAt: time.Time
	    +UpdatedAt: time.Time
	    +AssignSensorToVehicle()
	    +GetVehicleSensors()
	    +GetVehicleSensorsStatus()
	    +RemoveSensorFromVehicle()
	    +GetAllSensorsStatus()
	    +UpdateVehicleSensorStatus()
    }

    class Mission {
	    +ID: uint
	    +MissionCode: string
	    +Name: string
	    +Description: string
	    +Status: string
	    +VehicleID: uint?
	    +Waypoints: Waypoint[]
	    +HomeLocation: Waypoint?
	    +StartTime: time.Time?
	    +EndTime: time.Time?
	    +Progress: float64
	    +EnergyConsumed: float64
	    +EnergyBudget: float64
	    +TimeElapsed: int64
	    +CurrentWaypoint: int
	    +CompletedWaypoint: int
	    +TotalWaypoints: int
	    +TotalDistance: float64
	    +EstimatedTime: float64
	    +LastUpdateTime: time.Time?
	    +CreatedBy: uint?
	    +CreatedAt: time.Time
	    +UpdatedAt: time.Time
	    +BeforeCreate()
	    +CreateMission()
	    +GetAllMissions()
	    +GetMissionByID()
	    +UpdateMission()
	    +UploadMissionToVehicle()
	    +DeleteMission()
	    +GetMissionStats()
	    +UpdateMissionProgress()
	    +GetOngoingMissions()
    }

    class Waypoint {
	    +Name: string
	    +Type: string
	    +Lat: float64
	    +Lng: float64
	    +Shape: string
	    +Altitude: float64
	    +Speed: float64
	    +Delay: float64
	    +Loiter: float64
	    +Radius: float64
	    +Action: string
	    +Bounds: Bounds?
	    +Vertices: Waypoint[]
	    +Pattern: string
	    +Coverage: float64
	    +Overlap: float64
    }

    class Bounds {
	    +North: float64
	    +South: float64
	    +East: float64
	    +West: float64
    }

    class VehicleLog {
	    +ID: uint
	    +VehicleID: uint
	    +MissionID: uint?
	    +MissionCode: string?
	    +BatteryVoltage: float64?
	    +BatteryCurrent: float64?
	    +BatteryPercentage: float64?
	    +RSSI: int?
	    +Mode: string?
	    +Latitude: float64?
	    +Longitude: float64?
	    +Altitude: float64?
	    +Heading: float64?
	    +Armed: bool?
	    +GPSok: bool?
	    +SystemStatus: string?
	    +Speed: float64?
	    +Roll: float64?
	    +Pitch: float64?
	    +Yaw: float64?
	    +TemperatureSystem: string?
	    +UsvTimestamp: time.Time?
	    +MqttReceivedAt: time.Time?
	    +CreatedAt: time.Time
	    +GetVehicleLogs()
	    +GetVehicleLogByID()
	    +GetLatestVehicleLog()
	    +CreateVehicleLog()
	    +DeleteVehicleLog()
	    +ExportVehicleLogs()
	    +ImportVehicleLogs()
    }

    class SensorLog {
	    +ID: uint
	    +VehicleID: uint
	    +SensorID: uint
	    +Data: string
	    +UsvTimestamp: time.Time?
	    +MqttReceivedAt: time.Time?
	    +CreatedAt: time.Time
	    +GetSensorLogs()
	    +GetSensorLogByID()
	    +CreateSensorLog()
	    +DeleteSensorLog()
	    +ExportSensorLogs()
	    +ImportSensorLogs()
    }

    class RawLog {
	    +ID: uint
	    +VehicleID: uint?
	    +Logs: string
	    +CreatedAt: time.Time
	    +GetRawLogs()
	    +GetRawLogByID()
	    +GetRawLogStats()
	    +CreateRawLog()
	    +DeleteRawLog()
	    +ExportRawLogs()
	    +ImportRawLogs()
    }

    class Alert {
	    +ID: uint
	    +VehicleID: uint
	    +SensorID: uint?
	    +Severity: string
	    +AlertType: string
	    +Message: string
	    +Latitude: float64?
	    +Longitude: float64?
	    +Acknowledged: bool
	    +Source: string
	    +CreatedAt: time.Time
	    +UpdatedAt: time.Time
	    +GetAlerts()
	    +GetAlertByID()
	    +CreateAlert()
	    +UpdateAlert()
	    +AcknowledgeAlert()
	    +DeleteAlert()
	    +ClearAllAlerts()
	    +GetAlertStats()
	    +GetRecentAlerts()
	    +GetUnacknowledgedAlerts()
	    +ExportAlerts()
	    +ImportAlerts()
    }

    class Notification {
	    +ID: uint
	    +UserID: uint
	    +VehicleID: uint?
	    +Type: string
	    +Title: string
	    +Message: string
	    +Action: string
	    +Read: bool
	    +Source: string
	    +CreatedAt: time.Time
	    +UpdatedAt: time.Time
	    +GetNotifications()
	    +GetNotificationByID()
	    +CreateNotification()
	    +UpdateNotification()
	    +MarkAsRead()
	    +BulkMarkAsRead()
	    +MarkAllAsRead()
	    +DeleteNotification()
	    +DeleteAllRead()
	    +GetStats()
    }

    class CommandLog {
	    +ID: uint
	    +VehicleID: uint
	    +VehicleCode: string
	    +Command: string
	    +Status: string
	    +Message: string
	    +InitiatedAt: time.Time
	    +ResolvedAt: time.Time?
	    +CreatedAt: time.Time
	    +GetCommandLogs()
	    +GetCommandLogByID()
	    +CreateCommandLog()
	    +DeleteCommandLog()
    }

    class WaypointLog {
	    +ID: uint
	    +VehicleID: uint
	    +VehicleCode: string
	    +MissionID: uint?
	    +MissionName: string
	    +WaypointCount: int
	    +Status: string
	    +Message: string
	    +InitiatedAt: time.Time
	    +ResolvedAt: time.Time?
	    +CreatedAt: time.Time
	    +GetWaypointLogs()
	    +GetWaypointLogByID()
	    +CreateWaypointLog()
	    +DeleteWaypointLog()
    }

    class UntitledClass {
    }

    User "many" --> "1" Role : role
    Role "many" -- "many" Permission : grants
    User "1" --> "many" Vehicle : owns
    Vehicle "1" --> "many" VehicleBattery : has
    Sensor "many" --> "1" SensorType : type
    Vehicle "1" --> "many" VehicleSensor
    Sensor "1" --> "many" VehicleSensor
    User "1" --> "many" Mission : created_by
    Vehicle "1" --> "many" Mission : assigned_to
    Mission "1" o-- "many" Waypoint : waypoints
    Waypoint "1" o-- "0..1" Bounds : bounds
    Waypoint "1" o-- "0..*" Waypoint : vertices
    Vehicle "1" --> "many" VehicleLog
    Mission "1" --> "many" VehicleLog
    Vehicle "1" --> "many" SensorLog
    Sensor "1" --> "many" SensorLog
    Vehicle "1" --> "many" RawLog
    Vehicle "1" --> "many" Alert
    Sensor "0..1" --> "many" Alert
    User "1" --> "many" Notification
    Vehicle "0..1" --> "many" Notification
    Vehicle "1" --> "many" CommandLog
    Vehicle "1" --> "many" WaypointLog
    Mission "0..1" --> "many" WaypointLog
    Role -- UntitledClass