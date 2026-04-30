import type { Response } from "express";

import { Controller, Get, Header, Res } from "@nestjs/common";

import { buildOpenApiDocument } from "../../lib/openapi.js";

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
        validatorUrl: null,
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset.slice(0, -1)],
        layout: "StandaloneLayout",
      });
    };
  </script>
</body>
</html>`;

@Controller("api/docs")
export class DocsController {
  @Get()
  @Header("Content-Type", "text/html; charset=utf-8")
  getSwaggerUi(@Res({ passthrough: true }) _response: Response): string {
    return swaggerHtml;
  }

  @Get("json")
  getOpenApiDocument(): ReturnType<typeof buildOpenApiDocument> {
    return buildOpenApiDocument();
  }
}
