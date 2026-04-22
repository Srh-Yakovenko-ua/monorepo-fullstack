import mongoose from "mongoose";

import { env } from "../config/env.js";
import { createLogger } from "../lib/logger.js";

const log = createLogger("mongo");

export async function connectMongo(): Promise<void> {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 3000 });
  log.info({ uri: redactMongoUri(env.mongoUri) }, "connected");
}

export async function disconnectMongo(): Promise<void> {
  await mongoose.disconnect();
  log.info("disconnected");
}

function redactMongoUri(uri: string): string {
  return uri.replace(/\/\/[^@]+@/, "//***@");
}
