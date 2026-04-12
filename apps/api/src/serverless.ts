import type { Request, Response } from "express";

import { createApp } from "./app.js";

const app = createApp();

export default function handler(req: Request, res: Response): void {
  app(req, res);
}
