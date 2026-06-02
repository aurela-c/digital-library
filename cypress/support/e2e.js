// Loaded before every spec. Wires custom commands + reporter hooks.

import "./commands";
import "cypress-mochawesome-reporter/register";

// The frontend shows toast notifications via react-toastify. Some toasts
// fire uncaught console warnings during async cleanup which are noise —
// they shouldn't fail an E2E run.
Cypress.on("uncaught:exception", (err) => {
  if (/ResizeObserver/.test(err.message)) return false;
  return undefined;
});
