import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { buildInfo } from "./scripts/version-info.mjs";
const info = buildInfo(fileURLToPath(new URL(".", import.meta.url)));
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)), base: "./", plugins: [react(), {
    name: "brightboardtv-version",
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "version.json", source: JSON.stringify(info) });
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split("?")[0] !== "/version.json") return next();
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
        res.end(JSON.stringify(info));
      });
    },
  }],
  define: { __TV_VERSION__: JSON.stringify(info.version), __TV_BUILD_ID__: JSON.stringify(info.buildId) },
  server: { host: "0.0.0.0", allowedHosts: true, proxy: { "/api/tv": "http://127.0.0.1:4174" } },
  build: { outDir: "dist", emptyOutDir: true },
});
