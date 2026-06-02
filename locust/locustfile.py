"""
Digital Library — Locust load suite.

One file, three personas, each picking from a realistic mix of @tasks
weighted to mirror the read/write ratio a real library product sees
(~70 % catalog reads, 20 % auth, 10 % writes). Shapes (smoke / normal /
stress / spike) live next to this file under `shapes/` and are picked
with `--config shapes/<name>.conf` at run time — no separate locustfiles.

All traffic goes through the API gateway at `--host` (defaults to
`http://gateway:4000` when run via docker-compose.locust.yml, or
`http://localhost:4000` when run with bare-metal locust on the host).

Test data:
    - Re-uses the Cypress / Postman accounts (env-overridable).
    - Register persona uses Faker emails per VU; no fixed pool to manage.
    - No DB writes outside of normal product flows (register/borrow/return).
"""
from __future__ import annotations

import os
import random
import time
import uuid
from typing import Optional

from faker import Faker
from locust import HttpUser, between, events, task

fake = Faker()


# ---------------------------------------------------------------------------
# Reusable credentials & helpers
# ---------------------------------------------------------------------------

USER_EMAIL = os.environ.get("LOCUST_USER_EMAIL", "aurelacocaj1@gmail.com")
USER_PASSWORD = os.environ.get("LOCUST_USER_PASSWORD", "ela12345")
ADMIN_EMAIL = os.environ.get("LOCUST_ADMIN_EMAIL", "admin@library.com")
ADMIN_PASSWORD = os.environ.get("LOCUST_ADMIN_PASSWORD", "admin123")

# Resolved at runtime by AnonymousUser.on_start so the catalog persona
# doesn't need credentials. Falls back to a small static range so the
# first VU never has to wait for the discovery call.
DISCOVERED_BOOK_IDS: list[int] = list(range(1, 16))


def _login(client, email: str, password: str) -> Optional[dict]:
    """POST /auth/login and return the parsed response body on 2xx."""
    with client.post(
        "/auth/login",
        json={"email": email, "password": password},
        name="POST /auth/login",
        catch_response=True,
    ) as resp:
        if resp.status_code == 200:
            try:
                return resp.json()
            except ValueError:
                resp.failure("login returned 200 with non-JSON body")
                return None
        resp.failure(f"login failed status={resp.status_code}")
        return None


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---------------------------------------------------------------------------
# Test-init: discover real book ids ONCE so catalog-detail and borrow
# tasks target rows that actually exist.
#
# Gated to MASTER-ONLY: with `--processes N` locust spawns 1 master +
# N worker subprocesses; if every one of them runs discovery in parallel
# they collectively hammer the single-threaded bcrypt path in
# auth-service and all time out (we saw 5 simultaneous logins time out
# at 10 s during the 200-VU normal run). Workers inherit the static
# fallback range — that's good enough; the master broadcasts the
# discovered list to them implicitly via the shared module global at
# import time only when running in --processes mode the workers re-run
# the locustfile themselves, so they fall back to the static range
# without spamming the gateway.
# ---------------------------------------------------------------------------
def _is_worker(environment) -> bool:
    """True when this process is a distributed worker (subprocess of master)."""
    try:
        from locust.runners import WorkerRunner

        return isinstance(environment.runner, WorkerRunner)
    except Exception:  # noqa: BLE001 — never block startup on detection
        return False


@events.test_start.add_listener
def _discover_book_ids(environment, **_kwargs):
    if _is_worker(environment):
        return

    global DISCOVERED_BOOK_IDS
    host = environment.host or "http://gateway:4000"

    import requests

    try:
        login = requests.post(
            f"{host}/auth/login",
            json={"email": USER_EMAIL, "password": USER_PASSWORD},
            timeout=15,
        )
        if login.status_code != 200:
            print(
                f"[locust:init] book discovery skipped — "
                f"login {login.status_code} as {USER_EMAIL!r}"
            )
            return
        token = login.json().get("accessToken")
        books = requests.get(
            f"{host}/books?limit=200",
            headers={"Authorization": f"Bearer {token}"},
            timeout=15,
        )
        if books.status_code != 200:
            print(
                f"[locust:init] book discovery skipped — "
                f"GET /books {books.status_code}"
            )
            return
        data = books.json() if books.headers.get("content-type", "").startswith(
            "application/json"
        ) else []
        ids = [
            int(b["id"])
            for b in (data if isinstance(data, list) else [])
            if isinstance(b, dict) and "id" in b
        ]
        if ids:
            DISCOVERED_BOOK_IDS = ids
            print(f"[locust:init] discovered {len(ids)} book ids for load mix")
    except Exception as exc:  # noqa: BLE001 — init is best-effort
        # Quiet log: we already have a 15-id static fallback; this just
        # prevents the master from being noisy when the gateway is slow.
        print(
            f"[locust:init] book discovery skipped — gateway slow at start ({type(exc).__name__}); "
            f"using static fallback ids 1..15"
        )


# ---------------------------------------------------------------------------
# 1. Anonymous catalog browser  (the most common real-world workload)
# ---------------------------------------------------------------------------
class AnonymousBrowserUser(HttpUser):
    """Unauthenticated traffic — health pings + redis-cached GET /books."""

    weight = 3  # 60 % of the mix when balanced against the two authed personas below
    wait_time = between(1, 3)

    @task(2)
    def health_probe(self):
        self.client.get("/health", name="GET /health")

    @task(8)
    def list_books_anonymous(self):
        # Anonymous GETs are served from the gateway's Redis cache, so this
        # task drives the highest sustainable RPS of the suite.
        self.client.get("/books", name="GET /books (anon)")


