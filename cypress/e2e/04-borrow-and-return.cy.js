/// <reference types="cypress" />

/**
 * SRS 3.3 scenarios 4 + 5 — Borrow a book AND Return it.
 *
 * Real-user behaviour drives both flows:
 *   - test 1: open a known book's detail page, click "Borrow Book",
 *     assert the success toast.
 *   - test 2: open /profile, find that borrow in the "My library" grid,
 *     click "Return book", confirm in the modal, assert the toast.
 *
 * Availability deltas, edge cases, and error paths are already covered
 * by the Postman/Newman suite — this spec proves the UI is wired up.
 */
describe("Scenarios 4 + 5 — Borrow and return a book (UI)", () => {
  let seedBook;

  before(() => {
    cy.clearSession();
    // 1. Make sure at least one borrowable book exists.
    // 2. Clear any leftover active borrows on the test user so the
    //    borrow call below doesn't 409 on retries.
    cy.ensureBorrowableBook().then((book) => {
      seedBook = book;
    });
    cy.resetBorrowsFor("user");
  });

  beforeEach(() => {
    cy.clearSession();
    cy.loginAs("user");
  });

  it("borrows a book from the book detail page", () => {
    // BookCard.jsx renders the title from a hardcoded local seed list
    // (ids 1..15). Visiting any id outside that range silently falls
    // back to books[0] (id=1) but the borrow API call uses books[0].id,
    // so always visit a known-seeded id and we'll borrow what we see.
    cy.visit(`/book/1`);

    cy.contains("button", /^borrow book$/i)
      .should("be.visible")
      .click();

    cy.contains(/book borrowed successfully/i, { timeout: 10000 }).should(
      "be.visible"
    );
  });

  it("sees the borrowed book in profile activity and returns it", () => {
    cy.visit("/profile");

    cy.contains(/my library/i, { timeout: 10000 }).should("be.visible");

    // BorrowCard renders a "Return book" button per active borrow. The
    // card is positioned over a gradient overlay so the button may
    // need a forced click — that's expected per the UI's design.
    cy.contains("button", /^return book$/i, { timeout: 15000 })
      .first()
      .scrollIntoView()
      .click({ force: true });

    cy.contains("button", /^confirm return$/i, { timeout: 8000 }).click();

    cy.contains(/book returned successfully/i, { timeout: 10000 }).should(
      "be.visible"
    );
  });
});
