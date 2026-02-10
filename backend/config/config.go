package config

import (
	"log"
	"os"
	"time"
)

type Config struct {
	Server   ServerConfig
	Postgres PostgresConfig
	Redis    RedisConfig
	JWT      JWTConfig
	Auth     AuthConfig
	Public   PublicConfig
	Admin    AdminConfig
}

type AdminConfig struct {
	APIKey string
}

type ServerConfig struct {
	Port string
}

type PostgresConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	DB       string
}

type RedisConfig struct {
	Host string
	Port string
}

type JWTConfig struct {
	Secret string
	Expiry time.Duration
}

type AuthConfig struct {
	// Google OAuth
	GoogleClientID     string
	GoogleClientSecret string
	GoogleRedirectURL  string

	// Apple OAuth
	AppleClientID    string
	AppleTeamID      string
	AppleKeyID       string
	ApplePrivateKey  string
	AppleRedirectURL string

	// Facebook OAuth
	FacebookClientID     string
	FacebookClientSecret string
	FacebookRedirectURL  string

	// Twitter/X OAuth
	TwitterClientID     string
	TwitterClientSecret string
	TwitterRedirectURL  string

	// DAN
	DanClientID    string
	DanRedirectURL string
	DanScope       string

	// Gerege Core API
	GeregeCoreURL   string
	GeregeCoreToken string
}

type PublicConfig struct {
	URL string
}

func Load() *Config {
	// Validate required secrets at startup
	jwtSecret := getEnv("JWT_SECRET", "")
	if jwtSecret == "" {
		log.Fatal("FATAL: JWT_SECRET environment variable is required")
	}
	if len(jwtSecret) < 32 {
		log.Fatal("FATAL: JWT_SECRET must be at least 32 characters long")
	}

	return &Config{
		Server: ServerConfig{
			Port: getEnv("BACKEND_PORT", "8080"),
		},
		Postgres: PostgresConfig{
			Host:     getEnv("POSTGRES_HOST", "localhost"),
			Port:     getEnv("POSTGRES_PORT", "5432"),
			User:     getEnv("POSTGRES_USER", "grgdev"),
			Password: getEnv("POSTGRES_PASSWORD", ""),
			DB:       getEnv("POSTGRES_DB", "gerege_sso"),
		},
		Redis: RedisConfig{
			Host: getEnv("REDIS_HOST", "localhost"),
			Port: getEnv("REDIS_PORT", "6379"),
		},
		JWT: JWTConfig{
			Secret: jwtSecret,
			Expiry: parseDuration(getEnv("JWT_EXPIRY", "24h")),
		},
		Auth: AuthConfig{
			// Google OAuth
			GoogleClientID:     getEnv("GOOGLE_CLIENT_ID", ""),
			GoogleClientSecret: getEnv("GOOGLE_CLIENT_SECRET", ""),
			GoogleRedirectURL:  getEnv("GOOGLE_REDIRECT_URL", ""),

			// Apple OAuth
			AppleClientID:    getEnv("APPLE_CLIENT_ID", ""),
			AppleTeamID:      getEnv("APPLE_TEAM_ID", ""),
			AppleKeyID:       getEnv("APPLE_KEY_ID", ""),
			ApplePrivateKey:  getEnv("APPLE_PRIVATE_KEY", ""),
			AppleRedirectURL: getEnv("APPLE_REDIRECT_URL", "https://sso.gerege.mn/api/auth/apple/callback"),

			// Facebook OAuth
			FacebookClientID:     getEnv("FACEBOOK_CLIENT_ID", ""),
			FacebookClientSecret: getEnv("FACEBOOK_CLIENT_SECRET", ""),
			FacebookRedirectURL:  getEnv("FACEBOOK_REDIRECT_URL", "https://sso.gerege.mn/api/auth/facebook/callback"),

			// Twitter/X OAuth
			TwitterClientID:     getEnv("TWITTER_CLIENT_ID", ""),
			TwitterClientSecret: getEnv("TWITTER_CLIENT_SECRET", ""),
			TwitterRedirectURL:  getEnv("TWITTER_REDIRECT_URL", "https://sso.gerege.mn/api/auth/twitter/callback"),

			// DAN
			DanClientID:    getEnv("DAN_CLIENT_ID", ""),
			DanRedirectURL: getEnv("DAN_REDIRECT_URL", ""),
			DanScope:       getEnv("DAN_SCOPE", ""),

			// Gerege Core API
			GeregeCoreURL:   getEnv("GEREGE_CORE_URL", ""),
			GeregeCoreToken: getEnv("GEREGE_CORE_TOKEN", ""),
		},
		Public: PublicConfig{
			URL: getEnv("PUBLIC_URL", "https://sso.gerege.mn"),
		},
		Admin: AdminConfig{
			APIKey: getEnv("ADMIN_API_KEY", ""),
		},
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func parseDuration(s string) time.Duration {
	d, err := time.ParseDuration(s)
	if err != nil {
		return 24 * time.Hour
	}
	return d
}
