package services

import (
	"sync"

	"github.com/gorilla/websocket"
)

// WSHub manages WebSocket connections for QR login sessions
type WSHub struct {
	mu      sync.RWMutex
	clients map[string]map[*websocket.Conn]bool // sessionUUID -> connections
}

// NewWSHub creates a new WebSocket hub
func NewWSHub() *WSHub {
	return &WSHub{
		clients: make(map[string]map[*websocket.Conn]bool),
	}
}

// Register adds a WebSocket connection for a session
func (h *WSHub) Register(sessionUUID string, conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if h.clients[sessionUUID] == nil {
		h.clients[sessionUUID] = make(map[*websocket.Conn]bool)
	}
	h.clients[sessionUUID][conn] = true
}

// Unregister removes a WebSocket connection
func (h *WSHub) Unregister(sessionUUID string, conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if conns, ok := h.clients[sessionUUID]; ok {
		delete(conns, conn)
		if len(conns) == 0 {
			delete(h.clients, sessionUUID)
		}
	}
}

// Broadcast sends a message to all connections for a session
func (h *WSHub) Broadcast(sessionUUID string, message []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	if conns, ok := h.clients[sessionUUID]; ok {
		for conn := range conns {
			if err := conn.WriteMessage(websocket.TextMessage, message); err != nil {
				conn.Close()
			}
		}
	}
}

// CleanupSession removes all connections for a session
func (h *WSHub) CleanupSession(sessionUUID string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if conns, ok := h.clients[sessionUUID]; ok {
		for conn := range conns {
			conn.Close()
		}
		delete(h.clients, sessionUUID)
	}
}
