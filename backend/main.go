package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"gerege-sso/config"
	_ "gerege-sso/docs"
	"gerege-sso/handlers"
	"gerege-sso/middleware"
	"gerege-sso/services"

	"github.com/gin-gonic/gin"
	_ "github.com/lib/pq"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/redis/go-redis/v9"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

// @title Gerege SSO API
// @version 1.0
// @description Gerege нэгдсэн нэвтрэлтийн систем API
// @host sso.gerege.mn
// @BasePath /
// @schemes https
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @securityDefinitions.apikey AdminAPIKey
// @in header
// @name X-API-Key

func main() {
	// Load configuration
	cfg := config.Load()

	// Database connection
	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		cfg.Postgres.Host, cfg.Postgres.Port, cfg.Postgres.User, cfg.Postgres.Password, cfg.Postgres.DB)

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Test database connection
	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}
	log.Println("Connected to PostgreSQL")

	// Redis connection
	rdb := redis.NewClient(&redis.Options{
		Addr: fmt.Sprintf("%s:%s", cfg.Redis.Host, cfg.Redis.Port),
	})
	defer rdb.Close()

	// Test Redis connection
	ctx := context.Background()
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}
	log.Println("Connected to Redis")

	// Initialize services
	genIDService := services.NewGenIDService(db)
	oauthService := services.NewOAuthService(cfg)
	jwtService := services.NewJWTService(cfg.JWT.Secret, cfg.JWT.Expiry, rdb)
	userService := services.NewUserService(db, genIDService)
	auditService := services.NewAuditService(db)

	// Initialize Apple OAuth service (optional)
	var appleOAuthService *services.AppleOAuthService
	if cfg.Auth.AppleClientID != "" {
		var err error
		appleOAuthService, err = services.NewAppleOAuthService(cfg)
		if err != nil {
			log.Printf("Apple OAuth not configured: %v", err)
		} else {
			log.Println("Apple Sign-In enabled")
		}
	}

	// Initialize Facebook OAuth service (optional)
	var facebookOAuthService *services.FacebookOAuthService
	if cfg.Auth.FacebookClientID != "" {
		var err error
		facebookOAuthService, err = services.NewFacebookOAuthService(cfg)
		if err != nil {
			log.Printf("Facebook OAuth not configured: %v", err)
		} else {
			log.Println("Facebook Login enabled")
		}
	}

	// Initialize Twitter OAuth service (optional)
	var twitterOAuthService *services.TwitterOAuthService
	if cfg.Auth.TwitterClientID != "" {
		twitterOAuthService = services.NewTwitterOAuthService(
			cfg.Auth.TwitterClientID,
			cfg.Auth.TwitterClientSecret,
			cfg.Auth.TwitterRedirectURL,
		)
		log.Println("Twitter/X Login enabled")
	}

	// Initialize OAuth2 provider service
	clientService := services.NewClientService(db, rdb)
	grantService := services.NewGrantService(db)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(oauthService, appleOAuthService, facebookOAuthService, twitterOAuthService, jwtService, userService, auditService, rdb, cfg)
	healthHandler := handlers.NewHealthHandler(db, rdb)
	oauthProviderHandler := handlers.NewOAuthProviderHandler(clientService, jwtService, userService, auditService, grantService, rdb, cfg)

	// Setup Gin router
	if os.Getenv("GIN_MODE") == "" {
		gin.SetMode(gin.ReleaseMode)
	}
	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(middleware.Logger())
	router.Use(middleware.CORS())
	router.Use(middleware.SecurityHeaders())
	router.Use(middleware.Metrics())

	// Health and metrics routes
	router.GET("/health", healthHandler.Health)
	router.GET("/ready", healthHandler.Ready)
	router.GET("/metrics", gin.WrapH(promhttp.Handler()))
	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	// Rate limiter for auth endpoints (20 requests per minute per IP)
	authRateLimit := middleware.RateLimit(rdb, 20, 1*time.Minute)

	// API routes
	api := router.Group("/api")
	{
		// Auth routes
		auth := api.Group("/auth")
		auth.Use(authRateLimit)
		{
			auth.GET("/google", authHandler.GoogleLogin)
			auth.GET("/google/callback", authHandler.GoogleCallback)
			auth.GET("/apple", authHandler.AppleLogin)
			auth.POST("/apple/callback", authHandler.AppleCallback)
			auth.GET("/apple/callback", authHandler.AppleCallback)
			auth.GET("/facebook", authHandler.FacebookLogin)
			auth.GET("/facebook/callback", authHandler.FacebookCallback)
			auth.GET("/twitter", authHandler.TwitterLogin)
			auth.GET("/twitter/callback", authHandler.TwitterCallback)
			auth.POST("/exchange-token", authHandler.ExchangeToken)
		auth.POST("/logout", middleware.JWTAuth(jwtService), authHandler.Logout)
			auth.GET("/me", middleware.JWTAuth(jwtService), authHandler.Me)
			auth.POST("/verify", middleware.JWTAuth(jwtService), authHandler.VerifyIdentity)
			auth.POST("/confirm-link", authHandler.ConfirmIdentityLink)
			auth.GET("/dan", authHandler.DanLogin)
			auth.GET("/dan/callback", middleware.JWTAuth(jwtService), authHandler.DanCallback)

			// User grants endpoints
			auth.GET("/grants", middleware.JWTAuth(jwtService), oauthProviderHandler.ListMyGrants)
			auth.DELETE("/grants/:id", middleware.JWTAuth(jwtService), oauthProviderHandler.RevokeGrant)
		}

		// OAuth2 provider routes
		oauth := api.Group("/oauth")
		{
			oauth.GET("/authorize", middleware.JWTAuth(jwtService), oauthProviderHandler.Authorize)
			oauth.POST("/token", oauthProviderHandler.Token)
		}

		// Admin routes (API key auth)
		admin := api.Group("/admin", middleware.AdminAuth(cfg.Admin.APIKey))
		{
			admin.POST("/clients", oauthProviderHandler.CreateClient)
			admin.GET("/clients", oauthProviderHandler.ListClients)
			admin.PUT("/clients/:id", oauthProviderHandler.UpdateClient)
			admin.DELETE("/clients/:id", oauthProviderHandler.DeleteClient)
			admin.GET("/stats", oauthProviderHandler.GetStats)
			admin.GET("/audit-logs", oauthProviderHandler.GetAuditLogs)
		}
	}

	// Start server
	srv := &http.Server{
		Addr:         ":" + cfg.Server.Port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	go func() {
		log.Printf("Server starting on port %s", cfg.Server.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed: %v", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited")
}
