import { gunzipSync } from "node:zlib";
import { prepareSharedContent, SHARE_LIMITS, ShareError, type DocumentSharingStore } from "./document-sharing-store";
import { sharingSignature } from "./sharing-signature";
import { readFileSync } from "node:fs";
import { withoutPrivateShareFields } from "../shared/share-privacy";

export type SharingStore = Pick<DocumentSharingStore, "list"|"create"|"get"|"save"|"configure"|"invite"|"removeMember"|"request"|"decide"|"remove"|"fork"> & { publicGet?: (id: string, revision?: string) => Promise<any> };
type Viewer = {id:string;email:string;firstName?:string;emailVerified?:boolean};
export function sharingStorageURL() {
  if(process.env.SHARING_STORAGE_URL) {
    if(process.env.NODE_ENV==="production" && /^https:\/\/brightboard-sharing-preview\./.test(process.env.SHARING_STORAGE_URL)) {
      throw new ShareError(503,"Production sharing cannot use preview storage.");
    }
    return process.env.SHARING_STORAGE_URL;
  }
  try {
    const config=JSON.parse(readFileSync("sharing-storage.config.json","utf8"));
    if(process.env.NODE_ENV==="production" && config.stage!=="production") throw new Error("Wrong storage stage");
    if(typeof config.SHARING_STORAGE_URL!=="string") throw new Error("Missing service address");
    return config.SHARING_STORAGE_URL;
  } catch(error:any) {
    if(error?.code==="ENOENT") return "";
    throw new ShareError(503,"Invalid sharing storage configuration. Your local work is unchanged.");
  }
}

// Authenticated API server -> signed Worker RPC -> private D1/R2 bindings.
// Cloudflare setup credentials are never needed for normal document requests.
export class CloudflareSharingStore implements SharingStore {
  constructor(private url?: string, private secret?: string) {}
  async rpc(op:string,viewer:Viewer | null,args:Record<string,unknown>={}) {
    // Resolve lazily: a storage/configuration fault must not stop the main app
    // or BrightboardTV's independent relay from starting.
    const url=this.url ?? sharingStorageURL();
    if(!url) throw new ShareError(503,"Cloudflare sharing storage is not configured. Your local work is unchanged.");
    let endpoint:URL;
    try {endpoint=new URL("/rpc",url);if(endpoint.protocol!=="https:" || endpoint.username || endpoint.password) throw new Error();}
    catch {throw new ShareError(503,"Invalid private sharing storage configuration.");}
    if (!viewer && op !== "publicGet") throw new ShareError(401,"Sign in to change shared documents.");
    const body=JSON.stringify({op,actor:viewer ? {id:viewer.id,email:viewer.email,name:viewer.firstName||"BrightBoard user"} : null,...args});
    let response:Response;
    try {response=await fetch(endpoint,{method:"POST",headers:sharingSignature(body,this.secret),body,signal:AbortSignal.timeout(45000),redirect:"error"});}
    catch {throw new ShareError(503,"Cloudflare sharing storage could not be reached. Your local work is unchanged; keep a backup.");}
    let result:any;try {result=await response.json();}catch {throw new ShareError(503,"Cloudflare returned an invalid storage response.");}
    if(!response.ok) {
      if(response.status===401) throw new ShareError(503,"The BrightBoard server is not authorized for sharing storage. Please contact support; your local work is unchanged.");
      throw new ShareError([400,403,404,409,410,413,429,503].includes(response.status)?response.status:503,
        typeof result.error==="string"?result.error:"Cloudflare sharing storage is unavailable.",result.canRequest===true);
    }
    if(typeof result.packed==="string") {
      try {
        result.content=JSON.parse(gunzipSync(Buffer.from(result.packed,"base64"),{maxOutputLength:SHARE_LIMITS.documentBytes}).toString());
        if (!result.includePrivate) result.content = withoutPrivateShareFields(result.content);
        delete result.packed;
      } catch {throw new ShareError(503,"The stored snapshot failed validation. Your local work is unchanged.");}
    }
    return result;
  }
  private pack(kind:string,body:any,includePrivate:boolean) {
    if(!body || typeof body!=="object") throw new ShareError(400,"Invalid document.");
    const packed=prepareSharedContent(kind,body.content,includePrivate);
    const {content:_,...settings}=body;
    return {...settings,packed:packed.content.toString("base64"),bytes:packed.bytes};
  }
  list(v:Viewer){return this.rpc("list",v);}
  get(v:Viewer,id:string,revision?:string){return this.rpc("get",v,{id,revision});}
  publicGet(id:string,revision?:string){return this.rpc("publicGet",null,{id,revision});}
  create(v:Viewer,body:any){return this.rpc("create",v,{body:this.pack(body?.kind,body,body?.includePrivate===true)});}
  async save(v:Viewer,id:string,body:any,expected?:string){
    const doc=await this.get(v,id);
    if(!["owner","editor"].includes(doc.role)) throw new ShareError(403,"Editing requires the owner's approval.");
    return this.rpc("save",v,{id,expected:expected?.replace(/^"|"$/g,""),body:this.pack(doc.kind,body,doc.includePrivate)});
  }
  configure(v:Viewer,id:string,body:any){return this.rpc("configure",v,{id,body});}
  invite(v:Viewer,id:string,body:any){return this.rpc("invite",v,{id,body});}
  removeMember(v:Viewer,id:string,memberId:string){return this.rpc("removeMember",v,{id,memberId});}
  request(v:Viewer,id:string,body:any){return this.rpc("request",v,{id,body});}
  decide(v:Viewer,id:string,userId:string,body:any){return this.rpc("decide",v,{id,userId,body});}
  async remove(v:Viewer,id:string){await this.rpc("remove",v,{id});}
  async fork(v:Viewer,id:string){
    const doc=await this.get(v,id);
    if(doc.role!=="owner"&&!doc.allowDownload) throw new ShareError(403,"The owner has not allowed copies or downloads.");
    return this.create(v,{kind:doc.kind,title:`Copy of ${doc.title}`.slice(0,200),content:doc.content,includePrivate:doc.includePrivate});
  }
  removeAccount(v:Viewer){return this.rpc("removeAccount",v);}
}
