package handler

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"

	"go-fiber-pgsql/internal/middleware"
	"go-fiber-pgsql/internal/model"
	"go-fiber-pgsql/internal/repository"
)

type UserHandler struct {
	DB *gorm.DB
}

// CreateUser godoc
// @Summary Create a new user
// @Description Create a new user with email, full_name, and password
// @Tags User
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param user body model.CreateUserRequest true "User data"
// @Success 201 {object} model.User
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /users/ [post]
func (h *UserHandler) CreateUser(c *fiber.Ctx) error {
	var req model.CreateUserRequest

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request data"})
	}

	if req.Email == "" || req.Username == "" || req.Password == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Email, username, and password are required"})
	}

	user, err := repository.CreateUser(h.DB, req)
	if err != nil {
		if err.Error() == "duplicate email" {
			return c.Status(400).JSON(fiber.Map{"error": "Email already exists"})
		}
		if err.Error() == "duplicate username" {
			return c.Status(400).JSON(fiber.Map{"error": "Username already exists"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create user. Please try again"})
	}

	return c.Status(201).JSON(user)
}

// GetAllUsers godoc
// @Summary Get all users
// @Description Get list of all users
// @Tags User
// @Security BearerAuth
// @Produce json
// @Success 200 {array} model.User
// @Failure 500 {object} map[string]string
// @Router /users/ [get]
func (h *UserHandler) GetAllUsers(c *fiber.Ctx) error {
	users, err := repository.GetAllUsers(h.DB)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to retrieve users. Please try again"})
	}

	return c.JSON(users) // already []UserResponse with role_id
}

// GetUserByID godoc
// @Summary Get user by ID
// @Description Get a single user by ID (own profile or with users.view permission)
// @Tags User
// @Security BearerAuth
// @Produce json
// @Param user_id path int true "User ID"
// @Success 200 {object} model.User
// @Failure 403 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /users/{user_id} [get]
func (h *UserHandler) GetUserByID(c *fiber.Ctx) error {
	id := c.Params("user_id")
	loggedInUserID := c.Locals("user_id").(uint)

	// Convert string id to uint
	targetID, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid user ID"})
	}

	// Allow if viewing own profile OR has users.read permission
	if uint(targetID) != loggedInUserID {
		if !middleware.HasPermission(h.DB, loggedInUserID, "users.read") {
			return c.Status(403).JSON(fiber.Map{"error": "You don't have permission to view other users"})
		}
	}

	user, err := repository.GetUserByID(h.DB, id)
	if err != nil {
		if err.Error() == "user not found" {
			return c.Status(404).JSON(fiber.Map{"error": "User not found"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Failed to retrieve user data. Please try again"})
	}

	return c.JSON(model.ToUserDetailResponse(user))
}

// UpdateUser godoc
// @Summary Update user
// @Description Update user information by ID (own profile or with users.update permission)
// @Tags User
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param user_id path int true "User ID"
// @Param user body model.UpdateUserRequest true "User data to update"
// @Success 200 {object} model.User
// @Failure 400 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /users/{user_id} [put]
func (h *UserHandler) UpdateUser(c *fiber.Ctx) error {
	id := c.Params("user_id")
	loggedInUserID := c.Locals("user_id").(uint)

	// Convert string id to uint
	targetID, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid user ID"})
	}

	// Allow if updating own profile OR has users.update permission
	if uint(targetID) != loggedInUserID {
		if !middleware.HasPermission(h.DB, loggedInUserID, "users.update") {
			return c.Status(403).JSON(fiber.Map{"error": "You don't have permission to update other users"})
		}
	}

	var req model.UpdateUserRequest

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request data"})
	}

	// Regular users cannot change their own role
	if uint(targetID) == loggedInUserID && req.RoleID != nil {
		if !middleware.HasPermission(h.DB, loggedInUserID, "users.update") {
			return c.Status(403).JSON(fiber.Map{"error": "You cannot change your own role"})
		}
	}

	user, err := repository.UpdateUser(h.DB, id, req)
	if err != nil {
		if err.Error() == "user not found" {
			return c.Status(404).JSON(fiber.Map{"error": "User not found"})
		}
		if err.Error() == "duplicate email" {
			return c.Status(400).JSON(fiber.Map{"error": "Email already exists"})
		}
		if err.Error() == "duplicate username" {
			return c.Status(400).JSON(fiber.Map{"error": "Username already exists"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update user. Please try again"})
	}

	// Reload user with role for proper response
	var updatedUser model.User
	h.DB.Preload("Role").First(&updatedUser, user.ID)

	return c.JSON(model.ToUserResponse(&updatedUser))
}

// UploadAvatar godoc
// @Summary Upload profile avatar
// @Description Upload/replace the current user's avatar (own profile only)
// @Tags User
// @Security BearerAuth
// @Accept multipart/form-data
// @Produce json
// @Param user_id path int true "User ID"
// @Param file formData file true "Avatar image (JPG, PNG, WebP; max 5MB)"
// @Success 200 {object} model.UserResponse
// @Failure 400 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /users/{user_id}/avatar [post]
func (h *UserHandler) UploadAvatar(c *fiber.Ctx) error {
	id := c.Params("user_id")
	loggedInUserID := c.Locals("user_id").(uint)

	targetID, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid user ID"})
	}
	if uint(targetID) != loggedInUserID {
		return c.Status(403).JSON(fiber.Map{"error": "You can only update your own avatar"})
	}

	var user model.User
	if err := h.DB.First(&user, targetID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "User not found"})
	}

	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "No file provided"})
	}
	ext := strings.ToLower(filepath.Ext(file.Filename))
	allowed := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".webp": true}
	if !allowed[ext] {
		return c.Status(400).JSON(fiber.Map{"error": "Only JPG, PNG, and WebP files allowed"})
	}
	if file.Size > 5*1024*1024 {
		return c.Status(400).JSON(fiber.Map{"error": "File exceeds 5MB"})
	}

	uploadDir := "./public/uploads/avatars"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create directory"})
	}
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to generate filename"})
	}
	filename := fmt.Sprintf("%s%s", hex.EncodeToString(b), ext)
	savePath := filepath.Join(uploadDir, filename)
	if err := c.SaveFile(file, savePath); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to save file"})
	}

	oldAvatarURL := user.AvatarURL
	newAvatarURL := fmt.Sprintf("/uploads/avatars/%s", filename)
	if err := h.DB.Model(&user).Update("avatar_url", newAvatarURL).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update avatar"})
	}

	// Best-effort cleanup of the previous avatar file.
	if oldAvatarURL != "" && strings.HasPrefix(oldAvatarURL, "/uploads/avatars/") {
		oldPath := filepath.Join("./public/uploads/avatars", filepath.Base(oldAvatarURL))
		_ = os.Remove(oldPath)
	}

	var updatedUser model.User
	h.DB.Preload("Role").First(&updatedUser, user.ID)

	return c.JSON(model.ToUserResponse(&updatedUser))
}

// DeleteUser godoc
// @Summary Delete user
// @Description Delete a user by ID
// @Tags User
// @Security BearerAuth
// @Produce json
// @Param user_id path int true "User ID"
// @Success 200 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /users/{user_id} [delete]
func (h *UserHandler) DeleteUser(c *fiber.Ctx) error {
	id := c.Params("user_id")

	err := repository.DeleteUser(h.DB, id)
	if err != nil {
		if err.Error() == "user not found" {
			return c.Status(404).JSON(fiber.Map{"error": "User not found"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Failed to delete user. Please try again"})
	}

	return c.Status(200).JSON(fiber.Map{"message": "User deleted successfully"})
}

