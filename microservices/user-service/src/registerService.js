import axios from "axios";

const consulEnabled = () => {
  const flag = String(process.env.CONSUL_ENABLED || "").toLowerCase();
  if (flag === "false" || flag === "0") return false;
  if (flag === "true" || flag === "1") return true;
  return process.env.NODE_ENV !== "production";
};

export const registerService = async (name, port) => {
  if (!consulEnabled()) return;

  const consulUrl =
    process.env.CONSUL_HTTP_ADDR || "http://localhost:8500";
  const address =
    process.env.SERVICE_REGISTER_HOST || "127.0.0.1";

  try {
    await axios.put(`${consulUrl}/v1/agent/service/register`, {
      Name: name,
      ID: `${name}-${port}`,
      Address: address,
      Port: port,
      Check: {
        HTTP: `http://${address}:${port}/health`,
        Interval: "10s",
      },
    });

    console.log(` ${name} registered in Consul`);
  } catch (err) {
    console.log(` Consul register error (${name}):`, err.message);
  }
};
