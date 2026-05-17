import axios from "axios";

const CONSUL = process.env.CONSUL_HTTP_ADDR || "http://localhost:8500";

export async function resolveHttpServiceUrl(envUrl, consulName, fallbackPort) {
  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      `Missing HTTP URL for ${consulName}. Set the corresponding *_SERVICE_URL environment variable.`
    );
  }

  try {
    const res = await axios.get(`${CONSUL}/v1/catalog/service/${consulName}`);
    if (res.data?.length) {
      const svc = res.data[0];
      return `http://${svc.ServiceAddress}:${svc.ServicePort}`;
    }
  } catch {
    // Consul optional in local development
  }

  return `http://127.0.0.1:${fallbackPort}`;
}
