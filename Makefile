# Local dev helpers + server deploy
#
# Local workflow:
#   make dev          → db + backend (Docker, detached) + Vite (foreground)
#   make rebuild      → rebuild backend image after Python / Dockerfile changes
#   make logs         → follow backend logs
#   make test         → run backend tests (sqlite, no docker)
#
# Server:
#   make deploy       → rebuild and start all 3 containers (frontend nginx, backend, db)

.PHONY: dev up rebuild down stop clean logs frontend frontend-install deploy test help

.DEFAULT_GOAL := dev

## dev: start db + backend (Docker, detached) and run Vite in the foreground
dev: up _ensure-frontend-deps frontend

## up: bring db + backend up in detached mode (no rebuild)
up:
	docker compose up -d --wait db backend

## rebuild: rebuild backend image and bring db + backend up
rebuild:
	docker compose up -d --build db backend

## stop: stop db + backend (keeps containers and volumes)
stop:
	docker compose stop db backend

## down: tear down all containers (keeps volumes like pgdata)
down:
	docker compose down

## clean: tear down and wipe volumes (destroys the dev database)
clean:
	docker compose down -v

## logs: follow backend logs
logs:
	docker compose logs -f backend

## frontend: run the Vite dev server only (assumes db + backend are already up)
frontend:
	cd frontend && npm run dev

## frontend-install: install frontend deps (first-time setup)
frontend-install:
	cd frontend && npm install

_ensure-frontend-deps:
	@test -d frontend/node_modules || (echo "→ Installing frontend deps…" && cd frontend && npm install)

## deploy: rebuild and start all containers (server only, uses sudo)
deploy:
	sudo docker compose up -d --build

## test: run backend pytest suite
test:
	cd backend && .venv/bin/python -m pytest

## help: list available targets
help:
	@grep -E '^## ' Makefile | sed 's/## /  /'
