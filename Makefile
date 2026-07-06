IMAGE_NAME ?= rockthecards
IMAGE_TAG ?= latest
IMAGE_REF := $(IMAGE_NAME):$(IMAGE_TAG)
CONTAINER_NAME ?= rockthecards
APP_LABEL ?= fr.slimelab.service=rockthecards
IMAGE_LABEL ?= fr.slimelab.image=$(IMAGE_NAME)
ENV_FILE ?= .env.production
PORT ?= 3000

.PHONY: build clean clean-containers clean-images clean-dangling rebuild run restart stop logs shell ps inspect lint typecheck next-build prisma-generate prisma-push prisma-push-production prisma-deploy start start-production

build:
	@echo "Build propre de l'image $(IMAGE_REF)..."
	docker build --pull --no-cache --label "$(APP_LABEL)" --label "$(IMAGE_LABEL)" -t "$(IMAGE_REF)" .

clean-containers:
	@echo "Suppression des conteneurs $(CONTAINER_NAME), labels $(APP_LABEL), anciennes images $(IMAGE_NAME)..."
	-docker rm -f "$(CONTAINER_NAME)" >/dev/null 2>&1
	@containers=$$(docker ps -aq --filter "label=$(APP_LABEL)"); \
	if [ -n "$$containers" ]; then \
		docker rm -f $$containers; \
	fi
	@image_ids=$$(docker images --format '{{.Repository}} {{.ID}}' | awk '$$1 == "$(IMAGE_NAME)" {print $$2}' | sort -u); \
	for image_id in $$image_ids; do \
		containers=$$(docker ps -aq --filter "ancestor=$$image_id"); \
		if [ -n "$$containers" ]; then \
			docker rm -f $$containers; \
		fi; \
	done

clean-images:
	@echo "Suppression de toutes les images du repo $(IMAGE_NAME)..."
	@images=$$(docker images --format '{{.Repository}} {{.ID}}' | awk '$$1 == "$(IMAGE_NAME)" {print $$2}' | sort -u); \
	if [ -n "$$images" ]; then \
		docker rmi -f $$images; \
	else \
		echo "Aucune image $(IMAGE_NAME) a supprimer."; \
	fi

clean-dangling:
	@echo "Suppression des images Docker dangling du service $(IMAGE_NAME)..."
	@images=$$(docker images -f "dangling=true" -f "label=$(IMAGE_LABEL)" -q); \
	if [ -n "$$images" ]; then \
		docker rmi -f $$images; \
	else \
		echo "Aucune image dangling $(IMAGE_NAME) a supprimer."; \
	fi

clean: clean-containers clean-images clean-dangling

rebuild: clean build run

run:
	@echo "Demarrage du conteneur $(CONTAINER_NAME) depuis $(IMAGE_REF)..."
	docker run -d --restart unless-stopped --network host -v "$(CURDIR)/$(ENV_FILE):/usr/src/app/.env.production:ro" -e PORT="$(PORT)" -e HOSTNAME="0.0.0.0" --name "$(CONTAINER_NAME)" --label "$(APP_LABEL)" "$(IMAGE_REF)"

restart: clean-containers run

stop:
	-docker stop "$(CONTAINER_NAME)"

logs:
	docker logs -f "$(CONTAINER_NAME)"

shell:
	docker exec -it "$(CONTAINER_NAME)" sh

ps:
	docker ps -a --no-trunc --filter "name=$(CONTAINER_NAME)"
	docker ps -a --no-trunc --filter "label=$(APP_LABEL)"

inspect:
	docker inspect -f 'container={{.Id}} image={{.Image}} labels={{json .Config.Labels}}' "$(CONTAINER_NAME)"
	docker image inspect -f 'image={{.Id}} labels={{json .Config.Labels}}' "$(IMAGE_REF)"

lint:
	bun run lint

typecheck:
	bun x tsc --noEmit

next-build:
	bun run build

prisma-generate:
	bun --env-file=.env x --bun prisma generate

prisma-push:
	bun --env-file=.env x --bun prisma db push

prisma-push-production:
	docker run --rm --network host -v "$(CURDIR)/$(ENV_FILE):/usr/src/app/.env.production:ro" "$(IMAGE_REF)" bun --env-file=.env.production x --bun prisma db push

prisma-deploy: prisma-push-production

start:
	bun --env-file=.env run dev

start-production:
	bun --env-file=$(ENV_FILE) run start
