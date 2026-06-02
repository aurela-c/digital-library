/**
 * Reusable Cypress commands. Kept intentionally small — most specs drive
 * the actual UI; these helpers only exist to avoid re-doing the login
 * UI dance in every spec (login itself is covered by 02-auth-login.cy.js)
 * and to guarantee test preconditions (e.g. "there must be a borrowable
 * book in the catalog") without going through the admin UI just to
 * stage data.
 */

/**
 * Programmatically log in via the gateway and prime localStorage exactly
 * the same way the React login page does. Bypassing the UI here is the
 * standard Cypress pattern and is documented in their best-practices.
 *
 * Usage: cy.loginAs("user")   ← uses CYPRESS env userEmail/userPassword
 *        cy.loginAs("admin")  ← uses CYPRESS env adminEmail/adminPassword
 *        cy.loginAs({ email, password })
 */
Cypress.Commands.add("loginAs", (who) => {
  const apiUrl = Cypress.env("apiUrl");
  const creds =
    typeof who === "string"
      ? who === "admin"
        ? { email: Cypress.env("adminEmail"), password: Cypress.env("adminPassword") }
        : { email: Cypress.env("userEmail"),  password: Cypress.env("userPassword")  }
      : who;

  return cy
    .request({
      method: "POST",
      url: `${apiUrl}/auth/login`,
      body: creds,
      failOnStatusCode: true,
    })
    .then(({ body }) => {
      // Match the exact localStorage shape Login.jsx writes — the SPA's
      // protected routes and api.js interceptors read these three keys.
      window.localStorage.setItem("accessToken", body.accessToken);
      window.localStorage.setItem("refreshToken", body.refreshToken);
      window.localStorage.setItem("user", JSON.stringify(body.user));

      // BookCard.jsx gates its "Borrow Book" button on a separate
      // `localStorage.userId` key that Login.jsx itself never writes
      // (pre-existing app inconsistency). Mirror that key here so the
      // UI behaves the same way it does for a "fully" logged-in user.
      if (body.user?.id != null) {
        window.localStorage.setItem("userId", String(body.user.id));
      }
      return body;
    });
});

/**
 * Force-return every active borrow on the given account so a borrow test
 * starts from a clean slate (no 409 "already borrowed" surprises if a
 * previous run failed before its return step). Goes through the gateway.
 */
Cypress.Commands.add("resetBorrowsFor", (who = "user") => {
  const apiUrl = Cypress.env("apiUrl");

  return cy.loginAs(who).then(({ accessToken, user }) =>
    cy
      .request({
        method: "GET",
        url: `${apiUrl}/borrow/${user.id}`,
        headers: { Authorization: `Bearer ${accessToken}` },
        failOnStatusCode: false,
      })
      .then(({ status, body }) => {
        if (status !== 200) return;
        const list = Array.isArray(body) ? body : [];
        const active = list.filter(
          (b) => !b.returnDate && !b.return_date && b.status !== "RETURNED"
        );
        active.forEach((b) => {
          cy.request({
            method: "PUT",
            url: `${apiUrl}/borrow/return/${b.id}`,
            headers: { Authorization: `Bearer ${accessToken}` },
            failOnStatusCode: false,
          });
        });
      })
  );
});

/**
 * Ensure at least one borrowable book exists. Used by the borrow spec
 * so it can run on a fresh-from-volumes database without depending on
 * which migration / seed has been applied. The book is created via the
 * gateway as admin — same API surface the admin UI uses — so we don't
 * touch MySQL directly.
 */
Cypress.Commands.add("ensureBorrowableBook", () => {
  const apiUrl = Cypress.env("apiUrl");

  return cy
    .loginAs("user")
    .then(({ accessToken }) =>
      cy.request({
        method: "GET",
        url: `${apiUrl}/books?limit=200`,
        headers: { Authorization: `Bearer ${accessToken}` },
        failOnStatusCode: true,
      })
    )
    .then(({ body }) => {
      const list = Array.isArray(body) ? body : [];
      const ready = list.find((b) => Number(b.availableCopies) > 0);
      if (ready) return ready;

      // Fall back to creating one as admin.
      return cy.loginAs("admin").then(({ accessToken }) =>
        cy
          .request({
            method: "POST",
            url: `${apiUrl}/books`,
            headers: { Authorization: `Bearer ${accessToken}` },
            body: {
              title: `Cypress Seed ${Date.now()}`,
              author: "Cypress",
              image: "/images/book1.jpg",
              description: "Auto-created by Cypress to guarantee a borrowable book.",
              categoryId: 1,
              totalCopies: 3,
            },
          })
          .then(({ body: created }) => created)
      );
    });
});

/**
 * Clear all session-related localStorage so tests start from a known
 * unauthenticated state. Faster than cy.session() for our use-case.
 */
Cypress.Commands.add("clearSession", () => {
  cy.clearLocalStorage();
  cy.clearCookies();
});
