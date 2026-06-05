/**
 * Build an Express handler that aggregates one or more readiness probes.
 *
 * Each check may be flagged `critical: false` to signal that its failure
 * should NOT cause the overall service to be reported unhealthy (HTTP
 * 503). Non-critical checks still appear in the JSON payload with their
 * real status, and the overall status flips to "DEGRADED", but the
 * response code stays 200 so that orchestrators (Railway, Docker
 * Compose, Kubernetes) don't restart the container for a peripheral
 * outage like a temporarily unreachable SMTP server.
 *
 * Checks default to `critical: true` for backward compatibility.
 */
export function createHealthHandler({ serviceName, checks }) {
  return async (req, res) => {
    const started = Date.now();
    const payload = {
      status: "UP",
      service: serviceName,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
    let allCriticalOk = true;
    let anyDegraded = false;

    for (const { key, run, critical = true } of checks) {
      let ok = false;
      try {
        const result = await run();
        payload[key] = result.status;
        ok = Boolean(result.ok);
      } catch (e) {
        payload[key] = `DOWN (${e.message})`;
        ok = false;
      }
      if (!ok) {
        anyDegraded = true;
        if (critical) allCriticalOk = false;
      }
    }

    payload.durationMs = Date.now() - started;
    payload.status = allCriticalOk ? (anyDegraded ? "DEGRADED" : "UP") : "DOWN";
    res.status(allCriticalOk ? 200 : 503).json(payload);
  };
}
