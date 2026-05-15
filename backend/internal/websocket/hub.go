package websocket

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/gofiber/contrib/websocket"
)

const (
	pongWait   = 60 * time.Second
	pingPeriod = 50 * time.Second
	writeWait  = 10 * time.Second
)

type SensorDataMessage struct {
	MessageType string      `json:"message_type"`
	SensorType  string      `json:"sensor_type"`
	VehicleCode string      `json:"vehicle_code"`
	SensorCode  string      `json:"sensor_code"`
	Timestamp   string      `json:"timestamp"`
	Data        interface{} `json:"data"`
}

type MissionProgressMessage struct {
	MessageType       string  `json:"message_type"`
	MissionID         uint    `json:"mission_id"`
	VehicleCode       string  `json:"vehicle_code"`
	Progress          float64 `json:"progress"`
	EnergyConsumed    float64 `json:"energy_consumed"`
	EnergyBudget      float64 `json:"energy_budget"`
	TimeElapsed       int64   `json:"time_elapsed"`
	CurrentWaypoint   int     `json:"current_waypoint"`
	CompletedWaypoint int     `json:"completed_waypoint"`
	Status            string  `json:"status"`
	Timestamp         string  `json:"timestamp"`
}

type Client struct {
	Conn   *websocket.Conn
	Send   chan []byte
	Filter ClientFilter
}

type ClientFilter struct {
	VehicleCode string
	SensorCode  string
	SensorType  string
}

type Hub struct {
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	mu         sync.RWMutex
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan []byte, 512),
		register:   make(chan *Client, 64),
		unregister: make(chan *Client, 64),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			log.Printf("WebSocket client registered. Total clients: %d", len(h.clients))

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.Send)
			}
			h.mu.Unlock()
			log.Printf("WebSocket client unregistered. Total clients: %d", len(h.clients))

		case message := <-h.broadcast:
			// Unmarshal once for filtering instead of per-client
			var parsedMsg SensorDataMessage
			parsed := json.Unmarshal(message, &parsedMsg) == nil

			h.mu.RLock()
			var slowClients []*Client
			for client := range h.clients {
				if h.shouldSendToClientParsed(client, &parsedMsg, parsed) {
					select {
					case client.Send <- message:
					default:
						slowClients = append(slowClients, client)
					}
				}
			}
			h.mu.RUnlock()

			if len(slowClients) > 0 {
				h.mu.Lock()
				for _, client := range slowClients {
					if _, ok := h.clients[client]; ok {
						delete(h.clients, client)
						close(client.Send)
						log.Printf("WebSocket slow client dropped. Total clients: %d", len(h.clients))
					}
				}
				h.mu.Unlock()
			}
		}
	}
}

func (h *Hub) shouldSendToClientParsed(client *Client, msg *SensorDataMessage, parsed bool) bool {
	if client.Filter.VehicleCode == "" && client.Filter.SensorCode == "" && client.Filter.SensorType == "" {
		return true
	}
	if !parsed {
		return true
	}
	if client.Filter.VehicleCode != "" && client.Filter.VehicleCode != msg.VehicleCode {
		return false
	}
	if client.Filter.SensorCode != "" && client.Filter.SensorCode != msg.SensorCode {
		return false
	}
	if client.Filter.SensorType != "" && client.Filter.SensorType != msg.SensorType {
		return false
	}
	return true
}

func (h *Hub) BroadcastSensorData(msg SensorDataMessage) error {
	data, err := json.Marshal(msg)
	if err != nil {
		return err
	}
	select {
	case h.broadcast <- data:
	default:
		log.Printf("⚠️ WebSocket broadcast channel full, dropping message")
	}
	return nil
}

func (h *Hub) BroadcastMissionProgress(msg MissionProgressMessage) error {
	data, err := json.Marshal(msg)
	if err != nil {
		return err
	}
	select {
	case h.broadcast <- data:
	default:
		log.Printf("⚠️ WebSocket broadcast channel full, dropping message")
	}
	return nil
}

// Broadcast sends raw data to all connected clients (non-blocking)
func (h *Hub) Broadcast(data []byte) {
	select {
	case h.broadcast <- data:
	default:
		log.Printf("⚠️ WebSocket broadcast channel full, dropping message")
	}
}

func (h *Hub) GetClientCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}

func (c *Client) ReadPump(hub *Hub) {
	defer func() {
		hub.unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		hub.handleClientMessage(c, message)
	}
}

func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}
		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (h *Hub) handleClientMessage(client *Client, message []byte) {
	var msg map[string]interface{}
	if err := json.Unmarshal(message, &msg); err != nil {
		return
	}

	if msgType, ok := msg["type"].(string); ok && msgType == "subscribe" {
		h.mu.Lock()
		if vehicleCode, ok := msg["vehicle_code"].(string); ok {
			client.Filter.VehicleCode = vehicleCode
		}
		if sensorCode, ok := msg["sensor_code"].(string); ok {
			client.Filter.SensorCode = sensorCode
		}
		if sensorType, ok := msg["sensor_type"].(string); ok {
			client.Filter.SensorType = sensorType
		}
		h.mu.Unlock()
	}
}
