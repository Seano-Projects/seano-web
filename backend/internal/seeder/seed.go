package seeder

import (
	"log"

	"go-fiber-pgsql/internal/model"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func SeedRolesAndPermissions(db *gorm.DB) {
	roles := []model.Role{
		{Name: "admin", Description: "Administrator with full access"},
		{Name: "user", Description: "Regular user with limited access"},
	}

	for _, role := range roles {
		var existingRole model.Role
		if err := db.Where("name = ?", role.Name).First(&existingRole).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				if err := db.Create(&role).Error; err != nil {
					log.Printf("Failed to create role %s: %v", role.Name, err)
				} else {
					log.Printf("Role '%s' created successfully", role.Name)
				}
			}
		} else {
			log.Printf("Role '%s' already exists", role.Name)
		}
	}

	// ─── Single source of truth for all permissions ───────────────────────────
	// Naming convention: <resource>.<action>
	// Actions: read | create | update | delete | manage (create+update+delete)
	permissions := []model.Permission{
		// Dashboard
		{Name: "dashboard.access", Description: "Access the main dashboard"},

		// User Management
		{Name: "users.read", Description: "View users"},
		{Name: "users.create", Description: "Create new users"},
		{Name: "users.update", Description: "Update user information"},
		{Name: "users.delete", Description: "Delete users"},

		// Role Management
		{Name: "roles.read", Description: "View roles"},
		{Name: "roles.manage", Description: "Create, update, and delete roles"},

		// Permission Management
		{Name: "permissions.read", Description: "View permissions"},
		{Name: "permissions.manage", Description: "Create, update, and delete permissions"},

		// Vehicle Management
		{Name: "vehicles.read", Description: "View own vehicles"},
		{Name: "vehicles.read_all", Description: "View all vehicles (admin only)"},
		{Name: "vehicles.create", Description: "Create new vehicles"},
		{Name: "vehicles.update", Description: "Update any vehicle"},
		{Name: "vehicles.delete", Description: "Delete any vehicle"},

		// Sensor Management
		{Name: "sensors.read", Description: "View all sensors"},
		{Name: "sensors.manage", Description: "Create, update, and delete sensors"},

		// Sensor Type Management
		{Name: "sensor_types.read", Description: "View sensor types"},
		{Name: "sensor_types.manage", Description: "Create, update, and delete sensor types"},

		// Data Operations (main menu features)
		{Name: "tracking.read", Description: "View real-time vehicle tracking"},
		{Name: "control.read", Description: "Access vehicle control panel"},
		{Name: "cam.read", Description: "View live camera feed"},

		// Mission Management
		{Name: "missions.read", Description: "View own missions"},
		{Name: "missions.read_all", Description: "View all missions (admin only)"},
		{Name: "missions.create", Description: "Create new missions"},
		{Name: "missions.update", Description: "Update missions"},
		{Name: "missions.delete", Description: "Delete missions"},

		// Data Monitoring
		{Name: "battery.read", Description: "View battery monitoring data"},
		{Name: "logs.read", Description: "View system and vehicle logs"},
		{Name: "alerts.read", Description: "View alerts"},
		{Name: "notifications.read", Description: "View user notifications"},
		{Name: "sensor-monitoring.read", Description: "View sensor monitoring (CTD, etc.)"},
		{Name: "telemetry.read", Description: "View telemetry data from vehicles"},

		// Data Records
		{Name: "sensor_logs.read", Description: "View sensor log data"},
		{Name: "raw_logs.read", Description: "View raw log data"},
		{Name: "raw_logs.delete", Description: "Delete raw log data"},
	}

	for _, permission := range permissions {
		var existingPermission model.Permission
		if err := db.Where("name = ?", permission.Name).First(&existingPermission).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				if err := db.Create(&permission).Error; err != nil {
					log.Printf("Failed to create permission %s: %v", permission.Name, err)
				} else {
					log.Printf("Permission '%s' created successfully", permission.Name)
				}
			}
		} else {
			log.Printf("Permission '%s' already exists", permission.Name)
		}
	}

	// ─── Admin: assign ALL permissions on fresh install only ───────────────────
	// After fresh install, admin manages role permissions via web UI.
	var adminRole model.Role
	if err := db.Where("name = ?", "admin").Preload("Permissions").First(&adminRole).Error; err == nil {
		if len(adminRole.Permissions) == 0 {
			var allPermissions []model.Permission
			db.Find(&allPermissions)
			if err := db.Model(&adminRole).Association("Permissions").Append(&allPermissions); err != nil {
				log.Printf("Failed to assign permissions to admin: %v", err)
			} else {
				log.Printf("Admin role assigned %d permissions (fresh install)", len(allPermissions))
			}
		} else {
			log.Printf("Admin role already has %d permissions, skipping (manage via web UI)", len(adminRole.Permissions))
		}
	}

	// ─── User role: assign default read-level permissions ────────────────────
	// These are the permissions for regular users. Admin manages full access.
	userPermissionNames := []string{
		"dashboard.access",
		"tracking.read",
		"control.read",
		"cam.read",
		"missions.read",
		"battery.read",
		"logs.read",
		"alerts.read",
		"notifications.read",
		"sensor-monitoring.read",
		"telemetry.read",
		"vehicles.read",
		"sensors.read",
		"sensor_types.read",
		"sensor_logs.read",
		"raw_logs.read",
	}

	var userRole model.Role
	if err := db.Where("name = ?", "user").Preload("Permissions").First(&userRole).Error; err == nil {
		if len(userRole.Permissions) == 0 {
			var userPerms []model.Permission
			db.Where("name IN ?", userPermissionNames).Find(&userPerms)
			if err := db.Model(&userRole).Association("Permissions").Append(&userPerms); err != nil {
				log.Printf("Failed to assign permissions to user role: %v", err)
			} else {
				log.Printf("User role assigned %d permissions (fresh install)", len(userPerms))
			}
		} else {
			log.Printf("User role already has %d permissions, skipping (manage via web UI)", len(userRole.Permissions))
		}
	}
}

