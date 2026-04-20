import { Router } from "express";

import { clearAllData } from "../controllers/testing.controller.js";
import { registerPaths } from "../lib/openapi.js";

const router: Router = Router();

router.delete("/all-data", clearAllData);

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

export const testingRouter: Router = router;
