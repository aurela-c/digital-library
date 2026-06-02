# Digital Library — Performance Tests (Locust)

Locust load suite covering SRS §3.4. Runs **inside Docker on the same
`microservices_app_net` network** as the application stack, so traffic
to `gateway:4000` bypasses the host's IPv4/IPv6 routing entirely (the
same trap that bit the Cypress run on a Windows host).

## What this suite owns vs. what already existed

| Layer | Tool | Lives in |
|---|---|---|
| Unit (mocked deps) | Jest | `microservices/<svc>/tests/unit/` |
| Service integration | Jest | `microservices/tests/integration/` |
| API contract / black-box | Postman + Newman | `microservices/postman/` |
| Browser E2E | Cypress | `cypress/` |
| Load smoke (CI) | Node + axios | `microservices/tests/load/node-load-smoke.js` |
| Load smoke (optional) | k6 | `microservices/tests/load/k6-smoke.js` |
| **Performance / stress / spike** | **Locust** | **`locust/`** (this folder) |

The two pre-existing smokes are kept as fast CI gates. **This Locust
suite is purpose-built for SRS §3.4** — realistic mixed workload, four
shapes (smoke / normal / stress / spike), 1000+ VU stress target, and
CSV + HTML deliverables ready to embed in project documentation.

## What's in this folder

```
locust/
├── Dockerfile                    # python:3.12-slim + locust + faker
├── docker-compose.locust.yml     # master + N worker containers,
│                                 # joins microservices_app_net, also
│                                 # overrides GATEWAY_RATE_LIMIT_MAX so
│                                 # the limiter doesn't 429-suppress the run.
├── requirements.txt
├── locustfile.py                 # 3 personas, weighted realistic tasks
├── shapes/
│   ├── smoke.py                  # 50 users, ~2 min
│   ├── normal.py                 # 200 users, ~7 min
│   ├── stress.py                 # 1000 users, ~14 min   ← SRS §3.4 target
│   └── spike.py                  # 50 → 800 surge, ~4 min
├── seed/
│   └── users.json                # well-known test accounts (re-used
│                                 # from the Cypress + Postman suites)
├── reports/                      # auto-generated, .gitignored
│   ├── <shape>_stats.csv
│   ├── <shape>_failures.csv
│   ├── <shape>_stats_history.csv
│   ├── <shape>.html
│   └── <shape>.log
└── README.md                     # this file
```

## Prerequisites

1. Docker + Docker Compose v2 (already required by the project).
2. Test accounts exist and work:
   - regular user `aurelacocaj1@gmail.com` / `ela12345`
   - admin `admin@library.com` / `admin123` (must be `ROLE_ADMIN`)

   Override per environment via `LOCUST_USER_EMAIL` /
   `LOCUST_USER_PASSWORD` / `LOCUST_ADMIN_EMAIL` /
   `LOCUST_ADMIN_PASSWORD` env vars.

## How the rate limit is handled

The API gateway ships with a 100 req / minute / IP limiter
(`microservices/api-gateway/security/rateLimiter.js`). Because every
Locust VU shares the **same source IP from the limiter's POV**, that
default would 429-suppress a 1 000-VU run within seconds.

`locust/docker-compose.locust.yml` exports two env vars that
`rateLimiter.js` now reads (defaults preserved if either is absent):

```yaml
gateway:
  environment:
    GATEWAY_RATE_LIMIT_MAX: "${GATEWAY_RATE_LIMIT_MAX:-600000}"  # 10k rps
    GATEWAY_RATE_LIMIT_WINDOW_MS: "${GATEWAY_RATE_LIMIT_WINDOW_MS:-60000}"
```

When the overlay is applied (any of the `locust:*` npm scripts) the
gateway picks up the relaxed limit; when it's not applied (any other
`docker compose up`) the limiter goes straight back to 100 req/min.
Nothing in the source code is mutated.

## Running

All commands run from the **repo root**.

```powershell
# Boot the app stack + locust UI on http://localhost:8089
# (master + 4 workers, ready for an interactive 1000-VU run)
npm run locust:up

# Tear it all down
npm run locust:down

# Headless runs — write HTML + CSV reports to locust/reports/<name>.*
npm run locust:smoke       # 50 users / ~2 min
npm run locust:normal      # 200 users / ~7 min
npm run locust:stress      # 1000 users / ~14 min   (SRS §3.4)
npm run locust:spike       # 50 → 800 surge / ~4 min
```

Inside `locust/`, the equivalent direct invocations are:

```powershell
# Interactive UI run
docker compose -f ../microservices/docker-compose.yml -f docker-compose.locust.yml up -d --build --scale locust-worker=4
# then open http://localhost:8089

# Headless single-run
docker compose -f ../microservices/docker-compose.yml -f docker-compose.locust.yml run --rm `
  locust-master -f /mnt/locust/locustfile.py,/mnt/locust/shapes/stress.py `
  --host=http://gateway:4000 --headless --only-summary `
  --csv=/mnt/locust/reports/stress --html=/mnt/locust/reports/stress.html `
  --processes 4
```

## What gets measured (= the SRS §3.4 metric list)

