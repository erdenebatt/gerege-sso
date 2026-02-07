package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"gerege-sso/config"
	"gerege-sso/services"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

func setupTestRouter() (*gin.Engine, *AuthHandler) {
	gin.SetMode(gin.TestMode)

	cfg := &config.Config{
		Public: config.PublicConfig{URL: "http://localhost:3000"},
	}

	// Use a real redis client pointing to nothing (tests should mock or skip redis calls)
	rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379"})

	jwtService := services.NewJWTService("test-secret-that-is-long-enough-32", 24*3600000000000)

	handler := &AuthHandler{
		jwtService: jwtService,
		redis:      rdb,
		config:     cfg,
	}

	router := gin.New()
	return router, handler
}

func TestExchangeToken_MissingCode(t *testing.T) {
	router, handler := setupTestRouter()
	router.POST("/api/auth/exchange-token", handler.ExchangeToken)

	req := httptest.NewRequest("POST", "/api/auth/exchange-token", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", w.Code)
	}
}

func TestExchangeToken_InvalidCode(t *testing.T) {
	router, handler := setupTestRouter()
	router.POST("/api/auth/exchange-token", handler.ExchangeToken)

	req := httptest.NewRequest("POST", "/api/auth/exchange-token", strings.NewReader(`{"code":"nonexistent"}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", w.Code)
	}

	var resp map[string]string
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp["error"] != "Invalid or expired code" {
		t.Errorf("unexpected error message: %s", resp["error"])
	}
}

func TestMe_NoAuthHeader(t *testing.T) {
	router, handler := setupTestRouter()
	jwtService := services.NewJWTService("test-secret-that-is-long-enough-32", 24*3600000000000)

	router.GET("/api/auth/me", func(c *gin.Context) {
		// Simulate missing claims
		handler.Me(c)
	})

	// We need the JWTAuth middleware to block this
	_ = jwtService
	req := httptest.NewRequest("GET", "/api/auth/me", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", w.Code)
	}
}

func TestLogout_NoClaims(t *testing.T) {
	router, handler := setupTestRouter()
	router.POST("/api/auth/logout", handler.Logout)

	req := httptest.NewRequest("POST", "/api/auth/logout", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Without claims, should still return 200
	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	var resp map[string]string
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp["message"] != "Logged out successfully" {
		t.Errorf("unexpected message: %s", resp["message"])
	}
}

func TestConfirmIdentityLink_MissingBody(t *testing.T) {
	router, handler := setupTestRouter()

	// Simulate authenticated user via middleware
	router.POST("/api/auth/confirm-link", func(c *gin.Context) {
		c.Set("claims", &services.Claims{})
		handler.ConfirmIdentityLink(c)
	})

	req := httptest.NewRequest("POST", "/api/auth/confirm-link", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", w.Code)
	}
}

func TestConfirmIdentityLink_GenIDMismatch(t *testing.T) {
	router, handler := setupTestRouter()

	router.POST("/api/auth/confirm-link", func(c *gin.Context) {
		claims := &services.Claims{}
		claims.Subject = "user-gen-id-123"
		c.Set("claims", claims)
		handler.ConfirmIdentityLink(c)
	})

	body := `{"gen_id":"different-gen-id","reg_no":"AA12345678"}`
	req := httptest.NewRequest("POST", "/api/auth/confirm-link", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", w.Code)
	}
}
