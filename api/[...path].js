let app;

export default async function handler(req, res) {
  if (!app) {
    const { createApp } = await import("../apps/api/src/app.js");
    app = createApp();
  }
  app(req, res);
}
