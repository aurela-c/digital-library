# syntax=docker/dockerfile:1.6
#
# auth-service — REST on 5001, gRPC on 5010.
#
# Build context is `microservices/` (see docker-compose.yml) so we can pull in
# the shared `observability/`, `shared/` and `proto/` folders this service
# imports from. The layered COPY + npm install order is deliberate: shared
# folders change rarely, so their layers stay cached across rebuilds of the
# service code.

FROM node:20-alpine AS runtime

# wget is part of busybox in alpine — used by HEALTHCHECK below.
WORKDIR /workspace

# --- shared layers (cached unless they change) ----------------------------
COPY observability ./observability
RUN cd observability && npm install --omit=dev --no-audit --no-fund

COPY shared ./shared
RUN cd shared && npm install --omit=dev --no-audit --no-fund

COPY proto ./proto

# --- service-specific dependencies & source -------------------------------
# Copy package files first so `npm install` is cached when only the source
# of the service changes.
COPY auth-service/package*.json ./auth-service/
RUN cd auth-service && npm install --omit=dev --no-audit --no-fund

COPY auth-service ./auth-service

WORKDIR /workspace/auth-service

# Production defaults. Anything provided by docker-compose `environment:`
# overrides these at runtime (dotenv.config() respects existing env vars).
ENV NODE_ENV=production \
    PORT=5001 \
    AUTH_GRPC_PORT=5010 \
    LOG_FORMAT=json

EXPOSE 5001 5010

# Liveness probe. We hit `/` (the placeholder route this service has had
# forever) rather than `/health` so the container is marked healthy as
# soon as Express is accepting connections; SMTP/DB readiness is gated
# by docker-compose `depends_on: condition: service_healthy` on the infra
# containers instead.
HEALTHCHECK --interval=20s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:5001/ || exit 1

# Drop privileges. node:alpine images ship a non-root `node` user.
USER node

CMD ["node", "index.js"]
