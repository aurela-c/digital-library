/// <reference types="cypress" />

/**
 * SRS 3.3 scenario 8 — Admin CRUD operations that already exist.
 *
 * Drives the Admin → Book management panel through the full
 * Create → Read → Update → Delete cycle for a single book. The schema
 * and admin surface are untouched — we only use the existing buttons,
 * inputs, and the confirmation dialog the app already ships with.
 */
describe("Scenario 8 — Admin CRUD on books (UI)", () => {
  const stamp = Date.now();
  const title = `Cypress CRUD Book ${stamp}`;
  const updatedTitle = `${title} (updated)`;

  beforeEach(() => {
    cy.clearSession();
    cy.loginAs("admin");
  });

  it("creates, edits, and deletes a book end-to-end", () => {
    cy.visit("/admin");

    // The sidebar nav buttons are unlabelled <span>Books</span> inside a
    // <button>. cy.contains by exact label is the most stable selector.
    cy.contains("button", /^books$/i).click();
    cy.contains("h1", /book management/i, { timeout: 10000 }).should(
      "be.visible"
    );

    // ----- Create -----
    cy.contains("button", /^new book$/i).click();
    cy.contains("h3", /^add a book$/i).should("be.visible");

    cy.contains("label", "Title").find("input").type(title);
    cy.contains("label", "Author").find("input").type("Cypress Author");
    cy.contains("label", "Cover image")
      .find('input[type="text"]')
      .type("/images/book1.jpg");
    cy.contains("label", "Total copies").find("input").clear().type("4");
    cy.contains("label", "Description")
      .find("textarea")
      .type("Created by the Cypress admin CRUD spec.");

    cy.contains("button", /^add to catalog$/i).click();

    cy.contains(/book added to catalog/i, { timeout: 10000 }).should(
      "be.visible"
    );
    cy.contains("tr", title, { timeout: 10000 }).should("be.visible");

    // ----- Update -----
    cy.contains("tr", title)
      .find("button")
      .contains(/edit/i)
      .click();

    cy.contains("h3", /^edit/i).should("be.visible");
    cy.contains("label", "Title").find("input").clear().type(updatedTitle);
    cy.contains("button", /^save changes$/i).click();

    cy.contains(/book updated/i, { timeout: 10000 }).should("be.visible");
    cy.contains("tr", updatedTitle, { timeout: 10000 }).should("be.visible");

    // ----- Delete (confirm dialog) -----
    cy.contains("tr", updatedTitle)
      .find("button")
      .contains(/delete/i)
      .click();

    cy.contains("h3", /^delete book$/i).should("be.visible");
    cy.contains("div", /this cannot be undone/i).should("be.visible");
    // Two buttons exist ("Cancel", "Delete"); pick the danger one.
    cy.get(".bg-red-600, .bg-red-700")
      .contains("button", /^delete$/i)
      .click();

    cy.contains(/book deleted/i, { timeout: 10000 }).should("be.visible");
    cy.contains("tr", updatedTitle, { timeout: 8000 }).should("not.exist");
  });
});
