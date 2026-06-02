# Digital Library — End-to-End tests (Cypress)

Browser-driven E2E suite covering the user-facing flows defined in
**SRS §3.3**. The suite drives the **real React UI** through the
**live Docker Compose stack** (frontend → API gateway → microservices →
MySQL) — there are no mocks.

## What this suite owns vs. what already exists

| Layer | Tool | Lives in |
|---|---|---|
| Unit (mocked deps) | Jest | `microservices/<svc>/tests/unit/` |
| Service integration | Jest | `microservices/tests/integration/` |
| API contract / black-box | Postman + Newman | `microservices/postman/` |
| Load | k6 / Node | `microservices/tests/load/` |
| **Browser E2E** | **Cypress** | **`cypress/`** (this folder) |

Cypress was added **only** for the browser-level scenarios none of the
other tools cover. We did not duplicate API assertions that already
live in Newman or Jest.

## SRS §3.3 coverage map

| # | Scenario | Spec |
|---|----------|------|
| 1 | User registration | `e2e/01-auth-register.cy.js` |
| 2 | User login | `e2e/02-auth-login.cy.js` |
| 3 | Browse / search books | `e2e/03-browse-and-search.cy.js` |
| 4 | Borrow a book | `e2e/04-borrow-and-return.cy.js` |
| 5 | Return a book | `e2e/04-borrow-and-return.cy.js` |
| 6 | Contact / support submission | `e2e/05-contact-support.cy.js` |
| 7 | Admin login | `e2e/02-auth-login.cy.js` |
| 8 | Admin CRUD (books) | `e2e/06-admin-crud-books.cy.js` |
| 9 | Reporting / dashboard | `e2e/07-admin-reporting.cy.js` |

## Prerequisites

1. The Docker stack must be up and healthy:

   ```powershell
   cd microservices
   docker compose up -d
   ```

   Required endpoints:
   - Frontend: <http://localhost>
   - API gateway: <http://localhost:4000>

2. Test accounts must exist (defaults below — override via env vars if your
   DB has different ones):

   | Role | Default email | Default password |
   |---|---|---|
   | User | `aurelacocaj1@gmail.com` | `ela12345` |
   | Admin | `admin@library.com` | `admin123` |

   If you don't have these accounts yet, register them via the UI (or
   the gateway `/auth/register`) and promote admin with:

   ```sql
   UPDATE users SET role='ROLE_ADMIN' WHERE email='admin@library.com';
   ```

3. Install Cypress (one-time):

   ```powershell
   cd cypress
   npm install
   ```

## Running

From the **repo root**:

```powershell
# Headless run (terminal output only)
npm run test:e2e

# Headless run + auto-generated HTML report at
# cypress/reports/html/digital-library-e2e.html
npm run test:e2e:ci

# Interactive Cypress runner (opens the GUI)
npm run test:e2e:open
```

Or from inside `cypress/`:

```powershell
npm test          # headless
npm run test:ci   # headless + mochawesome HTML report
npm run open      # interactive
```

## Reports & artifacts

Generated on every run under `cypress/reports/`:

- `html/digital-library-e2e.html` — full mochawesome report (charts,
  per-spec timing, embedded failure screenshots). Open it in any
  browser.
- `screenshots/<spec>/<test>.png` — auto-captured on any failure.
- `videos/` — disabled by default to keep CI fast (`video: false` in
  `cypress.config.js`). Flip it on if you need recordings.

All of these are in `.gitignore` — only the source specs are committed.

## Configuration

Defaults live in `cypress.config.js > env`. Override per environment
with standard Cypress env vars (no file edits required):

```powershell
$env:CYPRESS_BASE_URL = "http://localhost:5173"
$env:CYPRESS_apiUrl   = "http://localhost:4000"
$env:CYPRESS_userEmail = "alice@example.com"
$env:CYPRESS_userPassword = "TestPass123!"
$env:CYPRESS_adminEmail = "root@example.com"
$env:CYPRESS_adminPassword = "RootPass123!"
npm run test:e2e:ci
```

## Custom commands

Defined in `support/commands.js`:

| Command | Purpose |
|---|---|
| `cy.loginAs('user' \| 'admin' \| {email, password})` | Programmatic login via the gateway + primes `localStorage` (avoids re-driving the login UI in every spec; login itself is covered by spec #2). Also mirrors the `userId` key BookCard reads, so the UI behaves the same way it does for a "fully" logged-in session. |
| `cy.ensureBorrowableBook()` | Guarantees at least one book with `availableCopies > 0` exists. Creates one via the admin API only if needed — never touches MySQL directly. |
| `cy.resetBorrowsFor('user' \| 'admin')` | Returns every active borrow on the account so the borrow spec can re-run idempotently without 409 "already borrowed". |
| `cy.clearSession()` | `clearLocalStorage()` + `clearCookies()`. |

## Latest verified run

```
       Spec                                              Tests  Passing  Failing  Pending  Skipped
  ┌────────────────────────────────────────────────────────────────────────────────────────────────┐
  │ √  01-auth-register.cy.js                   00:09        2        2        -        -        - │
  │ √  02-auth-login.cy.js                      00:05        3        3        -        -        - │
  │ √  03-browse-and-search.cy.js               00:02        3        3        -        -        - │
  │ √  04-borrow-and-return.cy.js               00:02        2        2        -        -        - │
  │ √  05-contact-support.cy.js                 00:03        1        1        -        -        - │
  │ √  06-admin-crud-books.cy.js                00:10        1        1        -        -        - │
  │ √  07-admin-reporting.cy.js                 00:01        1        1        -        -        - │
  └────────────────────────────────────────────────────────────────────────────────────────────────┘
    √  All specs passed!                        00:35       13       13        -        -        -
```

The full mochawesome HTML report is at
`cypress/reports/html/digital-library-e2e.html`. A snapshot
(`digital-library-e2e.png`) sits next to it for easy embedding in
project documentation.

## Known environment gotchas

- **Windows port shadowing.** On a Windows host that *also* runs other
  web servers on `:80` or `:4000` (XAMPP Apache, a standalone nginx,
  IIS, …), `localhost` can resolve to IPv4 first and silently land on
  the *wrong* server — every spec will fail with `404`s. Cypress 13
  also refuses an IPv6 baseUrl (`[::1]`), so the cleanest fix is to
  stop those services for the duration of the run:

  ```powershell
  # find what is holding the ports
  netstat -ano | findstr /R ":80 :4000"
  # then Stop-Process -Id <pid> -Force for each non-Docker entry
  ```

## Design notes

- **No DB seeding from Cypress.** The only state-mutating helper is
  `ensureBorrowableBook`, which calls the same gateway endpoints the
  admin UI uses. The DB schema is untouched.
- **Reuses existing accounts.** We don't create new admin/user
  accounts at suite startup — the registration spec creates a unique
  ephemeral account per run (`e2e_cy_<timestamp>@example.com`).
- **Independent and repeatable.** Each spec calls `cy.clearSession()`
  in `beforeEach` so order is irrelevant.
- **Conditional admin steps.** Admin-only specs (#6, #7 and #8 above)
  will fail fast with a clear message if `admin@library.com / admin123`
  isn't a `ROLE_ADMIN` in your DB — that's by design, identical to how
  the Postman/Newman suite behaves.
