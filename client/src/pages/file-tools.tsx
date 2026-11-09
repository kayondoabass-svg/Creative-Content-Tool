import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/use-subscription";
import { ShareDocumentButton } from "@/components/document-sharing";
import {
  FileText, Image, Presentation, ArrowRight, Download, Loader2, Upload, Merge,
  Scissors, Minimize2, Crown, Sparkles, ArrowLeft, ArrowUp, ArrowDown, X, Archive,
  FilePlus2,
} from "lucide-react";
import { Link } from "wouter";
import { Footer } from "@/components/footer";
import {
  bundleOutputs, convertWord, pdfToImages, pdfToWord, splitPdf, textToPresentation, textToWord, validateInput,
  WORD_MIME, type ToolOutput,
} from "@/lib/file-tool-operations";
import { abortable, pdfToPowerPoint } from "@/lib/pdf-powerpoint";
import { compressFileLocally, convertImageLocally, mergeFilesLocally } from "@/lib/local-file-tools";

const conversionOptions = [
  { from: "jpg", to: "pdf", label: "JPG to PDF", fromIcon: Image, toIcon: FileText },
  { from: "png", to: "pdf", label: "PNG to PDF", fromIcon: Image, toIcon: FileText },
  { from: "jpg", to: "png", label: "JPG to PNG", fromIcon: Image, toIcon: Image },
  { from: "png", to: "jpg", label: "PNG to JPG", fromIcon: Image, toIcon: Image },
  { from: "jpg", to: "pptx", label: "JPG to PowerPoint", fromIcon: Image, toIcon: Presentation },
  { from: "png", to: "pptx", label: "PNG to PowerPoint", fromIcon: Image, toIcon: Presentation },
  { from: "pdf", to: "pptx", label: "PDF to PowerPoint", fromIcon: FileText, toIcon: Presentation },
  { from: "pdf", to: "png", label: "PDF to PNG images", fromIcon: FileText, toIcon: Image },
  { from: "pdf", to: "jpeg", label: "PDF to JPEG images", fromIcon: FileText, toIcon: Image },
  { from: "docx", to: "pdf", label: "Word (.docx) to PDF", fromIcon: FileText, toIcon: FileText },
  { from: "docx", to: "pptx", label: "Word (.docx) to PowerPoint", fromIcon: FileText, toIcon: Presentation },
  { from: "pdf", to: "docx", label: "PDF to Word (.docx, text only)", fromIcon: FileText, toIcon: FileText },
];

type PageResult = ToolOutput & { url: string };
const MAX_FILE_BYTES = 20 * 1024 * 1024;
// Base64 adds one third; stay below the existing 50 MB JSON parser limit.
const MAX_MERGE_BYTES = 30 * 1024 * 1024;
const MAX_SHARE_BYTES = 11 * 1024 * 1024;

function readFileAsDataURL(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Could not read this file."));
    reader.readAsDataURL(file);
  });
}

function outputMime(output: ToolOutput) {
  if (output.blob.type) return output.blob.type;
  const extension = output.name.split(".").pop()?.toLowerCase();
  if (extension === "docx") return WORD_MIME;
  if (extension === "pdf") return "application/pdf";
  if (extension === "pptx") return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  if (extension === "png") return "image/png";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  return "application/octet-stream";
}

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function ShareOutput({ output }: { output: ToolOutput }) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isTooLarge = output.blob.size > MAX_SHARE_BYTES;

  const prepareShare = async () => {
    if (isTooLarge || content || loading) return;
    setLoading(true);
    setError("");
    try {
      setContent(await readFileAsDataURL(output.blob));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not prepare this file to share.");
    } finally {
      setLoading(false);
    }
  };

  if (isTooLarge) return <span className="text-xs text-muted-foreground">Share limit: 11 MB; download is still available.</span>;
  if (!content) return <div className="flex flex-col items-start gap-1">
    <Button type="button" variant="outline" size="sm" onClick={() => void prepareShare()} disabled={loading}>
      {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Preparing share…</> : "Prepare to share"}
    </Button>
    {error && <span role="alert" className="text-xs text-destructive">{error}</span>}
  </div>;
  return <ShareDocumentButton kind="file" title={output.name} content={{ name: output.name, mime: outputMime(output), data: content }} />;
}

