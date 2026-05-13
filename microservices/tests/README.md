# Digital Library — integration & load tests

Black-box tests against the **API gateway** (default `http://127.0.0.1:4000`). Requires gateway + backing services (auth, book, borrow, user, MySQL, Redis, gRPC ports) running.

## Tools

| Tool | Use |
|------|-----|
| **Jest** + **axios** | Integration / functional / edge / validation / security |
| **k6** | Load / concurrency (`load/k6-smoke.js`) |

## Setup

```bash
cd microservices/tests
npm install
```

Optional `microservices/tests/.env`:

```env
INTEGRATION_GATEWAY_URL=http://127.0.0.1:4000
ACCESS_SECRET=ACCESS_SECRET_KEY
TEST_ADMIN_EMAIL=admin@example.com
TEST_ADMIN_PASSWORD=your-admin-password
```

Admin credentials enable **book admin CRUD** happy-path tests. Without them, those tests are skipped.

## Run

```bash
# From microservices/tests
npm test

# Rate-limit test (optional; hammers /auth/login)
set RUN_RATE_LIMIT_TEST=true
npm test

# k6 (install from https://k6.io/)
set INTEGRATION_GATEWAY_URL=http://127.0.0.1:4000
k6 run load/k6-smoke.js
```

From repo root (after adding script):

```bash
npm run test:integration
```

## Structure

```
tests/
  helpers/           env + HTTP client
  integration/       *.test.js (Jest)
  load/              k6-smoke.js
```

## Notes

- **Profile** happy path uses `GET /auth/:id` (auth DB), not `GET /users/:id` (user-service DB), so it matches registered users.
- **Borrow** tests need at least one book with `availableCopies > 0`.
- **RUN_RATE_LIMIT_TEST** defaults off so parallel Jest workers do not trip the global rate limiter.
