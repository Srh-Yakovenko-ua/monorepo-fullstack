import "dotenv/config";
import { z } from "zod";

const envSchema = z
  .object({
    BASIC_AUTH_PASSWORD: z.string().default("qwerty"),
    BASIC_AUTH_USER: z.string().default("admin"),
    CORS_ORIGINS: z
      .string()
      .default("http://localhost:5173")
      .transform((value, ctx) => {
        const items = value
          .split(",")
          .map((entry) => entry.trim())
          .filter((entry) => entry.length > 0);
        if (items.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "CORS_ORIGINS must contain at least one origin",
          });
          return z.NEVER;
        }
        for (const item of items) {
          const result = z.string().url().safeParse(item);
          if (!result.success) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `CORS_ORIGINS contains invalid URL: ${item}`,
            });
            return z.NEVER;
          }
        }
        return items;
      }),
    EMAIL_FROM: z.string().email().default("no-reply@example.com"),
    ENABLE_SWAGGER: z
      .enum(["true", "false"])
      .default("true")
      .transform((value) => value === "true"),
    ENABLE_TESTING_ENDPOINTS: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    FRONTEND_URL: z.string().url().default("http://localhost:5173"),
    JWT_ACCESS_EXPIRES_IN: z
      .string()
      .regex(/^\d+[smhdwy]$/, 'JWT_ACCESS_EXPIRES_IN must look like "60s", "30m", "1h", "7d"')
      .default("1h"),
    JWT_REFRESH_EXPIRES_IN: z
      .string()
      .regex(/^\d+[smhdwy]$/, 'JWT_REFRESH_EXPIRES_IN must look like "60s", "30m", "1h", "7d"')
      .default("2h"),
    JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
    LOG_LEVEL: z.enum(["debug", "error", "info", "warn"]).default("info"),
    MONGO_URI: z.string().min(1).default("mongodb://localhost:27017/monorepo_fullstack"),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    SMTP_HOST: z.string().default("sandbox.smtp.mailtrap.io"),
    SMTP_PASS: z.string().default(""),
    SMTP_PORT: z.coerce.number().int().positive().default(2525),
    SMTP_USER: z.string().default(""),
  })
  .transform((raw) => ({
    basicAuthPassword: raw.BASIC_AUTH_PASSWORD,
    basicAuthUser: raw.BASIC_AUTH_USER,
    corsOrigins: raw.CORS_ORIGINS,
    emailFrom: raw.EMAIL_FROM,
    enableSwagger: raw.ENABLE_SWAGGER,
    enableTestingEndpoints: raw.ENABLE_TESTING_ENDPOINTS,
    frontendUrl: raw.FRONTEND_URL,
    jwtAccessExpiresIn: raw.JWT_ACCESS_EXPIRES_IN,
    jwtRefreshExpiresIn: raw.JWT_REFRESH_EXPIRES_IN,
    jwtSecret: raw.JWT_SECRET,
    logLevel: raw.LOG_LEVEL,
    mongoUri: raw.MONGO_URI,
    nodeEnv: raw.NODE_ENV,
    port: raw.PORT,
    smtpHost: raw.SMTP_HOST,
    smtpPass: raw.SMTP_PASS,
    smtpPort: raw.SMTP_PORT,
    smtpUser: raw.SMTP_USER,
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
