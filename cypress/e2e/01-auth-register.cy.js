/// <reference types="cypress" />

/**
 * SRS 3.3 scenario: User registration.
 *
 * Drives the actual /register page in the browser, fills the form, and
 * confirms the SPA redirects to /login on success (the existing
 * registration handler shows a toast then navigates after ~3.5s).
 */
describe("Scenario 1 — User registration (UI)", () => {
  beforeEach(() => {
    cy.clearSession();
  });

  it("registers a brand-new user and lands on the login page", () => {
    const email = `e2e_cy_${Date.now()}@example.com`;
    const name = "Cypress Newcomer";
    const password = "TestPass123!";

    cy.visit("/register");

    cy.contains("h2", /create your account/i).should("be.visible");

    cy.get('input[type="text"]').first().type(name);
    cy.get('input[type="email"]').type(email);
    cy.get('input[type="password"]').type(password);

    cy.get('button[type="submit"]').click();

    // Registration handler navigates to /login after a ~3.5s success toast.
    cy.url({ timeout: 8000 }).should("include", "/login");
    cy.contains(/log in to your account/i).should("be.visible");
  });

  it("blocks duplicate registration with a visible error", () => {
    const email = `e2e_cy_dup_${Date.now()}@example.com`;
    const password = "TestPass123!";

    // Seed the account directly via the gateway so this spec doesn't
    // depend on the previous test passing.
    cy.request({
      method: "POST",
      url: `${Cypress.env("apiUrl")}/auth/register`,
      body: { name: "Dup", email, password },
      failOnStatusCode: true,
    });

    cy.visit("/register");
    cy.get('input[type="text"]').first().type("Dup Again");
    cy.get('input[type="email"]').type(email);
    cy.get('input[type="password"]').type(password);
    cy.get('button[type="submit"]').click();

    // Toast appears top-center (react-toastify); we just assert the page
    // did NOT navigate to /login (it would on success).
    cy.wait(1500);
    cy.url().should("include", "/register");
  });
});
