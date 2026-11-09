// Dedicated private storage service: no public files, SQL endpoint or browser API.
// This Worker does not participate in BrightboardTV presentation/relay sessions.
type Statement = {
  bind(...values: any[]): Statement; first<T = any>(): Promise<T | null>;
  all<T = any>(): Promise<{ results: T[] }>; run(): Promise<any>;
};
type Env = {
  DB: { prepare(sql: string): Statement; batch(statements: Statement[]): Promise<any[]> };
  FILES: { put(key: string, value: Uint8Array, options?: any): Promise<any>; get(key: string): Promise<any>;
    delete(key: string | string[]): Promise<void>; list(options: any): Promise<any> };
  TRUSTED_KEYS: string;
};
type Actor = { id: string; email: string; name: string };
class Failure extends Error {
  constructor(public status: number, message: string, public canRequest = false) { super(message); }
}
const uuid = (v: any) => typeof v === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
const kinds = ["editor","tv","image","text","presentation","worksheet","activity","storyboard","mindmap","studio","file"];
const now = () => new Date().toISOString();
const from64 = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0));
function to64(b: Uint8Array) { let text = ""; for(let i=0;i<b.length;i+=16384) text += String.fromCharCode(...b.subarray(i,i+16384)); return btoa(text); }
const hash = async (data: Uint8Array) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", data as BufferSource))).map(v=>v.toString(16).padStart(2,"0")).join("");
function json(value: any, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "Content-Type":"application/json", "Cache-Control":"private, no-store", "X-Content-Type-Options":"nosniff" } });
}
const title = (value: any) => {
  if(typeof value !== "string" || !value.trim() || value.length > 200) throw new Failure(400,"Enter a document title of 1–200 characters.");
  return value.trim();
};
function options(body: any) {
  if(!body || typeof body !== "object" || Array.isArray(body)) throw new Failure(400,"Invalid sharing settings.");
  if(body.audience !== undefined && !["invited","link"].includes(body.audience)) throw new Failure(400,"Invalid audience.");
  for(const name of ["allowRequests","allowDownload","includePrivate","enabled"]) if(body[name] !== undefined && typeof body[name] !== "boolean") throw new Failure(400,`Invalid ${name} setting.`);
  if(body.expiresAt != null && (!Number.isFinite(Date.parse(body.expiresAt)) || Date.parse(body.expiresAt)<=Date.now())) throw new Failure(400,"Expiry must be in the future.");
}
export async function authenticated(request: Request, env: Env) {
  const timestamp=request.headers.get("x-bb-time") || "", nonce=request.headers.get("x-bb-nonce") || "", signature=request.headers.get("x-bb-signature") || "";
  if(!/^\d{13}$/.test(timestamp) || Math.abs(Date.now()-Number(timestamp))>60000 || !uuid(nonce)) throw new Failure(401,"Storage authentication required.");
  const raw=await request.text();
  if(raw.length > 24*1024*1024) throw new Failure(413,"Snapshot exceeds storage request limit.");
  let valid=false;
  for(const encoded of JSON.parse(env.TRUSTED_KEYS || "[]")) {
    try {
      const publicKey=await crypto.subtle.importKey("spki",from64(encoded),{name:"Ed25519"},false,["verify"]);
      if(await crypto.subtle.verify("Ed25519",publicKey,from64(signature),new TextEncoder().encode(`POST\n/rpc\n${timestamp}\n${nonce}\n${raw}`))) { valid=true; break; }
    } catch {}
  }
  if(!valid) throw new Failure(401,"Storage authentication failed.");
  const payload=JSON.parse(raw);
  // Anonymous reads are still signed by BrightBoard. No public R2/SQL API.
  if(payload.op === "publicGet" && payload.actor === null) return payload;
  if(!payload.actor || typeof payload.actor.id!=="string" || !payload.actor.id || payload.actor.id.length>200 ||
    typeof payload.actor.email!=="string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.actor.email) || payload.actor.email.length>320) throw new Failure(400,"Invalid signed account identity.");
  payload.actor.email=payload.actor.email.toLowerCase();
  payload.actor.name=typeof payload.actor.name==="string" ? payload.actor.name.slice(0,120) : "BrightBoard user";
  if(!["get","list","health"].includes(payload.op)) {
    try { await env.DB.prepare("INSERT INTO nonces(nonce,expires_at) VALUES(?,?)").bind(nonce,Date.now()+120000).run(); }
    catch { throw new Failure(409,"This signed operation has already been received. Reload before trying again."); }
  }
  return payload;
}

export class SharingService {
  constructor(private env: Env) {}
  q(sql: string,...args: any[]) { return this.env.DB.prepare(sql).bind(...args); }
  async document(id: string) {
    if(!uuid(id)) throw new Failure(404,"Shared document not found.");
    const doc=await this.q("SELECT * FROM documents WHERE id=?",id).first();
    if(!doc) throw new Failure(404,"Shared document not found."); return doc;
  }
  async role(doc: any, actor: Actor | null) {
    if (!actor) {
      if(!doc.enabled || (doc.expires_at && (!Number.isFinite(Date.parse(doc.expires_at)) || Date.parse(doc.expires_at)<=Date.now()))) throw new Failure(410,"This share has been disabled or has expired.");
      return doc.audience === "link" ? "viewer" : null;
    }
    if(doc.owner_id===actor.id) return "owner";
    if(!doc.enabled || (doc.expires_at && Date.parse(doc.expires_at)<=Date.now())) throw new Failure(410,"This share has been disabled or has expired.");
    const member=await this.q("SELECT role FROM members WHERE document_id=? AND email=?",doc.id,actor.email).first();
    return member?.role || (doc.audience==="link" ? "viewer" : null);
  }
  owner(doc: any, actor: Actor) { if(doc.owner_id!==actor.id) throw new Failure(403,"Only the owner can manage this document."); }
  log(id: string, actor: Actor, action: string) {
    return this.q("INSERT INTO activity(document_id,actor_id,actor_name,action,created_at) VALUES(?,?,?,?,?)",id,actor.id,actor.name,action,now());
  }
  // Every mutation's D1 batch begins by asserting the still-current authorization.
  // A NOT NULL violation aborts the complete batch if access changed since reads.
  guard(id: string, actor: Actor, ownerOnly = true) {
    const access=ownerOnly ? "owner_id=?" : "(owner_id=? OR (enabled=1 AND (expires_at IS NULL OR expires_at>?) AND EXISTS(SELECT 1 FROM members WHERE document_id=documents.id AND email=? AND role='editor')))";
    return this.q(`INSERT INTO mutation_guards(value) VALUES((SELECT 1 FROM documents WHERE id=? AND ${access}))`,
      ...[id,actor.id,...(ownerOnly?[]:[now(),actor.email])]);
  }
  async list(actor: Actor) {
    const {results}=await this.q(`SELECT d.id,d.title,d.kind,d.revision,d.updated_at,
      CASE WHEN d.owner_id=? THEN 'owner' ELSE m.role END AS role,
      CASE WHEN d.owner_id=? THEN (SELECT count(*) FROM requests r WHERE r.document_id=d.id AND r.status='pending') ELSE 0 END AS pending
      FROM documents d LEFT JOIN members m ON m.document_id=d.id AND m.email=?
      WHERE d.owner_id=? OR (m.id IS NOT NULL AND d.enabled=1 AND (d.expires_at IS NULL OR d.expires_at>?)) ORDER BY d.updated_at DESC`,
      actor.id,actor.id,actor.email,actor.id,now()).all();
    return {documents:results.map((r:any)=>({id:r.id,title:r.title,kind:r.kind,revision:r.revision,updatedAt:r.updated_at,role:r.role,pendingRequests:r.pending})),
      limits:{documentBytes:16777216,accountBytes:134217728,documents:100,revisions:50}};
  }
  async get(actor: Actor | null,id: string,revision?: string) {
    const doc=await this.document(id), role=await this.role(doc,actor);
    if(!role) throw new Failure(403,"You need permission to open this shared document.",!!doc.allow_requests);
    if(revision && !uuid(revision)) throw new Failure(400,"Invalid revision.");
    const version=await this.q("SELECT * FROM versions WHERE document_id=? AND revision=?",id,revision || doc.revision).first();
    if(!version) throw new Failure(404,"This revision was not found.");
    const object=await this.env.FILES.get(version.object_key);
    if(!object) throw new Failure(503,"This stored snapshot is unavailable. Your source and previous versions have not been changed.");
    const bytes=new Uint8Array(await object.arrayBuffer());
    if(await hash(bytes)!==version.sha256) throw new Failure(503,"Snapshot integrity check failed.");
    const versions=(await this.q("SELECT revision,created_at AS createdAt FROM versions WHERE document_id=? ORDER BY created_at DESC",id).all()).results;
    const result:any={id,title:version.title,kind:doc.kind,packed:to64(bytes),revision:version.revision,latestRevision:doc.revision,role,
      audience:doc.audience,allowRequests:!!doc.allow_requests,allowDownload:!!doc.allow_download,includePrivate:!!doc.include_private,
      enabled:!!doc.enabled,expiresAt:doc.expires_at,updatedAt:doc.updated_at,versions,members:[],requests:[],activity:[]};
    if(role==="owner") {
      result.members=(await this.q("SELECT id,email,role FROM members WHERE document_id=? ORDER BY created_at",id).all()).results;
      result.requests=(await this.q("SELECT user_id AS userId,name,message,status FROM requests WHERE document_id=? ORDER BY updated_at DESC",id).all()).results;
      result.activity=(await this.q("SELECT action,created_at AS createdAt,actor_name AS actorName FROM activity WHERE document_id=? ORDER BY id DESC LIMIT 50",id).all()).results;
    }
    return result;
  }
  async putSnapshot(id: string,revision: string,body: any) {
    if(typeof body.packed!=="string" || body.packed.length>23*1024*1024 || !Number.isInteger(body.bytes) || body.bytes<1 || body.bytes>16777216) throw new Failure(413,"Shared documents are limited to 16 MB.");
    const data=from64(body.packed);
    if(data[0]!==31 || data[1]!==139) throw new Failure(400,"Invalid compressed snapshot.");
    const key=`projects/${id}/${revision}.json.gz`, sha=await hash(data);
    await this.env.FILES.put(key,data,{httpMetadata:{contentType:"application/gzip"},customMetadata:{sha256:sha}});
    return {key,sha};
  }
  async create(actor: Actor,body:any) {
    options(body); const name=title(body.title);
    if(!kinds.includes(body.kind)) throw new Failure(400,"Unsupported document type.");
    const id=crypto.randomUUID(), revision=crypto.randomUUID(), at=now();
    const object=await this.putSnapshot(id,revision,body);
    try {
      await this.env.DB.batch([
        this.q(`INSERT INTO documents(id,owner_id,title,kind,revision,audience,allow_requests,allow_download,include_private,expires_at,created_at,updated_at)
          VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`,id,actor.id,name,body.kind,revision,body.audience||"invited",body.allowRequests===false?0:1,body.allowDownload===true?1:0,body.includePrivate===true?1:0,body.expiresAt?new Date(body.expiresAt).toISOString():null,at,at),
        this.q("INSERT INTO versions VALUES(?,?,?,?,?,?,?,?)",id,revision,actor.id,name,object.key,body.bytes,object.sha,at),
        this.log(id,actor,"created"),
      ]);
    } catch(e) { await this.env.FILES.delete(object.key).catch(()=>{}); throw e; }
    return this.get(actor,id);
  }
  async save(actor:Actor,id:string,body:any,expected:string) {
    const doc=await this.document(id),role=await this.role(doc,actor);
    if(!["owner","editor"].includes(role||"")) throw new Failure(403,"Editing requires the owner's approval.");
    if(!expected || expected!==doc.revision) throw new Failure(409,"A newer revision exists. Your local changes have not been published.");
    const name=title(body.title),revision=crypto.randomUUID(),at=now(),object=await this.putSnapshot(id,revision,body);
    try {
      await this.env.DB.batch([
        this.guard(id,actor,false),
        // Checking and updating in one atomic batch avoids lost concurrent edits.
        this.q("INSERT INTO mutation_guards(value) VALUES((SELECT 1 FROM documents WHERE id=? AND revision=?))",id,expected),
        this.q("UPDATE documents SET title=?,revision=?,updated_at=? WHERE id=?",name,revision,at,id),
        this.q("INSERT INTO versions VALUES(?,?,?,?,?,?,?,?)",id,revision,actor.id,name,object.key,body.bytes,object.sha,at),
        this.log(id,actor,"published revision"),
        this.q("DELETE FROM mutation_guards"),
      ]);
    } catch(e) { await this.env.FILES.delete(object.key).catch(()=>{}); throw e; }
    return this.get(actor,id);
  }
  async configure(actor:Actor,id:string,body:any) {
    options(body);const doc=await this.document(id);this.owner(doc,actor);
    await this.env.DB.batch([this.guard(id,actor),
      this.q("UPDATE documents SET audience=?,allow_requests=?,allow_download=?,enabled=?,expires_at=?,updated_at=? WHERE id=?",
        body.audience??doc.audience,body.allowRequests===undefined?doc.allow_requests:+body.allowRequests,body.allowDownload===undefined?doc.allow_download:+body.allowDownload,
        body.enabled===undefined?doc.enabled:+body.enabled,body.expiresAt===undefined?doc.expires_at:body.expiresAt?new Date(body.expiresAt).toISOString():null,now(),id),
      this.log(id,actor,"changed sharing settings"),this.q("DELETE FROM mutation_guards")]);
    return this.get(actor,id);
  }
  async invite(actor:Actor,id:string,body:any) {
    const doc=await this.document(id);this.owner(doc,actor);
    const email=typeof body.email==="string"?body.email.trim().toLowerCase():"";
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>320||!["viewer","editor"].includes(body.role)) throw new Failure(400,"Enter an email and choose viewer or editor.");
    await this.env.DB.batch([this.guard(id,actor),this.q("INSERT INTO members VALUES(?,?,?,?,?) ON CONFLICT(document_id,email) DO UPDATE SET role=excluded.role",crypto.randomUUID(),id,email,body.role,now()),
      this.log(id,actor,"invited account"),this.q("DELETE FROM mutation_guards")]);
    return this.get(actor,id);
  }
  async removeMember(actor:Actor,id:string,memberId:string) {
    const doc=await this.document(id);this.owner(doc,actor);
    if(!uuid(memberId)) throw new Failure(400,"Invalid invitation.");
    await this.env.DB.batch([this.guard(id,actor),this.q("DELETE FROM members WHERE document_id=? AND id=?",id,memberId),this.log(id,actor,"revoked account access"),this.q("DELETE FROM mutation_guards")]);
    return this.get(actor,id);
  }
  async request(actor:Actor,id:string,body:any) {
    const doc=await this.document(id);await this.role(doc,actor);
    if(doc.owner_id===actor.id) throw new Failure(400,"You already own this document.");
    if(!doc.allow_requests) throw new Failure(403,"This owner is not accepting edit requests.");
    if(typeof body.message!=="string"||body.message.length>1000) throw new Failure(400,"Requests can include up to 1,000 characters.");
    const at=now();
    const result=await this.env.DB.batch([
      this.q("INSERT INTO mutation_guards(value) VALUES((SELECT 1 FROM documents WHERE id=? AND enabled=1 AND allow_requests=1 AND (expires_at IS NULL OR expires_at>?)))",id,at),
      this.q(`INSERT INTO requests VALUES(?,?,?,?,?,'pending',?) ON CONFLICT(document_id,user_id)
        DO UPDATE SET email=excluded.email,name=excluded.name,message=excluded.message,status='pending',updated_at=excluded.updated_at
        WHERE requests.updated_at<?`,id,actor.id,actor.email,actor.name,body.message,at,new Date(Date.now()-60000).toISOString()),
      this.q("DELETE FROM mutation_guards"),
    ]);
    if(!result[1]?.meta?.changes) throw new Failure(429,"Your request was recorded. Please wait before requesting again.");
    return {success:true,message:"Request sent. The owner can review it in Shared documents."};
  }
  async decide(actor:Actor,id:string,userId:string,body:any) {
    const doc=await this.document(id);this.owner(doc,actor);
    if(!["approve","decline"].includes(body.decision)) throw new Failure(400,"Choose approve or decline.");
    const request=await this.q("SELECT email FROM requests WHERE document_id=? AND user_id=? AND status='pending'",id,userId).first();
    if(!request) throw new Failure(404,"Pending request not found.");
    const statements=[this.guard(id,actor)];
    if(body.decision==="approve") statements.push(this.q("INSERT INTO members VALUES(?,?,?,'editor',?) ON CONFLICT(document_id,email) DO UPDATE SET role='editor'",crypto.randomUUID(),id,request.email,now()));
    statements.push(this.q("UPDATE requests SET status=?,updated_at=? WHERE document_id=? AND user_id=?",body.decision==="approve"?"approved":"declined",now(),id,userId),
      this.log(id,actor,`${body.decision}d edit request`),this.q("DELETE FROM mutation_guards"));
    await this.env.DB.batch(statements);return this.get(actor,id);
  }
  async remove(actor:Actor,id:string) {
    const doc=await this.document(id);this.owner(doc,actor);
    await this.env.DB.batch([this.guard(id,actor),
      this.q("INSERT OR IGNORE INTO deletion_queue SELECT object_key,? FROM versions WHERE document_id=?",now(),id),
      this.q("DELETE FROM documents WHERE id=?",id),this.q("DELETE FROM mutation_guards")]);
    return {success:true};
  }
  async removeAccount(actor:Actor) {
    await this.env.DB.batch([
      this.q("INSERT OR IGNORE INTO deletion_queue SELECT v.object_key,? FROM versions v JOIN documents d ON d.id=v.document_id WHERE d.owner_id=?",now(),actor.id),
      this.q("DELETE FROM documents WHERE owner_id=?",actor.id),
      this.q("DELETE FROM requests WHERE user_id=?",actor.id),
      this.q("DELETE FROM members WHERE email=?",actor.email),
    ]);return {success:true};
  }
}
export async function maintenance(env: Env) {
  const service=new SharingService(env);
  const queue=await service.q("SELECT object_key FROM deletion_queue ORDER BY created_at LIMIT 50").all();
  if(queue.results.length) {
    const keys=queue.results.map((item:any)=>item.object_key);
    await env.FILES.delete(keys);
    await service.q(`DELETE FROM deletion_queue WHERE object_key IN (${keys.map(()=>"?").join(",")})`,...keys).run();
  }
  await service.q("DELETE FROM nonces WHERE expires_at<?",Date.now()).run();
  // Crash-created orphan uploads: never remove recent/in-flight snapshots.
  const state=await service.q("SELECT value FROM maintenance_state WHERE name='orphan-cursor'").first();
  const page=await env.FILES.list({prefix:"projects/",limit:10,...(state?.value?{cursor:state.value}:{})});
  for(const item of page.objects) {
    if(new Date(item.uploaded).getTime()>Date.now()-86400000) continue;
    const referenced=await service.q("SELECT 1 FROM versions WHERE object_key=?",item.key).first();
    if(!referenced) await env.FILES.delete(item.key);
  }
  await service.q("INSERT INTO maintenance_state VALUES('orphan-cursor',?) ON CONFLICT(name) DO UPDATE SET value=excluded.value",page.truncated?page.cursor:"").run();
}
export default {
  async fetch(request: Request,env: Env,ctx: {waitUntil(p:Promise<any>):void}) {
    try {
      if(request.method!=="POST" || new URL(request.url).pathname!=="/rpc") return json({error:"Not found."},404);
      const p=await authenticated(request,env), service=new SharingService(env);
      let result:any;
      switch(p.op) {
        case "health": await service.q("SELECT 1").first();await env.FILES.list({limit:1});result={ok:true,storage:"cloudflare-d1-r2",version:2,anonymousLinkViewing:true};break;
        case "list":result=await service.list(p.actor);break;
        case "get":result=await service.get(p.actor,p.id,p.revision);break;
        case "publicGet":result=await service.get(null,p.id,p.revision);break;
        case "create":result=await service.create(p.actor,p.body);break;
        case "save":result=await service.save(p.actor,p.id,p.body,p.expected);break;
        case "configure":result=await service.configure(p.actor,p.id,p.body);break;
        case "invite":result=await service.invite(p.actor,p.id,p.body);break;
        case "removeMember":result=await service.removeMember(p.actor,p.id,p.memberId);break;
        case "request":result=await service.request(p.actor,p.id,p.body);break;
        case "decide":result=await service.decide(p.actor,p.id,p.userId,p.body);break;
        case "remove":result=await service.remove(p.actor,p.id);ctx.waitUntil(maintenance(env));break;
        case "removeAccount":result=await service.removeAccount(p.actor);ctx.waitUntil(maintenance(env));break;
        default:throw new Failure(400,"Unknown storage operation.");
      }
      return json(result);
    } catch(error:any) {
      if(error instanceof Failure) return json({error:error.message,canRequest:error.canRequest},error.status);
      if(/SHARING_.*LIMIT/.test(error?.message || "")) return json({error:"Sharing storage limit reached. Keep backups before deleting older documents."},413);
      if(/mutation_guards\.value/.test(error?.message||"")) return json({error:"Document access or revision changed. Your local work is unchanged; reload before publishing."},409);
      // Do not leak SQL, bindings, file names or signatures into HTTP responses.
      console.error("Sharing storage operation failed",error?.name || "Error");
      return json({error:"Cloudflare sharing storage is temporarily unavailable. Keep your local backup."},503);
    }
  },
  async scheduled(_event:any,env:Env,ctx:{waitUntil(p:Promise<any>):void}) {ctx.waitUntil(maintenance(env));},
};
