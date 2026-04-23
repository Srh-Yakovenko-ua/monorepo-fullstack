import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { createDocument, type ZodOpenApiPathsObject } from "zod-openapi";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

function readApiVersion(): string {
  const pkgPath = resolve(__dirname, "../../package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { version: string };
  return pkg.version;
}

const registeredPaths: ZodOpenApiPathsObject = {};

export function buildOpenApiDocument(): ReturnType<typeof createDocument> {
  return createDocument({
    components: {
      securitySchemes: {
        basicAuth: { scheme: "basic", type: "http" },
        bearerAuth: { bearerFormat: "JWT", scheme: "bearer", type: "http" },
      },
    },
    info: {
      description: "REST API for the monorepo-fullstack project",
      title: "monorepo-fullstack API",
      version: readApiVersion(),
    },
    openapi: "3.1.0",
    paths: registeredPaths,
    servers: [{ url: "/" }],
  });
}

export function registerPaths(paths: ZodOpenApiPathsObject): void {
  Object.assign(registeredPaths, paths);
}

export const fieldErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
});

export const apiErrorResultSchema = z.object({
  errorsMessages: z.array(fieldErrorSchema),
});

export const stringIdParam = {
  in: "path" as const,
  name: "id",
  required: true,
  schema: { type: "string" as const },
};

export const integerIdParam = {
  in: "path" as const,
  name: "id",
  required: true,
  schema: { format: "int32", type: "integer" as const },
};
