# Digital Library — Postman + Newman Integration Tests

End-to-end **integration tests** that drive the running Digital Library
system through its **API Gateway** (default `http://localhost:4000`)
and verify the full chain works:

```
Postman/Newman  →  nginx (optional)  →  api-gateway  →  auth/user/book/borrow services  →  MySQL / Redis / RabbitMQ
```

These tests **complement** the existing test layers — they do NOT
duplicate them:

| Layer | Where | Runs against |
|---|---|---|
| Unit tests | `microservices/<service>/__tests__/unit/` | mocks (no Docker) |
| **Postman / Newman (this folder)** | `microservices/postman/` | **live Docker Compose stack via the gateway** |
| Jest integration | `microservices/tests/integration/` | live stack (programmatic) |
| Security / load | `microservices/tests/integration/security.test.js`, `microservices/tests/load/` | live stack |

## What is covered

| Folder | Requests | What it proves |
|---|---|---|
| **0. Gateway Health** | `GET /health` | gateway up, Redis connected, auth HTTP + gRPC reachable |
| **1. Authentication Flow** | register, duplicate-register, missing/wrong/correct login, refresh (missing + happy path) | RBAC, JWT shape (`sub`, `role`, `typ=access`), token rotation, no password leak |
| **2. User Flow** | `GET /auth/:id` (unauth + happy), `PATCH /auth/me` (happy + invalid) | bearer auth, profile read/write through the gateway |
| **3. Book Flow** | `GET /books` (unauth + list), `GET /books/:id`, `POST /books` (RBAC negative + admin), `PUT /books/:id` (admin), `DELETE /books/:id` (admin) | gateway → book-service over gRPC, RBAC enforcement |
| **4. Borrow Flow** | `POST /borrow` (unauth + happy), `GET /books/:id` (availability delta), `GET /borrow/:userId`, `PUT /borrow/return/:id`, `GET /books/:id` (restored) | cross-service flow (borrow ↔ book), inventory math, ownership |
| **5. Support Flow** | `POST /support/tickets`, `GET /support/tickets/me`, `POST /support/tickets/:id/reply`, `PATCH /support/tickets/:id/status` (admin close) | full helpdesk lifecycle through the gateway + user-service |
| **6. Admin Reporting** | `GET /users` (admin list), `GET /users/admin/stats` | admin-only authorization + dashboard counts surface |
| **7. Negative / Error cases** | `GET /books/99999999` (404), `PUT /borrow/return/99999999` (4xx), `GET /books` with malformed JWT (401) | hardened error contracts, no 5xx leak on unhappy paths |

For each request the test scripts assert:

- HTTP status code (200 / 201 / 400 / 401 / 403 / 404 / etc.)
- Response is valid JSON (collection-level test)
- Required body fields exist and have the right type
- JWTs have three dot-separated parts and the payload contains the
  expected claims (`sub`, `role`, `typ=access`)
- Inventory math is correct on borrow / return (availability ± 1)
- Tokens captured from `login` / `refresh` are reused in subsequent
  requests via `pm.collectionVariables.set/get` (no manual copy/paste)

## Prerequisites

1. **Docker Compose stack running** with the gateway listening on
   `http://localhost:4000`:

   ```bash
   cd microservices
   docker compose up -d --build
   ```

   `docker-compose.yml` already defaults `AUTH_SKIP_EMAIL_VERIFY=true`
   on the `auth-service` container so a freshly registered user can log
   in immediately (no real Gmail App Password / browser click needed).
   If you ever change that, the `POST /auth/login` test is self-aware:
   on `403 EMAIL_NOT_VERIFIED` it reports a clear SKIPPED message
   instead of failing cryptically.

2. **Newman**. Two install options:

   - **Local (recommended for CI / reproducibility):**
     ```bash
     cd microservices/postman
     npm install
     ```
   - **Global:**
     ```bash
     npm install -g newman
     ```

3. **(Optional) Seed a book** so the Borrow Flow has inventory to
   exercise. Without one, the borrow folder is gracefully skipped and
   you'll still get a green run — but the borrow assertions will not
   actually fire. A one-liner that's safe to repeat:

   ```bash
   docker exec -i microservices-mysql-1 \
     mysql -uroot -ppassword digital_library <<'SQL'
   INSERT INTO books (title, author, image, description, category_id, total_copies, available_copies, created_at)
   VALUES ('Postman Seed Book', 'QA', 'https://via.placeholder.com/120x180?text=Seed', 'Seeded for Postman/Newman runs', 1, 5, 5, NOW())
   ON DUPLICATE KEY UPDATE available_copies = VALUES(available_copies);
   SQL
   ```

