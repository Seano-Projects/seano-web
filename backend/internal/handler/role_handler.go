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

type RoleHandler struct {
	roleRepo *repository.RoleRepository
}

func NewRoleHandler(roleRepo *repository.RoleRepository) *RoleHandler {
	return &RoleHandler{roleRepo: roleRepo}
}

// CreateRole godoc
// @Summary Create a new role
// @Description Create a new role with name and description
// @Tags Roles
// @Accept json
// @Produce json
// @Param role body model.CreateRoleRequest true "Role data"
// @Success 201 {object} model.Role
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /roles [post]
func (h *RoleHandler) CreateRole(c *fiber.Ctx) error {
	var req model.CreateRoleRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	role := &model.Role{
		Name:        req.Name,
		Description: req.Description,
	}

	// Enforce unique role name to avoid 500s on DB constraint errors.
	if existing, err := h.roleRepo.GetRoleByName(req.Name); err == nil && existing != nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error": "role name already exists",
		})
	} else if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to validate role name",
		})
	}

	if err := h.roleRepo.CreateRole(role); err != nil {
		if errors.Is(err, gorm.ErrDuplicatedKey) || strings.Contains(strings.ToLower(err.Error()), "duplicate") {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": "role name already exists",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create role",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(role)
}

// GetAllRoles godoc
// @Summary Get all roles
// @Description Get all roles with their permissions
// @Tags Roles
// @Produce json
// @Success 200 {array} model.Role
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /roles [get]
func (h *RoleHandler) GetAllRoles(c *fiber.Ctx) error {
	roles, err := h.roleRepo.GetAllRoles()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch roles",
		})
	}

	return c.JSON(roles)
}

// GetRoleByID godoc
// @Summary Get a role by ID
// @Description Get a specific role by ID with its permissions
// @Tags Roles
// @Produce json
// @Param id path int true "Role ID"
// @Success 200 {object} model.Role
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Security BearerAuth
// @Router /roles/{id} [get]
func (h *RoleHandler) GetRoleByID(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid role ID",
		})
	}

	role, err := h.roleRepo.GetRoleByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Role not found",
		})
	}

	return c.JSON(role)
}

// UpdateRole godoc
// @Summary Update a role
// @Description Update a role's name and/or description
// @Tags Roles
// @Accept json
// @Produce json
// @Param id path int true "Role ID"
// @Param role body model.UpdateRoleRequest true "Updated role data"
// @Success 200 {object} model.Role
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /roles/{id} [put]
func (h *RoleHandler) UpdateRole(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid role ID",
		})
	}

	var req model.UpdateRoleRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	updates := make(map[string]interface{})
	if req.Name != nil {
		if existing, err := h.roleRepo.GetRoleByName(*req.Name); err == nil && existing != nil && existing.ID != uint(id) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": "role name already exists",
			})
		} else if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to validate role name",
			})
		}
		updates["name"] = *req.Name
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}

	if err := h.roleRepo.UpdateRole(uint(id), updates); err != nil {
		if errors.Is(err, gorm.ErrDuplicatedKey) || strings.Contains(strings.ToLower(err.Error()), "duplicate") {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": "role name already exists",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update role",
		})
	}

	role, err := h.roleRepo.GetRoleByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Role not found",
		})
	}

	return c.JSON(role)
}

// DeleteRole godoc
// @Summary Delete a role
// @Description Delete a role by ID
// @Tags Roles
// @Produce json
// @Param id path int true "Role ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /roles/{id} [delete]
func (h *RoleHandler) DeleteRole(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid role ID",
		})
	}

	if err := h.roleRepo.DeleteRole(uint(id)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete role",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Role deleted successfully",
	})
}
