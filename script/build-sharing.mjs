import { build } from "esbuild";
import { readFile, writeFile, mkdir } from "node:fs/promises";
export async function buildSharing() {
  await mkdir("dist",{recursive:true});
  await build({entryPoints:["cloudflare/sharing/worker.ts"],bundle:true,format:"esm",platform:"browser",target:"es2022",outfile:"dist/sharing-worker.mjs"});
  // pg's CJS loader works inside standalone ESM; no npm install is needed on VPS.
  await build({entryPoints:["scripts/deploy-sharing-storage.ts"],bundle:true,format:"esm",platform:"node",target:"node20",external:["pg-native"],banner:{js:"import { createRequire as bbCreateRequire } from 'node:module'; const require = bbCreateRequire(import.meta.url);"},outfile:"dist/sharing-deploy.mjs"});
  await writeFile("dist/sharing-schema.json",JSON.stringify({sql:await readFile("cloudflare/sharing/schema.sql","utf8")}));
}
