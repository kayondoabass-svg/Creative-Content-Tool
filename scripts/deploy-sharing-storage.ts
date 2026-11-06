import { readFile, writeFile, rename } from "node:fs/promises";
import { resolve } from "node:path";
import { sharingPublicKey } from "../server/sharing-signature";
import pg from "pg";

const root=process.cwd();
const stage=process.argv.includes("--production")?"production":process.argv.includes("--preview")?"preview":null;
if(!stage) throw new Error("Choose --preview or --production explicitly; existing resources are never renamed.");
const account=process.env.CLOUDFLARE_ACCOUNT_ID;
const token=process.env.CLOUDFLARE_API_TOKEN?.trim().replace(/^Bearer\s+/i,"").replace(/^(['"])(.*)\1$/s,"$2");
if(!account || !/^[a-f0-9]{32}$/i.test(account) || !token) throw new Error("Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN securely.");
const name=stage==="production"?"brightboard-sharing":"brightboard-sharing-preview";
const base=`/accounts/${account}`;
// Never silently strand any documents created by the earlier PostgreSQL release.
// Existing accounts/TV tables are queried neither for migration nor modification.
if(stage==="production") {
  if(!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required to check existing shared documents safely.");
  const client=new pg.Client({connectionString:process.env.DATABASE_URL});
  try {
    await client.connect();
    const exists=await client.query("SELECT to_regclass('public.shared_documents') AS name");
    if(exists.rows[0].name) {
      const count=await client.query("SELECT count(*)::int AS count FROM public.shared_documents");
      if(count.rows[0].count>0) throw new Error("Existing PostgreSQL shared documents found. Refusing storage switch until a verified link-preserving migration is prepared. No existing documents have been changed.");
    }
  } catch(error:any) {
    if(error?.message?.startsWith("Existing PostgreSQL")) throw error;
    throw new Error("Could not safely check existing shared documents. No storage switch performed.");
  } finally {await client.end();}
}
async function api(path:string,method="GET",body?:any) {
  const response=await fetch(`https://api.cloudflare.com/client/v4${path}`,{method,headers:{Authorization:`Bearer ${token}`,...(body instanceof FormData?{}:{"Content-Type":"application/json"})},
    body:body===undefined?undefined:body instanceof FormData?body:JSON.stringify(body),signal:AbortSignal.timeout(60000)});
  const json:any=await response.json();
  if(!response.ok||!json.success) throw new Error(`Cloudflare ${method} ${path.split("/").slice(-2).join("/")}: HTTP ${response.status}; error codes ${(json.errors||[]).map((e:any)=>e.code).join(",")}`);
  return json.result;
}
const databases=await api(`${base}/d1/database?per_page=100`);
let database=databases.find((r:any)=>r.name===name);
if(!database) database=await api(`${base}/d1/database`,"POST",{name});
const buckets=await api(`${base}/r2/buckets?per_page=100`);
if(!(buckets.buckets||[]).some((r:any)=>r.name===name)) await api(`${base}/r2/buckets`,"POST",{name});
// New private bucket: never enable an r2.dev URL, public domain or browser CORS.
const managed=await api(`${base}/r2/buckets/${name}/domains/managed`);
const custom=await api(`${base}/r2/buckets/${name}/domains/custom`);
if(managed.enabled || (custom.domains||[]).some((domain:any)=>domain.enabled)) {
  throw new Error("This sharing bucket has public access enabled. Refusing deployment; review bucket access before continuing.");
}
const schema=JSON.parse(await readFile(resolve(root,"dist/sharing-schema.json"),"utf8")).sql;
await api(`${base}/d1/database/${database.uuid}/query`,"POST",{sql:schema,params:[]});
const code=await readFile(resolve(root,"dist/sharing-worker.mjs"),"utf8");
const metadata={
  main_module:"worker.mjs",compatibility_date:"2026-11-01",
  bindings:[{type:"d1",name:"DB",id:database.uuid},{type:"r2_bucket",name:"FILES",bucket_name:name},
    {type:"plain_text",name:"TRUSTED_KEYS",text:JSON.stringify([sharingPublicKey()])}],
};
// Do not overwrite an existing production trust key with a different machine's key.
let existing:any[]=[];
try {existing=await api(`${base}/workers/scripts/${name}/settings`).then(r=>r.bindings||[]);}
catch(e) {if(!(e instanceof Error && /HTTP 404/.test(e.message))) throw e;}
const old=existing.find(r=>r.name==="TRUSTED_KEYS");
if(old && old.text!==metadata.bindings[2].text && !process.argv.includes("--rotate-key")) throw new Error("This Worker trusts a different server key. Refusing replacement; deploy from the original server or deliberately use --rotate-key after confirming the server secret rotation.");
const form=new FormData();form.set("metadata",new Blob([JSON.stringify(metadata)],{type:"application/json"}));
form.set("worker.mjs",new Blob([code],{type:"application/javascript+module"}),"worker.mjs");
await api(`${base}/workers/scripts/${name}`,"PUT",form);
await api(`${base}/workers/scripts/${name}/subdomain`,"POST",{enabled:true});
await api(`${base}/workers/scripts/${name}/schedules`,"PUT",[{cron:"0 */6 * * *"}]);
const subdomain=await api(`${base}/workers/subdomain`);
const url=`https://${name}.${subdomain.subdomain}.workers.dev`;
if(process.env.SHARING_STORAGE_URL && process.env.SHARING_STORAGE_URL!==url) {
  throw new Error("SHARING_STORAGE_URL overrides this deployment with another service. Resolve that configuration explicitly; no local configuration was changed.");
}
// Confirm both bindings and the server's signer before activating configuration.
const {sharingSignature}=await import("../server/sharing-signature");
const health=JSON.stringify({op:"health",actor:{id:"storage-deploy-check",email:"storage-check@example.invalid",name:"Deployment check"}});
let healthy=false;
for(let attempt=0;attempt<4;attempt++) {
  try {
    const response=await fetch(`${url}/rpc`,{method:"POST",headers:sharingSignature(health),body:health,signal:AbortSignal.timeout(15000)});
    const result:any=await response.json();healthy=response.ok&&result.storage==="cloudflare-d1-r2";
    if(healthy) break;
  } catch {}
  if(attempt<3) await new Promise(resolve=>setTimeout(resolve,2000));
}
if(!healthy) throw new Error("The private D1/R2 service did not pass its signed health check. Local storage configuration was not changed.");
if(process.argv.includes("--save-config")) {
  const path=resolve(root,"sharing-storage.config.json"),config={stage,SHARING_STORAGE_URL:url,d1DatabaseId:database.uuid,r2Bucket:name};
  try {
    const previous=JSON.parse(await readFile(path,"utf8"));
    if(previous.SHARING_STORAGE_URL!==url) throw new Error("Existing sharing configuration targets another service. Refusing replacement.");
  } catch(error:any) {if(error.code!=="ENOENT") throw error;}
  const temporary=`${path}.${process.pid}.tmp`;
  await writeFile(temporary,JSON.stringify(config,null,2),{mode:0o600});
  await rename(temporary,path);
}
console.log(JSON.stringify({stage,worker:name,d1DatabaseId:database.uuid,r2Bucket:name,SHARING_STORAGE_URL:url,
  healthy,configSaved:process.argv.includes("--save-config"),
  note:"Public service address; /rpc rejects unsigned requests. No credentials are printed."},null,2));
