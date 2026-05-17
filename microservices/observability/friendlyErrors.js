/**
 * Short, human-oriented error strings for terminals (dev UX).
 */

export function formatGrpcBindError(port, err) {
  const msg = err?.message || String(err);
  if (/EADDRINUSE|already in use/i.test(msg)) {
    return `gRPC port ${port} already in use (stop the other process or change the port)`;
  }
  if (/No address added/i.test(msg)) {
    return `gRPC could not bind on port ${port} (often EADDRINUSE - check details above)`;
  }
  return `gRPC bind failed: ${msg.split("\n")[0]}`;
}

export function formatRabbitMqError(err) {
  if (!err) return "RabbitMQ: unknown error";
  const refused =
    err.code === "ECONNREFUSED" ||
    (Array.isArray(err.errors) &&
      err.errors.some((e) => e && e.code === "ECONNREFUSED")) ||
    /ECONNREFUSED/i.test(String(err.message || err));
  if (refused) {
    return "RabbitMQ not reachable (localhost:5672) - start RabbitMQ or ignore for local dev";
  }
  const first =
    err.errors?.[0]?.message ||
    err.message ||
    (typeof err === "string" ? err : "connection failed");
  return `RabbitMQ: ${String(first).split("\n")[0]}`;
}

export function summarizeErr(err, maxStackLines = 4) {
  if (!err) return {};
  let stack;
  if (maxStackLines > 0 && typeof err.stack === "string") {
    stack = err.stack.split("\n").slice(0, maxStackLines).join("\n");
  }
  return {
    message: err.message || String(err),
    code: err.code,
    ...(stack ? { stack } : {}),
  };
}
