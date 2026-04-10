import type { RequestHandler } from "express";

import { randomUUID } from "node:crypto";

const HEADER = "x-request-id";

export const requestId: RequestHandler = (req, res, next) => {
  const incoming = req.header(HEADER);
  const id = incoming ?? randomUUID();
  req.requestId = id;
  res.setHeader(HEADER, id);
  next();
};
