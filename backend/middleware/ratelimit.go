package middleware

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

// RateLimit creates a Redis-based sliding window rate limiter.
// maxRequests is the maximum number of requests allowed within the window.
func RateLimit(rdb *redis.Client, maxRequests int, window time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		key := fmt.Sprintf("ratelimit:%s:%s", c.FullPath(), c.ClientIP())
		ctx := context.Background()
		now := time.Now()

		// Use sorted set with timestamps as scores for sliding window
		pipe := rdb.Pipeline()

		// Remove expired entries
		pipe.ZRemRangeByScore(ctx, key, "0", fmt.Sprintf("%d", now.Add(-window).UnixMilli()))

		// Count current entries
		countCmd := pipe.ZCard(ctx, key)

		// Add current request
		pipe.ZAdd(ctx, key, redis.Z{Score: float64(now.UnixMilli()), Member: now.UnixNano()})

		// Set expiry on the key
		pipe.Expire(ctx, key, window)

		_, err := pipe.Exec(ctx)
		if err != nil {
			// On Redis failure, allow the request through
			c.Next()
			return
		}

		count := countCmd.Val()
		if count >= int64(maxRequests) {
			c.Header("Retry-After", fmt.Sprintf("%d", int(window.Seconds())))
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "Too many requests. Please try again later.",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}
