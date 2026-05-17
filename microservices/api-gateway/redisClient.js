import { createRedisClient } from "../observability/config/redis.js";

const redis = createRedisClient();

export default redis;
