# syntax=docker/dockerfile:1.6
#
# Frontend — Vite + React. Two-stage build:
#
#   1. `builder`  — node:20-alpine, runs `vite build` into /app/dist.
#   2. `runtime`  — nginx:alpine, serves the static bundle AND proxies the
#                   backend API prefixes to the api-gateway over the docker
#                   network. This avoids CORS entirely (the browser only
#                   talks to the nginx origin) and means the SPA needs no
#                   knowledge of the gateway host at runtime.

# ---------------------------------------------------------------------------
# 1. Build
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Cache the dependency layer separately from source changes.
COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY . .

# `VITE_GATEWAY_TARGET=/` resolves (via `frontend/src/config/apiBase.js` →
# `normalizeGatewayBase`) to the empty string, so axios uses RELATIVE URLs:
# `/auth/login`, `/users/123`, etc. Same-origin requests, no CORS, and the
# nginx layer in the runtime stage forwards each prefix to `gateway:4000`.
# Override at build time with `--build-arg VITE_GATEWAY_TARGET=https://...`
# if you want the bundle to call an external gateway directly.
ARG VITE_GATEWAY_TARGET=/
ENV VITE_GATEWAY_TARGET=${VITE_GATEWAY_TARGET}

RUN npm run build

# ---------------------------------------------------------------------------
# 2. Runtime
# ---------------------------------------------------------------------------
FROM nginx:alpine AS runtime

# Three environment variables drive the site config (rendered at container
# start by the nginx:alpine image's built-in envsubst step). Defaults are
# wired for local Docker Compose; Railway (or any other PaaS) overrides them.
#
#   PORT          public listen port             (Compose: 80, Railway: injected)
#   GATEWAY_HOST  gateway DNS name               (Compose: gateway,
#                                                 Railway: gateway.railway.internal)
#   GATEWAY_PORT  gateway HTTP port              (always 4000)
#
# NGINX_ENVSUBST_FILTER restricts substitution to ONLY those three names so
# nginx's own variables ($host, $remote_addr, $scheme, ...) survive intact.
ENV PORT=80 \
    GATEWAY_HOST=gateway \
    GATEWAY_PORT=4000 \
    NGINX_ENVSUBST_TEMPLATE_SUFFIX=.template \
    NGINX_ENVSUBST_FILTER=^(PORT|GATEWAY_HOST|GATEWAY_PORT)$

# Drop the templated site config where the image's built-in
# /docker-entrypoint.d/20-envsubst-on-templates.sh expects to find it.
# It renders the file into /etc/nginx/conf.d/default.conf before nginx
# starts, so we don't need a custom ENTRYPOINT.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Drop the built bundle into nginx's web root.
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

# Use shell form so $PORT is resolved from the container ENV at runtime —
# matters on Railway, where PORT is dynamic.
HEALTHCHECK --interval=20s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:${PORT}/ || exit 1
