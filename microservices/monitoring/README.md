# Monitoring & observability

This stack uses **Prometheus** (metrics), **Grafana** (dashboards), **Pino JSON logs** (stdout), and **correlation IDs** (`X-Request-Id`) across services.

## Architecture

- **`microservices/observability/`** — shared ESM modules (logger, Prometheus registry + HTTP metrics, request logging, health handler, global error handler, process guards).
- Each Node service exposes:
  - **`GET /metrics`** — Prometheus text exposition.
  - **`GET /health`** — JSON status with dependency checks (DB, optional upstreams / email).
- **API gateway** forwards `X-Request-Id` to the auth service for trace continuity.
- **Structured logs** — one JSON line per HTTP access (`msg: http_access`) and per error (`msg: http_error`); ship to **Grafana Loki** or **ELK** with your log agent (Docker logging driver, Promtail, Filebeat, etc.).

## Run with Docker Compose

From `microservices/`:

```bash
docker compose up --build
```

- **Grafana**: http://localhost:3000 (default `admin` / `admin` — change in production).
- **Prometheus**: http://localhost:9090
- **Gateway metrics**: http://localhost:4000/metrics
- **Per-service metrics**: ports `5001`–`5004` `/metrics`

## Local development (without Docker)

Run each service from its folder; the repo layout resolves `../observability`:

```bash
cd microservices/auth-service && npm install && node index.js
```

Install dependencies in each service after adding `pino` and `prom-client`.

## Environment

| Variable | Purpose |
|----------|---------|
| `LOG_LEVEL` | `debug`, `info`, `warn`, `error` (default `info`) |
| `NODE_ENV` | `production` hides error stacks from JSON API responses |

## Grafana dashboards

Provisioning loads **HTTP / API overview** (`http-overview.json`): request rate, latency p95, 5xx rates by `service` label.

## Centralized logs (Loki / ELK)

Logs are written to **stdout** as JSON. Point **Promtail** (Loki) or **Filebeat** (Elasticsearch) at container logs or aggregate on your platform. No in-process log shipping is required for the app to run.

## Error tracking (Sentry / etc.)

Unhandled rejections are logged. For SaaS error tracking, add your vendor’s SDK in `observability/errorHandler.js` or wrap `createErrorHandler` (optional; not included by default).
