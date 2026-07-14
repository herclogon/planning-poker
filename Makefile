# Planning poker — local development helpers.

# Port the HTTP/WebSocket server listens on (override: `make run HTTP_PORT=3000`).
HTTP_PORT ?= 8080

.PHONY: help install run start dev

help: ## Show available commands.
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies from package-lock.json.
	npm ci

run: install ## Install deps and start the server locally.
	HTTP_PORT=$(HTTP_PORT) npm start

start: ## Start the server without reinstalling dependencies.
	HTTP_PORT=$(HTTP_PORT) npm start

dev: start ## Alias for `start`.
