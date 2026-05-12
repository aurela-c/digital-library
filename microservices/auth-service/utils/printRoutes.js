/**
 * Logs Express app stack (routes + middleware order) for debugging mounts.
 * Set PRINT_ROUTES=true on startup to enable.
 */
export function printExpressStack(app, label) {
  if (String(process.env.PRINT_ROUTES || "").toLowerCase() !== "true") {
    return;
  }
  console.log(`\n========== ${label} — Express stack ==========`);
  const stack = app?._router?.stack;
  if (!stack) {
    console.log("(no _router.stack)");
    console.log(`========== end ${label} ==========\n`);
    return;
  }
  stack.forEach((layer, i) => {
    if (layer.route?.path != null) {
      const methods = Object.keys(layer.route.methods || {})
        .filter((k) => layer.route.methods[k])
        .join(", ")
        .toUpperCase();
      console.log(`  [${i}] ${methods.padEnd(18)} ${layer.route.path}`);
    } else if (layer.name === "router" && layer.handle?.stack) {
      console.log(`  [${i}] <Router mount>`);
      layer.handle.stack.forEach((s, j) => {
        if (s.route?.path != null) {
          const methods = Object.keys(s.route.methods || {})
            .filter((k) => s.route.methods[k])
            .join(", ")
            .toUpperCase();
          console.log(`        [${j}] ${methods.padEnd(16)} ${s.route.path}`);
        }
      });
    } else {
      console.log(`  [${i}] middleware: ${layer.name || "anonymous"}`);
    }
  });
  console.log(`========== end ${label} ==========\n`);
}