function OriginalDocxShare({ file }: { file: File }) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  if (file.size > MAX_SHARE_BYTES) return <p className="text-xs text-muted-foreground">This DOCX is over the 11 MB sharing limit. Conversion and download are still available.</p>;
  if (content) return <ShareDocumentButton kind="file" title={file.name} content={{ name: file.name, mime: WORD_MIME, data: content }} />;
  return <div className="flex flex-col items-start gap-1">
    <Button type="button" variant="outline" size="sm" disabled={loading} onClick={async () => {
      setLoading(true);
      setError("");
      try { setContent(await readFileAsDataURL(new Blob([file], { type: WORD_MIME }))); }
      catch (e) { setError(e instanceof Error ? e.message : "Could not prepare this file to share."); }
      finally { setLoading(false); }
    }}>
      {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Preparing share…</> : "Share original DOCX"}
    </Button>
    {error && <span role="alert" className="text-xs text-destructive">{error}</span>}
  </div>;
}

function PageResultCard({ result }: { result: PageResult }) {
  return <div className="flex flex-col gap-3 rounded-xl border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex min-w-0 items-start gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><FileText className="h-5 w-5" /></div>
      <div className="min-w-0"><p className="break-all font-medium">{result.name}</p><p className="text-xs text-muted-foreground">{formatSize(result.blob.size)}</p></div>
    </div>
    <div className="flex flex-wrap items-center gap-2">
      <a href={result.url} download={result.name} className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
        <Download className="mr-2 h-4 w-4" />Download
      </a>
      <ShareOutput output={result} />
    </div>
  </div>;
}

