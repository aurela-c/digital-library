import axios from "axios";

const CONSUL_URL = "http://localhost:8500";

export const registerService = async (name, port) => {
  try {
    await axios.put(`${CONSUL_URL}/v1/agent/service/register`, {
      Name: name,
      ID: `${name}-${port}`,
      Address: "127.0.0.1",
      Port: port,
      Check: {
        HTTP: `http://127.0.0.1:${port}/health`,
        Interval: "10s",
      },
    });

    console.log(` ${name} registered in Consul`);
  } catch (err) {
    console.log(`Consul register error (${name}):`, err.message);
  }
};