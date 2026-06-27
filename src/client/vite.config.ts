import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress pre-existing INVALID_ANNOTATION warnings from @microsoft/signalr ESM bundle.
        // The signalr package uses /*#__PURE__*/ in positions Rolldown rejects; this is a
        // known upstream issue unrelated to our code. TypeScript type-check (tsc --noEmit) is
        // used as the authoritative type gate instead.
        if (
          warning.code === "INVALID_ANNOTATION" &&
          warning.id?.includes("@microsoft/signalr")
        ) {
          return;
        }
        warn(warning);
      },
    },
  },
  server: {
    proxy: {
      "/api": {
        target: process.env.API_URL ?? "http://localhost:5000",
        changeOrigin: true,
      },
      "/hubs": {
        target: process.env.API_URL ?? "http://localhost:5000",
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
