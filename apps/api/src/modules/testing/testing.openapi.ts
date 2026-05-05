import { registerPaths } from "../../core/openapi/openapi.js";

export function registerTestingOpenApi(): void {
  registerPaths({
    "/api/testing/all-data": {
      delete: {
        operationId: "clearAllData",
        responses: {
          "204": { description: "All data cleared" },
        },
        summary: "Clear all in-memory data (testing only)",
        tags: ["Testing"],
      },
    },
  });
}
