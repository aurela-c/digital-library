export function createErrorHandler(logger) {
  return (err, req, res, next) => {
    if (res.headersSent) {
      return next(err);
    }

    const status = Number(err.status || err.statusCode || 500);
    const isProd = process.env.NODE_ENV === "production";

    logger.error(
      {
        msg: "http_error",
        correlationId: req.correlationId,
        err: {
          message: err.message,
          name: err.name,
          code: err.code,
          stack: isProd ? undefined : err.stack,
        },
        method: req.method,
        endpoint: req.originalUrl?.split("?")[0],
      },
      err.message || "request failed"
    );

    const body = {
      error: status >= 500 && isProd ? "Internal server error" : err.message,
      correlationId: req.correlationId,
    };
    if (!isProd && err.stack) {
      body.stack = err.stack;
    }
    res.status(Number.isFinite(status) ? status : 500).json(body);
  };
}

export function notFoundHandler(req, res) {
  res.status(404).json({
    error: "Not found",
    correlationId: req.correlationId,
  });
}