4. **(Optional) Promote a user to admin** so admin book CRUD fires:

   ```bash
   # Register an admin candidate
   curl -X POST http://localhost:4000/auth/register \
     -H "Content-Type: application/json" \
     -d '{"name":"Postman Admin","email":"postman_admin@example.com","password":"AdminPass123!"}'

   # Promote them to ROLE_ADMIN
   docker exec microservices-mysql-1 mysql -uroot -ppassword digital_library \
     -e "UPDATE users SET role='ROLE_ADMIN' WHERE email='postman_admin@example.com';"
   ```

## Run

```bash
# From microservices/postman/
npm test
# …which is equivalent to:
newman run digital-library.postman_collection.json -e local.postman_environment.json --color on
```

For CI (CLI summary + JUnit XML at `./reports/newman.junit.xml`):

```bash
npm run test:ci
```

> Output is **terminal-only by default** — no HTML dashboards. The `test:ci`
> script is the only one that writes a file (a plain JUnit XML, useful if
> you ever wire this into Jenkins / GitHub Actions).

## Admin-only flows (optional)

The book-create / book-update / book-delete tests require an
`ROLE_ADMIN` account. Set the credentials in the environment file
(or via the `--env-var` flag) and the suite will exercise them
automatically:

```bash
newman run digital-library.postman_collection.json \
  -e local.postman_environment.json \
  --env-var ADMIN_EMAIL=postman_admin@example.com \
  --env-var ADMIN_PASSWORD=AdminPass123!
```

### Expected verified output (with admin + book inventory present)

```
┌─────────────────────────┬───────────────────┬──────────────────┐
│                         │          executed │           failed │
├─────────────────────────┼───────────────────┼──────────────────┤
│              iterations │                 1 │                0 │
│                requests │                35 │                0 │
│            test-scripts │                70 │                0 │
│      prerequest-scripts │                53 │                0 │
│              assertions │               112 │                0 │
├─────────────────────────┴───────────────────┴──────────────────┤
│ total run duration: ~5s                                        │
└────────────────────────────────────────────────────────────────┘
```

### Expected verified output (no admin creds — bare-bones)

```
┌─────────────────────────┬───────────────────┬──────────────────┐
│                         │          executed │           failed │
├─────────────────────────┼───────────────────┼──────────────────┤
│              iterations │                 1 │                0 │
│                requests │                ~30│                0 │
│              assertions │                ~95│                0 │
└─────────────────────────┴───────────────────┴──────────────────┘
```

**Without admin credentials** the admin folder is auto-skipped and the
suite still proves that:

- Anonymous callers get a clean `401`.
- A regular user trying to `POST /books` is correctly rejected with `403`
  (RBAC negative test — always runs).
- Support tickets can be created, listed, and replied to by a normal
  user (only the admin-close step is skipped).

## Direct execution (no npm wrapper)

```bash
cd microservices/postman
newman run digital-library.postman_collection.json -e local.postman_environment.json
```

## How state flows between requests

```
register  →  login        →  refresh    →  user / book / borrow flow
  email   →   accessToken      accessToken    Bearer {{accessToken}}
              refreshToken     refreshToken
              userId           (no change)
              userRole

borrow    →  borrowId
  bookId  →  status=BORROWED
```

Every captured value lives in a **collection variable**
(`accessToken`, `refreshToken`, `userId`, `userRole`,
`adminAccessToken`, `createdBookId`, `seedBookId`, `seedBookAvail`,
`borrowId`, `supportTicketId`, `skipAdminFlow`). Newman re-reads them
between requests so the entire flow is self-contained — no manual
copy/paste.

## Strict invariants

- **Every** request goes through `{{BASE_URL}}` (the gateway). No
  request targets a microservice port directly.
- **No** business logic is modified.
- **No** unit / E2E / load tests are introduced here — those live in
  `microservices/<service>/__tests__/unit/` and
  `microservices/tests/`.
