import express from "express";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { runWorkflow } from "./service.js";
const app = express();
app.use(express.json({ limit: "5mb" }));
// Local/LAN app. No permissive CORS; cross-origin browser mutations are rejected.
app.use((req, res, next) => {
  if (
    req.method === "POST" &&
    req.headers.origin &&
    new URL(req.headers.origin).host !== req.headers.host
  ) {
    res.status(403).json({ error: "Cross-origin requests are disabled." });
    return;
  }
  next();
});
let busy = false;
app.post("/api/evaluate", async (req, res) => {
  if (busy) {
    res
      .status(409)
      .json({
        error: "An evaluation is already running. Try again when it finishes.",
      });
    return;
  }
  busy = true;
  try {
    res.json(await runWorkflow(req.body));
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : String(e) });
  } finally {
    busy = false;
  }
});
app.get("/api/demo", async (_req, res) => {
  res.json({
    current: await readFile("fixtures/current.xml", "utf8"),
    target: await readFile("fixtures/target.xml", "utf8"),
    candidates: JSON.parse(await readFile("fixtures/candidates.json", "utf8")),
  });
});
if (existsSync("dist/index.html")) app.use(express.static(resolve("dist")));
else {
  const { createServer } = await import("vite");
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => res.status(400).json({ error: err.message }),
);
const host = process.env.HOST || "127.0.0.1",
  port = Number(process.env.PORT || 3000);
app.listen(port, host, () =>
  console.log(`Gear Oracle: http://${host}:${port}`),
);
