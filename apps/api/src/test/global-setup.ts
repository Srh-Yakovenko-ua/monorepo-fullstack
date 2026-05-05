import { MongoMemoryServer } from "mongodb-memory-server";

let mongoServer: MongoMemoryServer | undefined;

export async function setup(): Promise<void> {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongoServer.getUri();
}

export async function teardown(): Promise<void> {
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = undefined;
  }
}
