// Deterministic env for every unit test in this project.
// Real JWT secrets so we can do real sign/verify round-trips without
// depending on production .env values.
process.env.NODE_ENV = "test";
process.env.ACCESS_SECRET = "unit-test-access-secret";
process.env.REFRESH_SECRET = "unit-test-refresh-secret";
process.env.JWT_ACCESS_EXPIRES_IN = "1h";
process.env.JWT_REFRESH_EXPIRES_IN = "7d";
process.env.AUTH_SKIP_EMAIL_VERIFY = "false";
process.env.FRONTEND_URL = "http://localhost:5173";
process.env.BACKEND_URL = "http://localhost:5001";
