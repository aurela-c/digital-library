/// <reference types="cypress" />

/**
 * SRS 3.3 scenario: Contact / support submission.
 *
 * Uses the existing /contact form. Asserts the success toast appears
 * AND that the new ticket shows up in the user's history panel — the
 * second check exercises the GET /support/tickets API the panel calls
 * after submission, so we're covering the full submit → list round
 * trip a real user would see.
 */
describe("Scenario 6 — Contact / support submission (UI)", () => {
  beforeEach(() => {
    cy.clearSession();
    cy.loginAs("user");
  });

  it("submits a support ticket and shows it in the history panel", () => {
    const subject = `Cypress E2E ${Date.now()}`;
    const message =
      "This support ticket was opened by Cypress as part of the automated E2E suite.";

    cy.visit("/contact");
    cy.contains("h1", /contact support/i).should("be.visible");

    cy.get("#ct-subject").type(subject);
    cy.get("#ct-message").type(message);
    cy.contains("button", /send message/i).click();

    cy.contains(/message sent/i, { timeout: 8000 }).should("be.visible");

    // History panel auto-expands after a successful submit.
    cy.contains(subject, { timeout: 8000 }).should("be.visible");
  });
});
