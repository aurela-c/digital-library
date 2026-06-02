# Digital Library — Unit Tests (Jest)

Per-service **unit-test** suites that exercise the business / service
layer of every microservice in **complete isolation** — no Docker, no
MySQL, no Redis, no RabbitMQ, no gRPC sockets, no SMTP.

These tests **complement** (they do NOT duplicate) the existing
black-box test suites:

| Layer | Where | Runner |
|---|---|---|
| **Unit (this folder)** | `microservices/<service>/__tests__/unit/` | `npm test` (root) |
| Integration / happy path | `microservices/tests/integration/*.test.js` | `npm run test:integration` |
| Security (SQLi, XSS, CSRF, brute-force, authz) | `microservices/tests/integration/security.test.js` | `npm run test:integration:security` |
| Load / stress | `microservices/tests/load/` | `npm run test:load` |

## Layout

```
microservices/
  __tests__/
    _helpers/http.js         # shared { makeReq, makeRes, invokeGrpc, makeFakeRow, muteConsole }
    README.md                # this file
  auth-service/
    __tests__/unit/          # authService.{register,login,refresh,profile,
                             # password,verify,reset}.test.js  +  roles.test.js
    jest.config.js           # ESM-native, coverage scoped to services/
  book-service/
    __tests__/unit/bookController.test.js
    jest.config.js
  borrow-service/
    __tests__/unit/borrowController.test.js
    jest.config.js
  user-service/
    __tests__/unit/userController.test.js
    __tests__/unit/supportController.test.js
    jest.config.js
jest.config.js               # ROOT — multi-project orchestrator (unit only)
```

## Run

```bash
# Run EVERY unit suite with unified coverage (≥80% threshold enforced)
npm test                       # alias: npm run test:unit

# Run a single service in isolation
npm run test:unit:auth
npm run test:unit:books
npm run test:unit:borrow
npm run test:unit:users

# Or from inside the service folder
cd microservices/auth-service && npm test
```

Coverage reports are emitted to:

- `coverage/unit/lcov-report/index.html` — unified HTML report (root run)
- `microservices/<service>/coverage/lcov-report/index.html` — per-service report

## What is covered

Coverage is **scoped** via `collectCoverageFrom` to the actual business
/ service layer of each service — controllers, services, and shared
constants. Infrastructure files (transport, routes, models, config,
gRPC servers, RabbitMQ wiring, healthchecks, index.js) are
**intentionally excluded** because they're already exercised end-to-end
by the integration suite.

| Service | Files under coverage threshold |
|---|---|
| auth-service | `services/authService.js` (≥80%) |
| book-service | `controllers/bookController.js` (≥80%) |
| borrow-service | `controllers/borrowController.js` (≥80%) |
| user-service | `controllers/userController.js`, `controllers/supportController.js` (≥80%) |

`shared/constants/roles.js` is fully covered by `roles.test.js` in the
auth-service project (the unit tests run there for convenience; Jest
cannot instrument files outside a project's `rootDir`, so it is not
formally counted in auth-service's coverage table but is verified
behaviourally).

## How mocking works

Every spec uses `jest.unstable_mockModule(...)` (Jest's native ESM mock
API) to replace:

- **Sequelize models** → `{ findAndCountAll, findByPk, create, ... }` jest.fn()s that
  return fake row objects created via the shared `makeFakeRow` helper
  (which itself stubs `.save() / .update() / .destroy() / .get() / .reload()`).
- **gRPC clients** (e.g. `bookClient.GetBook`) → callback-shaped
  `jest.fn((req, cb) => cb(null, payload))`, since the controllers wrap
  them with `util.promisify`.
- **bcrypt** → deterministic stubs (`hash(raw) → "hashed:" + raw`) so
  tests are sub-millisecond.
- **nodemailer / emailService** → `jest.fn()` that resolves; failure
  branches use `.mockRejectedValueOnce(...)` to assert the swallow.
- **auditLog** → spy that captures every emitted action.

`jsonwebtoken` is **NOT** mocked — tests use real sign/verify against
test-only secrets set in `__tests__/jest.setup.js` so the round-trip
behaviour (`iat`, `exp`, `jti`, `typ` claims) is exercised end-to-end.

## What is NOT here

- Express middleware end-to-end behaviour, real DB transactions, real
  HTTP/gRPC sockets → covered by `microservices/tests/integration/`.
- SQLi / XSS / CSRF / brute-force / auth-z bypass attempts → covered
  by `security.test.js`.
- Load / stress / throughput → `microservices/tests/load/`.

The two layers together provide:

- **Fast feedback** (~1–10s) on every business-rule change via these unit tests.
- **Confidence that the wiring works** via the integration suite.
- **Confidence the deployed system is safe** via the security suite.
