import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)), base: "./", plugins: [react()],
  server: { host: "0.0.0.0", allowedHosts: true, proxy: { "/api/tv": "http://127.0.0.1:4174" } },
  build: { outDir: "dist", emptyOutDir: true },
});
