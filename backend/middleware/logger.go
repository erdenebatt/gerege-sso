package middleware

import (
	"bytes"
	"io"
	"log"
	"strings"
	"time"

	"gerege-sso/services"

	"github.com/gin-gonic/gin"
)

// responseBodyWriter wraps gin.ResponseWriter to capture the response body
type responseBodyWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (w *responseBodyWriter) Write(b []byte) (int, error) {
	w.body.Write(b)
	return w.ResponseWriter.Write(b)
}

// Logger middleware logs request details to stdout
func Logger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		query := c.Request.URL.RawQuery

		c.Next()

		latency := time.Since(start)
		status := c.Writer.Status()
		clientIP := c.ClientIP()
		method := c.Request.Method

		if query != "" {
			path = path + "?" + query
		}

		log.Printf("[%s] %d | %v | %s | %s",
			method, status, latency, clientIP, path)
	}
}

// skipPaths are paths that should not be logged to the database
var skipPaths = []string{"/health", "/ready", "/metrics", "/swagger"}

// APILogger middleware captures full request/response and sends to APILogService
func APILogger(apiLogService *services.APILogService) gin.HandlerFunc {
	return func(c *gin.Context) {
		path := c.Request.URL.Path

		// Skip noisy endpoints
		for _, sp := range skipPaths {
			if strings.HasPrefix(path, sp) {
				c.Next()
				return
			}
		}

		start := time.Now()

		// Read request body and restore it
		var requestBody string
		if c.Request.Body != nil {
			bodyBytes, _ := io.ReadAll(c.Request.Body)
			requestBody = string(bodyBytes)
			c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
		}

		// Truncate large request bodies
		if len(requestBody) > 10240 {
			requestBody = requestBody[:10240] + "...[truncated]"
		}

		// Wrap response writer to capture body
		blw := &responseBodyWriter{
			ResponseWriter: c.Writer,
			body:           &bytes.Buffer{},
		}
		c.Writer = blw

		c.Next()

		// Capture response
		latency := time.Since(start)
		responseBody := blw.body.String()
		if len(responseBody) > 10240 {
			responseBody = responseBody[:10240] + "...[truncated]"
		}

		// Build header maps (redact sensitive headers)
		reqHeaders := make(map[string][]string)
		for key, values := range c.Request.Header {
			if key == "Authorization" || key == "Cookie" {
				reqHeaders[key] = []string{"[REDACTED]"}
			} else {
				reqHeaders[key] = values
			}
		}

		resHeaders := make(map[string][]string)
		for key, values := range blw.Header() {
			resHeaders[key] = values
		}

		apiLogService.AddLog(&services.APILogInput{
			Method:          c.Request.Method,
			Path:            path,
			Query:           c.Request.URL.RawQuery,
			StatusCode:      c.Writer.Status(),
			LatencyMs:       int(latency.Milliseconds()),
			ClientIP:        c.ClientIP(),
			UserAgent:       c.Request.UserAgent(),
			RequestHeaders:  reqHeaders,
			RequestBody:     requestBody,
			ResponseHeaders: resHeaders,
			ResponseBody:    responseBody,
		})
	}
}
