import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID, webcrypto } from "node:crypto";
import { CloudflareSharingStore } from "./cloudflare-sharing-store";
import { sharingPublicKey, sharingSignature } from "./sharing-signature";
import { authenticated } from "../cloudflare/sharing/worker";
import { newLesson } from "../packages/brightboard-tv/src/types";

test("storage signatures reject tampering and missing service authentication",async()=>{
  const secret="isolated-test-secret-not-used-by-any-application";
  const body=JSON.stringify({op:"list",actor:{id:"test",email:"test@example.invalid"}});
  const headers=sharingSignature(body,secret);
  // Node 20 exposes the same WebCrypto verification API used by Workers.
  if(!globalThis.crypto) Object.defineProperty(globalThis,"crypto",{value:webcrypto});
  const env:any={TRUSTED_KEYS:JSON.stringify([sharingPublicKey(secret)])};
  assert.equal((await authenticated(new Request("https://storage.invalid/rpc",{method:"POST",body,headers}),env)).op,"list");
  await assert.rejects(authenticated(new Request("https://storage.invalid/rpc",{method:"POST",body:body.replace('"list"','"get"'),headers}),env),(e:any)=>e.status===401);
  await assert.rejects(authenticated(new Request("https://storage.invalid/rpc",{method:"POST",body}),env),(e:any)=>e.status===401);
});
test("missing Cloudflare configuration fails explicitly without PostgreSQL fallback",async()=>{
  await assert.rejects(new CloudflareSharingStore("").list({id:"test",email:"test@example.invalid"}),(e:any)=>e.status===503);
});
test("a broken storage configuration cannot crash the app or TV relay at startup",async()=>{
  const before=process.env.SHARING_STORAGE_URL;
  try {
    process.env.SHARING_STORAGE_URL="invalid-configuration";
    let store!:CloudflareSharingStore;
    assert.doesNotThrow(()=>{store=new CloudflareSharingStore();});
    await assert.rejects(store.list({id:"test",email:"test@example.invalid"}),(e:any)=>e.status===503);
  } finally {
    if(before===undefined) delete process.env.SHARING_STORAGE_URL;
    else process.env.SHARING_STORAGE_URL=before;
  }
});
test("real preview D1/R2: durable revisions, isolation, approval, concurrency, revocation and deletion",{
  skip:process.env.RUN_CLOUDFLARE_SHARING_TESTS!=="1",
},async()=>{
  const url=process.env.SHARING_STORAGE_URL || "";
  assert.match(url,/^https:\/\/brightboard-sharing-preview\.[a-z0-9-]+\.workers\.dev$/,"Only the isolated preview service can be tested.");
  const store=new CloudflareSharingStore(url);
  const run=randomUUID();
  const owner={id:`sharing-test-owner-${run}`,email:`owner-${run}@example.invalid`,firstName:"Test owner"};
  const reader={id:`sharing-test-reader-${run}`,email:`reader-${run}@example.invalid`,firstName:"Test reader"};
  const outsider={id:`sharing-test-other-${run}`,email:`other-${run}@example.invalid`,firstName:"Test other"};
  const actors=[owner,reader,outsider];
  const create=()=>store.create(owner,{kind:"text",title:"Durable Cloudflare snapshot",content:{body:"Original content",teacherNotes:"PRIVATE"},allowRequests:true});
  let id="";
  try {
    assert.equal((await store.rpc("health",owner)).storage,"cloudflare-d1-r2");
    const doc=await create();id=doc.id;
    assert.equal(doc.content.teacherNotes,undefined);
    const fresh=new CloudflareSharingStore(url);
    assert.equal((await fresh.get(owner,id)).revision,doc.revision);
    await assert.rejects(store.get(reader,id),(e:any)=>e.status===403&&e.canRequest);
    await store.request(reader,id,{message:"Please approve an edit."});
    const requested=await store.get(owner,id);
    assert.equal(requested.requests[0].userId,reader.id);
    await store.decide(owner,id,reader.id,{decision:"approve"});
    assert.equal((await store.get(reader,id)).role,"editor");
    const edit=await store.save(reader,id,{title:"Updated by approved collaborator",content:{body:"Second content",teacherNotes:"STILL PRIVATE"}},doc.revision);
    assert.equal(edit.content.teacherNotes,undefined);
    assert.notEqual(edit.revision,doc.revision);
    assert.equal((await store.get(reader,id,doc.revision)).content.body,"Original content");
    await assert.rejects(store.save(owner,id,{title:"Stale",content:{body:"Cannot overwrite"}},doc.revision),(e:any)=>e.status===409);
    const concurrent=await Promise.allSettled([
      store.save(owner,id,{title:"Concurrent A",content:{body:"A"}},edit.revision),
      store.save(reader,id,{title:"Concurrent B",content:{body:"B"}},edit.revision),
    ]);
    assert.equal(concurrent.filter(v=>v.status==="fulfilled").length,1);
    assert.equal(concurrent.filter(v=>v.status==="rejected"&&(v.reason as any).status===409).length,1);
    for(const action of [
      ()=>store.configure(reader,id,{audience:"link"}),
      ()=>store.invite(reader,id,{email:outsider.email,role:"editor"}),
      ()=>store.remove(reader,id),
      ()=>store.fork(reader,id),
    ]) await assert.rejects(action(),(e:any)=>e.status===403);
    assert.equal((await store.list(outsider)).documents.length,0);
    let ownerDoc=await store.get(owner,id);
    await store.removeMember(owner,id,ownerDoc.members[0].id);
    await assert.rejects(store.get(reader,id),(e:any)=>e.status===403);
    await store.configure(owner,id,{audience:"link",allowDownload:true});
    assert.equal((await store.get(reader,id)).role,"viewer");
    const copy=await store.fork(reader,id);assert.equal(copy.role,"owner");
    await store.configure(owner,id,{enabled:false});
    await assert.rejects(store.get(reader,id),(e:any)=>e.status===410);
    assert.equal((await store.get(owner,id)).role,"owner");
    await store.configure(owner,id,{enabled:true,expiresAt:new Date(Date.now()+2000).toISOString()});
    await new Promise(resolve=>setTimeout(resolve,2100));
    await assert.rejects(store.get(reader,id),(e:any)=>e.status===410);
    // Native TV structure and required blank notes survive R2 round trips.
    const lesson=newLesson();lesson.pages[0].notes="PRIVATE PRESENTER NOTES";
    const tv=await store.create(owner,{kind:"tv",title:"TV snapshot",content:lesson});
    assert.equal((await fresh.get(owner,tv.id)).content.pages[0].notes,"");
    await store.save(owner,tv.id,{title:"TV updated",content:{...tv.content,title:"TV updated"}},tv.revision);
    const png="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==";
    for(const [kind,content] of [
      ["image",{body:png}],
      ["file",{name:"tiny.png",mime:"image/png",data:png}],
      ["worksheet",{body:JSON.stringify({title:"Worksheet",questions:[{prompt:"Question",answerKey:"SECRET"}]})}],
      ["studio",{type:"cv",body:JSON.stringify({name:"Example",summary:"Editable source"})}],
    ] as const) {
      const variant=await store.create(owner,{kind,title:`${kind} snapshot`,content});
      assert.equal((await fresh.get(owner,variant.id)).kind,kind);
      assert.ok(!JSON.stringify(variant.content).includes("SECRET"));
    }
    // Browser callers and anyone copying a Worker URL cannot access R2/D1.
    const unsigned=await fetch(`${url}/rpc`,{method:"POST",body:JSON.stringify({op:"list",actor:owner})});
    assert.equal(unsigned.status,401);
    const body=JSON.stringify({op:"configure",actor:{id:owner.id,email:owner.email,name:"Test"},id,body:{enabled:true,expiresAt:null}});
    const headers=sharingSignature(body);
    assert.equal((await fetch(`${url}/rpc`,{method:"POST",headers,body})).status,200);
    assert.equal((await fetch(`${url}/rpc`,{method:"POST",headers,body})).status,409);
    console.log("Live preview checks passed: D1 metadata + private R2 snapshots + signed RPC.");
  } finally {
    for(const actor of actors) await store.removeAccount(actor);
  }
  assert.equal((await store.list(owner)).documents.length,0);
  assert.equal((await store.list(reader)).documents.length,0);
  if(id) await assert.rejects(store.get(owner,id),(e:any)=>e.status===404);
});
