let app;

export default async function handler(req, res) {
  if (!app) {
    const { createApp } = await import("../apps/api/dist/app.js");
    app = createApp();
  }
  app(req, res);
}
