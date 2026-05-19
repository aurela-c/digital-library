/**
 * Run a gRPC-style (call, callback) handler as a Promise for HTTP routes.
 */
export function invokeGrpc(handler, request) {
  return new Promise((resolve, reject) => {
    handler({ request }, (err, response) => {
      if (err) {
        const e = new Error(err.message || "Service error");
        e.code = err.code;
        reject(e);
      } else {
        resolve(response);
      }
    });
  });
}

export function sendGrpcError(res, err) {
  const message = err.message || "Server error";
  const code = err.code;

  if (code === 3) return res.status(400).json({ error: message });
  if (code === 5) return res.status(404).json({ error: message });
  if (code === 7) return res.status(403).json({ error: message });
  if (code === 9) return res.status(400).json({ error: message });
  if (code === 14) {
    return res.status(503).json({
      error: "Book service unavailable",
      message,
    });
  }

  return res.status(500).json({ error: message });
}
