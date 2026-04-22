package ws

import (
	"encoding/json"
	"log"
	"sync"
)

// Message represents a WebSocket message
type Message struct {
	Type string      `json:"type"` // "new_order", "order_update", "status_change"
	Data interface{} `json:"data"`
}

// Hub maintains the set of active clients and broadcasts messages
type Hub struct {
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	mu         sync.RWMutex
}

// Global hub instance
var GlobalHub *Hub

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan []byte, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			log.Printf("WebSocket client connected. Total: %d", len(h.clients))

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
			h.mu.Unlock()
			log.Printf("WebSocket client disconnected. Total: %d", len(h.clients))

		case message := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
			h.mu.RUnlock()
		}
	}
}

// BroadcastMessage sends a typed message to all connected clients
func (h *Hub) BroadcastMessage(msgType string, data interface{}) {
	msg := Message{
		Type: msgType,
		Data: data,
	}
	jsonData, err := json.Marshal(msg)
	if err != nil {
		log.Printf("Failed to marshal WebSocket message: %v", err)
		return
	}
	h.broadcast <- jsonData
}

func InitHub() {
	GlobalHub = NewHub()
	go GlobalHub.Run()
	log.Println("WebSocket hub initialized")
}