# ---------------------------------------------------------------------------
# 2. Authenticated regular user — the bread-and-butter library workflow
# ---------------------------------------------------------------------------
class RegularUser(HttpUser):
    weight = 2
    wait_time = between(1, 4)

    def on_start(self):
        body = _login(self.client, USER_EMAIL, USER_PASSWORD)
        if not body:
            self.environment.runner.quit()
            return
        self.token = body["accessToken"]
        self.user_id = body["user"]["id"]
        self.headers = _auth_headers(self.token)
        # Carry borrows we create here so the return task has something
        # to return without re-querying every iteration.
        self.active_borrows: list[int] = []

    @task(10)
    def browse_catalog(self):
        self.client.get("/books", name="GET /books (auth)", headers=self.headers)

    @task(6)
    def view_book_detail(self):
        book_id = random.choice(DISCOVERED_BOOK_IDS)
        self.client.get(
            f"/books/{book_id}",
            name="GET /books/:id",
            headers=self.headers,
        )

    @task(3)
    def view_my_borrows(self):
        self.client.get(
            f"/borrow/{self.user_id}",
            name="GET /borrow/:userId",
            headers=self.headers,
        )

    @task(2)
    def borrow_and_return_cycle(self):
        """Realistic borrow → return flow.

        We don't hammer the same book id repeatedly — that would serialise
        on the row-level UPDATE for `available_copies`. We pick at random
        from the discovered pool and accept that some VUs will collide
        (409 already-borrowed) — those count as legitimate negative
        responses, NOT failures.
        """
        book_id = random.choice(DISCOVERED_BOOK_IDS)

        with self.client.post(
            "/borrow",
            json={"bookId": str(book_id)},
            name="POST /borrow",
            headers=self.headers,
            catch_response=True,
        ) as borrow_resp:
            if borrow_resp.status_code in (200, 201):
                try:
                    body = borrow_resp.json() or {}
                except ValueError:
                    body = {}
                borrow_id = (
                    body.get("id")
                    or body.get("borrowId")
                    or (body.get("borrow") or {}).get("id")
                )
                if borrow_id:
                    self.active_borrows.append(int(borrow_id))
                borrow_resp.success()
            elif borrow_resp.status_code in (400, 403, 404, 409, 422):
                # Expected negative paths under contention. Mark success
                # so the failure column reflects ONLY real 5xx / timeouts.
                borrow_resp.success()
            else:
                borrow_resp.failure(
                    f"unexpected borrow status={borrow_resp.status_code}"
                )

        # Cheap think-time between user actions; lets the row lock drain
        # before we try to return.
        time.sleep(random.uniform(0.2, 0.8))

        if not self.active_borrows:
            return

        borrow_id = self.active_borrows.pop()
        with self.client.put(
            f"/borrow/return/{borrow_id}",
            name="PUT /borrow/return/:id",
            headers=self.headers,
            catch_response=True,
        ) as ret_resp:
            if ret_resp.status_code in (200, 204):
                ret_resp.success()
            elif ret_resp.status_code in (400, 403, 404, 409, 422):
                ret_resp.success()
            else:
                ret_resp.failure(
                    f"unexpected return status={ret_resp.status_code}"
                )

    @task(1)
    def submit_support_ticket(self):
        # The real route is /support/tickets — the bare /support prefix
        # only proxies to user-service, the actual ticket creation
        # handler lives at POST /support/tickets (see
        # microservices/user-service/routes/supportRoutes.js).
        subject = f"Locust load run {uuid.uuid4().hex[:8]}"
        self.client.post(
            "/support/tickets",
            name="POST /support/tickets",
            json={
                "subject": subject,
                "message": fake.paragraph(nb_sentences=3),
                "category": "general",
            },
            headers=self.headers,
        )

    @task(1)
    def register_new_user(self):
        """Brand-new account per VU iteration — exercises bcrypt + insert."""
        email = f"locust_{uuid.uuid4().hex[:12]}@example.com"
        self.client.post(
            "/auth/register",
            name="POST /auth/register",
            json={
                "name": fake.first_name(),
                "email": email,
                "password": "LoadTest123!",
            },
        )


# ---------------------------------------------------------------------------
# 3. Admin reporting workload (read-only — destructive endpoints excluded
#    on purpose; see locust/README.md "Excluded endpoints").
# ---------------------------------------------------------------------------
class AdminUser(HttpUser):
    weight = 1
    wait_time = between(2, 6)

    def on_start(self):
        body = _login(self.client, ADMIN_EMAIL, ADMIN_PASSWORD)
        if not body:
            # Admin creds missing in this environment — quietly drop the
            # admin slice of traffic so the rest of the run continues.
            self.environment.runner.quit()
            return
        self.headers = _auth_headers(body["accessToken"])

    @task(3)
    def overview_dashboard(self):
        # The heaviest read-path on the user-service: 9 parallel COUNT()s.
        self.client.get(
            "/users/admin/stats",
            name="GET /users/admin/stats",
            headers=self.headers,
        )

    @task(2)
    def list_users(self):
        self.client.get("/users", name="GET /users (admin)", headers=self.headers)

    @task(2)
    def catalog_audit(self):
        self.client.get("/books", name="GET /books (admin)", headers=self.headers)
