SHELL := /bin/sh
COMPOSE_FILE := $(CURDIR)/docker-compose.local.yml
COMPOSE := docker compose -f $(COMPOSE_FILE)

.PHONY: help up down logs ps restart rebuild health clean web-build web-preview api-dev web-dev n8n-logs n8n-restart n8n-shell n8n-backup n8n-restore crawl4ai-logs

help: ## Show available targets
	@awk -F':.*##' '/^[a-zA-Z0-9_-]+:.*##/ {printf "\033[36m%-14s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

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
	@echo "Checking service health..."
	@echo -n "API (3000): "; curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health 2>/dev/null || echo "DOWN"
	@echo -n "WEB (5173): "; curl -s -o /dev/null -w "%{http_code}" http://localhost:5173 2>/dev/null || echo "DOWN"
	@echo -n "crawl4ai (4000): "; curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/health 2>/dev/null || echo "DOWN"
	@echo -n "n8n (5678): "; curl -s -o /dev/null -w "%{http_code}" http://localhost:5678/healthz 2>/dev/null || echo "DOWN"
	@echo -n "PostgreSQL: "; $(COMPOSE) exec -T postgres pg_isready -U n8n 2>/dev/null | grep -q "accepting connections" && echo "UP" || echo "DOWN"

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

n8n-logs: ## Show n8n container logs
	$(COMPOSE) logs -f n8n

n8n-restart: ## Restart only n8n service
	$(COMPOSE) restart n8n

n8n-shell: ## Open shell in n8n container
	$(COMPOSE) exec n8n sh

n8n-backup: ## Backup n8n database to ./backups/
	@mkdir -p backups
	@echo "Backing up n8n database..."
	$(COMPOSE) exec -T postgres pg_dump -U n8n n8n > backups/n8n-backup-$(shell date +%Y%m%d-%H%M%S).sql
	@echo "Backup saved to backups/n8n-backup-$(shell date +%Y%m%d-%H%M%S).sql"

n8n-restore: ## Restore n8n database from backup file (Usage: make n8n-restore BACKUP=filename.sql)
	@if [ -z "$(BACKUP)" ]; then echo "Usage: make n8n-restore BACKUP=filename.sql"; exit 1; fi
	@if [ ! -f "backups/$(BACKUP)" ]; then echo "Backup file backups/$(BACKUP) not found"; exit 1; fi
	@echo "Restoring n8n database from backups/$(BACKUP)..."
	$(COMPOSE) exec -T postgres psql -U n8n -d n8n < backups/$(BACKUP)
	@echo "Database restored successfully"

crawl4ai-logs: ## Show crawl4ai container logs
	$(COMPOSE) logs -f crawl4ai

install: ## Install all dependencies
	cd web && npm install
	cd api && npm install
	cd crawl4ai && npm install

dev: ## Start all services with Docker (recommended)
	$(COMPOSE) up --build

dev-detached: ## Start all services with Docker in background
	$(COMPOSE) up --build -d

dev-all: ## Start all services in development mode (without Docker)
	@echo "Starting PostgreSQL with Docker..."
	docker compose up postgres -d
	@echo "Starting services in development mode..."
	@echo "Open separate terminals and run:"
	@echo "  make crawl4ai-dev"
	@echo "  make api-dev"
	@echo "  make web-dev"

crawl4ai-dev: ## Run crawl4ai service in watch mode (without Docker)
	cd crawl4ai && npm install && npm run dev

test-crawl: ## Test crawl functionality
	@echo "Testing crawl endpoint..."
	curl -X POST http://localhost:3000/crawl \
		-H "Content-Type: application/json" \
		-d '{"url": "https://example.com", "prompt": "Extract the main heading and description"}'

db-shell: ## Open PostgreSQL shell
	$(COMPOSE) exec postgres psql -U n8n -d n8n


