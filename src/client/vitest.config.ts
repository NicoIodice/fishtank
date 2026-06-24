import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/unit/setup.ts"],
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    exclude: ["tests/e2e/**", "node_modules/**"],
    // jsdom v29 ESM deps (dom-selector) can hang when 9 workers start
    // simultaneously on Node 24. Use a single fork so jsdom initialises
    // once, eliminating the parallel-startup contention that causes
    // "Timeout waiting for worker to respond" in CI.
    singleFork: true,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