func SeedAdminUser(db *gorm.DB) {
	var existingAdmin model.User
	if err := db.Where("email = ?", "seanousv@gmail.com").First(&existingAdmin).Error; err != nil {
		if err == gorm.ErrRecordNotFound {

			var adminRole model.Role
			if err := db.Where("name = ?", "admin").First(&adminRole).Error; err != nil {
				log.Printf("Admin role not found, cannot create admin user: %v", err)
				return
			}

			
			hashedPassword, err := bcrypt.GenerateFromPassword([]byte("Seano2025*"), bcrypt.DefaultCost)
			if err != nil {
				log.Printf("Failed to hash admin password: %v", err)
				return
			}

			
		adminUser := model.User{
			Username:   "admin",
			Email:      "seanousv@gmail.com",
			Password:   string(hashedPassword),
			RoleID:     &adminRole.ID,
			IsVerified: true, 
		}

			if err := db.Create(&adminUser).Error; err != nil {
				log.Printf("Failed to create admin user: %v", err)
			} else {
				log.Println("Admin user created successfully (email: seanousv@gmail.com, password: Seano2025*)")
			}
		}
	} else {
		log.Println("Admin user already exists")
	}
}

func SeedRegularUser(db *gorm.DB) {
	var existingUser model.User
	if err := db.Where("email = ?", "seanouser@gmail.com").First(&existingUser).Error; err != nil {
		if err == gorm.ErrRecordNotFound {

			var userRole model.Role
			if err := db.Where("name = ?", "user").First(&userRole).Error; err != nil {
				log.Printf("User role not found, cannot create user: %v", err)
				return
			}

			hashedPassword, err := bcrypt.GenerateFromPassword([]byte("Seano2025*"), bcrypt.DefaultCost)
			if err != nil {
				log.Printf("Failed to hash user password: %v", err)
				return
			}

		regularUser := model.User{
			Username:   "user",
			Email:      "seanouser@gmail.com",
			Password:   string(hashedPassword),
			RoleID:     &userRole.ID,
			IsVerified: true,
		}

			if err := db.Create(&regularUser).Error; err != nil {
				log.Printf("Failed to create regular user: %v", err)
			} else {
				log.Println("User created successfully (email: seanouser@gmail.com, password: Seano2025*)")
			}
		}
	} else {
		log.Println("User already exists")
	}
}

func SeedSensorTypes(db *gorm.DB) {
	sensorTypes := []model.SensorType{
		{Name: "Oceanography", Description: "Sensors for ocean data measurement and analysis"},
		{Name: "Hydrography", Description: "Sensors for underwater mapping and bathymetry"},
		{Name: "Telemetry", Description: "Sensors for remote monitoring and data transmission"},
		{Name: "Meteorology", Description: "Sensors for weather and atmospheric conditions"},
		{Name: "Navigation", Description: "Sensors for positioning and navigation systems"},
	}

	for _, sensorType := range sensorTypes {
		var existingSensorType model.SensorType
		if err := db.Where("name = ?", sensorType.Name).First(&existingSensorType).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				if err := db.Create(&sensorType).Error; err != nil {
					log.Printf("Failed to create sensor type %s: %v", sensorType.Name, err)
				} else {
					log.Printf("Sensor type '%s' created successfully", sensorType.Name)
				}
			}
		} else {
			log.Printf("Sensor type '%s' already exists", sensorType.Name)
		}
	}
}

func SeedSensors(db *gorm.DB) {
	// Sensors are now managed via API by admin
	// No pre-seeded sensors - admin can create sensors with custom data schemas
	log.Println("Sensor seeding skipped - manage sensors via API")
}

