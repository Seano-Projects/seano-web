package websocket

import (
	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
)

type WebSocketHandler struct {
	hub *Hub
}

func NewWebSocketHandler(hub *Hub) *WebSocketHandler {
	return &WebSocketHandler{
		hub: hub,
	}
}

func (h *WebSocketHandler) HandleWebSocket(c *websocket.Conn) {
	var userID uint
	if id, ok := c.Locals("user_id").(uint); ok {
		userID = id
	}

	client := &Client{
		Conn:   c,
		Send:   make(chan []byte, 256),
		UserID: userID,
	}

	h.hub.register <- client

	go client.WritePump()
	client.ReadPump(h.hub)
}

func WebSocketUpgrade() fiber.Handler {
	return func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	}
}

func (h *WebSocketHandler) GetStats(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"connected_clients": h.hub.GetClientCount(),
	})
}
