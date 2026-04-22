import { Router } from "express";

import { buildOpenApiDocument } from "../lib/openapi.js";

const SWAGGER_UI_VERSION = "5.17.14";
const SWAGGER_UI_CDN = `https://cdn.jsdelivr.net/npm/swagger-ui-dist@${SWAGGER_UI_VERSION}`;

const swaggerHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>monorepo-fullstack API</title>
  <link rel="stylesheet" href="${SWAGGER_UI_CDN}/swagger-ui.css" />
  <link rel="icon" type="image/png" href="${SWAGGER_UI_CDN}/favicon-32x32.png" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="${SWAGGER_UI_CDN}/swagger-ui-bundle.js"></script>
  <script src="${SWAGGER_UI_CDN}/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: "/api/docs/json",
        dom_id: "#swagger-ui",
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset.slice(0, -1)],
        layout: "StandaloneLayout",
      });
    };
  </script>
</body>
</html>`;

const router: Router = Router();

router.get("/", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(swaggerHtml);
});

router.get("/json", (_req, res) => {
  res.json(buildOpenApiDocument());
});

export const docsRouter: Router = router;
