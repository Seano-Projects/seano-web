package handler

import (
	"errors"
	"strconv"
	"strings"

	"go-fiber-pgsql/internal/model"
	"go-fiber-pgsql/internal/repository"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type PermissionHandler struct {
	permissionRepo *repository.PermissionRepository
	roleRepo       *repository.RoleRepository
}

func NewPermissionHandler(permissionRepo *repository.PermissionRepository, roleRepo *repository.RoleRepository) *PermissionHandler {
	return &PermissionHandler{
		permissionRepo: permissionRepo,
		roleRepo:       roleRepo,
	}
}

// CreatePermission godoc
// @Summary Create a new permission
// @Description Create a new permission with name and description
// @Tags Permissions
// @Accept json
// @Produce json
// @Param permission body model.CreatePermissionRequest true "Permission data"
// @Success 201 {object} model.Permission
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /permissions [post]
func (h *PermissionHandler) CreatePermission(c *fiber.Ctx) error {
	var req model.CreatePermissionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	permission := &model.Permission{
		Name:        req.Name,
		Description: req.Description,
	}

	// Enforce unique permission name to avoid 500s on DB constraint errors.
	if existing, err := h.permissionRepo.GetPermissionByName(req.Name); err == nil && existing != nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error": "permission name already exists",
		})
	} else if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to validate permission name",
		})
	}

	if err := h.permissionRepo.CreatePermission(permission); err != nil {
		if errors.Is(err, gorm.ErrDuplicatedKey) || strings.Contains(strings.ToLower(err.Error()), "duplicate") {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": "permission name already exists",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create permission",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(permission)
}

// GetAllPermissions godoc
// @Summary Get all permissions
// @Description Get all permissions
// @Tags Permissions
// @Produce json
// @Success 200 {array} model.Permission
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /permissions [get]
func (h *PermissionHandler) GetAllPermissions(c *fiber.Ctx) error {
	permissions, err := h.permissionRepo.GetAllPermissions()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch permissions",
		})
	}

	return c.JSON(permissions)
}

// GetPermissionByID godoc
// @Summary Get a permission by ID
// @Description Get a specific permission by ID
// @Tags Permissions
// @Produce json
// @Param id path int true "Permission ID"
// @Success 200 {object} model.Permission
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Security BearerAuth
// @Router /permissions/{id} [get]
func (h *PermissionHandler) GetPermissionByID(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid permission ID",
		})
	}

	permission, err := h.permissionRepo.GetPermissionByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Permission not found",
		})
	}

	return c.JSON(permission)
}

// UpdatePermission godoc
// @Summary Update a permission
// @Description Update a permission's name and/or description
// @Tags Permissions
// @Accept json
// @Produce json
// @Param id path int true "Permission ID"
// @Param permission body model.UpdatePermissionRequest true "Updated permission data"
// @Success 200 {object} model.Permission
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /permissions/{id} [put]
func (h *PermissionHandler) UpdatePermission(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid permission ID",
		})
	}

	var req model.UpdatePermissionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	updates := make(map[string]interface{})
	if req.Name != nil {
		if existing, err := h.permissionRepo.GetPermissionByName(*req.Name); err == nil && existing != nil && existing.ID != uint(id) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": "permission name already exists",
			})
		} else if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to validate permission name",
			})
		}
		updates["name"] = *req.Name
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}

	if err := h.permissionRepo.UpdatePermission(uint(id), updates); err != nil {
		if errors.Is(err, gorm.ErrDuplicatedKey) || strings.Contains(strings.ToLower(err.Error()), "duplicate") {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": "permission name already exists",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update permission",
		})
	}

	permission, err := h.permissionRepo.GetPermissionByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Permission not found",
		})
	}

	return c.JSON(permission)
}

// DeletePermission godoc
// @Summary Delete a permission
// @Description Delete a permission by ID
// @Tags Permissions
// @Produce json
// @Param id path int true "Permission ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /permissions/{id} [delete]
func (h *PermissionHandler) DeletePermission(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid permission ID",
		})
	}

	if err := h.permissionRepo.DeletePermission(uint(id)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete permission",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Permission deleted successfully",
	})
}

// AssignPermissionToRole godoc
// @Summary Assign permissions to a role
// @Description Assign one or more permissions to a role
// @Tags Permissions
// @Accept json
// @Produce json
// @Param request body model.AssignPermissionRequest true "Assignment data"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /permissions/assign-to-role [post]
func (h *PermissionHandler) AssignPermissionToRole(c *fiber.Ctx) error {
	var req model.AssignPermissionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if err := h.roleRepo.AssignPermissionsToRole(req.RoleID, req.PermissionIDs); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to assign permissions to role",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Permissions assigned successfully",
	})
}

// RemovePermissionFromRole godoc
// @Summary Remove a permission from a role
// @Description Remove a specific permission from a role
// @Tags Permissions
// @Produce json
// @Param role_id path int true "Role ID"
// @Param permission_id path int true "Permission ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /permissions/remove-from-role/{role_id}/{permission_id} [delete]
func (h *PermissionHandler) RemovePermissionFromRole(c *fiber.Ctx) error {
	roleID, err := strconv.ParseUint(c.Params("role_id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid role ID",
		})
	}

	permissionID, err := strconv.ParseUint(c.Params("permission_id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid permission ID",
		})
	}

	if err := h.roleRepo.RemovePermissionFromRole(uint(roleID), uint(permissionID)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to remove permission from role",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Permission removed successfully",
	})
}
