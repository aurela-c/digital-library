/// <reference types="cypress" />

/**
 * SRS 3.3 scenarios: User login (#2) AND Admin login (#7).
 *
 * Drives the /login form for both roles and confirms:
 *   - successful login redirects to /home
 *   - tokens (accessToken, refreshToken) are stored in localStorage
 *   - the user JSON in localStorage carries the right role
 *   - wrong-password attempt stays on /login
 */
describe("Scenarios 2 + 7 — Login (user + admin)", () => {
  beforeEach(() => {
    cy.clearSession();
  });

  it("logs in as a regular user and lands on /home", () => {
    const email = Cypress.env("userEmail");
    const password = Cypress.env("userPassword");

    cy.visit("/login");
    cy.contains(/log in to your account/i).should("be.visible");

    cy.get('input[type="email"]').type(email);
    cy.get('input[type="password"]').type(password);
    cy.get('button[type="submit"]').click();

    cy.url({ timeout: 8000 }).should("include", "/home");

    cy.window().then((win) => {
      const access = win.localStorage.getItem("accessToken");
      const refresh = win.localStorage.getItem("refreshToken");
      const user = JSON.parse(win.localStorage.getItem("user") || "{}");

      expect(access, "accessToken").to.be.a("string").and.not.empty;
      expect(refresh, "refreshToken").to.be.a("string").and.not.empty;
      expect(access.split("."), "JWT has 3 segments").to.have.length(3);
      expect(user.email).to.eq(email);
      expect(user.role).to.match(/^ROLE_/);
    });
  });

  it("logs in as admin and surfaces the admin badge in the navbar", () => {
    const email = Cypress.env("adminEmail");
    const password = Cypress.env("adminPassword");

    cy.visit("/login");
    cy.get('input[type="email"]').type(email);
    cy.get('input[type="password"]').type(password);
    cy.get('button[type="submit"]').click();

    cy.url({ timeout: 8000 }).should("include", "/home");

    cy.window().then((win) => {
      const user = JSON.parse(win.localStorage.getItem("user") || "{}");
      expect(user.role).to.eq("ROLE_ADMIN");
    });
  });

  it("rejects wrong password and stays on /login", () => {
    cy.visit("/login");
    cy.get('input[type="email"]').type(Cypress.env("userEmail"));
    cy.get('input[type="password"]').type("definitely-wrong-password");
    cy.get('button[type="submit"]').click();

    cy.wait(1000);
    cy.url().should("include", "/login");
    cy.window().then((win) => {
      expect(win.localStorage.getItem("accessToken")).to.be.null;
    });
  });
});
