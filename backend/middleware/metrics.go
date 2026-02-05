package middleware

import (
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	httpRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "Total number of HTTP requests",
		},
		[]string{"method", "path", "status"},
	)

	httpRequestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Help:    "HTTP request duration in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "path"},
	)

	loginAttemptsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "login_attempts_total",
			Help: "Total number of login attempts",
		},
		[]string{"status"}, // success, failure
	)

	activeUsers = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "active_users",
			Help: "Number of active users (logged in within last 24h)",
		},
	)

	identityVerificationTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "identity_verification_total",
			Help: "Total number of identity verification attempts",
		},
		[]string{"status"},
	)
)

// Metrics middleware records Prometheus metrics
func Metrics() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		// Process request
		c.Next()

		// Record metrics
		duration := time.Since(start).Seconds()
		status := strconv.Itoa(c.Writer.Status())
		path := c.FullPath()
		if path == "" {
			path = "unknown"
		}

		httpRequestsTotal.WithLabelValues(c.Request.Method, path, status).Inc()
		httpRequestDuration.WithLabelValues(c.Request.Method, path).Observe(duration)
	}
}

// RecordLoginAttempt records a login attempt metric
func RecordLoginAttempt(success bool) {
	status := "failure"
	if success {
		status = "success"
	}
	loginAttemptsTotal.WithLabelValues(status).Inc()
}

// SetActiveUsers sets the active users gauge
func SetActiveUsers(count float64) {
	activeUsers.Set(count)
}

// RecordIdentityVerification records an identity verification attempt
func RecordIdentityVerification(success bool) {
	status := "failure"
	if success {
		status = "success"
	}
	identityVerificationTotal.WithLabelValues(status).Inc()
}
