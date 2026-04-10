import mongoose from "mongoose";

import { env } from "../config/env.js";
import { createLogger } from "../lib/logger.js";

const log = createLogger("mongo");

export async function connectMongo(): Promise<void> {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.mongoUri);
  log.info({ uri: env.mongoUri }, "connected");
}

export async function disconnectMongo(): Promise<void> {
  await mongoose.disconnect();
  log.info("disconnected");
}
