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

type PublicationHandler struct {
	pubRepo *repository.PublicationRepository
}

func NewPublicationHandler(pubRepo *repository.PublicationRepository) *PublicationHandler {
	return &PublicationHandler{pubRepo: pubRepo}
}

// GetAll godoc
// @Summary Get all publications
// @Tags Publications
// @Produce json
// @Success 200 {array} model.Publication
// @Router /publications [get]
func (h *PublicationHandler) GetAll(c *fiber.Ctx) error {
	pubs, err := h.pubRepo.GetAll()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch publications"})
	}
	return c.JSON(pubs)
}

// GetByID godoc
// @Summary Get publication by ID
// @Tags Publications
// @Produce json
// @Param id path int true "Publication ID"
// @Success 200 {object} model.Publication
// @Router /publications/{id} [get]
func (h *PublicationHandler) GetByID(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid ID"})
	}
	pub, err := h.pubRepo.GetByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Publication not found"})
	}
	return c.JSON(pub)
}

// Create godoc
// @Summary Create a publication
// @Tags Publications
// @Accept json
// @Produce json
// @Param publication body model.CreatePublicationRequest true "Publication data"
// @Success 201 {object} model.Publication
// @Security BearerAuth
// @Router /publications [post]
func (h *PublicationHandler) Create(c *fiber.Ctx) error {
	var req model.CreatePublicationRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request data"})
	}
	if strings.TrimSpace(req.Title) == "" || strings.TrimSpace(req.Authors) == "" || strings.TrimSpace(req.Type) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "title, authors, and type are required"})
	}

	pub := &model.Publication{
		Title:    req.Title,
		Authors:  req.Authors,
		Type:     req.Type,
		Venue:    req.Venue,
		Year:     req.Year,
		Abstract: req.Abstract,
		DOI:      req.DOI,
		PDF:      req.PDF,
		Tags:     req.Tags,
	}
	if err := h.pubRepo.Create(pub); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create publication"})
	}
	return c.Status(fiber.StatusCreated).JSON(pub)
}

// Update godoc
// @Summary Update a publication
// @Tags Publications
// @Accept json
// @Produce json
// @Param id path int true "Publication ID"
// @Param publication body model.UpdatePublicationRequest true "Updated data"
// @Success 200 {object} model.Publication
// @Security BearerAuth
// @Router /publications/{id} [put]
func (h *PublicationHandler) Update(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid ID"})
	}
	pub, err := h.pubRepo.GetByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Publication not found"})
	}

	var req model.UpdatePublicationRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request data"})
	}

	if req.Title != nil {
		pub.Title = *req.Title
	}
	if req.Authors != nil {
		pub.Authors = *req.Authors
	}
	if req.Type != nil {
		pub.Type = *req.Type
	}
	if req.Venue != nil {
		pub.Venue = *req.Venue
	}
	if req.Year != nil {
		pub.Year = *req.Year
	}
	if req.Abstract != nil {
		pub.Abstract = *req.Abstract
	}
	if req.DOI != nil {
		pub.DOI = *req.DOI
	}
	if req.PDF != nil {
		pub.PDF = *req.PDF
	}
	if req.Tags != nil {
		pub.Tags = req.Tags
	}

	if err := h.pubRepo.Update(pub); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update publication"})
	}
	return c.JSON(pub)
}

// UploadPDF godoc
// @Summary Upload a PDF file for a publication
// @Tags Publications
// @Accept multipart/form-data
// @Produce json
// @Param file formData file true "PDF file (max 20MB)"
// @Success 200 {object} map[string]string
// @Security BearerAuth
// @Router /publications/upload-pdf [post]
func (h *PublicationHandler) UploadPDF(c *fiber.Ctx) error {
	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "No file provided"})
	}

	// Validate extension
	ext := strings.ToLower(filepath.Ext(file.Filename))
	if ext != ".pdf" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Only PDF files are allowed"})
	}

	// Validate size (20MB max)
	if file.Size > 20*1024*1024 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "File size exceeds 20MB limit"})
	}

	// Create upload directory
	uploadDir := "./public/uploads/publications"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create upload directory"})
	}

	// Generate unique filename
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate filename"})
	}
	filename := fmt.Sprintf("%s.pdf", hex.EncodeToString(b))

	savePath := filepath.Join(uploadDir, filename)
	if err := c.SaveFile(file, savePath); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save file"})
	}

	return c.JSON(fiber.Map{"url": fmt.Sprintf("/uploads/publications/%s", filename)})
}

// DeletePDF godoc
// @Summary Delete an uploaded PDF file
// @Tags Publications
// @Produce json
// @Param filename path string true "Filename"
// @Success 200 {object} map[string]string
// @Security BearerAuth
// @Router /publications/upload-pdf/{filename} [delete]
func (h *PublicationHandler) DeletePDF(c *fiber.Ctx) error {
	filename := filepath.Base(c.Params("filename")) // sanitize — no path traversal
	if !strings.HasSuffix(strings.ToLower(filename), ".pdf") {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid filename"})
	}
	path := filepath.Join("./public/uploads/publications", filename)
	if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete file"})
	}
	return c.JSON(fiber.Map{"message": "File deleted"})
}

// Delete godoc
// @Summary Delete a publication
// @Tags Publications
// @Param id path int true "Publication ID"
// @Success 200 {object} map[string]string
// @Security BearerAuth
// @Router /publications/{id} [delete]
func (h *PublicationHandler) Delete(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid ID"})
	}
	if err := h.pubRepo.Delete(uint(id)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete publication"})
	}
	return c.JSON(fiber.Map{"message": "Publication deleted"})
}
