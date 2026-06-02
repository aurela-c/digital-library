import { describe, it, expect } from "@jest/globals";
import {
  ROLES,
  normalizeRoleKey,
  toCanonicalRole,
  isAdminRole,
  BORROW_ACTOR_ROLES,
  STAFF_BOOK_ROLES,
} from "../../../shared/constants/roles.js";

describe("shared/constants/roles", () => {
  describe("normalizeRoleKey", () => {
    it("strips the ROLE_ prefix and lowercases", () => {
      expect(normalizeRoleKey("ROLE_ADMIN")).toBe("admin");
      expect(normalizeRoleKey("ROLE_USER")).toBe("user");
      expect(normalizeRoleKey("ROLE_LIBRARIAN")).toBe("librarian");
    });

    it("normalises mixed-case / whitespace input", () => {
      expect(normalizeRoleKey("  Admin  ")).toBe("admin");
      expect(normalizeRoleKey("User")).toBe("user");
    });

    it("treats nullish input as an empty string", () => {
      expect(normalizeRoleKey(undefined)).toBe("");
      expect(normalizeRoleKey(null)).toBe("");
      expect(normalizeRoleKey("")).toBe("");
    });
  });

  describe("toCanonicalRole", () => {
    it("maps every recognised variant to a canonical ROLE_*", () => {
      expect(toCanonicalRole("admin")).toBe(ROLES.ADMIN);
      expect(toCanonicalRole("ROLE_ADMIN")).toBe(ROLES.ADMIN);
      expect(toCanonicalRole("Admin")).toBe(ROLES.ADMIN);
      expect(toCanonicalRole("user")).toBe(ROLES.USER);
      expect(toCanonicalRole("ROLE_USER")).toBe(ROLES.USER);
      expect(toCanonicalRole("librarian")).toBe(ROLES.LIBRARIAN);
    });

    it("defaults to ROLE_USER when input is empty/nullish", () => {
      expect(toCanonicalRole(null)).toBe(ROLES.USER);
      expect(toCanonicalRole(undefined)).toBe(ROLES.USER);
      expect(toCanonicalRole("")).toBe(ROLES.USER);
      expect(toCanonicalRole("   ")).toBe(ROLES.USER);
    });

    it("passes through unknown but non-empty role strings (forward-compatible)", () => {
      expect(toCanonicalRole("ROLE_FUTURE")).toBe("ROLE_FUTURE");
    });
  });

  describe("isAdminRole", () => {
    it("recognises every ADMIN spelling and rejects everything else", () => {
      expect(isAdminRole("ROLE_ADMIN")).toBe(true);
      expect(isAdminRole("admin")).toBe(true);
      expect(isAdminRole("Admin")).toBe(true);
      expect(isAdminRole("ROLE_USER")).toBe(false);
      expect(isAdminRole("librarian")).toBe(false);
      expect(isAdminRole(undefined)).toBe(false);
      expect(isAdminRole("")).toBe(false);
    });
  });

  describe("role allow-lists", () => {
    it("BORROW_ACTOR_ROLES excludes admin (admins MANAGE the library, not consume it)", () => {
      expect(BORROW_ACTOR_ROLES).toEqual(
        expect.arrayContaining([ROLES.USER, ROLES.LIBRARIAN])
      );
      expect(BORROW_ACTOR_ROLES).not.toContain(ROLES.ADMIN);
    });

    it("STAFF_BOOK_ROLES grants both admins and librarians book-management rights", () => {
      expect(STAFF_BOOK_ROLES).toEqual(
        expect.arrayContaining([ROLES.ADMIN, ROLES.LIBRARIAN])
      );
      expect(STAFF_BOOK_ROLES).not.toContain(ROLES.USER);
    });
  });
});
