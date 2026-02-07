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

func setupOAuthProviderTestRouter() (*gin.Engine, *OAuthProviderHandler) {
	gin.SetMode(gin.TestMode)

	cfg := &config.Config{
		Public: config.PublicConfig{URL: "http://localhost:3000"},
	}

	rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379"})
	jwtService := services.NewJWTService("test-secret-that-is-long-enough-32", 24*3600000000000)

	handler := &OAuthProviderHandler{
		jwtService: jwtService,
		redis:      rdb,
		config:     cfg,
	}

	router := gin.New()
	return router, handler
}

func TestAuthorize_MissingResponseType(t *testing.T) {
	router, handler := setupOAuthProviderTestRouter()
	router.GET("/api/oauth/authorize", func(c *gin.Context) {
		c.Set("claims", &services.Claims{})
		c.Set("user_id", "test-gen-id")
		handler.Authorize(c)
	})

	req := httptest.NewRequest("GET", "/api/oauth/authorize?client_id=test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", w.Code)
	}

	var resp map[string]string
	json.Unmarshal(w.Body.Bytes(), &resp)
	if !strings.Contains(resp["error"], "response_type") {
		t.Errorf("expected response_type error, got: %s", resp["error"])
	}
}

func TestAuthorize_InvalidCodeChallengeMethod(t *testing.T) {
	router, handler := setupOAuthProviderTestRouter()
	router.GET("/api/oauth/authorize", func(c *gin.Context) {
		c.Set("claims", &services.Claims{})
		c.Set("user_id", "test-gen-id")
		handler.Authorize(c)
	})

	req := httptest.NewRequest("GET", "/api/oauth/authorize?response_type=code&client_id=test&code_challenge=abc&code_challenge_method=invalid", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", w.Code)
	}
}

func TestToken_UnsupportedGrantType(t *testing.T) {
	router, handler := setupOAuthProviderTestRouter()
	router.POST("/api/oauth/token", handler.Token)

	req := httptest.NewRequest("POST", "/api/oauth/token", strings.NewReader("grant_type=implicit"))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", w.Code)
	}

	var resp map[string]string
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp["error"] != "unsupported grant_type" {
		t.Errorf("unexpected error: %s", resp["error"])
	}
}
