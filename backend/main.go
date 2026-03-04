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
	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		cfg.Postgres.Host, cfg.Postgres.Port, cfg.Postgres.User, cfg.Postgres.Password, cfg.Postgres.DB, cfg.Postgres.SSLMode)

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

	// Sign database connection (optional, graceful degradation)
	var signDB *sql.DB
	signDSN := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		cfg.SignDB.Host, cfg.SignDB.Port, cfg.SignDB.User, cfg.SignDB.Password, cfg.SignDB.DB, cfg.SignDB.SSLMode)
	signDB, err = sql.Open("postgres", signDSN)
	if err != nil {
		log.Printf("Sign DB connection failed (sign features disabled): %v", err)
		signDB = nil
	} else if err := signDB.Ping(); err != nil {
		log.Printf("Sign DB ping failed (sign features disabled): %v", err)
		signDB.Close()
		signDB = nil
	} else {
		log.Println("Connected to Sign DB (gerege_sign)")
		defer signDB.Close()
	}

	// e-ID database connection (optional, graceful degradation)
	var eidDB *sql.DB
	eidDSN := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		cfg.EIDDB.Host, cfg.EIDDB.Port, cfg.EIDDB.User, cfg.EIDDB.Password, cfg.EIDDB.DB, cfg.EIDDB.SSLMode)
	eidDB, err = sql.Open("postgres", eidDSN)
	if err != nil {
		log.Printf("EID DB connection failed (e-ID features disabled): %v", err)
		eidDB = nil
	} else if err := eidDB.Ping(); err != nil {
		log.Printf("EID DB ping failed (e-ID features disabled): %v", err)
		eidDB.Close()
		eidDB = nil
	} else {
		log.Println("Connected to EID DB (gerege_eid)")
		defer eidDB.Close()
	}

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

	// Initialize Gerege Core API service (optional)
	var geregeCoreService *services.GeregeCoreService
	if cfg.Auth.GeregeCoreURL != "" && cfg.Auth.GeregeCoreToken != "" {
		geregeCoreService = services.NewGeregeCoreService(cfg.Auth.GeregeCoreURL, cfg.Auth.GeregeCoreToken)
		log.Println("Gerege Core API enabled")
	}

	userService := services.NewUserService(db, genIDService, geregeCoreService)
	auditService := services.NewAuditService(db)
	apiLogService := services.NewAPILogService(db)

	// Initialize email service (optional)
	emailService := services.NewEmailService(cfg.SMTP)
	if emailService != nil {
		log.Println("SMTP email service enabled")
	}

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

	// Initialize MFA services
	var totpService *services.TOTPService
	if cfg.MFA.EncryptionKey != "" {
		totpService = services.NewTOTPService(db, cfg.MFA.EncryptionKey)
		log.Println("TOTP MFA service enabled")
	}

	var passkeyService *services.PasskeyService
	if cfg.MFA.WebAuthnRPID != "" {
		var err error
		passkeyService, err = services.NewPasskeyService(db, cfg.MFA.WebAuthnRPID, cfg.MFA.WebAuthnOrigin, cfg.MFA.WebAuthnRPName)
		if err != nil {
			log.Printf("Passkey service not configured: %v", err)
		} else {
			log.Println("Passkey/WebAuthn MFA service enabled")
		}
	}

	pushAuthService := services.NewPushAuthService(db, rdb)
	wsHub := services.NewWSHub()
	qrLoginService := services.NewQRLoginService(db, rdb, wsHub, cfg.Public.URL)
	recoveryService := services.NewRecoveryService(db)
	mfaSettingsService := services.NewMFASettingsService(db)
	mfaAuditService := services.NewMFAAuditService(db)

	// Initialize Gerege Sign services (optional)
	var gesignService *services.GesignService
	if signDB != nil {
		gesignService = services.NewGesignService(signDB, db, rdb, wsHub)
		log.Println("Gerege Sign service enabled")
	}

	// Initialize e-ID service (optional)
	var eidService *services.EIDService
	if eidDB != nil {
		eidService = services.NewEIDService(eidDB, db)
		log.Println("Gerege e-ID service enabled")
	}

	// Initialize OAuth2 provider service
	clientService := services.NewClientService(db, rdb)
	grantService := services.NewGrantService(db)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(oauthService, appleOAuthService, facebookOAuthService, twitterOAuthService, jwtService, userService, auditService, emailService, rdb, cfg)
	healthHandler := handlers.NewHealthHandler(db, rdb)
	oauthProviderHandler := handlers.NewOAuthProviderHandler(clientService, jwtService, userService, auditService, grantService, rdb, cfg)
	apiLogHandler := handlers.NewAPILogHandler(apiLogService)
	mfaHandler := handlers.NewMFAHandler(totpService, passkeyService, pushAuthService, qrLoginService, recoveryService, mfaSettingsService, mfaAuditService, jwtService, userService, wsHub, rdb, cfg.CORS.AllowedOrigins)

	// Initialize Sign handler (optional)
	var signHandler *handlers.SignHandler
	if gesignService != nil {
		signHandler = handlers.NewSignHandler(gesignService, pushAuthService, jwtService, userService, wsHub)
	}

	// Initialize e-ID handler (optional)
	var eidHandler *handlers.EIDHandler
	if eidService != nil {
		eidHandler = handlers.NewEIDHandler(eidService, jwtService, userService)
	}

	// Setup Gin router
	if os.Getenv("GIN_MODE") == "" {
		gin.SetMode(gin.ReleaseMode)
	}
	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(middleware.Logger())
	router.Use(middleware.APILogger(apiLogService))
	router.Use(middleware.CORS(cfg.CORS.AllowedOrigins))
	router.Use(middleware.SecurityHeaders())
	router.Use(middleware.Metrics())

	// Health and metrics routes
	router.GET("/health", healthHandler.Health)
	router.GET("/ready", healthHandler.Ready)
	router.GET("/metrics", gin.WrapH(promhttp.Handler()))
	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	// Middleware shorthands
	jwtAuth := middleware.JWTAuth(jwtService)
	fullJWT := middleware.RequireFullJWT(jwtService)

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
		auth.POST("/logout", jwtAuth, fullJWT, authHandler.Logout)
			auth.GET("/me", jwtAuth, fullJWT, authHandler.Me)
			auth.POST("/verify", jwtAuth, fullJWT, authHandler.VerifyIdentity)
			auth.POST("/confirm-link", authHandler.ConfirmIdentityLink)
			auth.GET("/dan", authHandler.DanLogin)
			auth.GET("/dan/authorized", authHandler.DanAuthorized)
			auth.GET("/dan/callback", jwtAuth, fullJWT, authHandler.DanCallback)

			// Email OTP login
			auth.POST("/email/send-otp", authHandler.SendEmailOTP)
			auth.POST("/email/verify-otp", authHandler.VerifyEmailOTP)

			// Phone verification
			auth.POST("/phone/send-otp", jwtAuth, fullJWT, authHandler.SendPhoneOTP)
			auth.POST("/phone/verify-otp", jwtAuth, fullJWT, authHandler.VerifyPhoneOTP)

			// Login activity
			auth.GET("/login-activity", jwtAuth, fullJWT, authHandler.LoginActivity)

			// API logs
			auth.GET("/api-logs", jwtAuth, fullJWT, apiLogHandler.GetAPILogs)

			// User grants endpoints
			auth.GET("/grants", jwtAuth, fullJWT, oauthProviderHandler.ListMyGrants)
			auth.DELETE("/grants/:id", jwtAuth, fullJWT, oauthProviderHandler.RevokeGrant)

			// MFA routes
			mfa := auth.Group("/mfa")
			{
				// TOTP — setup/disable require full JWT, validate accepts temp token
				mfa.POST("/totp/setup", jwtAuth, fullJWT, mfaHandler.SetupTOTP)
				mfa.POST("/totp/verify-setup", jwtAuth, fullJWT, mfaHandler.VerifyTOTPSetup)
				mfa.POST("/totp/validate", jwtAuth, mfaHandler.ValidateTOTP)
				mfa.DELETE("/totp", jwtAuth, fullJWT, mfaHandler.DisableTOTP)

				// Passkey — register/list/delete require full JWT, auth accepts temp token
				mfa.POST("/passkey/register/begin", jwtAuth, fullJWT, mfaHandler.PasskeyRegisterBegin)
				mfa.POST("/passkey/register/finish", jwtAuth, fullJWT, mfaHandler.PasskeyRegisterFinish)
				mfa.POST("/passkey/auth/begin", jwtAuth, mfaHandler.PasskeyAuthBegin)
				mfa.POST("/passkey/auth/finish", jwtAuth, mfaHandler.PasskeyAuthFinish)
				mfa.GET("/passkey/list", jwtAuth, fullJWT, mfaHandler.ListPasskeys)
				mfa.DELETE("/passkey/:id", jwtAuth, fullJWT, mfaHandler.DeletePasskey)

				// Push — register-device requires full JWT, challenge/status accept temp token
				mfa.POST("/push/register-device", jwtAuth, fullJWT, mfaHandler.RegisterDevice)
				mfa.POST("/push/challenge", jwtAuth, mfaHandler.SendPushChallenge)
				mfa.POST("/push/respond", mfaHandler.RespondPushChallenge)
				mfa.GET("/push/status/:id", jwtAuth, mfaHandler.GetPushChallengeStatus)

				// Recovery — view/regenerate require full JWT, validate accepts temp token
				mfa.GET("/recovery/codes", jwtAuth, fullJWT, mfaHandler.GetRecoveryCodes)
				mfa.POST("/recovery/regenerate", jwtAuth, fullJWT, mfaHandler.RegenerateCodes)
				mfa.POST("/recovery/validate", jwtAuth, mfaHandler.ValidateRecovery)

				// Settings — require full JWT
				mfa.GET("/settings", jwtAuth, fullJWT, mfaHandler.GetMFASettings)
				mfa.PUT("/settings", jwtAuth, fullJWT, mfaHandler.UpdateMFASettings)

				// Devices — require full JWT
				mfa.GET("/devices", jwtAuth, fullJWT, mfaHandler.ListDevices)
				mfa.DELETE("/devices/:id", jwtAuth, fullJWT, mfaHandler.RemoveDevice)
			}

			// Passwordless Passkey Login (public, no JWT)
			auth.POST("/passkey/login/begin", mfaHandler.PasskeyLoginBegin)
			auth.POST("/passkey/login/finish", mfaHandler.PasskeyLoginFinish)

			// QR Login (public + authenticated)
			qr := auth.Group("/qr")
			{
				qr.GET("/generate", mfaHandler.GenerateQR)
				qr.POST("/approve", jwtAuth, fullJWT, mfaHandler.ApproveQR)
				qr.GET("/status/:id", mfaHandler.GetQRStatus)
				qr.POST("/scan", mfaHandler.QRMarkScanned)
			}
		}

		// WebSocket routes (outside /api for cleaner URLs)
		router.GET("/ws/auth/qr/:id", mfaHandler.QRWebSocket)

		// OAuth2 provider routes
		oauth := api.Group("/oauth")
		{
			oauth.GET("/authorize", oauthProviderHandler.Authorize)
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

		// Gerege Sign routes (conditional on signDB availability)
		if signHandler != nil {
			sign := api.Group("/sign")
			{
				// Public endpoint — no auth required
				sign.POST("/verify", signHandler.VerifyDocument)

				// Authenticated endpoints
				sign.POST("/request", jwtAuth, fullJWT, signHandler.CreateSignRequest)
				sign.GET("/status/:id", jwtAuth, fullJWT, signHandler.GetSignStatus)
				sign.POST("/approve", jwtAuth, fullJWT, signHandler.ApproveSign)
				sign.POST("/deny", jwtAuth, fullJWT, signHandler.DenySign)
				sign.POST("/complete", jwtAuth, fullJWT, signHandler.CompleteSign)
				sign.GET("/certificates", jwtAuth, fullJWT, signHandler.GetCertificates)
				sign.GET("/history", jwtAuth, fullJWT, signHandler.GetSignHistory)
			}

			// Sign WebSocket (outside /api for cleaner URLs)
			router.GET("/ws/sign/:id", signHandler.SignWebSocket)
			log.Println("Gerege Sign routes registered")
		}

		// Gerege e-ID routes (conditional on eidDB availability)
		if eidHandler != nil {
			eid := api.Group("/eid")
			{
				// Public endpoint — no auth required
				eid.POST("/cards/verify", eidHandler.VerifyCard)

				// Authenticated endpoints
				eid.POST("/verify", jwtAuth, fullJWT, eidHandler.VerifyEID)
				eid.GET("/status", jwtAuth, fullJWT, eidHandler.GetEIDStatus)
				eid.POST("/cards", jwtAuth, fullJWT, eidHandler.RegisterCard)
				eid.GET("/cards/user", jwtAuth, fullJWT, eidHandler.GetUserCards)
				eid.GET("/cards/:number", jwtAuth, fullJWT, eidHandler.GetCard)
				eid.POST("/cards/revoke", jwtAuth, fullJWT, eidHandler.RevokeCard)
				eid.GET("/cards/:number/history", jwtAuth, fullJWT, eidHandler.GetCardHistory)
			}
			log.Println("Gerege e-ID routes registered")
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
