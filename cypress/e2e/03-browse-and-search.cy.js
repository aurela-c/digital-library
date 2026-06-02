/// <reference types="cypress" />

/**
 * SRS 3.3 scenario: Browse / search books.
 *
 * Exercises the actual navigation UI:
 *   - jump from /home into a category landing page (Literature)
 *   - assert the category page renders multiple book tiles
 *   - use the navbar search box to find a known title and confirm we
 *     land on its detail page
 */
describe("Scenario 3 — Browse + search books (UI)", () => {
  beforeEach(() => {
    cy.clearSession();
    cy.loginAs("user");
  });

  it("navigates to the Literature category and renders multiple books", () => {
    cy.visit("/categories/literature");

    cy.contains("h1", /literature books/i).should("be.visible");
    cy.contains("h2", /all literature books/i).should("be.visible");

    // Pinned-grid of tiles — there's always more than 3 with the seeded
    // catalog. We tolerate the seed-only case (no API books) too.
    cy.get('a[href^="/book/"]').its("length").should("be.greaterThan", 3);
  });

  it("opens a known book card from the catalog", () => {
    cy.visit("/categories/literature");
    cy.contains("h3", /1984/i).click();

    cy.url().should("match", /\/book\/\d+/);
    cy.contains(/borrow/i).should("be.visible");
  });

  it("uses the navbar search to jump to a matching book", () => {
    cy.visit("/home");

    // Two SearchField instances are rendered (mobile + desktop). On a
    // 1280-wide viewport only the desktop one is visible — filter by it.
    cy.get('input[aria-label="Search books"]:visible').first().type("1984");
    cy.get('button[aria-label="Search"]:visible').first().click();

    cy.url({ timeout: 8000 }).should("match", /\/book\/\d+/);
  });
});
