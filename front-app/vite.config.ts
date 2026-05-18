import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// All requests to /api/* are forwarded to the runtime backend so the browser
// stays single-origin and we don't need CORS headers on the runtime.
//
// Override the target with PLATFORM_RUNTIME_URL when running the runtime on
// a different host.
const RUNTIME_URL =
  process.env.PLATFORM_RUNTIME_URL ?? "http://127.0.0.1:8080";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: RUNTIME_URL,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
        // SSE / streaming responses must not be buffered by the proxy.
        configure: (proxy) => {
          proxy.on("proxyRes", (proxyRes) => {
            proxyRes.headers["x-accel-buffering"] = "no";
          });
        },
      },
    },
  },
});
