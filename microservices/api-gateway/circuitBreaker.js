import CircuitBreaker from "opossum";
import axios from "axios";

const callService = async (url, options) => {
  const res = await axios(url, options);
  return res.data;
};

const breakerOptions = {
  timeout: 3000, 
  errorThresholdPercentage: 50,
  resetTimeout: 10000,
};

export const createBreaker = (url) => {
  const breaker = new CircuitBreaker(
    (options) => callService(url, options),
    breakerOptions
  );

  breaker.fallback(() => {
    return { error: "Service temporarily unavailable" };
  });

  return breaker;
};