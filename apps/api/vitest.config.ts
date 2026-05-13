import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    conditions: ["source"],
  },
  test: {
    clearMocks: true,
    env: {
      CORS_ORIGINS: "http://localhost:5173",
      DATABASE_URL: "postgresql://monorepo:monorepo_dev_2026@localhost:5432/monorepo_dev",
      JWT_ACCESS_EXPIRES_IN: "2m",
      JWT_REFRESH_EXPIRES_IN: "2m",
      JWT_SECRET: "test-secret-that-is-at-least-32-characters-long",
      LOG_LEVEL: "error",
      NODE_ENV: "test",
      PORT: "4001",
    },
    environment: "node",
    globals: false,
    globalSetup: ["./src/test/global-setup.ts"],
    include: ["src/**/*.{test,spec}.ts"],
    pool: "forks",
    restoreMocks: true,
    setupFiles: ["./src/test/setup.ts"],
  },
});