export default function FileToolsPage() {
  const [activeTab, setActiveTab] = useState("convert");
  const [convertFile, setConvertFile] = useState<File | null>(null);
  const [compressFile, setCompressFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [conversionType, setConversionType] = useState("jpg-to-pdf");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingLabel, setProcessingLabel] = useState("");
  const [processingTab, setProcessingTab] = useState("");
  const [pdfPowerPointMode, setPdfPowerPointMode] = useState<"pages" | "text">("pages");
  const conversionAbortRef = useRef<AbortController | null>(null);
  const operationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [operationError, setOperationError] = useState("");
  const [compressionLevel, setCompressionLevel] = useState("medium");
  const [splitFile, setSplitFile] = useState<File | null>(null);
  const [splitRanges, setSplitRanges] = useState("1-3");
  const [separatePages, setSeparatePages] = useState(false);
  const [presentationText, setPresentationText] = useState("");
  const [presentationName, setPresentationName] = useState("Lesson slides");
  const [results, setResults] = useState<PageResult[]>([]);
  const [bundleUrl, setBundleUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const compressInputRef = useRef<HTMLInputElement>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null);
  const splitInputRef = useRef<HTMLInputElement>(null);
  const objectUrlsRef = useRef<string[]>([]);
  const { toast } = useToast();
  const { isPremium } = useSubscription();
  const marked = !isPremium;

  useEffect(() => () => {
    conversionAbortRef.current?.abort();
    if (operationTimerRef.current) clearTimeout(operationTimerRef.current);
    objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    objectUrlsRef.current = [];
  }, []);

  const replaceResults = (outputs: ToolOutput[]) => {
    objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    objectUrlsRef.current = outputs.map(output => URL.createObjectURL(output.blob));
    setBundleUrl("");
    setResults(outputs.map((output, index) => ({ ...output, url: objectUrlsRef.current[index] })));
  };

  const startOperation = (label: string) => {
    const controller = new AbortController();
    conversionAbortRef.current = controller;
    operationTimerRef.current = setTimeout(() => controller.abort(new Error("This task took too long. Your original files and previous results are unchanged. Try fewer pages or a smaller file.")), 180000);
    setOperationError("");
    setProcessingTab(activeTab);
    setProcessingLabel(label);
    setIsProcessing(true);
  };
  const finishOperation = () => {
    if (operationTimerRef.current) clearTimeout(operationTimerRef.current);
    operationTimerRef.current = null;
    conversionAbortRef.current = null;
    setIsProcessing(false);
    setProcessingTab("");
    setProcessingLabel("");
  };
  const waitForOperation = <T,>(promise: Promise<T>) => {
    const signal = conversionAbortRef.current?.signal;
    return signal ? abortable(promise, signal) : promise;
  };
  const cancelOperation = () => conversionAbortRef.current?.abort(new Error("Task cancelled. Your original files and previous results are unchanged."));
  const showError = (error: unknown) => {
    const message = error instanceof Error && error.name === "TimeoutError"
      ? "The server did not finish this task in time. Your original files are unchanged. Try fewer pages or a smaller file."
      : error instanceof Error ? error.message : "The file could not be processed. Try another file.";
    setOperationError(message);
    toast({ title: "Could not complete this file task", description: message, variant: "destructive" });
  };
  const validatePickedFile = (file: File) => {
    validateInput(file);
    if (file.size > MAX_FILE_BYTES) throw new Error("Choose a file under 20 MB.");
  };
  const handleSingleSelect = (e: ChangeEvent<HTMLInputElement>, target: "convert" | "compress" | "split") => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      validatePickedFile(file);
      if (target === "convert") {
        const extension = file.name.split(".").pop()?.toLowerCase();
        const from = extension === "jpeg" ? "jpg" : extension;
        const options = conversionOptions.filter(option => option.from === from);
        if (!options.length) throw new Error("Choose a PDF, JPG, PNG or DOCX file. PowerPoint is currently an output format.");
        if (!conversionType.startsWith(`${from}-to-`)) {
          const targetFormat = conversionType.split("-")[2];
          const option = options.find(option => option.to === targetFormat) || options[0];
          setConversionType(`${option.from}-to-${option.to}`);
        }
        setConvertFile(file);
      }
      if (target === "compress") setCompressFile(file);
      if (target === "split") setSplitFile(file);
    } catch (error) { showError(error); }
  };

  const handleMultiFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files || []);
    e.target.value = "";
    if (!incoming.length) return;
    try {
      const combined = [...selectedFiles];
      let total = combined.reduce((sum, file) => sum + file.size, 0);
      for (const file of incoming) {
        validatePickedFile(file);
        if (!/\.(pdf|jpe?g|png)$/i.test(file.name)) throw new Error("Merge supports PDF, JPG, JPEG, and PNG files.");
        if (combined.length >= 10) throw new Error("Choose no more than 10 files.");
        if (total + file.size > MAX_MERGE_BYTES) throw new Error("Selected files must total 30 MB or less.");
        if (combined.some(existing => existing.name === file.name && existing.size === file.size && existing.lastModified === file.lastModified)) continue;
        combined.push(file);
        total += file.size;
      }
      setSelectedFiles(combined);
    } catch (error) { showError(error); }
  };

  const handleConvert = async () => {
    if (!convertFile) return;
    const [from, , to] = conversionType.split("-");
    startOperation("Converting…");
    const controller = conversionAbortRef.current!;
    try {
      const ext = convertFile.name.split(".").pop()?.toLowerCase();
      if ((ext === "jpeg" ? "jpg" : ext) !== from) throw new Error("The selected conversion does not match this file. Choose the matching source format.");
      if (from === "pdf" && to === "pptx") {
        replaceResults([await pdfToPowerPoint(convertFile, {
          mode: pdfPowerPointMode, marked, signal: controller.signal, onProgress: setProcessingLabel,
        })]);
      } else if (from === "docx") {
        replaceResults([await waitForOperation(convertWord(convertFile, to, marked, { signal: controller.signal, onProgress: setProcessingLabel }))]);
      } else if (from === "pdf" && (to === "png" || to === "jpeg")) {
        replaceResults(await waitForOperation(pdfToImages(convertFile, to, marked, { signal: controller.signal, onProgress: setProcessingLabel })));
      } else if (from === "pdf" && to === "docx") {
        replaceResults([await waitForOperation(pdfToWord(convertFile, marked, { signal: controller.signal, onProgress: setProcessingLabel }))]);
      } else {
        replaceResults([await waitForOperation(convertImageLocally(convertFile, to, {
          marked, signal: controller.signal, onProgress: setProcessingLabel,
        }))]);
      }
      toast({ title: "Conversion ready", description: "Your download is ready below." });
    } catch (error) { showError(error); }
    finally { finishOperation(); }
  };

  const handleMerge = async () => {
    if (selectedFiles.length < 2) return;
    startOperation("Merging files…");
    try {
      replaceResults([await waitForOperation(mergeFilesLocally(selectedFiles, {
        marked, signal: conversionAbortRef.current!.signal, onProgress: setProcessingLabel,
      }))]);
      toast({ title: "Merge ready", description: "Your merged PDF is ready below." });
    } catch (error) { showError(error); }
    finally { finishOperation(); }
  };

  const handleCompress = async () => {
    if (!compressFile) return;
    startOperation("Compressing…");
    try {
      const result = await waitForOperation(compressFileLocally(compressFile, compressionLevel, {
        marked, signal: conversionAbortRef.current!.signal, onProgress: setProcessingLabel,
      }));
      const blob = result.blob;
      replaceResults([result]);
      const change = blob.size < compressFile.size
        ? `Reduced by ${Math.round((1 - blob.size / compressFile.size) * 100)}% (${formatSize(compressFile.size)} to ${formatSize(blob.size)}).`
        : `No reduction this time (${formatSize(compressFile.size)} to ${formatSize(blob.size)}).`;
      toast({ title: "Compression complete", description: change });
    } catch (error) { showError(error); }
    finally { finishOperation(); }
  };

  const handleSplit = async () => {
    if (!splitFile) return;
    startOperation("Splitting PDF…");
    try {
      replaceResults(await waitForOperation(splitPdf(splitFile, splitRanges, separatePages, marked, { signal: conversionAbortRef.current!.signal, onProgress: setProcessingLabel })));
      toast({ title: "Pages extracted", description: "Your PDF pages are ready below." });
    } catch (error) { showError(error); }
    finally { finishOperation(); }
  };

  const handleTextPresentation = async (format: "pptx" | "docx" = "pptx") => {
    startOperation(format === "docx" ? "Building Word document…" : "Building PowerPoint…");
    try {
      const operation = format === "docx" ? textToWord : textToPresentation;
      replaceResults([await waitForOperation(operation(presentationText, presentationName.trim() || "Lesson slides", marked))]);
      toast({ title: "Document ready", description: "Your download is ready below." });
    } catch (error) { showError(error); }
    finally { finishOperation(); }
  };

  const handleBundle = async () => {
    if (results.length < 2) return;
    startOperation("Preparing ZIP…");
    try {
      const output = await waitForOperation(bundleOutputs(results));
      const url = URL.createObjectURL(output.blob);
      objectUrlsRef.current.push(url);
      setBundleUrl(url);
      toast({ title: "ZIP ready", description: "Download all individual results together." });
    } catch (error) { showError(error); }
    finally { finishOperation(); }
  };

  const moveFile = (index: number, direction: -1 | 1) => {
    setSelectedFiles(current => {
      const destination = index + direction;
      if (destination < 0 || destination >= current.length) return current;
      const next = [...current];
      [next[index], next[destination]] = [next[destination], next[index]];
      return next;
    });
  };
  const fileInputAccept = conversionType.startsWith("docx") ? ".docx,.doc" : ".pdf,.jpg,.jpeg,.png,.docx,.doc";

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" aria-label="Back to BrightBoard" data-testid="button-back"><ArrowLeft className="h-5 w-5" /></Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70"><Sparkles className="h-4 w-4 text-primary-foreground" /></div>
              <span className="text-lg font-bold">BrightBoard</span><Badge variant="secondary">File Tools</Badge>
            </div>
          </div>
          {!isPremium && <Link href="/pricing"><Button size="sm" className="gap-2" data-testid="button-upgrade"><Crown className="h-4 w-4" />Remove Watermark</Button></Link>}
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[.16em] text-primary">Teacher file desk</p>
          <h1 className="mb-2 text-3xl font-bold">File Tools for Teachers</h1>
          <p className="text-muted-foreground">Prepare classroom files, combine handouts, and make lesson slides.</p>
          <p className="mt-2 text-sm text-muted-foreground">File processing runs on your device. Uploads happen only when you explicitly publish a shared copy.</p>
          {!isPremium && <Badge variant="outline" className="mt-3">Free users: generated files include a BrightBoard watermark</Badge>}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mx-auto max-w-4xl">
          {isProcessing && <div role="status" aria-live="polite" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-primary/5 p-4">
            <div><p className="font-semibold">One task is running: {processingTab === "text-pptx" ? "Text to documents" : processingTab}</p><p className="text-sm text-muted-foreground">{processingLabel}</p><p className="text-xs text-muted-foreground">Other tools are paused until this task finishes or you cancel it. Your files have not been replaced.</p></div>
            <Button variant="outline" onClick={cancelOperation}>Cancel current task</Button>
          </div>}
          <TabsList className="mb-8 grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-5">
            <TabsTrigger value="convert" className="gap-2"><ArrowRight className="h-4 w-4" />Convert</TabsTrigger>
            <TabsTrigger value="merge" className="gap-2"><Merge className="h-4 w-4" />Merge</TabsTrigger>
            <TabsTrigger value="compress" className="gap-2"><Minimize2 className="h-4 w-4" />Compress</TabsTrigger>
            <TabsTrigger value="split" className="gap-2"><Scissors className="h-4 w-4" />Split PDF</TabsTrigger>
            <TabsTrigger value="text-pptx" className="gap-2"><Presentation className="h-4 w-4" />Text to PPT</TabsTrigger>
          </TabsList>

          <TabsContent value="convert">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><ArrowRight className="h-5 w-5 text-primary" />Convert files</CardTitle><CardDescription>Choose a format, then select a source file up to 20 MB.</CardDescription></CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Conversion type</Label>
                  <Select value={conversionType} onValueChange={setConversionType} disabled={isProcessing}>
                    <SelectTrigger data-testid="select-conversion-type"><SelectValue placeholder="Select conversion type" /></SelectTrigger>
                    <SelectContent>{conversionOptions.map(opt => <SelectItem key={`${opt.from}-to-${opt.to}`} value={`${opt.from}-to-${opt.to}`}><span className="flex items-center gap-2"><opt.fromIcon className="h-4 w-4 text-muted-foreground" /><ArrowRight className="h-3 w-3" /><opt.toIcon className="h-4 w-4 text-primary" />{opt.label}</span></SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="rounded-xl border-2 border-dashed p-6 text-center sm:p-8">
                  <input type="file" ref={fileInputRef} onChange={e => handleSingleSelect(e, "convert")} className="hidden" accept={fileInputAccept} data-testid="input-file-convert" />
                  {convertFile ? <div className="space-y-3">
                    <FileText className="mx-auto h-10 w-10 text-primary" /><p className="break-all font-medium">{convertFile.name}</p><p className="text-sm text-muted-foreground">{formatSize(convertFile.size)}</p>
                    <div className="flex flex-wrap justify-center gap-2"><Button variant="outline" onClick={() => fileInputRef.current?.click()}>Choose another file</Button>{/\.docx$/i.test(convertFile.name) && <OriginalDocxShare key={`${convertFile.name}-${convertFile.lastModified}-${convertFile.size}`} file={convertFile} />}</div>
                    {/\.docx$/i.test(convertFile.name) && <p className="mx-auto max-w-xl text-xs text-muted-foreground">Word exports reflow readable text only. Original layout, images, and tables are not preserved.</p>}
                  </div> : <div className="space-y-4"><Upload className="mx-auto h-10 w-10 text-muted-foreground" /><p className="text-muted-foreground">Select a PDF, JPG, PNG, or DOCX file</p><Button onClick={() => fileInputRef.current?.click()} data-testid="button-upload-convert">Select file</Button></div>}
                </div>
                {conversionType === "docx-to-pdf" && <p className="rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">PDF output is raster text, so the text will not be searchable or selectable.</p>}
                {conversionType === "pdf-to-pptx" && <div className="space-y-2 rounded-lg border p-3">
                  <Label htmlFor="pdf-powerpoint-mode">PowerPoint conversion mode</Label>
                  <select id="pdf-powerpoint-mode" className="w-full rounded-md border bg-background p-2 text-sm" value={pdfPowerPointMode} disabled={isProcessing} onChange={e => setPdfPowerPointMode(e.target.value as "pages" | "text")}>
                    <option value="pages">Keep page appearance — image slides</option>
                    <option value="text">Editable text — reflowed, no images</option>
                  </select>
                  <p className="text-xs text-muted-foreground">Runs on this device; the PDF is not uploaded for conversion. Image slides keep illustrations and scanned pages, but their text is not individually editable. Editable text mode changes layout and cannot read scans. Up to 100 pages; larger PDFs can be split first.</p>
                </div>}
                {conversionType === "pdf-to-docx" && <p className="rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">Extracts readable PDF text into an editable Word document. Layout, images and tables are not preserved. Scanned pages need OCR and are not silently skipped.</p>}
                {conversionType === "pdf-to-png" || conversionType === "pdf-to-jpeg" ? <p className="rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">Each PDF page becomes a separate image. The images are raster exports.</p> : null}
                <Button onClick={handleConvert} disabled={!convertFile || isProcessing} className="w-full" size="lg" data-testid="button-convert">{isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{processingLabel}</> : <><Download className="mr-2 h-4 w-4" />Convert file</>}</Button>
                {isProcessing && processingTab === "convert" && conversionType === "pdf-to-pptx" && <div className="flex flex-wrap items-center justify-between gap-2">
                  <p role="status" aria-live="polite" className="text-sm text-muted-foreground">{processingLabel}</p>
                  <Button variant="outline" onClick={cancelOperation}>Cancel conversion</Button>
                </div>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="merge">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Merge className="h-5 w-5 text-primary" />Merge PDFs and images</CardTitle><CardDescription>Combine PDF, JPG, JPEG, or PNG files in the order shown. Up to 10 files, 20 MB each and 30 MB total.</CardDescription></CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-xl border-2 border-dashed p-6 text-center sm:p-8">
                  <input type="file" ref={multiFileInputRef} onChange={handleMultiFileSelect} className="hidden" accept=".pdf,.jpg,.jpeg,.png" multiple data-testid="input-files-merge" />
                  {selectedFiles.length ? <div className="space-y-4">
                    <p className="font-medium">{selectedFiles.length} of 10 files · {formatSize(selectedFiles.reduce((sum, file) => sum + file.size, 0))} of 30 MB</p>
                    <ol className="mx-auto max-w-2xl space-y-2 text-left">{selectedFiles.map((file, index) => <li key={`${file.name}-${file.lastModified}-${index}`} className="flex items-center gap-2 rounded-lg border bg-background p-2">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded bg-primary/10 text-primary">{/\.(jpg|jpeg|png)$/i.test(file.name) ? <Image className="h-4 w-4" /> : <FileText className="h-4 w-4" />}</span>
                      <span className="min-w-0 flex-1 break-all text-sm">{index + 1}. {file.name}<span className="ml-2 text-xs text-muted-foreground">{formatSize(file.size)}</span></span>
                      <Button type="button" variant="ghost" size="icon" aria-label={`Move ${file.name} up`} disabled={index === 0} onClick={() => moveFile(index, -1)}><ArrowUp className="h-4 w-4" /></Button>
                      <Button type="button" variant="ghost" size="icon" aria-label={`Move ${file.name} down`} disabled={index === selectedFiles.length - 1} onClick={() => moveFile(index, 1)}><ArrowDown className="h-4 w-4" /></Button>
                      <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${file.name}`} onClick={() => setSelectedFiles(current => current.filter((_, i) => i !== index))}><X className="h-4 w-4" /></Button>
                    </li>)}</ol>
                    <div className="flex flex-wrap justify-center gap-2"><Button variant="outline" onClick={() => multiFileInputRef.current?.click()} disabled={selectedFiles.length >= 10}>Add files</Button><Button variant="ghost" onClick={() => setSelectedFiles([])}>Clear all</Button></div>
                  </div> : <div className="space-y-4"><Upload className="mx-auto h-10 w-10 text-muted-foreground" /><p className="text-muted-foreground">Add PDFs and images to create one classroom-ready PDF</p><Button onClick={() => multiFileInputRef.current?.click()} data-testid="button-upload-merge">Select files</Button></div>}
                </div>
                <Button onClick={handleMerge} disabled={selectedFiles.length < 2 || isProcessing} className="w-full" size="lg" data-testid="button-merge">{isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{processingLabel}</> : <><Download className="mr-2 h-4 w-4" />Merge files</>}</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compress">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Minimize2 className="h-5 w-5 text-primary" />Compress files</CardTitle><CardDescription>Optimize PDF or PNG files losslessly, or adjust JPEG quality. Already compressed scans and PNGs may not shrink; results show the actual size change. Quality level affects JPEG only.</CardDescription></CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2"><Label>Compression level</Label><Select value={compressionLevel} onValueChange={setCompressionLevel}><SelectTrigger data-testid="select-compression"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low (best quality)</SelectItem><SelectItem value="medium">Medium (balanced)</SelectItem><SelectItem value="high">High (smallest size)</SelectItem></SelectContent></Select></div>
                <div className="rounded-xl border-2 border-dashed p-6 text-center sm:p-8">
                  <input type="file" ref={compressInputRef} onChange={e => handleSingleSelect(e, "compress")} className="hidden" accept=".pdf,.jpg,.jpeg,.png" data-testid="input-file-compress" />
                  {compressFile ? <div className="space-y-3"><FileText className="mx-auto h-10 w-10 text-primary" /><p className="break-all font-medium">{compressFile.name}</p><p className="text-sm text-muted-foreground">{formatSize(compressFile.size)}</p><Button variant="outline" onClick={() => compressInputRef.current?.click()}>Choose another file</Button></div> : <div className="space-y-4"><Upload className="mx-auto h-10 w-10 text-muted-foreground" /><p className="text-muted-foreground">Select a PDF, JPG, or PNG file up to 20 MB</p><Button onClick={() => compressInputRef.current?.click()}>Select file</Button></div>}
                </div>
                <Button onClick={handleCompress} disabled={!compressFile || isProcessing} className="w-full" size="lg" data-testid="button-compress">{isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{processingLabel}</> : <><Download className="mr-2 h-4 w-4" />Compress file</>}</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="split">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Scissors className="h-5 w-5 text-primary" />Extract pages from a PDF</CardTitle><CardDescription>Keep only the pages you need, together or as individual PDF files.</CardDescription></CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-xl border-2 border-dashed p-6 text-center">
                  <input type="file" ref={splitInputRef} onChange={e => handleSingleSelect(e, "split")} className="hidden" accept=".pdf" />
                  {splitFile ? <div className="space-y-3"><FileText className="mx-auto h-10 w-10 text-primary" /><p className="break-all font-medium">{splitFile.name}</p><p className="text-sm text-muted-foreground">{formatSize(splitFile.size)}</p><Button variant="outline" onClick={() => splitInputRef.current?.click()}>Choose another PDF</Button></div> : <div className="space-y-3"><Upload className="mx-auto h-10 w-10 text-muted-foreground" /><p className="text-muted-foreground">Select a PDF up to 20 MB</p><Button onClick={() => splitInputRef.current?.click()}>Select PDF</Button></div>}
                </div>
                <div className="space-y-2"><Label htmlFor="split-ranges">Pages to keep</Label><Input id="split-ranges" value={splitRanges} onChange={e => setSplitRanges(e.target.value)} placeholder="For example: 1-3, 5, 8-10" aria-describedby="split-help" /><p id="split-help" className="text-xs text-muted-foreground">Use page numbers and ranges separated by commas, such as 1-3,5.</p></div>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm"><input type="checkbox" checked={separatePages} onChange={e => setSeparatePages(e.target.checked)} className="mt-1 accent-primary" /><span><strong>Save each selected page separately</strong><span className="mt-1 block text-muted-foreground">Leave unchecked to combine all selected pages in one PDF.</span></span></label>
                <Button onClick={handleSplit} disabled={!splitFile || isProcessing} className="w-full" size="lg">{isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{processingLabel}</> : <><Scissors className="mr-2 h-4 w-4" />Extract pages</>}</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="text-pptx">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Presentation className="h-5 w-5 text-primary" />Turn text into lesson slides</CardTitle><CardDescription>Paste or type a lesson outline. BrightBoard flows the text into simple, readable slides.</CardDescription></CardHeader>
              <CardContent className="space-y-5">
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4"><p className="flex items-center gap-2 font-medium"><FilePlus2 className="h-4 w-4 text-primary" />Text source</p><p className="mt-1 text-sm text-muted-foreground">This tool uses the text entered here; it does not import another file.</p></div>
                <div className="space-y-2"><Label htmlFor="presentation-name">Presentation title</Label><Input id="presentation-name" maxLength={120} value={presentationName} onChange={e => setPresentationName(e.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="presentation-text">Lesson text or outline</Label><textarea id="presentation-text" value={presentationText} onChange={e => setPresentationText(e.target.value)} maxLength={150000} rows={11} placeholder={"Paste an outline or lesson notes here…\n\nUse paragraphs to guide how the content flows across slides."} className="w-full resize-y rounded-xl border border-input bg-background px-3 py-3 text-sm leading-6 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /><p className="text-right text-xs text-muted-foreground">{presentationText.length.toLocaleString()} / 150,000 characters</p></div>
                <Button onClick={() => handleTextPresentation("pptx")} disabled={!presentationText.trim() || isProcessing} className="w-full" size="lg">{isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{processingLabel}</> : <><Presentation className="mr-2 h-4 w-4" />Create PowerPoint</>}</Button>
                <Button onClick={() => handleTextPresentation("docx")} disabled={!presentationText.trim() || isProcessing} variant="outline" className="w-full"><FileText className="mr-2 h-4 w-4" />Create Word document</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {operationError && <div role="alert" className="mx-auto mt-6 max-w-4xl rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"><strong>We couldn’t finish that task.</strong><p className="mt-1">{operationError}</p></div>}
        {results.length > 0 && <section aria-labelledby="file-results-title" className="mx-auto mt-8 max-w-4xl">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-primary">Ready to use</p><h2 id="file-results-title" className="mt-1 text-xl font-semibold">Your results</h2><p className="mt-1 text-sm text-muted-foreground">Downloads stay available here until the next successful file task.</p></div>
            {results.length > 1 && <div className="flex flex-wrap items-center gap-2">{bundleUrl && <a href={bundleUrl} download="brightboard-files.zip" className="inline-flex h-9 items-center justify-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted"><Archive className="mr-2 h-4 w-4" />Download ZIP</a>}<Button variant="outline" size="sm" onClick={() => void handleBundle()} disabled={isProcessing}>{isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Archive className="mr-2 h-4 w-4" />}Prepare ZIP</Button></div>}
          </div>
          <div className="space-y-3">{results.map(result => <PageResultCard key={result.url} result={result} />)}</div>
          {results.some(result => result.name.toLowerCase().endsWith(".pdf") && (result.name.includes("converted-") || result.name.includes("-pages-"))) && <p className="mt-3 text-xs text-muted-foreground">PDF exports from Word are raster text, not searchable. Page extraction keeps PDF text as provided by the source.</p>}
        </section>}
      </main>
      <Footer />
    </div>
  );
}
