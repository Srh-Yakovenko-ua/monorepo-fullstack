import "dotenv/config";
import { z } from "zod";

const envSchema = z
  .object({
    BASIC_AUTH_PASSWORD: z.string().min(1).default("qwerty"),
    BASIC_AUTH_USERNAME: z.string().min(1).default("admin"),
    CORS_ORIGIN: z.string().url().default("http://localhost:5173"),
    ENABLE_SWAGGER: z
      .enum(["true", "false"])
      .default("true")
      .transform((value) => value === "true"),
    JWT_EXPIRES_IN: z
      .string()
      .regex(/^\d+[smhdwy]$/, 'JWT_EXPIRES_IN must look like "60s", "30m", "1h", "7d"')
      .default("1h"),
    JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
    LOG_LEVEL: z.enum(["debug", "error", "info", "warn"]).default("info"),
    MONGO_URI: z.string().min(1).default("mongodb://localhost:27017/monorepo_fullstack"),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
  })
  .transform((raw) => ({
    basicAuthPassword: raw.BASIC_AUTH_PASSWORD,
    basicAuthUsername: raw.BASIC_AUTH_USERNAME,
    corsOrigin: raw.CORS_ORIGIN,
    enableSwagger: raw.ENABLE_SWAGGER,
    jwtExpiresIn: raw.JWT_EXPIRES_IN,
    jwtSecret: raw.JWT_SECRET,
    logLevel: raw.LOG_LEVEL,
    mongoUri: raw.MONGO_URI,
    nodeEnv: raw.NODE_ENV,
    port: raw.PORT,
  }));

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const fieldErrors = parsed.error.flatten().fieldErrors;
  console.error("\n[env] Invalid environment variables:\n");
  for (const [key, messages] of Object.entries(fieldErrors)) {
    console.error(`  ${key}: ${messages?.join(", ")}`);
  }
  console.error("\nSee apps/api/.env.example for the expected shape.\n");
  process.exit(1);
}

export const env = parsed.data;
