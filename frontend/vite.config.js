import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const isDev = mode === "development";
  const gateway =
    env.VITE_GATEWAY_TARGET || "http://127.0.0.1:4000";

  return {
    plugins: [react()],
    server: isDev
      ? {
          proxy: {
            "/api/auth": {
              target: gateway,
              changeOrigin: true,
              rewrite: (p) => p.replace(/^\/api/, ""),
            },
            "/auth": { target: gateway, changeOrigin: true },
            "/users": { target: gateway, changeOrigin: true },
            "/books": { target: gateway, changeOrigin: true },
            "/borrow": { target: gateway, changeOrigin: true },
          },
        }
      : undefined,
  };
});
