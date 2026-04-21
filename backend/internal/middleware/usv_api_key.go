package middleware

import (
	"encoding/json"
	"os"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"

	"go-fiber-pgsql/internal/model"
	"go-fiber-pgsql/internal/repository"
)

const apiKeyHeader = "X-API-Key"

func AuthOrVehicleAPIKey(vehicleRepo *repository.VehicleRepository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader != "" {
			if err := authenticateJWT(c, authHeader); err != nil {
				return err
			}
			return c.Next()
		}

		apiKey := strings.TrimSpace(c.Get(apiKeyHeader))
		if apiKey == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Missing Authorization or X-API-Key",
			})
		}

		vehicle, err := resolveVehicleFromBody(c, vehicleRepo)
		if err != nil {
			return err
		}

		if vehicle.ApiKey == "" || apiKey != vehicle.ApiKey {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid API key",
			})
		}

		c.Locals("vehicle_id", vehicle.ID)
		c.Locals("vehicle_code", vehicle.Code)
		return c.Next()
	}
}

func AuthOrVehicleAPIKeyFromQuery(vehicleRepo *repository.VehicleRepository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader != "" {
			if err := authenticateJWT(c, authHeader); err != nil {
				return err
			}
			return c.Next()
		}

		apiKey := strings.TrimSpace(c.Get(apiKeyHeader))
		if apiKey == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Missing Authorization or X-API-Key",
			})
		}

		vehicle, err := resolveVehicleFromQuery(c, vehicleRepo)
		if err != nil {
			return err
		}

		if vehicle.ApiKey == "" || apiKey != vehicle.ApiKey {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid API key",
			})
		}

		c.Locals("vehicle_id", vehicle.ID)
		c.Locals("vehicle_code", vehicle.Code)
		return c.Next()
	}
}

func AuthOrVehicleAPIKeyByMissionID(missionRepo *repository.MissionRepository, vehicleRepo *repository.VehicleRepository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader != "" {
			if err := authenticateJWT(c, authHeader); err != nil {
				return err
			}
			return c.Next()
		}

		apiKey := strings.TrimSpace(c.Get(apiKeyHeader))
		if apiKey == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Missing Authorization or X-API-Key",
			})
		}

		id, err := strconv.ParseUint(c.Params("id"), 10, 32)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid mission ID",
			})
		}

		mission, err := missionRepo.GetMissionByID(uint(id))
		if err != nil || mission.VehicleID == nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Mission not found",
			})
		}

		vehicle, err := vehicleRepo.GetVehicleByID(*mission.VehicleID)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid vehicle for mission",
			})
		}

		if vehicle.ApiKey == "" || apiKey != vehicle.ApiKey {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid API key",
			})
		}

		c.Locals("vehicle_id", vehicle.ID)
		c.Locals("vehicle_code", vehicle.Code)
		return c.Next()
	}
}

func authenticateJWT(c *fiber.Ctx, authHeader string) error {
	tokenString := strings.TrimSpace(authHeader)
	if strings.HasPrefix(tokenString, "Bearer ") {
		tokenString = strings.TrimPrefix(tokenString, "Bearer ")
	} else if strings.HasPrefix(tokenString, "bearer ") {
		tokenString = strings.TrimPrefix(tokenString, "bearer ")
	}
	if tokenString == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "You are not authorized. Please login first",
		})
	}

	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "your-secret-key-change-in-production"
	}

	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(secret), nil
	})
	if err != nil || !token.Valid {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Your session has expired or token is invalid. Please login again",
		})
	}

	if claims, ok := token.Claims.(*JWTClaims); ok {
		c.Locals("user_id", claims.UserID)
		c.Locals("email", claims.Email)
		c.Locals("role", claims.Role)
	}

	return nil
}

func resolveVehicleFromBody(c *fiber.Ctx, vehicleRepo *repository.VehicleRepository) (*model.Vehicle, error) {
	if len(c.Body()) == 0 {
		return nil, c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "vehicle_code or vehicle_id is required",
		})
	}

	var body map[string]interface{}
	if err := json.Unmarshal(c.Body(), &body); err != nil {
		return nil, c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	vehicleCode := ""
	if rawCode, ok := body["vehicle_code"]; ok {
		if codeStr, ok := rawCode.(string); ok {
			vehicleCode = strings.TrimSpace(codeStr)
		}
	}

	var vehicleID uint
	if rawID, ok := body["vehicle_id"]; ok {
		switch v := rawID.(type) {
		case float64:
			if v > 0 {
				vehicleID = uint(v)
			}
		case json.Number:
			if n, err := v.Int64(); err == nil && n > 0 {
				vehicleID = uint(n)
			}
		case string:
			idStr := strings.TrimSpace(v)
			if idStr != "" {
				if n, err := strconv.ParseUint(idStr, 10, 32); err == nil {
					vehicleID = uint(n)
				} else if vehicleCode == "" {
					vehicleCode = idStr
				}
			}
		}
	}

	if vehicleCode != "" {
		vehicle, err := vehicleRepo.GetVehicleByCode(vehicleCode)
		if err != nil {
			return nil, c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid vehicle_code",
			})
		}
		return vehicle, nil
	}

	if vehicleID != 0 {
		vehicle, err := vehicleRepo.GetVehicleByID(vehicleID)
		if err != nil {
			return nil, c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid vehicle_id",
			})
		}
		return vehicle, nil
	}

	return nil, c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
		"error": "vehicle_code or vehicle_id is required",
	})
}

func resolveVehicleFromQuery(c *fiber.Ctx, vehicleRepo *repository.VehicleRepository) (*model.Vehicle, error) {
	vehicleCode := strings.TrimSpace(c.Query("vehicle_code"))
	vehicleIDRaw := strings.TrimSpace(c.Query("vehicle_id"))

	if vehicleCode != "" {
		vehicle, err := vehicleRepo.GetVehicleByCode(vehicleCode)
		if err != nil {
			return nil, c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid vehicle_code",
			})
		}
		return vehicle, nil
	}

	if vehicleIDRaw != "" {
		id, err := strconv.ParseUint(vehicleIDRaw, 10, 32)
		if err != nil || id == 0 {
			return nil, c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid vehicle_id",
			})
		}

		vehicle, err := vehicleRepo.GetVehicleByID(uint(id))
		if err != nil {
			return nil, c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid vehicle_id",
			})
		}
		return vehicle, nil
	}

	return nil, c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
		"error": "vehicle_code or vehicle_id is required",
	})
}
