import express from "express";
import path from "node:path";
import { createTvRelay } from "./relay";
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "13mb" }));
const relay = createTvRelay();
app.use("/api/tv", relay.router);
// Run `npm start` from the repository root. Never serve the source/server folder.
app.use(express.static(path.resolve("dist"), { index: "index.html" }));
app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(error.status === 413 ? 413 : 500).json({ error: error.status === 413 ? "Presentation exceeds sharing size limit." : "Request failed." });
});
const port = Number(process.env.PORT || 4174);
const server = app.listen(port, "0.0.0.0", () => console.log(`BrightboardTV listening on port ${port}`));
const close = () => { relay.close(); server.close(() => process.exit(0)); };
process.on("SIGTERM", close); process.on("SIGINT", close);
