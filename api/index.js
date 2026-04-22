let bootstrapPromise;

async function bootstrap() {
  const [{ createApp }, { connectMongo }] = await Promise.all([
    import("../apps/api/dist/app.js"),
    import("../apps/api/dist/db/mongo.js"),
  ]);
  connectMongo().catch((err) => {
    console.error("[api] mongo connect failed, DB routes will fail until it recovers", err);
  });
  return createApp();
}

export default async function handler(req, res) {
  try {
    if (!bootstrapPromise) {
      bootstrapPromise = bootstrap().catch((err) => {
        bootstrapPromise = undefined;
        throw err;
      });
    }
    const app = await bootstrapPromise;
    app(req, res);
  } catch (err) {
    console.error("[api] bootstrap failed", err);
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        error: "BootstrapFailed",
        message: err instanceof Error ? err.message : String(err),
      }),
    );
  }
}
