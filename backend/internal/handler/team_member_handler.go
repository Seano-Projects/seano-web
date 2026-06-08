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

	"go-fiber-pgsql/internal/model"
	"go-fiber-pgsql/internal/repository"
)

type TeamMemberHandler struct {
	teamRepo *repository.TeamMemberRepository
}

func NewTeamMemberHandler(teamRepo *repository.TeamMemberRepository) *TeamMemberHandler {
	return &TeamMemberHandler{teamRepo: teamRepo}
}

func (h *TeamMemberHandler) GetAll(c *fiber.Ctx) error {
	members, err := h.teamRepo.GetAll()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch team members"})
	}
	return c.JSON(members)
}

func (h *TeamMemberHandler) GetByID(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid ID"})
	}
	member, err := h.teamRepo.GetByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Team member not found"})
	}
	return c.JSON(member)
}

func (h *TeamMemberHandler) Create(c *fiber.Ctx) error {
	var req model.CreateTeamMemberRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request data"})
	}
	if strings.TrimSpace(req.Name) == "" || strings.TrimSpace(req.Role) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "name and role are required"})
	}
	member := &model.TeamMember{
		Name:      req.Name,
		Role:      req.Role,
		Division:  req.Division,
		Photo:     req.Photo,
		LinkedIn:  req.LinkedIn,
		GitHub:    req.GitHub,
		Twitter:   req.Twitter,
		Instagram: req.Instagram,
		SortOrder: req.SortOrder,
	}
	if err := h.teamRepo.Create(member); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create team member"})
	}
	return c.Status(fiber.StatusCreated).JSON(member)
}

func (h *TeamMemberHandler) Update(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid ID"})
	}
	member, err := h.teamRepo.GetByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Team member not found"})
	}
	var req model.UpdateTeamMemberRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request data"})
	}
	if req.Name != nil {
		member.Name = *req.Name
	}
	if req.Role != nil {
		member.Role = *req.Role
	}
	if req.Division != nil {
		member.Division = *req.Division
	}
	if req.Photo != nil {
		member.Photo = *req.Photo
	}
	if req.LinkedIn != nil {
		member.LinkedIn = *req.LinkedIn
	}
	if req.GitHub != nil {
		member.GitHub = *req.GitHub
	}
	if req.Twitter != nil {
		member.Twitter = *req.Twitter
	}
	if req.Instagram != nil {
		member.Instagram = *req.Instagram
	}
	if req.SortOrder != nil {
		member.SortOrder = *req.SortOrder
	}
	if err := h.teamRepo.Update(member); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update team member"})
	}
	return c.JSON(member)
}

func (h *TeamMemberHandler) Delete(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid ID"})
	}
	if _, err := h.teamRepo.GetByID(uint(id)); err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Team member not found"})
	}
	if err := h.teamRepo.Delete(uint(id)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete team member"})
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *TeamMemberHandler) UploadPhoto(c *fiber.Ctx) error {
	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "No file provided"})
	}
	ext := strings.ToLower(filepath.Ext(file.Filename))
	allowed := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".webp": true}
	if !allowed[ext] {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Only JPG, PNG, and WebP files allowed"})
	}
	if file.Size > 5*1024*1024 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "File exceeds 5MB"})
	}
	uploadDir := "./public/uploads/team"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create directory"})
	}
	b := make([]byte, 16)
	rand.Read(b)
	filename := fmt.Sprintf("%s%s", hex.EncodeToString(b), ext)
	savePath := filepath.Join(uploadDir, filename)
	if err := c.SaveFile(file, savePath); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save file"})
	}
	return c.JSON(fiber.Map{"url": fmt.Sprintf("/uploads/team/%s", filename)})
}

func (h *TeamMemberHandler) DeletePhoto(c *fiber.Ctx) error {
	raw := c.Params("filename")
	// Use filepath.Base to strip any directory components — prevents path traversal
	filename := filepath.Base(raw)
	if filename == "" || filename == "." || filename == "/" || strings.ContainsAny(filename, "/\\") {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid filename"})
	}
	// Only allow known image extensions
	ext := strings.ToLower(filepath.Ext(filename))
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".webp" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid file type"})
	}
	path := filepath.Join("./public/uploads/team", filename)
	if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete file"})
	}
	return c.SendStatus(fiber.StatusNoContent)
}
