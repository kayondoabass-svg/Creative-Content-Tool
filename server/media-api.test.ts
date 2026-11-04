import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { registerMediaAPI, hashMediaKey, validateRenderRequest, mediaDailyQuota } from "./media-api";
import { newProject } from "../packages/brightboard-media/src/engine";
import { renderMediaImage, renderMediaVideo, videoAvailable } from "./media-render";
import sharp from "sharp";

test("free API has no paid tier dependency; strict render bounds protect the host", () => {
  assert.equal(mediaDailyQuota({ subscriptionTier: "free" }), mediaDailyQuota({ isOwner: true }));
  assert.equal(mediaDailyQuota(), 100);
  assert.equal(validateRenderRequest({ type: "image", project: newProject() }).format, "png");
  assert.throws(() => validateRenderRequest({ type: "video", project: newProject() }));
  assert.throws(() => validateRenderRequest({ type: "image", format: "mp4", project: newProject() }));
});
test("API key lifecycle is account-private, hashed at rest, revocable and quota bounded", async () => {
  const keys: any[] = []; let used = 0;
  const fake = { async query(sql: string, a: any[] = []): Promise<any> {
    let rows: any[] = [];
    if (sql.includes("CREATE TABLE") || sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK" || sql.startsWith("SELECT id FROM users")) return { rows: [], rowCount: 0 };
    if (sql.includes("COUNT(*)")) rows = [{ count: keys.filter(k => k.user_id === a[0] && !k.revoked_at).length }];
    else if (sql.includes("INSERT INTO media_developer_keys")) { keys.push({ id:a[0],user_id:a[1],label:a[2],prefix:a[3],key_hash:a[4],revoked_at:null }); rows = [{createdAt:new Date().toISOString()}]; }
    else if (sql.includes("WHERE key_hash")) rows = keys.filter(k => k.key_hash === a[0] && !k.revoked_at);
    else if (sql.includes("SET revoked_at")) { const k=keys.find(k=>k.id===a[0]&&k.user_id===a[1]&&!k.revoked_at); if(k){k.revoked_at=new Date();rows=[{id:k.id}];} }
    else if (sql.includes("SELECT id,label")) rows = keys.filter(k=>k.user_id===a[0]).map(k=>({id:k.id,label:k.label,prefix:k.prefix,revokedAt:k.revoked_at,createdAt:new Date().toISOString()}));
    else if (sql.includes("INSERT INTO media_developer_usage")) { if(used<a[2]) rows=[{used:++used}]; }
    else if (sql.includes("SELECT used")) rows=[{used}];
    else if (sql.includes("GREATEST")) used--;
    return {rows,rowCount:rows.length};
  }, async connect() { return { query: fake.query.bind(fake), release(){} }; } };
  const app=express(); app.use(express.json());
  app.use((req:any,_res,next)=>{req.session={userId:req.get("x-test-user")?Number(req.get("x-test-user")):undefined};next();});
  await registerMediaAPI(app,{pool:fake as any,userById:(async(id:number)=>({id,subscriptionTier:"free"})) as any,videoAvailable:false});
  const server=app.listen(0,"127.0.0.1"); await new Promise<void>(resolve=>server.once("listening",resolve));
  const base=`http://127.0.0.1:${(server.address() as any).port}`;
  const call=(url:string,method="GET",body?:unknown,user?:number,key?:string)=>fetch(base+url,{method,headers:{"Content-Type":"application/json",...(user?{"x-test-user":String(user)}:{}),...(key?{Authorization:`Bearer ${key}`}:{})},body:body?JSON.stringify(body):undefined});
  try{
    assert.equal((await call("/api/media/developer").then(r=>r.json())).authenticated,false);
    assert.equal((await call("/api/media/keys","POST",{label:"unauthorized"})).status,401);
    const creation=await call("/api/media/keys","POST",{label:"free-key"},1); assert.equal(creation.status,201);
    const created=await creation.json(); assert.ok(created.key.startsWith("bbm_live_"));
    assert.equal(keys[0].key_hash,hashMediaKey(created.key)); assert.ok(!JSON.stringify(keys).includes(created.key));
    const other=await call("/api/media/developer","GET",undefined,2).then(r=>r.json()); assert.equal(other.keys.length,0);
    assert.equal((await call(`/api/media/keys/${created.id}`,"DELETE",undefined,2)).status,404);
    const status=await call("/api/media/developer","GET",undefined,1).then(r=>r.json()); assert.equal(status.entitled,true); assert.ok(!JSON.stringify(status).includes(created.key));
    assert.equal((await call("/api/media/v1/generate","POST",{type:"image",project:newProject()})).status,401);
    const rendered=await call("/api/media/v1/generate","POST",{type:"image",project:newProject()},undefined,created.key);
    assert.equal(rendered.status,200); assert.match(rendered.headers.get("content-type")!,/image\/png/);
    const image=await sharp(Buffer.from(await rendered.arrayBuffer())).metadata(); assert.equal(image.width,1920); assert.equal(image.height,1080);
    const p=newProject();p.width=640;p.height=360;
    assert.equal((await call("/api/media/v1/generate","POST",{type:"video",project:p},undefined,created.key)).status,503);
    used=100;assert.equal((await call("/api/media/v1/generate","POST",{type:"audio",project:p},undefined,created.key)).status,429);
    assert.equal((await call(`/api/media/keys/${created.id}`,"DELETE",undefined,1)).status,200);
    assert.equal((await call("/api/media/v1/generate","POST",{type:"image",project:p},undefined,created.key)).status,401);
  } finally {server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
test("native renderer returns real JPEG and H264 MP4 rather than renamed files", async () => {
  const p=newProject();p.width=320;p.height=180;p.duration=1;p.audio.enabled=true;
  const image=await renderMediaImage(p,"jpeg",0);assert.equal((await sharp(image).metadata()).format,"jpeg");
  if(videoAvailable()){
    const video=await renderMediaVideo(p);assert.equal(video.subarray(4,8).toString(),"ftyp");assert.ok(video.length>1000);
  }
});
