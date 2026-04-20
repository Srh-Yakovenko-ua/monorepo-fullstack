import { Router } from "express";
import swaggerUi from "swagger-ui-express";

import { buildOpenApiDocument } from "../lib/openapi.js";

const router: Router = Router();

router.use("/", swaggerUi.serve);
router.get("/", swaggerUi.setup(undefined, { swaggerOptions: { url: "/api/docs/json" } }));
router.get("/json", (_req, res) => {
  res.json(buildOpenApiDocument());
});

export const docsRouter: Router = router;
