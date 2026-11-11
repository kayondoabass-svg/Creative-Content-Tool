// Read-only anonymous browser check: no sign-in, account creation or production writes.
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
const url = process.argv[2] || `https://${process.env.REPLIT_DEV_DOMAIN}/`;
const families = JSON.parse(await readFile("client/public/fonts/manifest.json", "utf8")).families;
const temp = await mkdtemp(path.join(tmpdir(), "brightboard-font-check-"));
const browser = spawn("chromium", ["--headless", "--no-sandbox", "--disable-dev-shm-usage",
  `--user-data-dir=${temp}`, "--remote-debugging-port=0", "about:blank"], { stdio: "ignore" });
let socket;
const requests = [];
try {
  let port;
  for (let i = 0; i < 100; i++) {
    try { port = Number((await readFile(path.join(temp, "DevToolsActivePort"), "utf8")).split("\n")[0]); break; }
    catch { await new Promise(resolve => setTimeout(resolve, 100)); }
  }
  if (!port) throw new Error("Chromium did not start.");
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(targets.find(target => target.type === "page").webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
  let serial = 0;
  const pending = new Map();
  socket.addEventListener("message", event => {
    const message = JSON.parse(String(event.data));
    if (message.method === "Network.requestWillBeSent") requests.push(message.params.request.url);
    const callback = pending.get(message.id);
    if (callback) { pending.delete(message.id); callback(message); }
  });
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++serial;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`${method} timed out`)); }, 45000);
    pending.set(id, message => { clearTimeout(timer); message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result); });
    socket.send(JSON.stringify({ id, method, params }));
  });
  await call("Network.enable");
  await call("Page.navigate", { url });
  await new Promise(resolve => setTimeout(resolve, 5000));
  const check = await call("Runtime.evaluate", {
    expression: `(async()=>{await document.fonts.ready;return Promise.all(${JSON.stringify(families)}.map(async family=>({family,count:(await document.fonts.load('400 16px "'+family+'"','BrightBoard')).length})));})()`,
    awaitPromise: true, returnByValue: true,
  });
  if (check.exceptionDetails) throw new Error(check.exceptionDetails.exception?.description || "Font rendering failed.");
  const results = check.result.value;
  const blocked = requests.filter(request => /^https?:\/\/(?:fonts\.googleapis\.com|fonts\.gstatic\.com|[^/]*googlesyndication\.com|[^/]*doubleclick\.net)\//.test(request));
  if (blocked.length || results.length !== 26 || results.some(result => result.count < 1)) {
    throw new Error(JSON.stringify({ forbiddenRequests: blocked, fonts: results }));
  }
  console.log(JSON.stringify({ passed: true, fontFamiliesLoaded: results.length,
    localFontRequests: requests.filter(request => new URL(request).origin === new URL(url).origin && new URL(request).pathname.endsWith(".woff2")).length,
    googleFontRequests: 0, advertisingRequests: 0 }));
} finally {
  socket?.close();
  browser.kill("SIGTERM");
  if (browser.exitCode === null) await new Promise(resolve => browser.once("exit", resolve));
  await rm(temp, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
}
