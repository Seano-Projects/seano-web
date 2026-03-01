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

	permissions := []model.Permission{
		// CRUD permissions - standardized with .read for read operations
		{Name: "users.read", Description: "View/read users"},
		{Name: "users.create", Description: "Create new users"},
		{Name: "users.update", Description: "Update user information"},
		{Name: "users.delete", Description: "Delete users"},
		{Name: "roles.read", Description: "View/read roles"},
		{Name: "roles.manage", Description: "Create, update, and delete roles"},
		{Name: "permissions.read", Description: "View/read permissions"},
		{Name: "permissions.manage", Description: "Create, update, and delete permissions"},
		{Name: "sensors.read", Description: "View/read all sensors"},
		{Name: "sensors.manage", Description: "Create, update, and delete sensors (admin only)"},
		{Name: "sensor_types.read", Description: "View/read sensor types"},
		{Name: "sensor_types.manage", Description: "Create, update, and delete sensor types"},
		{Name: "vehicles.read", Description: "View/read all vehicles"},
		{Name: "vehicles.create", Description: "Create new vehicles"},
		{Name: "vehicles.update", Description: "Update any vehicle"},
		{Name: "vehicles.delete", Description: "Delete any vehicle"},

		// Feature-specific permissions
		{Name: "tracking.read", Description: "View tracking data and real-time vehicle monitoring"},
		{Name: "missions.read", Description: "View missions and mission planning"},
		{Name: "telemetry.read", Description: "View telemetry data from vehicles"},
		{Name: "logs.read", Description: "View system and vehicle logs"},
		{Name: "alerts.read", Description: "View alerts and notifications"},
		{Name: "notifications.read", Description: "View user notifications"},
		{Name: "sensor_logs.read", Description: "View sensor log data"},
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

	var adminRole model.Role
	if err := db.Where("name = ?", "admin").Preload("Permissions").First(&adminRole).Error; err == nil {
		var allPermissions []model.Permission
		db.Find(&allPermissions)

		if len(adminRole.Permissions) == 0 {
			if err := db.Model(&adminRole).Association("Permissions").Append(&allPermissions); err != nil {
				log.Printf("Failed to assign permissions to admin: %v", err)
			} else {
				log.Println("All permissions assigned to admin role")
			}
		} else {
			log.Println("Admin role already has permissions")
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

