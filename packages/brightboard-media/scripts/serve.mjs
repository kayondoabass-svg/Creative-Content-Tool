import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist");
const types = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".png": "image/png", ".md": "text/plain", ".txt": "text/plain" };
createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", "http://localhost");
    const name = decodeURIComponent(url.pathname).replace(/^\/+/, "") || "index.html";
    const file = path.resolve(root, name);
    if (!file.startsWith(root + path.sep) || ![".html",".js",".css",".png",".md",".txt"].includes(path.extname(file))) { res.writeHead(404).end(); return; }
    const data = await readFile(file);
    res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "frame-ancestors 'self'" }); res.end(data);
  } catch { res.writeHead(404).end("File not found"); }
}).listen(4178, "127.0.0.1", () => console.log("Offline Media Studio: http://127.0.0.1:4178"));