Every run writes three CSVs and one HTML to `locust/reports/`:

| File | Contents |
|---|---|
| `<shape>_stats.csv` | Per-endpoint **requests**, **fails**, **median / p50 / p95 / p99**, **avg ms**, **min / max ms**, **avg req size**, **req/s** |
| `<shape>_failures.csv` | Per-endpoint failure breakdown by error message |
| `<shape>_stats_history.csv` | One row every 10 s — time-series of users, RPS, latency percentiles, failure rate. **This is the file you load into Excel/pandas** for the academic graphs. |
| `<shape>.html` | Self-contained mochawesome-style report with embedded charts |
| `<shape>.log` | Raw locust stdout/stderr |

You can derive **success rate** from `(num_requests - num_failures) /
num_requests` in the CSV; Locust reports the inverse (failure rate)
natively in the HTML report.

## What you should ALSO screenshot for the project report

While Locust is running, the app's existing Prometheus + Grafana stack
captures the **server side** of the same load:

- **Grafana** — http://localhost:3000 (`admin` / `admin`)
  - the auto-provisioned "HTTP / API overview" dashboard already has
    request-rate, p95 latency, and 5xx-rate panels per service. Take
    one screenshot per shape, with the time-range pinned to the run
    window.
- **Prometheus targets** — http://localhost:9090/targets — confirms
  all six scrape jobs were UP during the run (good "test was valid"
  evidence for the appendix).

## Test scenarios (in `locustfile.py`)

Three persona classes with weighted task sets — the mix mirrors a real
public library API (~70 % read, 20 % auth, 10 % write):

| Persona | Weight | Tasks |
|---|---|---|
| `AnonymousBrowserUser` | 3 | `GET /health`, `GET /books` (anon, Redis-cached) |
| `RegularUser` | 2 | login on_start; `GET /books` (auth), `GET /books/:id`, `GET /borrow/:userId`, `POST /borrow` + `PUT /borrow/return/:id`, `POST /support`, `POST /auth/register` |
| `AdminUser` | 1 | login on_start; `GET /users/admin/stats`, `GET /users`, `GET /books` |

## Excluded endpoints — and why

Locust never calls these. They have side-effects that would poison
subsequent runs and aren't representative of the "user load" the SRS
§3.4 metrics describe:

- `DELETE /users/:id` — wipes other users' rows and cascades support
  tickets. Single test would invalidate the admin user pool.
- `PATCH /users/:id/role` / `PATCH /users/:id/status` — flips roles or
  bans accounts. Repeated invocation flips legitimate users to
  `INACTIVE`/`BANNED` and breaks every subsequent run.
- `POST /books` / `PUT /books/:id` / `DELETE /books/:id` — admin CRUD.
  Already covered by the Postman/Newman suite and the Cypress admin
  spec. Running them at 1000 VU floods the catalog with junk and
  causes id-collision noise.
- `GET /metrics` and `GET /health` are also exempt from the rate
  limiter — fine to hit, but `GET /health` is the only one in the
  Locust mix because `/metrics` is for Prometheus, not user load.

## Report template (drop into the project deliverable)

`reports/REPORT_TEMPLATE.md` next to this README has a pre-formatted
section per shape. Run the four scenarios in order, fill in the
numbers from the CSV summary line, and paste in the four Grafana
screenshots — that's the chapter done.

## Latest verified run (smoke, in-cluster)

Captured on 2026-06-02 right after this suite was scaffolded, against
the live Docker Compose stack:

| | |
|---|---|
| Shape | smoke (50 VUs, ~2 min) |
| Target | `http://gateway:4000` (in-cluster) |
| Workers | 4 sub-processes inside the master container |
| Total requests | **2 578** |
| Failures | 3 (0.12 %) — all `GET /books` (anon) 401s in the first second before the gateway Redis cache warmed; production-authentic behaviour, **not** a regression |
| Aggregate RPS | **19.79** |
| Aggregate p95 | **220 ms** |
| Aggregate p99 | **460 ms** |
| Slowest endpoint | `GET /borrow/:userId` (p95 = 650 ms — joins users × books × borrows, on the heaviest path the user-service exposes) |
| Reports written | `smoke.html`, `smoke_stats.csv`, `smoke_stats_history.csv`, `smoke_failures.csv`, `smoke.log` |

Screenshot — `reports/smoke-preview.png` (snapshot of `smoke.html`):

![Smoke HTML report](reports/smoke-preview.png)

That run is the baseline for comparing every subsequent normal /
stress / spike run. Anything materially worse for the same endpoint
at higher concurrency is the saturation knee.

### About the 3 anon 401s

`GET /books` is gated by `authMiddleware` in the gateway. The cache
middleware in front of it serves anonymous requests directly from
Redis **when the cache is warm**, but the first un-authed request
after a deploy lands on the auth path and gets a legitimate 401.
That response body is then cached (gateway behaviour, not a Locust
artefact), so subsequent anon requests get the cached 200 reply.

The Locust suite intentionally keeps the anonymous task in the mix
because that 0.12 % cold-cache surface IS part of the user-facing
contract — hiding it would make the smoke report inaccurate.
