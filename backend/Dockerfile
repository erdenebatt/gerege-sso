# ==============================================================================
# Stage 1: Development (hot-reload with air)
# Usage: docker build --target dev -t gerege-backend-dev .
# ==============================================================================
FROM golang:1.21-alpine AS dev

WORKDIR /app

RUN apk add --no-cache git

# Install air for hot-reload
RUN go install github.com/air-verse/air@v1.52.3

COPY go.mod ./
RUN go mod download

COPY . .
RUN go mod tidy

EXPOSE 8080

# air watches for file changes and rebuilds
CMD ["air", "-c", ".air.toml"]

# ==============================================================================
# Stage 2: Builder (compile static binary)
# ==============================================================================
FROM golang:1.21-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git

COPY go.mod ./
COPY . .
RUN go mod tidy

# Build a fully static binary with optimizations
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s" \
    -a -installsuffix cgo \
    -o main .

# ==============================================================================
# Stage 3: Production (minimal image)
# ==============================================================================
FROM alpine:3.19 AS production

WORKDIR /app

# Only the bare essentials: TLS certs and timezone data
RUN apk --no-cache add ca-certificates tzdata && \
    addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy only the compiled binary
COPY --from=builder /app/main .

# Run as non-root
USER appuser

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:8080/health || exit 1

CMD ["./main"]
