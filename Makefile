SHELL := /bin/sh
COMPOSE_FILE := $(CURDIR)/docker-compose.local.yml
COMPOSE := docker compose -f $(COMPOSE_FILE)

.PHONY: help up down logs ps restart rebuild health clean web-build web-preview api-dev web-dev

help: ## Show available targets
	@awk -F':.*##' '/^[a-zA-Z_-]+:.*##/ {printf "\033[36m%-14s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

up: ## Start local stack in detached mode
	$(COMPOSE) up --build -d

down: ## Stop local stack
	$(COMPOSE) down

logs: ## Tail logs for all services
	$(COMPOSE) logs -f

ps: ## Show service status
	$(COMPOSE) ps

restart: ## Restart local stack
	$(COMPOSE) down
	$(COMPOSE) up --build -d

rebuild: ## Force rebuild and recreate containers
	$(COMPOSE) up --build -d --force-recreate

health: ## Check service HTTP endpoints
	@echo "API:"; curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/health | cat
	@echo "WEB:"; curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173 | cat
	@echo "n8n:"; curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5678 | cat

clean: ## Stop and remove volumes
	$(COMPOSE) down -v

web-build: ## Build the web app (production)
	cd web && npm ci && npm run build

web-preview: ## Preview the built web app locally (port 5173)
	cd web && npm run preview -- --port 5173 | cat

api-dev: ## Run API in watch mode (without Docker)
	cd api && npm install && npm run dev

web-dev: ## Run web dev server (without Docker)
	cd web && npm install && npm run dev


