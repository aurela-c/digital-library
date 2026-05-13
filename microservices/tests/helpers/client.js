import axios from "axios";
import { GATEWAY_URL } from "./env.js";

export function createClient() {
  return axios.create({
    baseURL: GATEWAY_URL,
    timeout: 30000,
    validateStatus: () => true,
    headers: { "Content-Type": "application/json" },
  });
}

export async function gatewayReachable(client) {
  try {
    const res = await client.get("/health", { timeout: 5000 });
    return res.status === 200 || res.status === 503;
  } catch {
    return false;
  }
}
