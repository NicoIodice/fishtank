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
    // Run all test files in a single fork (Vitest 4: isolate:false + maxWorkers:1
    // sends all files to one worker at once — see source comment "Non-isolated
    // single worker can receive all files at once"). This avoids spawning 9 separate
    // Node.js processes, each of which can exceed the hardcoded 60-second fork-start
    // timeout on Windows when the system is loaded (e.g. after a dotnet build).
    isolate: false,
    maxWorkers: 1,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
