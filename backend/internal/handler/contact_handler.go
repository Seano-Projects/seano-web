package handler

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"go-fiber-pgsql/internal/util"
)

type ContactHandler struct {
	EmailService *util.EmailService
}

func NewContactHandler(emailService *util.EmailService) *ContactHandler {
	return &ContactHandler{EmailService: emailService}
}

type ContactRequest struct {
	Name    string `json:"name"`
	Email   string `json:"email"`
	Message string `json:"message"`
}

func (h *ContactHandler) Send(c *fiber.Ctx) error {
	var req ContactRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	req.Name = strings.TrimSpace(req.Name)
	req.Email = strings.TrimSpace(req.Email)
	req.Message = strings.TrimSpace(req.Message)

	if req.Name == "" || req.Email == "" || req.Message == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Name, email, and message are required"})
	}
	if len(req.Message) > 5000 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Message is too long"})
	}

	if err := h.EmailService.SendContactEmail(req.Name, req.Email, req.Message); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to send message. Please try again later."})
	}

	return c.JSON(fiber.Map{"message": "Your message has been sent successfully!"})
}
