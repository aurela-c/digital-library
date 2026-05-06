import axios from "axios";

const CONSUL = "http://localhost:8500";

export const getService = async (name) => {
  const res = await axios.get(`${CONSUL}/v1/catalog/service/${name}`);

  if (!res.data.length) {
    throw new Error(`${name} not found in Consul`);
  }

  const svc = res.data[0];

  return `http://${svc.ServiceAddress}:${svc.ServicePort}`;
};