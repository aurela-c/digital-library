/**
 * Structured access log after response completes (level INFO).
 */
export function createRequestLogMiddleware(logger) {
  return (req, res, next) => {
    const start = process.hrtime.bigint();
    res.on("finish", () => {
      const durationNs = process.hrtime.bigint() - start;
      const durationMs = Number(durationNs / 1000000n);
      const userId =
        req.user?.id ??
        req.user?.userId ??
        (req.user?.sub != null ? String(req.user.sub) : null);

      logger.info({
        msg: "http_access",
        correlationId: req.correlationId,
        method: req.method,
        endpoint: req.originalUrl?.split("?")[0],
        statusCode: res.statusCode,
        durationMs,
        userId: userId || undefined,
      });
    });
    next();
  };
}
