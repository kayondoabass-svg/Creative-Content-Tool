// Local headless-browser verification. Never uploads fixtures to production.
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
const input = process.argv[2];
if (!input || !process.env.REPLIT_DEV_DOMAIN) throw new Error("Pass a local PDF; a running development server is required.");
const bytes = await readFile(input);
const temp = await mkdtemp(path.join(tmpdir(), "brightboard-file-browser-"));
const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const code = `
const results = [];
const base = ${JSON.stringify(base)};
const source = ${JSON.stringify(bytes.toString("base64"))};
const assert = (ok,message) => { if(!ok) throw new Error(message); };
const reject = async (promise, pattern) => {try { await promise; } catch(e) {assert(pattern.test(e.message), e.message);return;} throw new Error("Expected an error.");};
try {
  const sourceModule = await fetch(base+"/src/lib/file-tool-operations.ts").then(r=>r.text());
  const dependency = async name => {
    const pattern = name === "zip" ? /import [^;]+ from "([^"]*jszip[^"]*)"/ : /import \\{[^}]*PDFDocument[^}]*\\} from "([^"]+)"/;
    const match = sourceModule.match(pattern);
    assert(match, "Cannot find dependency "+name);
    return import(new URL(match[1],base).href);
  };
  const [{default:JSZip},{PDFDocument},ops,local,ppt] = await Promise.all([
    dependency("zip"),dependency("pdf"),import(base+"/src/lib/file-tool-operations.ts"),
    import(base+"/src/lib/local-file-tools.ts"),import(base+"/src/lib/pdf-powerpoint.ts")
  ]);
  const data = Uint8Array.from(atob(source), c=>c.charCodeAt(0));
  const reader = new File([data],"reader.pdf",{type:"application/pdf"});
  const pages = (await PDFDocument.load(data)).getPageCount();
  const progress = [];
  const start = performance.now();
  const converted = await ppt.pdfToPowerPoint(reader,{onProgress:m=>progress.push(m)});
  const zip = await JSZip.loadAsync(await converted.blob.arrayBuffer());
  const slides = Object.keys(zip.files).filter(p=>/^ppt\\/slides\\/slide\\d+\\.xml$/.test(p));
  const media = Object.keys(zip.files).filter(p=>/^ppt\\/media\\/[^/]+$/.test(p));
  assert(slides.length===pages, "Missing PowerPoint pages");
  assert(media.length===pages, "Missing PowerPoint page images");
  assert(progress.some(m=>m.includes("page "+pages+" of "+pages)), "Missing final-page progress");
  results.push({test:"Actual uploaded PDF to image-slide PPTX",pages,slides:slides.length,media:media.length,bytes:converted.blob.size,seconds:Math.round((performance.now()-start)/100)/10});
  const second = new File([data],"second.pdf",{type:"application/pdf"});
  const merged = await local.mergeFilesLocally([reader,second]);
  assert((await PDFDocument.load(await merged.blob.arrayBuffer())).getPageCount()===pages*2,"Merge dropped pages");
  results.push({test:"Large local merge",inputBytes:data.length*2,pages:pages*2,outputBytes:merged.blob.size});
  const compressed = await local.compressFileLocally(reader,"high");
  assert((await PDFDocument.load(await compressed.blob.arrayBuffer())).getPageCount()===pages,"Compression dropped pages");
  results.push({test:"Actual PDF compression",pages,outputBytes:compressed.blob.size});
  const split = await ops.splitPdf(reader,"1,3",false);
  assert((await PDFDocument.load(await split[0].blob.arrayBuffer())).getPageCount()===2,"Split incorrect");
  results.push({test:"Split actual PDF",pages:2});
  const canvas=document.createElement("canvas"); canvas.width=300;canvas.height=200;
  const context=canvas.getContext("2d");context.fillStyle="red";context.fillRect(0,0,300,200);context.fillStyle="blue";context.fillText("Lesson image",20,40);
  const imageBlob=await new Promise(resolve=>canvas.toBlob(resolve,"image/png"));
  const image=new File([imageBlob],"lesson.png",{type:"image/png"});
  for(const target of ["pdf","jpg","png","pptx"]){
    const output=await local.convertImageLocally(image,target);
    assert(output.blob.size>0,"Empty image output");
    if(target==="pdf") assert((await PDFDocument.load(await output.blob.arrayBuffer())).getPageCount()===1,"Bad image PDF");
    if(target==="pptx") assert((await JSZip.loadAsync(await output.blob.arrayBuffer())).file("ppt/presentation.xml"),"Bad image PPTX");
  }
  const jpeg=await local.convertImageLocally(image,"jpg");
  const png=await local.convertImageLocally(new File([jpeg.blob],"lesson.jpg",{type:"image/jpeg"}),"png");
  assert(png.blob.type==="image/png","JPEG to PNG failed");
  const imageCompressed=await local.compressFileLocally(image,"high");
  assert(imageCompressed.blob.type==="image/png","PNG compression changed format");
  results.push({test:"Image PDF, PNG, JPEG, PowerPoint and compression",pass:true});
  const textPdf=await PDFDocument.create();
  textPdf.addPage().drawText("Editable lesson one");textPdf.addPage().drawText("Editable lesson two");
  const textFile=new File([await textPdf.save()],"text.pdf",{type:"application/pdf"});
  const editable=await ppt.pdfToPowerPoint(textFile,{mode:"text"});
  const editableZip=await JSZip.loadAsync(await editable.blob.arrayBuffer());
  const xml=await editableZip.file("ppt/slides/slide1.xml").async("text");
  assert(xml.includes("Editable lesson one"),"Missing editable text");
  const textSlides=await ops.textToPresentation("A normal lesson outline","lesson");
  assert(textSlides.blob.size>0,"Text to PPTX failed");
  results.push({test:"Editable PDF text and text-source slides",pass:true});
  const invalid=new File(["broken"],"broken.pdf",{type:"application/pdf"});
  await reject(ppt.pdfToPowerPoint(invalid),/PDF|invalid|document/i);
  const large=await PDFDocument.create();for(let n=0;n<101;n++)large.addPage();
  await reject(ppt.pdfToPowerPoint(new File([await large.save()],"many.pdf",{type:"application/pdf"})),/100/);
  const controller=new AbortController();controller.abort();
  await reject(ppt.pdfToPowerPoint(reader,{signal:controller.signal}),/cancelled/);
  await reject(local.mergeFilesLocally([reader,second],{signal:controller.signal}),/abort/i);
  results.push({test:"Damaged PDF, page limit and cancellation",pass:true});
  document.body.textContent="PASS: "+JSON.stringify(results);
} catch(error) {
  document.body.textContent="FAIL: "+String(error?.stack||error)+" Completed: "+JSON.stringify(results);
}
`;
const browser = spawn("chromium", [
    "--headless", "--no-sandbox", "--disable-dev-shm-usage",
    "--disable-web-security", "--allow-file-access-from-files",
    `--user-data-dir=${temp}`, "--remote-debugging-port=0", "about:blank",
  ], { stdio: "ignore" });
let socket;
try {
  let port;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { port = Number((await readFile(path.join(temp, "DevToolsActivePort"), "utf8")).split("\n")[0]); break; }
    catch { await new Promise(resolve => setTimeout(resolve, 100)); }
  }
  if (!port) throw new Error("Local Chromium did not start.");
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const target = targets.find(item => item.type === "page");
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
  const response = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Browser checks exceeded 3 minutes.")), 180000);
    socket.addEventListener("message", event => {
      const message = JSON.parse(String(event.data));
      if (message.id !== 1) return;
      clearTimeout(timer);
      message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result);
    });
    socket.send(JSON.stringify({ id: 1, method: "Runtime.evaluate", params: {
      expression: `(async()=>{${code};return document.body.textContent;})()`,
      awaitPromise: true, returnByValue: true, timeout: 170000,
    } }));
  });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || "Browser exception");
  const body = response.result.value;
  console.log(body);
  if (!body.startsWith("PASS:")) process.exitCode = 1;
} finally {
  socket?.close();
  browser.kill("SIGTERM");
  await new Promise(resolve => browser.once("exit", resolve));
  await rm(temp, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
}
