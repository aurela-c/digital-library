export function createHealthHandler({ serviceName, checks }) {
  return async (req, res) => {
    const started = Date.now();
    const payload = {
      status: "UP",
      service: serviceName,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
    let allOk = true;

    for (const { key, run } of checks) {
      try {
        const result = await run();
        payload[key] = result.status;
        if (!result.ok) allOk = false;
      } catch (e) {
        payload[key] = `DOWN (${e.message})`;
        allOk = false;
      }
    }

    payload.durationMs = Date.now() - started;
    payload.status = allOk ? "UP" : "DEGRADED";
    res.status(allOk ? 200 : 503).json(payload);
  };
}
