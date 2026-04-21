import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    conditions: ["source"],
  },
  test: {
    clearMocks: true,
    env: {
      CORS_ORIGIN: "http://localhost:5173",
      LOG_LEVEL: "error",
      NODE_ENV: "test",
      PORT: "4001",
    },
    environment: "node",
    globals: false,
    include: ["src/**/*.{test,spec}.ts"],
    maxWorkers: 1,
    minWorkers: 1,
    pool: "forks",
    restoreMocks: true,
    setupFiles: ["./src/test/setup.ts"],
  },
});
