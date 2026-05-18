import { defineConfig } from "vitest/config";

const testEnv = {
  CORS_ORIGINS: "http://localhost:5173",
  DATABASE_URL: "postgresql://monorepo:monorepo_dev_2026@localhost:5432/monorepo_test",
  EMAIL_FROM: "no-reply@test.local",
  JWT_ACCESS_EXPIRES_IN: "2m",
  JWT_REFRESH_EXPIRES_IN: "2m",
  JWT_SECRET: "test-secret-that-is-at-least-32-characters-long",
  LOG_LEVEL: "error",
  NODE_ENV: "test",
  PORT: "4001",
  SMTP_PASS: "test",
  SMTP_USER: "test",
};

for (const [key, value] of Object.entries(testEnv)) {
  process.env[key] = value;
}

export default defineConfig({
  resolve: {
    conditions: ["source"],
  },
  test: {
    clearMocks: true,
    env: testEnv,
    environment: "node",
    fileParallelism: false,
    globals: false,
    globalSetup: ["./src/test/global-setup.ts"],
    include: ["src/**/*.{test,spec,e2e-spec}.ts"],
    pool: "forks",
    restoreMocks: true,
    setupFiles: ["./src/test/setup.ts"],
    testTimeout: 15000,
  },
});
