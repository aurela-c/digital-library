/**
 * Read a secret env var. In production, missing values throw at startup.
 */
export function getSecret(name, devFallback) {
  const value = process.env[name];
  if (value && String(value).trim() !== "") {
    return value;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(`${name} must be set when NODE_ENV=production`);
  }
  return devFallback;
}
