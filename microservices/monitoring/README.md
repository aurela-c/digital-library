# Monitoring & observability

This stack uses **Prometheus** (metrics), **Grafana** (dashboards), **Pino JSON logs** (stdout), and **correlation IDs** (`X-Request-Id`) across services.

## Architecture

- **`microservices/observability/`** — shared ESM modules (logger, Prometheus registry + HTTP metrics, request logging, health handler, global error handler, process guards).
- Each Node service exposes:
  - **`GET /metrics`** — Prometheus text exposition.
  - **`GET /health`** — JSON status with dependency checks (DB, optional upstreams / email).
- **API gateway** forwards `X-Request-Id` to the auth service for trace continuity.
- **Structured logs** — one JSON line per HTTP access (`msg: http_access`) and per error (`msg: http_error`); ship to **Grafana Loki** or **ELK** with your log agent (Docker logging driver, Promtail, Filebeat, etc.).

## Full stack — one command

The `docker-compose.yml` at the parent directory bundles MySQL, Redis,
RabbitMQ, all five Node services, the React frontend, Prometheus, and
Grafana. From a fresh checkout:

```bash
cd microservices
cp .env.example .env          # then edit EMAIL_APP_PASSWORD etc.
docker compose up --build
```

Wait until `docker compose ps` shows every service `running` / `healthy`,
then open:

- **Frontend** — http://localhost
- **Gateway** — http://localhost:4000
- **Prometheus** — http://localhost:9090/targets (all 6 jobs must read **UP**)
- **Grafana** — http://localhost:3000 (default `admin` / `admin`; the
  “HTTP / API overview” dashboard is the auto-provisioned home)
- **RabbitMQ management UI** — http://localhost:15672 (default `guest` / `guest`)
- **Per-service `/metrics`** — http://localhost:4000/metrics and
  `http://localhost:5001..5004/metrics`

### Scrape topology

Every Node service runs inside the `app_net` bridge network, so
Prometheus reaches them by their compose service names
(`gateway:4000`, `auth-service:5001`, …). Service labels (`service=<name>`)
are applied inside the Node process by `observability/metricsBundle.js`,
so the scrape config carries no per-target labels (those would clash and
get renamed `exported_service`).

### Run only the monitoring tier

If you're iterating on a single service on the host (for hot-reload) and
want the rest of the stack containerised, the prometheus container
already maps `host.docker.internal:host-gateway`, so you can flip a
target back to `host.docker.internal:<port>` in `prometheus.yml`,
reload (`curl -X POST http://localhost:9090/-/reload`), and the host
process becomes scrapable while everything else still runs in compose.

## Environment

| Variable | Purpose |
|----------|---------|
| `LOG_LEVEL` | `debug`, `info`, `warn`, `error` (default `info`) |
| `NODE_ENV` | `production` hides error stacks from JSON API responses |
| `AUTH_SERVICE_GRPC` | (api-gateway) Target for auth gRPC, e.g. `auth-service:5010` or `localhost:5010` |
| `AUTH_GRPC_PORT` | (auth-service) gRPC listen port (default `5010`; HTTP REST stays on `5001`) |

## Grafana dashboards

Provisioning loads **HTTP / API overview** (`http-overview.json`): request rate, latency p95, 5xx rates by `service` label.

## Centralized logs (Loki / ELK)

Logs are written to **stdout** as JSON. Point **Promtail** (Loki) or **Filebeat** (Elasticsearch) at container logs or aggregate on your platform. No in-process log shipping is required for the app to run.

## Error tracking (Sentry / etc.)

Unhandled rejections are logged. For SaaS error tracking, add your vendor’s SDK in `observability/errorHandler.js` or wrap `createErrorHandler` (optional; not included by default).
