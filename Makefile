.PHONY: corpus install harness up-eo up-collabora up-both down digests logs help

help:
	@echo "Office Collab Lab (Collabora + Euro-Office)"
	@echo "  make install       Install harness npm deps"
	@echo "  make corpus        Generate smoke corpus"
	@echo "  make harness       Run harness on host (:3100)"
	@echo "  make up-collabora  Start Collabora CODE"
	@echo "  make up-eo         Start Euro-Office"
	@echo "  make up-both       Start Collabora + Euro-Office"
	@echo "  make down          Stop all compose services"
	@echo "  make digests C=collabora|eurooffice"

install:
	cd harness && npm install

corpus:
	cd harness && node scripts/generate-corpus.js

harness: install
	cd harness && npm start

up-eo:
	docker compose --profile eurooffice up -d eurooffice
	./scripts/record-artifacts.sh eurooffice || true

up-collabora:
	docker compose --profile collabora up -d collabora
	./scripts/record-artifacts.sh collabora || true

up-both:
	docker compose --profile all up -d collabora eurooffice
	./scripts/record-artifacts.sh collabora || true
	./scripts/record-artifacts.sh eurooffice || true

down:
	docker compose --profile all down

digests:
	./scripts/record-artifacts.sh $(C)

logs:
	docker compose --profile all logs -f --tail=100
