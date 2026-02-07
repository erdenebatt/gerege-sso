.PHONY: swagger build run test

swagger:
	$(shell go env GOPATH)/bin/swag init

build: swagger
	go build -o bin/gerege-sso .

run: build
	./bin/gerege-sso

test:
	go test ./...
