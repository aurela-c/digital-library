/// <reference types="cypress" />

/**
 * SRS 3.3 scenario 9 — Reporting / dashboard functionality.
 *
 * The admin dashboard's Overview tab is the reporting surface — it
 * pulls DB-authoritative totals from the user-service /users/admin/stats
 * endpoint and renders five StatCards. This spec verifies:
 *   - the Overview tab is the landing view
 *   - all five labelled cards render
 *   - "Total books" resolves to a numeric value (not the loading dash)
 */
describe("Scenario 9 — Admin reporting / dashboard (UI)", () => {
  beforeEach(() => {
    cy.clearSession();
    cy.loginAs("admin");
  });

  it("renders the Overview snapshot with all stat cards populated", () => {
    cy.visit("/admin");
    cy.contains("h1", /overview/i).should("be.visible");

    const labels = [
      "Total users",
      "Active users",
      "Total books",
      "Categories",
      "Support tickets",
    ];

    labels.forEach((label) => {
      cy.contains("p", new RegExp(`^${label}$`, "i")).should("be.visible");
    });

    // "Total books" starts as "—" while the user-service /admin/stats
    // request is in flight, then becomes a number. Retry until it
    // resolves to a digit — generous timeout because the stats endpoint
    // aggregates across services.
    cy.contains("p", /^total books$/i)
      .parent()
      .find("p")
      .eq(1)
      .should(($p) => {
        const txt = $p.text().trim();
        expect(txt, "total books").to.match(/^\d+$/);
      });

    cy.contains("p", /^total users$/i)
      .parent()
      .find("p")
      .eq(1)
      .invoke("text")
      .then((t) => expect(t.trim()).to.match(/^\d+$/));
  });
});
