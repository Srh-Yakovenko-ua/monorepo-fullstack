import mongoose from "mongoose";
import { afterAll, afterEach, beforeAll } from "vitest";

import { resetAuthRateLimit } from "../core/guards/auth-rate-limit.guard.js";

beforeAll(async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI not set by globalSetup");
  const workerId = process.env.VITEST_POOL_ID ?? "0";
  const dbName = `test_${workerId}`;
  await mongoose.connect(uri, { dbName });
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});

afterEach(async () => {
  const db = mongoose.connection.db;
  if (!db) {
    await resetAuthRateLimit();
    return;
  }
  const collections = await db.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
  await resetAuthRateLimit();
});
