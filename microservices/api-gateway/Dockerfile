# syntax=docker/dockerfile:1.6
#
# api-gateway — HTTP on 4000. Only entry point for the frontend.
#
# Unlike the data-plane services this gateway does NOT depend on the
# `shared/` folder (no JWT validation here — verification is delegated to
# the auth microservice over gRPC), so the COPY shared step is omitted.

FROM node:20-alpine AS runtime

WORKDIR /workspace

COPY observability ./observability
RUN cd observability && npm install --omit=dev --no-audit --no-fund

COPY proto ./proto

COPY api-gateway/package*.json ./api-gateway/
RUN cd api-gateway && npm install --omit=dev --no-audit --no-fund

COPY api-gateway ./api-gateway

WORKDIR /workspace/api-gateway

ENV NODE_ENV=production \
    PORT=4000 \
    LOG_FORMAT=json

EXPOSE 4000

# Gateway exposes a real `/health` that checks Redis, the auth HTTP service
# and the auth gRPC stub. It's the right liveness probe for the entry
# point — if any of those are broken the gateway can't usefully serve
# traffic. `start_period` gives the downstream containers time to come up.
HEALTHCHECK --interval=20s --timeout=5s --start-period=60s --retries=5 \
  CMD wget -q --spider http://127.0.0.1:4000/health || exit 1

USER node

CMD ["node", "index.js"]
