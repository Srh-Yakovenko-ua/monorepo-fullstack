import { pinoHttp } from "pino-http";

import { logger } from "../lib/logger.js";

export const requestLogger = pinoHttp({
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  genReqId: (req) => (req as unknown as { requestId: string }).requestId,
  logger,
  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
});
