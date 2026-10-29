import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import QRCode from "qrcode";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";
import pdfWorker from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import "@google/model-viewer";
import { ArrowDown, ArrowRight, ArrowUp, BookOpen, Check, ChevronLeft, ChevronRight, Circle, Clock3, Copy, Download, Eraser, Eye, FileImage, FilePlus2, FileText, Focus, Fullscreen, Hand, Highlighter, ImagePlus, Import, Link2, Lock, Maximize2, MoreHorizontal, Move, PanelRight, Pause, Play, Plus, Presentation, Redo2, RotateCcw, Save, ScanLine, Settings2, Share2, Sparkles, Square, Timer, Trash2, Undo2, Unlock, Upload, Users, X, ZoomIn } from "lucide-react";
import type { Background, BoardObject, Command, Hotspot, Ink, Lesson, Page, Point, StageState } from "./types";
import { blankPage, initialState, newLesson } from "./types";
import { downloadBlob, fileToDataUrl, fileToModelDataUrl, lessonFromJSON, MAX_FILE, MAX_LESSON_FILE, mergeLessonPages, safeName, validLesson } from "./helpers";
import { MODEL_LIBRARY } from "./models";
import { useRelay } from "./useRelay";
import { workspaceStorage } from "./workspace-storage";
import { useConfirmation } from "./useConfirmation";
import { chooseLocalLessonFile, openLocalLesson, supportsLocalFiles, writeLessonFile, type LocalLessonFile } from "./local-files";
import { assertPageLimit, FREE_PAGE_LIMIT, verifiedPageLimit, PAGE_LIMIT_DESCRIPTION, replacesEmptyStarter } from "./page-limits";
import { CloudLibrary } from "./CloudLibrary";
import { CloudLibraryError, openCloudLesson, saveCloudLesson } from "./cloud-library";
import { PresentationSize } from "./PresentationSize";
import { formatBytes, hasOversizedRelayAsset, lessonBlob, MAX_RELAY_BYTES, presentationSizes } from "./presentation-size";

GlobalWorkerOptions.workerSrc = pdfWorker;
type Tool = "pen" | "highlighter" | "eraser" | "text" | "rect" | "ellipse" | "arrow" | "line" | "select" | "move";
type Modal = "library" | "share" | "transfer" | "timer" | "names" | "model" | "settings" | "help" | null;
type LibraryAccessStatus = "checking" | "allowed" | "restricted" | "unavailable";
type DeviceImportMode = "open" | "merge";
const colors = ["#183a40", "#197b70", "#d56b51", "#e6a737", "#5368a9", "#805fa2", "#27323a", "#f6fbf4"];
const getPage = (lesson: Lesson, index: number) => lesson.pages[Math.max(0, Math.min(index, lesson.pages.length - 1))];
const makeObject = (type: BoardObject["type"], x: number, y: number, color: string): BoardObject =>
  ({ id: crypto.randomUUID(), type, x, y, width: type === "text" ? .32 : .18, height: type === "text" ? .1 : .15, color, text: type === "text" ? "Double-click to edit" : undefined, fontSize: 38 });
const asStage = (lesson: Lesson): StageState => ({ ...initialState(lesson), pageIndex: 0 });
function loadWorkspace(): Lesson {
  return workspaceStorage.workspace() || newLesson();
}
function readLibrary(): Lesson[] {
  return workspaceStorage.library();
}
function svgPath(points: Point[], width: number, height: number) {
  return points.map((p, i) => `${i ? "L" : "M"} ${p.x * width} ${p.y * height}`).join(" ");
}
type CameraElement = HTMLElement & { getCameraOrbit?: () => { theta: number; phi: number; radius: number } };
function serializeCameraOrbit(viewer: CameraElement | null) {
  const camera = viewer?.getCameraOrbit?.();
  return camera && Number.isFinite(camera.theta) && Number.isFinite(camera.phi) && Number.isFinite(camera.radius)
    ? `${camera.theta}rad ${camera.phi}rad ${camera.radius}m` : null;
}
function ModelViewer({ page, onOrbit, frozen = false, onHotspot, resetKey = 0 }: { page: Page; onOrbit?: (orbit: string) => void; frozen?: boolean; onHotspot?: (hotspot: Hotspot) => void; resetKey?: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<(HTMLElement & { getCameraOrbit?: () => { theta: number; phi: number; radius: number }; positionAndNormalFromPoint?: (x: number, y: number) => { position?: { x: number; y: number; z: number }; normal?: { x: number; y: number; z: number } } | null }) | null>(null);
  const orbitCallback = useRef(onOrbit); orbitCallback.current = onOrbit;
  const appliedOrbitProp = useRef(page.model?.cameraOrbit || "");
  const appliedResetKey = useRef(resetKey);
  const suppressCameraEvent = useRef(false);
  const suppressTimer = useRef<number | null>(null);
  const [modelError, setModelError] = useState("");
  const [modelLoaded, setModelLoaded] = useState(false);
  const [hotspotMessage, setHotspotMessage] = useState<{ label: string; description: string } | null>(null);
  const hotspotKey = (page.model?.hotspots || []).map(h => `${h.id}:${h.position}:${h.normal}:${h.label}`).join("|");
  useEffect(() => {
    if (!ref.current || !page.model) return;
    const probe = document.createElement("canvas");
    let graphics: WebGL2RenderingContext | null = null;
    try { graphics = probe.getContext("webgl2"); } catch { /* Explicit fallback below. */ }
    if (!graphics) {
      viewerRef.current = null; ref.current.replaceChildren();
      setModelError("3D rendering requires WebGL 2. Enable graphics acceleration or use a supported browser. Your board and presentation are still available.");
      setModelLoaded(false); return;
    }
    graphics.getExtension("WEBGL_lose_context")?.loseContext();
    const el = document.createElement("model-viewer") as HTMLElement & { getCameraOrbit?: () => { theta: number; phi: number; radius: number } };
    el.setAttribute("src", page.model.src); el.setAttribute("alt", `${page.model.name}, interactive 3D model`);
    if (!frozen) el.setAttribute("camera-controls", "");
    el.setAttribute("interaction-prompt", "auto"); el.setAttribute("touch-action", "pan-y");
    el.setAttribute("shadow-intensity", ".55"); el.setAttribute("exposure", "1");
    el.setAttribute("camera-orbit", page.model.cameraOrbit || "auto auto auto");
    if (frozen) el.setAttribute("disable-zoom", "");
    setModelError(""); setModelLoaded(false); setHotspotMessage(null);
    for (const h of page.model.hotspots || []) {
      const button = document.createElement("button");
      button.setAttribute("slot", `hotspot-${h.id}`); button.setAttribute("data-position", h.position);
      button.setAttribute("data-normal", h.normal); button.textContent = h.label;
      button.title = h.description || h.label;
      button.addEventListener("click", event => { event.stopPropagation(); setHotspotMessage({ label: h.label, description: h.description }); });
      el.append(button);
    }
    viewerRef.current = el; ref.current.replaceChildren(el);
    const loaded = () => { setModelLoaded(true); setModelError(""); };
    const failed = () => { setModelError("This 3D model could not load. Check the asset or uploaded GLB file."); };
    const change = (event: Event) => {
      const source = (event as CustomEvent<{ source?: string }>).detail?.source;
      if (source && source !== "user-interaction") return;
      if (suppressCameraEvent.current) {
        suppressCameraEvent.current = false;
        if (suppressTimer.current !== null) window.clearTimeout(suppressTimer.current);
        suppressTimer.current = null;
        return;
      }
      const serialized = serializeCameraOrbit(el);
      if (serialized) orbitCallback.current?.(serialized);
    };
    el.addEventListener("camera-change", change);
    el.addEventListener("load", loaded); el.addEventListener("error", failed);
    appliedOrbitProp.current = page.model.cameraOrbit || "";
    return () => {
      el.removeEventListener("camera-change", change); el.removeEventListener("load", loaded); el.removeEventListener("error", failed);
      if (suppressTimer.current !== null) window.clearTimeout(suppressTimer.current);
    };
  // Do not remount the viewer as cameraOrbit changes: camera-change updates are frequent.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.model?.src, frozen, hotspotKey]);
  useEffect(() => {
    const viewer = viewerRef.current;
    const nextOrbit = page.model?.cameraOrbit || "";
    const resetChanged = resetKey !== appliedResetKey.current;
    if (viewer && (nextOrbit !== appliedOrbitProp.current || resetChanged)) {
      appliedOrbitProp.current = nextOrbit;
      appliedResetKey.current = resetKey;
      if (!resetChanged && nextOrbit && serializeCameraOrbit(viewer) === nextOrbit) return;
      suppressCameraEvent.current = true;
      viewer.setAttribute("camera-orbit", nextOrbit || "auto auto auto");
      if (suppressTimer.current !== null) window.clearTimeout(suppressTimer.current);
      suppressTimer.current = window.setTimeout(() => { suppressCameraEvent.current = false; suppressTimer.current = null; }, 350);
    }
  }, [page.model?.cameraOrbit, resetKey]);
  if (!page.model) return null;
  return <div className="model-area" onClick={event => {
    if (!onHotspot || !viewerRef.current) return;
    const rect = viewerRef.current.getBoundingClientRect();
    const hit = viewerRef.current.positionAndNormalFromPoint?.(event.clientX - rect.left, event.clientY - rect.top);
    if (!hit?.position || !hit.normal) { window.dispatchEvent(new CustomEvent("bbtv-toast", { detail: "Tap directly on the model surface to place a hotspot." })); return; }
    const position = `${hit.position.x}m ${hit.position.y}m ${hit.position.z}m`, normal = `${hit.normal.x} ${hit.normal.y} ${hit.normal.z}`;
    onHotspot({ id: crypto.randomUUID(), label: "Point of interest", description: "", position, normal });
  }}><div className="model-mount" ref={ref} />{(modelError || !modelLoaded) && <div className="model-status" role="status">{modelError || "Loading 3D scene…"}</div>}{hotspotMessage && <div className="hotspot-description" role="status"><strong>{hotspotMessage.label}</strong><span>{hotspotMessage.description || "No description provided."}</span><button className="button small" onClick={() => setHotspotMessage(null)}>Close</button></div>}</div>;
}
function App() {
  const params = new URLSearchParams(location.search);
  const mode = params.get("mode") || "edit";
  const [lesson, setLesson] = useState<Lesson>(loadWorkspace);
  const [stage, setStage] = useState<StageState>(() => asStage(lesson));
  const [saveStatus, setSaveStatus] = useState<"saving" | "saved" | "error">("saving");
  const autosaveTimer = useRef<number | null>(null);
  const importHandled = useRef(false);
  const linkedFile = useRef<{ handle: LocalLessonFile; lessonId: string } | null>(null);
  const [localFileName, setLocalFileName] = useState("");
  const [fileBusy, setFileBusy] = useState(false);
  const { requestConfirmation, confirmationDialog, confirmationOpen } = useConfirmation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [tool, setTool] = useState<Tool>("select");
  const [moveMode, setMoveMode] = useState(false);
  const [color, setColor] = useState(colors[0]);
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [modal, setModal] = useState<Modal>(null);
  const [toast, setToast] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modelResetKey, setModelResetKey] = useState(0);
  const [undoStack, setUndoStack] = useState<Lesson[]>([]);
  const [redoStack, setRedoStack] = useState<Lesson[]>([]);
  const [library, setLibrary] = useState<Lesson[]>(readLibrary);
  const [libraryAccess, setLibraryAccess] = useState<LibraryAccessStatus>("checking");
  const [hostedLibrary, setHostedLibrary] = useState<boolean | null>(null);
  const [cloudRefresh, setCloudRefresh] = useState(0);
  const [cloudBusy, setCloudBusy] = useState(false);
  // Only a version actually opened/saved in this editor may be overwritten.
  const cloudRevisions = useRef(new Map<string, string>());
  const [pageLimit, setPageLimit] = useState(FREE_PAGE_LIMIT);
  const livePageLimit = useRef(pageLimit);
  livePageLimit.current = pageLimit;
  const liveLesson = useRef(lesson);
  liveLesson.current = lesson;
  const [deviceImportMode, setDeviceImportMode] = useState<DeviceImportMode>("open");
  const [isOnline, setOnline] = useState(navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [qr, setQr] = useState("");
  const [names, setNames] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [groupSize, setGroupSize] = useState(3);
  const [timerSeconds, setTimerSeconds] = useState(300);
  const [laser, setLaser] = useState(false);
  const [deviceName, setDeviceName] = useState("Presenter remote");
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [joinIdInput, setJoinIdInput] = useState("");
  const [joinStatus, setJoinStatus] = useState("");
  const [cameraWarning, setCameraWarning] = useState("");
  const [installMessage, setInstallMessage] = useState("");
  const [pdfProgress, setPdfProgress] = useState("");
  const powerpointAbort = useRef<AbortController | null>(null);
  const [powerpointWarnings, setPowerpointWarnings] = useState<string[]>([]);
  const [remoteStage, setRemoteStage] = useState<StageState | null>(null);
  const [showPrivateNotes, setShowPrivateNotes] = useState(true);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);
  const [reveal, setReveal] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);
  const jsonRef = useRef<HTMLInputElement>(null);
  const libraryImportRef = useRef<HTMLInputElement>(null);
  const deviceImportModeRef = useRef<DeviceImportMode>("open");
  const lastLaserAt = useRef(0);
  const lastCameraAt = useRef(0);
  const lastRemoteCameraAt = useRef(0);
  const ignorePublishOnce = useRef(false);
  const relayRoleRef = useRef<"host" | "controller" | "display">("host");
  const drawing = useRef<Ink | null>(null);
  const lastErasePoint = useRef<Point | null>(null);
  const draggedObject = useRef<{ id: string; x: number; y: number; startX: number; startY: number; kind: "move" | "draw" } | null>(null);
  const relay = useRelay(snap => {
    if (mode !== "edit" && snap.state) setRemoteStage(snap.state);
    else if (relayRoleRef.current === "host" && snap.state) {
      ignorePublishOnce.current = true;
      setLesson(snap.state.lesson); setCurrentIndex(snap.state.pageIndex); setStage(snap.state);
    }
  });
  relayRoleRef.current = relay.session?.role || "host";
  const page = getPage(lesson, currentIndex);
  const currentState = mode === "display" || mode === "remote" ? (remoteStage || stage) : null;
  const editor = mode === "edit";
  const relayStage = useMemo(() => ({ ...stage, lesson, pageIndex: currentIndex }), [stage, lesson, currentIndex]);
  const transferSizes = useMemo(() => presentationSizes(lesson, relayStage), [lesson, relayStage]);
  const oversizedRelayAsset = useMemo(() => hasOversizedRelayAsset(lesson), [lesson]);
  const activateTool = (next: Tool) => { setTool(next); setMoveMode(next === "move"); };

  const notify = useCallback((message: string, error = false) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
    if (error) setCameraWarning(message);
  }, []);
  const checkLibraryAccess = useCallback(async () => {
    setLibraryAccess("checking");
    setPageLimit(FREE_PAGE_LIMIT);
    setHostedLibrary(null);
    try {
      const healthResponse = await fetch("/api/tv/health", { credentials: "include", headers: { Accept: "application/json" } });
      if (!healthResponse.ok) throw new Error("Could not verify BrightBoard hosting status.");
      const health = await healthResponse.json() as { hostedLibrary?: unknown };
      if (health.hostedLibrary !== true) {
        setHostedLibrary(false);
        setLibraryAccess("allowed");
        return;
      }
      setHostedLibrary(true);
      const accessResponse = await fetch("/api/tv/library-access", { credentials: "include", headers: { Accept: "application/json" } });
      if (!accessResponse.ok) throw new Error("Could not verify lesson library access.");
      const access = await accessResponse.json() as { canSaveLibrary?: unknown; maxPages?: unknown };
      if (typeof access.canSaveLibrary !== "boolean") throw new Error("Library access response was incomplete.");
      setLibraryAccess(access.canSaveLibrary ? "allowed" : "restricted");
      setPageLimit(verifiedPageLimit(access.maxPages));
    } catch {
      setLibraryAccess("unavailable");
    }
  }, []);
  useEffect(() => {
    const fn = (event: Event) => notify(String((event as CustomEvent).detail));
    window.addEventListener("bbtv-toast", fn); return () => window.removeEventListener("bbtv-toast", fn);
  }, [notify]);
  useEffect(() => { void checkLibraryAccess(); }, [checkLibraryAccess]);
  useEffect(() => {
    const recheck = () => { void checkLibraryAccess(); };
    window.addEventListener("focus", recheck);
    window.addEventListener("online", recheck);
    return () => { window.removeEventListener("focus", recheck); window.removeEventListener("online", recheck); };
  }, [checkLibraryAccess]);
  useEffect(() => { const online = () => setOnline(true), offline = () => setOnline(false);
    window.addEventListener("online", online); window.addEventListener("offline", offline);
    const install = (e: Event) => { e.preventDefault?.(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", install);
    return () => { window.removeEventListener("online", online); window.removeEventListener("offline", offline); window.removeEventListener("beforeinstallprompt", install); };
  }, []);
  useEffect(() => {
    if (location.pathname.startsWith("/tv") || location.pathname === "/") {
      if ("serviceWorker" in navigator) {
        const workerPath = new URL("sw.js", location.href).pathname;
        navigator.serviceWorker.register(workerPath).catch(() => setInstallMessage("Offline shell could not be registered; local editing still works."));
      }
    }
  }, []);
  useEffect(() => {
    const importFlag = params.get("import") === "brightboard";
    if (!importFlag || importHandled.current || libraryAccess === "checking") return;
    importHandled.current = true;
    void (async () => { try {
      const raw = localStorage.getItem("brightboard-tv-import");
      const envelope = raw ? JSON.parse(raw) : null;
      const candidate = envelope?.lesson || envelope;
      if (validLesson(candidate)) {
        assertPageLimit(candidate.pages.length, pageLimit);
        // Keep the previous autosaved draft before a cross-app import replaces it.
        const prior = liveLesson.current;
        setLibrary(await workspaceStorage.switchWorkspace(candidate, prior && prior.id !== candidate.id ? prior : undefined));
        setLesson(candidate); setCurrentIndex(0); setStage(asStage(candidate));
        localStorage.removeItem("brightboard-tv-import");
        notify("BrightBoard presentation imported. Previous draft kept in the library.");
        if (params.get("merge") === "device") {
          deviceImportModeRef.current = "merge";
          setDeviceImportMode("merge");
          setModal("library");
        }
      }
      else notify("The BrightBoard import is missing or invalid.", true);
    } catch (error) { importHandled.current = false; notify(error instanceof Error ? error.message : "Could not save the BrightBoard import. Your previous draft has been kept.", true); } })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [libraryAccess, pageLimit]);
  useEffect(() => {
    if (!editor) return;
    let active = true;
    setSaveStatus("saving");
    const id = autosaveTimer.current = window.setTimeout(() => {
      void workspaceStorage.saveWorkspace(lesson).then(() => { if (active) setSaveStatus("saved"); })
        .catch(() => { if (active) { setSaveStatus("error"); notify("Device storage could not save this draft. Download a .bbtv backup; your open presentation is still here.", true); } });
    }, 300);
    return () => { active = false; window.clearTimeout(id); };
  }, [lesson, editor, notify]);
  useEffect(() => {
    if (editor && relay.session?.role === "host") {
      if (ignorePublishOnce.current) { ignorePublishOnce.current = false; return; }
      const timer = window.setTimeout(() => void relay.publish(relayStage), 400);
      return () => window.clearTimeout(timer);
    }
  }, [relayStage, relay.session?.id, relay.session?.role]);
  useEffect(() => {
    if (!currentState || mode === "edit") return;
    setLesson(currentState.lesson); setCurrentIndex(currentState.pageIndex);
  }, [currentState?.lesson, currentState?.pageIndex, mode]);
  useEffect(() => {
    if ((mode === "remote" || mode === "display") && !relay.session) {
      const id = location.hash.match(/(?:^#|&)id=([^&]+)/)?.[1];
      const code = location.hash.match(/(?:^#|&)code=([^&]+)/)?.[1];
      if (id) setJoinIdInput(decodeURIComponent(id));
      if (code) setJoinCodeInput(decodeURIComponent(code));
    }
  }, [mode, relay.session]);
  useEffect(() => {
    if (relay.session?.role === "host") void QRCode.toDataURL(`${location.origin}${location.pathname}?mode=remote#id=${encodeURIComponent(relay.session.id)}&code=${encodeURIComponent(relay.joinCode)}`, { width: 240, margin: 1 }).then(setQr).catch(() => setQr(""));
  }, [relay.session?.id, relay.joinCode]);
  const updateLesson = (mutator: (prev: Lesson) => Lesson, history = true) => {
    if (history) { setUndoStack(s => [...s.slice(-39), lesson]); setRedoStack([]); }
    setLesson(prev => { const next = mutator(prev); return { ...next, updatedAt: new Date().toISOString() }; });
  };
  const updatePage = (mutator: (p: Page) => Page, history = true) =>
    updateLesson(l => ({ ...l, pages: l.pages.map((p, i) => i === currentIndex ? mutator(p) : p) }), history);
  const restoreLesson = (next: Lesson) => { setLesson(next); setCurrentIndex(Math.min(currentIndex, next.pages.length - 1)); setSelectedId(null); };
  const undo = () => {
    if (!undoStack.length) return;
    setRedoStack(s => [...s, lesson]); restoreLesson(undoStack[undoStack.length - 1]); setUndoStack(s => s.slice(0, -1));
  };
  const redo = () => {
    if (!redoStack.length) return;
    setUndoStack(s => [...s, lesson]); restoreLesson(redoStack[redoStack.length - 1]); setRedoStack(s => s.slice(0, -1));
  };
  const canGrow = (count = 1) => {
    try { assertPageLimit(lesson.pages.length + count, pageLimit); return true; }
    catch (error) { notify((error as Error).message, true); return false; }
  };
  const addPage = () => { if (!canGrow()) return; const p = blankPage(`Page ${lesson.pages.length + 1}`); updateLesson(l => ({ ...l, pages: [...l.pages.slice(0, currentIndex + 1), p, ...l.pages.slice(currentIndex + 1)] })); setCurrentIndex(currentIndex + 1); };
  const deletePage = () => requestConfirmation({
    title: "Delete this page?", confirmLabel: "Delete page",
    description: `Delete “${page.title}” and its content? ${lesson.pages.length === 1 ? "The last page will be replaced with a blank page." : "Other pages will stay."} You can use Undo while this editor remains open.`,
    run: () => {
      const id = page.id;
      updateLesson(l => { const remaining = l.pages.filter(p => p.id !== id); return { ...l, pages: remaining.length ? remaining : [blankPage("Page 1")] }; });
      setSelectedId(null); setCurrentIndex(Math.max(0, currentIndex - 1)); notify("Page deleted. Use Undo to restore it.");
    },
  });
  const movePage = (direction: number) => {
    const target = currentIndex + direction; if (target < 0 || target >= lesson.pages.length) return;
    updateLesson(l => { const pages = [...l.pages]; [pages[currentIndex], pages[target]] = [pages[target], pages[currentIndex]]; return { ...l, pages }; });
    setCurrentIndex(target);
  };
  const choosePage = (i: number) => { setSelectedId(null); setCurrentIndex(i); if (relay.session?.role === "host") void relay.command({ type: "page", index: i }); };
  useEffect(() => {
    document.querySelector(".page-item.selected")?.scrollIntoView?.({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [currentIndex]);
  const renamePage = (title: string) => updatePage(p => ({ ...p, title }), false);
  const addObject = (type: BoardObject["type"]) => {
    const obj = makeObject(type, .38, .37, color);
    updatePage(p => ({ ...p, objects: [...p.objects, obj] })); setSelectedId(obj.id);
    if (type === "text") activateTool("select");
  };
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!canvasRef.current || !editor) return;
    const rect = canvasRef.current.getBoundingClientRect(), point = { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height };
    const target = event.target as HTMLElement;
    if ((tool === "select" || moveMode) && target.closest(".board-object")) {
      const id = target.closest<HTMLElement>(".board-object")?.dataset.objectId;
      const obj = page.objects.find(o => o.id === id);
      if (obj && !obj.locked && moveMode) { draggedObject.current = { id: obj.id, x: obj.x, y: obj.y, startX: point.x, startY: point.y, kind: "move" }; setSelectedId(obj.id); }
      return;
    }
    if (tool === "pen" || tool === "highlighter" || tool === "eraser") {
      if (page.model && tool !== "eraser" && !moveMode) { /* ink intentionally sits on top of frozen/rotating scene */ }
      event.currentTarget.setPointerCapture(event.pointerId);
      if (tool === "eraser") { lastErasePoint.current = point; updatePage(p => ({ ...p, ink: p.ink.filter(s => !s.points.some(pt => Math.hypot(pt.x - point.x, pt.y - point.y) < .035)), objects: p.objects.filter(o => point.x < o.x - .01 || point.x > o.x + o.width + .01 || point.y < o.y - .01 || point.y > o.y + o.height + .01) })); return; }
      drawing.current = { id: crypto.randomUUID(), points: [point], color, width: tool === "highlighter" ? strokeWidth * 4 : strokeWidth, highlighter: tool === "highlighter" };
      updatePage(p => ({ ...p, ink: [...p.ink, drawing.current!] }));
    } else if (["rect", "ellipse", "arrow", "line"].includes(tool)) {
      const item = makeObject(tool as BoardObject["type"], point.x, point.y, color);
      item.width = .001; item.height = .001; updatePage(p => ({ ...p, objects: [...p.objects, item] })); draggedObject.current = { id: item.id, x: item.x, y: item.y, startX: point.x, startY: point.y, kind: "draw" }; setSelectedId(item.id);
    } else if (tool === "text") { addObject("text"); }
    else if (tool === "select") { setSelectedId(null); }
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect(), point = { x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) };
    if (laser) {
      setStage(s => ({ ...s, pointer: { ...point, visible: true } }));
      if (relay.session?.role === "host" && Date.now() - lastLaserAt.current >= 90) {
        lastLaserAt.current = Date.now();
        void relay.command({ type: "pointer", x: point.x, y: point.y, visible: true });
      }
    }
    if (drawing.current) {
      drawing.current.points.push(point); const id = drawing.current.id, nextPoints = [...drawing.current.points];
      updatePage(p => ({ ...p, ink: p.ink.map(s => s.id === id ? { ...s, points: nextPoints } : s) }), false);
    } else if (tool === "eraser" && lastErasePoint.current) {
      const previous = lastErasePoint.current, distance = Math.hypot(point.x - previous.x, point.y - previous.y);
      const count = Math.min(12, Math.ceil(distance / .02)) + 1;
      const samples = Array.from({ length: count }, (_, i) => ({ x: previous.x + (point.x - previous.x) * i / (count - 1 || 1), y: previous.y + (point.y - previous.y) * i / (count - 1 || 1) }));
      updatePage(p => ({ ...p, ink: p.ink.filter(stroke => !stroke.points.some(pt => samples.some(at => Math.hypot(pt.x - at.x, pt.y - at.y) < .035))), objects: p.objects.filter(o => !samples.some(at => at.x >= o.x && at.x <= o.x + o.width && at.y >= o.y && at.y <= o.y + o.height)) }), false);
      lastErasePoint.current = point;
    }
    if (draggedObject.current) {
      const drag = draggedObject.current;
      updatePage(p => ({ ...p, objects: p.objects.map(o => o.id !== drag.id ? o : drag.kind === "move"
        ? { ...o, x: Math.max(0, Math.min(1 - o.width, drag.x + point.x - drag.startX)), y: Math.max(0, Math.min(1 - o.height, drag.y + point.y - drag.startY)) }
        : { ...o, width: Math.max(.015, Math.abs(point.x - drag.startX)), height: Math.max(.015, Math.abs(point.y - drag.startY)), x: ["rect", "ellipse", "text", "image"].includes(o.type) ? Math.min(point.x, drag.startX) : drag.startX, y: ["rect", "ellipse", "text", "image"].includes(o.type) ? Math.min(point.y, drag.startY) : drag.startY }) }), false);
    }
  };
  const onPointerUp = () => {
    drawing.current = null; draggedObject.current = null; lastErasePoint.current = null;
    if (laser) { setStage(s => ({ ...s, pointer: { ...s.pointer, visible: false } })); if (relay.session?.role === "host") void relay.command({ type: "pointer", x: stage.pointer.x, y: stage.pointer.y, visible: false }); }
  };
  const clearBoard = () => requestConfirmation({
    title: "Clear this page?", confirmLabel: "Clear page",
    description: "Remove drawings, text, images and the 3D model from this page? Private notes and other pages stay. You can use Undo to restore the content.",
    run: () => { updatePage(p => ({ ...p, ink: [], objects: [], model: undefined })); setSelectedId(null); setReveal(false); notify("Page cleared. Use Undo to restore it."); },
  });
  const editText = (obj: BoardObject) => { const text = window.prompt("Edit text", obj.text || ""); if (text !== null) updatePage(p => ({ ...p, objects: p.objects.map(o => o.id === obj.id ? { ...o, text } : o) })); };
  const resizeSelected = (direction: number) => updatePage(p => ({ ...p, objects: p.objects.map(o => o.id === selectedId ? { ...o, width: Math.max(.04, Math.min(.9, o.width + direction * .03)), height: Math.max(.04, Math.min(.9, o.height + direction * .02)) } : o) }));
  const toggleLock = () => updatePage(p => ({ ...p, objects: p.objects.map(o => o.id === selectedId ? { ...o, locked: !o.locked } : o) }));
  const removeSelected = () => { updatePage(p => ({ ...p, objects: p.objects.filter(o => o.id !== selectedId) })); setSelectedId(null); };
  const saveToLibrary = async (snapshot = lesson) => {
    if (libraryAccess !== "allowed") {
      notify(libraryAccess === "restricted"
        ? "Saved lesson library saving is part of a paid BrightBoard plan. Download a .bbtv backup to keep a copy."
        : "Library access could not be verified. Download a .bbtv backup, reconnect, and retry the access check.", true);
      return;
    }
    setCloudBusy(true);
    try {
      assertPageLimit(snapshot.pages.length, pageLimit);
      if (hostedLibrary === true) {
        const saved = await saveCloudLesson(snapshot, cloudRevisions.current.get(snapshot.id));
        cloudRevisions.current.set(snapshot.id, saved.revision);
        setCloudRefresh(value => value + 1);
        notify("Saved to your private account library. Open it on any signed-in device.");
      } else if (hostedLibrary === false) {
        setLibrary(await workspaceStorage.saveLibrary(snapshot)); notify("Saved to this device’s lesson library.");
      } else throw new Error("Hosting status is unknown. Download a .bbtv backup and retry online.");
    }
    catch (error) {
      if (hostedLibrary === true && error instanceof CloudLibraryError && error.status === 409) {
        // Never silently replace a version this editor has not seen.
        try {
          const latest = await openCloudLesson(snapshot.id);
          requestConfirmation({ title: "Replace the account copy?", confirmLabel: "Replace account copy",
            description: `“${latest.lesson.title}” is already saved or changed on another device. Replace it with this editor’s snapshot? Cancel to open or download the account version first. Your device recovery copies stay unchanged.`,
            run: async () => {
              const saved = await saveCloudLesson(snapshot, latest.revision);
              cloudRevisions.current.set(snapshot.id, saved.revision);
              setCloudRefresh(value => value + 1); notify("Account lesson updated.");
            } });
        } catch (failure) { notify(failure instanceof Error ? failure.message : "Could not check the account copy. Download a backup and retry.", true); }
      } else notify(error instanceof Error ? error.message : "Could not save to library. Export a backup or remove large images.", true);
    }
    finally { setCloudBusy(false); }
  };
  const exportLesson = () => setModal("transfer");
  const loadLesson = async (selected: Lesson) => {
    const previous = liveLesson.current;
    if (autosaveTimer.current !== null) window.clearTimeout(autosaveTimer.current);
    // Opening a file must not silently discard the presentation being edited.
    if (selected !== previous) {
      try {
        setLibrary(await workspaceStorage.switchWorkspace(selected, previous));
      } catch {
        setSaveStatus(previous === workspaceStorage.workspace() ? "saved" : "error");
        notify("Could not back up your current presentation. Export it or free browser storage before opening another file.", true);
        return false;
      }
    }
    setUndoStack([]); setRedoStack([]); restoreLesson(selected); setStage(asStage(selected)); setModal(null);
    notify("Presentation opened. Your previous presentation is kept in device recovery copies.");
    return true;
  };
  const openLocalFile = async () => {
    if (!supportsLocalFiles()) { notify("Direct file access is unavailable here. Use the device importer and download .bbtv backups instead.", true); return; }
    setFileBusy(true);
    try {
      const opened = await openLocalLesson();
      assertPageLimit(opened.lesson.pages.length, livePageLimit.current);
      if (await loadLesson(opened.lesson)) {
        linkedFile.current = { handle: opened.handle, lessonId: opened.lesson.id };
        setLocalFileName(opened.handle.name);
      }
    } catch (error) { if ((error as Error).name !== "AbortError") notify((error as Error).message || "Could not open the local file.", true); }
    finally { setFileBusy(false); }
  };
  const saveLocalFile = async () => {
    if (!supportsLocalFiles()) { exportLesson(); return; }
    setFileBusy(true);
    try {
      const handle = linkedFile.current?.lessonId === lesson.id ? linkedFile.current.handle : await chooseLocalLessonFile(lesson);
      await writeLessonFile(handle, lesson);
      linkedFile.current = { handle, lessonId: lesson.id }; setLocalFileName(handle.name);
      notify(`Presentation snapshot saved directly to ${handle.name}.`);
    } catch (error) { if ((error as Error).name !== "AbortError") notify((error as Error).message || "Could not save the local file. Your open presentation is unchanged.", true); }
    finally { setFileBusy(false); }
  };
  const removeFromLibrary = (id: string) => requestConfirmation({
    title: "Delete saved lesson?", confirmLabel: "Delete saved lesson",
    description: "Remove this saved copy from this device? The presentation currently open in the editor is not deleted. Download a backup first if you want to keep the saved copy.",
    run: async () => { setLibrary(await workspaceStorage.deleteLibrary(id)); notify("Saved lesson deleted."); },
  });
  const handleImportJSON = async (event: ChangeEvent<HTMLInputElement>, importMode: DeviceImportMode = "open") => {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
      notify("For PDFs, use the device importer in the saved lesson library or Insert PDF in the toolbar.", true);
      return;
    }
    if (file.size > MAX_LESSON_FILE) { notify("Lesson files must be 64 MB or smaller.", true); return; }
    try {
      const imported = lessonFromJSON(await file.text());
      assertPageLimit(imported.pages.length, livePageLimit.current);
      if (importMode === "merge") {
        const merged = mergeLessonPages(liveLesson.current, imported, undefined, livePageLimit.current);
        updateLesson(() => merged);
        setModal(null);
        notify(`Merged ${imported.pages.length} page${imported.pages.length === 1 ? "" : "s"} into “${lesson.title}”.`);
      } else await loadLesson(imported);
    } catch (e) { notify(e instanceof Error ? e.message : "Invalid lesson file.", true); }
  };
  const importImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    try {
      const extensionOnlyImage = !file.type && /\.(png|jpe?g|webp|gif)$/i.test(file.name);
      if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type) && !extensionOnlyImage) throw new Error("Choose a PNG, JPEG, WebP or GIF image.");
      if (page.objects.length >= 1000) throw new Error("This page has reached its 1,000-object limit. Add the image to another page.");
      const src = await fileToDataUrl(file); const image = new Image(); image.src = src;
      await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("This image could not be decoded.")); });
      const ratio = image.width / image.height; const w = Math.min(.7, .62 * ratio), h = Math.min(.7, .62 / ratio);
      updatePage(p => ({ ...p, objects: [...p.objects, { ...makeObject("image", (.5 - w / 2), (.5 - h / 2), color), width: w, height: h, src }] }));
      setModal(null);
    } catch (e) { notify(e instanceof Error ? e.message : "Image import failed.", true); }
  };
  const importPDF = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    if (file.size > MAX_FILE) { notify("PDF files must be 25 MB or smaller.", true); return; }
    setPdfProgress("Opening PDF…");
    try {
      const bytes = await file.arrayBuffer(), pdf = await getDocument({ data: bytes }).promise;
      const starter = replacesEmptyStarter(lesson);
      assertPageLimit((starter ? 0 : lesson.pages.length) + pdf.numPages, pageLimit);
      const rendered: Page[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        setPdfProgress(`Rendering PDF page ${i} of ${pdf.numPages}…`);
        const pdfPage = await pdf.getPage(i), viewport = pdfPage.getViewport({ scale: Math.min(2, 1600 / pdfPage.getViewport({ scale: 1 }).width) });
        const canvas = document.createElement("canvas"); canvas.width = viewport.width; canvas.height = viewport.height;
        await pdfPage.render({ canvas, canvasContext: canvas.getContext("2d")!, viewport }).promise;
        const src = canvas.toDataURL("image/jpeg", .9);
        const pg = blankPage(`${file.name.replace(/\.pdf$/i, "")} · ${i}`);
        pg.objects.push({ ...makeObject("image", 0, 0, "#183a40"), width: 1, height: 1, src });
        rendered.push(pg);
      }
      const latest = liveLesson.current;
      const replaceStarter = replacesEmptyStarter(latest);
      assertPageLimit((replaceStarter ? 0 : latest.pages.length) + rendered.length, livePageLimit.current);
      const insertionIndex = Math.min(currentIndex + 1, latest.pages.length);
      updateLesson(() => ({ ...latest, pages: replaceStarter ? rendered : [...latest.pages.slice(0, insertionIndex), ...rendered, ...latest.pages.slice(insertionIndex)] }));
      setCurrentIndex(replaceStarter ? 0 : insertionIndex); setModal(null); notify(`Added ${rendered.length} PDF page${rendered.length === 1 ? "" : "s"}.`);
    } catch (e) { notify(e instanceof Error ? e.message : "PDF import failed.", true); }
    finally { setPdfProgress(""); }
  };
  const importPPTX = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file || powerpointAbort.current) return;
    const controller = new AbortController();
    powerpointAbort.current = controller;
    setModal(null);
    setPowerpointWarnings([]);
    setPdfProgress("Opening PowerPoint…");
    try {
      const importMode = deviceImportModeRef.current;
      const start = liveLesson.current;
      const isMerge = importMode === "merge" && !replacesEmptyStarter(start);
      const { importPowerPoint } = await import("./powerpoint");
      const result = await importPowerPoint(file, {
        maxPages: livePageLimit.current, existingPages: isMerge ? start.pages.length : 0,
        signal: controller.signal, progress: setPdfProgress,
      });
      if (controller.signal.aborted) throw new Error("PowerPoint import cancelled. Your presentation was not changed.");
      const imported = { ...newLesson(), title: file.name.replace(/\.pptx$/i, "").slice(0, 200) || "Imported presentation", pages: result.pages };
      if (!validLesson(imported) || new Blob([JSON.stringify(imported)]).size > MAX_LESSON_FILE) throw new Error("This PowerPoint exceeds the supported lesson size or contains invalid objects. Export as PDF or compress its images.");
      assertPageLimit(imported.pages.length, livePageLimit.current);
      if (importMode === "merge") {
        const latest = liveLesson.current;
        if (replacesEmptyStarter(latest)) updateLesson(() => ({ ...latest, pages: imported.pages }));
        else updateLesson(() => mergeLessonPages(latest, imported, undefined, livePageLimit.current));
        setModal(null);
      } else {
        // Loading a file first preserves a recovery copy using the existing flow.
        // Do not replace work that changed while the import was being prepared.
        if (liveLesson.current !== start) throw new Error("Your presentation changed during import. Please retry; no pages were replaced.");
        if (!(await loadLesson(imported))) return;
      }
      setPowerpointWarnings(result.warnings);
      notify(`Imported ${result.pages.length} PowerPoint slides. Review the import notes.`);
    } catch (error) { notify(error instanceof Error ? error.message : "PowerPoint import failed.", true); }
    finally { powerpointAbort.current = null; setPdfProgress(""); }
  };
  const importFromDevice = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) { event.target.value = ""; return; }
    const name = file.name.toLowerCase();
    if (/\.pptx?$/.test(name)) {
      void importPPTX(event);
    } else if (name.endsWith(".bbtv") || name.endsWith(".json") || file.type === "application/json" || file.type === "text/json") {
      void handleImportJSON(event, deviceImportModeRef.current);
    } else if (name.endsWith(".pdf") || file.type === "application/pdf") {
      void importPDF(event);
    } else if (/\.(png|jpe?g|webp|gif)$/.test(name) || /^image\/(png|jpeg|webp|gif)$/.test(file.type)) {
      void importImage(event);
    } else {
      event.target.value = "";
      notify("Unsupported file. Choose a .pptx PowerPoint, .bbtv or JSON lesson, PDF, or PNG, JPEG, WebP, or GIF image.", true);
    }
  };
  const chooseDeviceImport = (importMode: DeviceImportMode) => {
    deviceImportModeRef.current = importMode;
    setDeviceImportMode(importMode);
    libraryImportRef.current?.click();
  };
  const canvasSource = async (pg: Page, showInk = true, includeModel = true): Promise<HTMLCanvasElement> => {
    const canvas = document.createElement("canvas"); canvas.width = 1600; canvas.height = 900;
    const ctx = canvas.getContext("2d")!;
    const bg = pg.background === "dark" ? "#20363b" : "#ffffff"; ctx.fillStyle = bg; ctx.fillRect(0, 0, 1600, 900);
    if (pg.background === "grid" || pg.background === "lined") {
      ctx.strokeStyle = pg.background === "grid" ? "#e1ebe6" : "#d8e5ec"; ctx.lineWidth = 1;
      for (let y = 0; y < 900; y += pg.background === "grid" ? 30 : 36) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1600, y); ctx.stroke(); }
      if (pg.background === "grid") for (let x = 0; x < 1600; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 900); ctx.stroke(); }
    }
    if (includeModel && pg.model) {
      try {
        if (pg.id !== page.id) throw new Error("This browser can only screenshot the currently visible 3D page. Export that page as PNG, or switch to it before exporting a PDF with 3D content.");
        const viewer = canvasRef.current?.querySelector("model-viewer") as (HTMLElement & { toBlob?: () => Promise<Blob> }) | null;
        if (!viewer?.toBlob) throw new Error("This browser cannot capture the current 3D view.");
        const blob = await viewer.toBlob(); if (!blob) throw new Error("3D screenshot returned no image.");
        const img = new Image(); img.src = URL.createObjectURL(blob);
        await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error("Could not decode 3D screenshot.")); });
        ctx.drawImage(img, 0, 0, 1600, 900); URL.revokeObjectURL(img.src);
      } catch (e) { throw new Error(e instanceof Error ? e.message : "Could not capture the 3D scene."); }
    }
    for (const obj of pg.objects) {
      const x = obj.x * 1600, y = obj.y * 900, w = obj.width * 1600, h = obj.height * 900; ctx.strokeStyle = obj.color; ctx.fillStyle = obj.color;
      if (obj.type === "image" && obj.src) {
        const image = new Image(); image.src = obj.src;
        await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("An embedded image could not be exported.")); });
        ctx.drawImage(image, x, y, w, h);
      } else if (obj.type === "text") { ctx.font = `700 ${obj.fontSize || 38}px Manrope, sans-serif`; ctx.fillText(obj.text || "", x, y + (obj.fontSize || 38), w); }
      else if (obj.type === "ellipse") { ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.stroke(); }
      else if (obj.type === "rect") { ctx.lineWidth = 3; ctx.strokeRect(x, y, w, h); }
      else { ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y + h); ctx.stroke(); if (obj.type === "arrow") { ctx.beginPath(); ctx.moveTo(x + w, y + h); ctx.lineTo(x + w - 20, y + h - 4); ctx.lineTo(x + w - 6, y + h - 19); ctx.fill(); } }
    }
    if (showInk) for (const stroke of pg.ink) {
      if (stroke.points.length < 1) continue;
      ctx.strokeStyle = stroke.color; ctx.lineWidth = stroke.width * 2; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath();
      ctx.moveTo(stroke.points[0].x * 1600, stroke.points[0].y * 900);
      for (const point of stroke.points.slice(1)) ctx.lineTo(point.x * 1600, point.y * 900);
      ctx.stroke();
    }
    return canvas;
  };
  const exportPNG = async () => {
    try { const canv = await canvasSource(page); canv.toBlob(blob => { if (blob) downloadBlob(blob, `${safeName(lesson.title)}-page-${currentIndex + 1}.png`); else notify("PNG export failed.", true); }, "image/png"); }
    catch (e) { notify(e instanceof Error ? e.message : "PNG export failed.", true); }
  };
  const exportPDF = async () => {
    try {
      const { jsPDF } = await import("jspdf"); const doc = new jsPDF({ orientation: "landscape", unit: "px", format: [1600, 900], hotfixes: ["px_scaling"] });
      for (let i = 0; i < lesson.pages.length; i++) {
        if (i) doc.addPage([1600, 900], "landscape");
        const image = await canvasSource(lesson.pages[i]); doc.addImage(image.toDataURL("image/jpeg", .92), "JPEG", 0, 0, 1600, 900);
      }
      doc.save(`${safeName(lesson.title)}.pdf`);
    } catch (e) { notify(e instanceof Error ? e.message : "PDF export failed.", true); }
  };
  const handleFiles = () => fileRef.current?.click();
  const addModel = (id: string) => {
    const model = MODEL_LIBRARY.find(m => m.id === id);
    if (!model) { notify("That model is not available.", true); return; }
    updatePage(p => ({ ...p, model: { src: model.src, name: model.name, attribution: model.attribution, license: model.license, hotspots: model.hotspots || [] } }));
    setModal(null); notify(`${model.name} model added.`);
  };
  const uploadModel = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    if (!file.name.toLowerCase().endsWith(".glb")) { notify("Choose a .glb model file.", true); return; }
    if (file.size > MAX_FILE) { notify("Model must be 25 MB or smaller.", true); return; }
    try { const src = await fileToModelDataUrl(file); updatePage(p => ({ ...p, model: { src, name: file.name, attribution: "Uploaded by presenter", license: "Presenter supplied", hotspots: [] } })); setModal(null); }
    catch (e) { notify(e instanceof Error ? e.message : "Model import failed.", true); }
  };
  const addHotspot = (hotspot: Hotspot) => {
    updatePage(p => p.model ? { ...p, model: { ...p.model, hotspots: [...p.model.hotspots, hotspot] } } : p);
    const label = window.prompt("Name this model hotspot", hotspot.label);
    if (label) updatePage(p => p.model ? { ...p, model: { ...p.model, hotspots: p.model.hotspots.map(h => h.id === hotspot.id ? { ...h, label } : h) } } : p);
  };
  const saveOrbit = (orbit: string) => {
    if (Date.now() - lastCameraAt.current < 100) return;
    lastCameraAt.current = Date.now();
    updatePage(p => p.model ? { ...p, model: { ...p.model, cameraOrbit: orbit } } : p, false);
  };
  const saveCurrentCamera = () => {
    const viewer = canvasRef.current?.querySelector("model-viewer") as CameraElement | null;
    const orbit = serializeCameraOrbit(viewer);
    if (orbit) { updatePage(p => p.model ? { ...p, model: { ...p.model, cameraOrbit: orbit } } : p, false); notify("Current 3D camera view saved with this lesson."); }
    else notify("Rotate the model first; this browser has no active camera view.", true);
  };
  const resetCameraView = () => {
    updatePage(p => p.model ? { ...p, model: { ...p.model, cameraOrbit: undefined } } : p, false);
    setModelResetKey(key => key + 1);
  };
  const duplicatePage = () => {
    if (!canGrow()) return;
    const clone: Page = JSON.parse(JSON.stringify(page)); clone.id = crypto.randomUUID(); clone.title = `${page.title} copy`;
    updateLesson(l => ({ ...l, pages: [...l.pages.slice(0, currentIndex + 1), clone, ...l.pages.slice(currentIndex + 1)] })); setCurrentIndex(currentIndex + 1);
  };
  const openShare = async () => { setModal(relay.session?.role === "host" ? "share" : "transfer"); };
  const startSharing = async () => {
    // Room administration never transfers content: keep revoke/end available even
    // if subsequent edits can no longer be published.
    if (relay.session?.role === "host") { setModal("share"); return; }
    try { assertPageLimit(lesson.pages.length, pageLimit); }
    catch (error) { notify((error as Error).message, true); return; }
    if (transferSizes.relay > MAX_RELAY_BYTES || oversizedRelayAsset) return;
    if (!relay.session) await relay.create(relayStage);
    setModal("share");
  };
  const openOptimizedCopy = async (copy: Lesson) => {
    assertPageLimit(copy.pages.length, pageLimit);
    // A fresh identity and no linked handle prevent subsequent saves from overwriting the source.
    const separate = { ...copy, id: crypto.randomUUID() };
    if (await loadLesson(separate)) {
      linkedFile.current = null; setLocalFileName("");
      setModal("transfer");
    }
  };
  const joinSession = async (role: "controller" | "display") => {
    const result = await relay.join(joinIdInput.trim(), joinCodeInput.trim(), deviceName.trim() || "My device", role);
    if (result) { setJoinStatus(result.status); notify(result.status === "pending" ? "Request sent. Ask the presenter to approve this device." : "Connected to presentation."); }
  };
  const copyText = async (text: string) => { try { await navigator.clipboard.writeText(text); notify("Copied to clipboard."); } catch { notify(text); } };
  const rotateCode = async () => { const code = await relay.rotate(); if (code) notify("A new join code is active."); };
  const clearLocal = () => requestConfirmation({
    title: "Clear this device's workspace?", confirmLabel: "Clear local data",
    description: "This removes this device's draft, local saved lessons, relay credentials and saved names. It does not delete your account or cloud files. Download a .bbtv backup before continuing. This full reset cannot be undone.",
    run: async () => {
      if (autosaveTimer.current !== null) window.clearTimeout(autosaveTimer.current);
      const fresh = newLesson();
      await workspaceStorage.clear(fresh);
      relay.clear(); setLibrary([]); setNames(""); setPicked([]); setUndoStack([]); setRedoStack([]); setSelectedId(null); setReveal(false);
      linkedFile.current = null; setLocalFileName("");
      setLesson(fresh); setStage(asStage(fresh)); setCurrentIndex(0); setModal(null); setCameraWarning(""); notify("Local workspace cleared.");
    },
  });
  const prepareOffline = async () => {
    try {
      if (!("caches" in window) || !("serviceWorker" in navigator)) throw new Error("Offline cache storage is not available in this browser.");
      await Promise.race([navigator.serviceWorker.ready, new Promise((_, reject) => {
        window.setTimeout(() => reject(new Error("Offline preparation is unavailable. Use HTTPS and allow service workers, then try again.")), 8000);
      })]);
      const cache = await caches.open("brightboardtv-v1-assets");
      const assets = new Set<string>([location.pathname, new URL("sw.js", location.href).pathname]);
      lesson.pages.forEach(p => { if (p.model?.src.startsWith("/")) assets.add(p.model.src); });
      let failed = 0;
      for (const url of assets) try { await cache.add(url); } catch { failed++; }
      notify(failed ? `Offline preparation finished with ${failed} unavailable asset${failed === 1 ? "" : "s"}.` : "App shell and current lesson models prepared for offline use.");
    } catch (e) { notify(e instanceof Error ? e.message : "Could not prepare offline cache.", true); }
  };
  const installApp = async () => {
    if (installPrompt) { const prompt = installPrompt as Event & { prompt?: () => Promise<void> }; await prompt.prompt?.(); setInstallPrompt(null); }
    else setInstallMessage(/iPhone|iPad|iPod/.test(navigator.userAgent) ? "In Safari, tap Share, then Add to Home Screen." : "Use your browser’s Install app or Add to Home Screen option.");
  };
  const fullscreen = () => { const target = mode === "display" ? document.documentElement : canvasRef.current; if (document.fullscreenElement) void document.exitFullscreen(); else void target?.requestFullscreen?.(); };
  const openLocalPresentation = async () => {
    try { assertPageLimit(lesson.pages.length, pageLimit); } catch (error) { notify((error as Error).message, true); return; }
    // Open synchronously to retain the user's browser popup permission.
    const target = window.open("about:blank", "_blank");
    if (!target) { notify("Allow a presentation tab for BrightboardTV, then try Present again.", true); return; }
    target.opener = null;
    try {
      await workspaceStorage.saveWorkspace(lesson); setSaveStatus("saved");
      target.location.replace(`${location.origin}${location.pathname}?mode=display&local=1`);
    } catch { target.close(); setSaveStatus("error"); notify("Device storage could not save the presentation. Export a .bbtv backup; your editor is unchanged.", true); }
  };
  const dispatchCommand = (cmd: Command) => {
    if (relay.session?.role === "host") void relay.command(cmd);
    if (cmd.type === "reset-view" && mode === "edit") resetCameraView();
    setStage(s => {
      if (cmd.type === "next") return { ...s, pageIndex: Math.min(s.pageIndex + 1, s.lesson.pages.length - 1) };
      if (cmd.type === "previous") return { ...s, pageIndex: Math.max(0, s.pageIndex - 1) };
      if (cmd.type === "page") return { ...s, pageIndex: Math.max(0, Math.min(cmd.index, s.lesson.pages.length - 1)) };
      if (cmd.type === "blank") return { ...s, blank: !s.blank };
      if (cmd.type === "spotlight") return { ...s, spotlight: !s.spotlight };
      if (cmd.type === "timer") return { ...s, timer: { ...s.timer, remaining: cmd.seconds, running: cmd.running, endsAt: cmd.running ? Date.now() + cmd.seconds * 1000 : null } };
      if (cmd.type === "pointer") return { ...s, pointer: { x: cmd.x, y: cmd.y, visible: cmd.visible } };
      if (cmd.type === "camera") return s;
      return s;
    });
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement || (e.target as HTMLElement)?.isContentEditable) return;
      if (confirmationOpen) return;
      if (editor && !modal && selectedId && (e.key === "Delete" || e.key === "Backspace")) { e.preventDefault(); removeSelected(); return; }
      if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); if (mode === "display") dispatchCommand({ type: "next" }); else choosePage(Math.min(currentIndex + 1, lesson.pages.length - 1)); }
      if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); if (mode === "display") dispatchCommand({ type: "previous" }); else choosePage(Math.max(0, currentIndex - 1)); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      if (e.key === "Escape") setModal(null);
    };
    window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key);
  }, [mode, currentIndex, lesson, undoStack, redoStack, selectedId, modal, confirmationOpen]);
  const changeBackground = (background: Background) => updatePage(p => ({ ...p, background }));
  const randomPick = () => {
    const pool = names.split(/\n|,/).map(x => x.trim()).filter(Boolean);
    if (!pool.length) { notify("Add names first, separated by lines or commas."); return; }
    const shuffled = [...pool].sort(() => Math.random() - .5); setPicked(shuffled.slice(0, Math.min(groupSize, pool.length)));
  };
  const createGroups = () => {
    const pool = names.split(/\n|,/).map(x => x.trim()).filter(Boolean).sort(() => Math.random() - .5);
    if (!pool.length) { notify("Add names first, separated by lines or commas."); return; }
    const groups: string[][] = [];
    pool.forEach((name, i) => { const index = i % Math.max(1, Math.ceil(pool.length / groupSize)); (groups[index] ||= []).push(name); });
    setPicked(groups.map((g, i) => `Group ${i + 1}: ${g.join(", ")}`));
  };
  const namesSaved = async () => { try { await workspaceStorage.saveNames(names); notify("Names are saved on this device."); } catch { notify("Names could not be saved. Device storage is unavailable.", true); } };
  useEffect(() => { setNames(workspaceStorage.names()); }, []);
  const modelFor = (pg: Page, frozen: boolean) => pg.model ? <ModelViewer page={pg} frozen={frozen} resetKey={modelResetKey} onOrbit={frozen ? undefined : saveOrbit} onHotspot={editor && tool === "select" ? addHotspot : undefined} /> : null;
  const drawCanvas = (pg: Page, editable: boolean, blank = false, includeNotes = false) => <div ref={editable ? canvasRef : undefined} className={`canvas ${pg.background}${blank ? " blank" : ""}${editable && ["pen", "highlighter", "eraser"].includes(tool) ? " drawing" : ""}`} onPointerDown={editable ? onPointerDown : undefined} onPointerMove={editable ? onPointerMove : undefined} onPointerUp={editable ? onPointerUp : undefined} onPointerCancel={editable ? onPointerUp : undefined} onDoubleClick={e => {
    const target = e.target as HTMLElement, id = target.closest<HTMLElement>(".board-object")?.dataset.objectId;
    const obj = pg.objects.find(o => o.id === id); if (obj?.type === "text" && editable) editText(obj);
  }}>
    {!blank && modelFor(pg, !editable || tool === "pen" || tool === "highlighter" || tool === "eraser")}
    {!blank && pg.objects.map(obj => <div key={obj.id} data-object-id={obj.id} className={`board-object ${obj.type === "text" ? "text" : obj.type === "rect" ? "shape" : obj.type === "ellipse" ? "shape ellipse" : obj.type}`} style={{ left: `${obj.x * 100}%`, top: `${obj.y * 100}%`, width: `${obj.width * 100}%`, height: `${obj.height * 100}%`, color: obj.color, fontSize: `${(obj.fontSize || 38) / 900 * 100}cqh`, ...(obj.type === "line" || obj.type === "arrow" ? { transform: `rotate(${Math.atan2(obj.height, obj.width) * 180 / Math.PI}deg)`, width: `${Math.hypot(obj.width, obj.height) * 100}%` } : {}) }} onClick={e => { if (editable) { e.stopPropagation(); setSelectedId(obj.id); } }}>
      {obj.type === "image" && obj.src ? <img src={obj.src} alt="Imported presentation visual" draggable={false} /> : obj.type === "text" ? obj.text : null}
      {editable && selectedId === obj.id && !obj.locked && <span className="resize-handle" />}
    </div>)}
    {!blank && <svg className="ink-layer" viewBox="0 0 1600 900" preserveAspectRatio="none">{pg.ink.map(stroke => <path key={stroke.id} d={svgPath(stroke.points, 1600, 900)} fill="none" stroke={stroke.color} strokeWidth={stroke.width * 2} strokeLinecap="round" strokeLinejoin="round" opacity={stroke.highlighter ? .38 : 1} />)}</svg>}
    {includeNotes && <div className="stage-note">Presenter notes stay private</div>}
    {reveal && <div style={{ position: "absolute", inset: 0, zIndex: 9, background: "#17343c", clipPath: "inset(0 0 0 55%)", pointerEvents: "none" }} />}
    {editor && stage.spotlight && <div style={{ position: "absolute", inset: 0, zIndex: 7, pointerEvents: "none", background: `radial-gradient(circle 120px at ${stage.pointer.x * 100}% ${stage.pointer.y * 100}%, transparent 0, #17343ca8 130px)` }} />}
    {(editor ? stage.pointer : currentState?.pointer)?.visible && <div style={{ position: "absolute", left: `${(editor ? stage.pointer.x : currentState!.pointer.x) * 100}%`, top: `${(editor ? stage.pointer.y : currentState!.pointer.y) * 100}%`, zIndex: 11, width: 17, height: 17, borderRadius: "50%", border: "3px solid #f16449", background: "#f1644980", transform: "translate(-50%,-50%)", pointerEvents: "none" }} />}
    {currentState?.spotlight && <div style={{ position: "absolute", inset: 0, zIndex: 8, pointerEvents: "none", background: `radial-gradient(circle 115px at ${currentState.pointer.x * 100}% ${currentState.pointer.y * 100}%, transparent 0, #172e33b8 125px)` }} />}
  </div>;
  const pageThumb = (p: Page, i: number) => <button key={p.id} className={`page-item ${currentIndex === i ? "selected" : ""}`} onClick={() => choosePage(i)} onDoubleClick={() => { const name = window.prompt("Rename page", p.title); if (name) updateLesson(l => ({ ...l, pages: l.pages.map((x, idx) => idx === i ? { ...x, title: name } : x) })); }}>
    <div className={`thumb ${p.background}`}><span className="thumb-count">{String(i + 1).padStart(2, "0")}</span><div className="thumb-content">{p.objects.find(o => o.type === "text")?.text || p.title}{p.model ? ` · ${p.model.name}` : ""}</div></div><span className="page-name">{p.title}</span>
  </button>;
  const libraryAccessHelp = libraryAccess === "restricted" && hostedLibrary === true
    ? <p className="notice library-access-help">Saving, renaming and deleting account lessons require a current paid BrightBoard plan. Sign in to open and download existing account lessons, even after your plan expires. Device recovery copies and exports remain available. <a className="button small" href="/pricing">View plans</a></p>
    : libraryAccess === "unavailable"
      ? <div className="notice library-access-help" role="status">Couldn’t verify library access, so saving is paused to protect your work. Download a .bbtv backup, reconnect, then retry. <button className="button small" onClick={() => void checkLibraryAccess()}>Retry access check</button></div>
      : libraryAccess === "checking"
        ? <p className="notice library-access-help" role="status">Checking library access. Manual saving stays disabled until verified; download a backup if you need a copy now.</p>
        : null;
  const librarySaveDisabled = libraryAccess !== "allowed" || cloudBusy;
  const librarySaveDisabledReason = libraryAccess === "restricted"
    ? "Saved lesson library is available with paid BrightBoard plans."
    : libraryAccess === "unavailable"
      ? "Library access could not be verified. Download a backup and retry the check."
      : libraryAccess === "checking" ? "Checking library access." : undefined;

  if (mode === "display") {
    if (!remoteStage && !relay.session && params.get("local") !== "1") return <div className="remote-shell"><JoinScreen role="display" code={joinCodeInput} setCode={setJoinCodeInput} id={joinIdInput} setId={setJoinIdInput} deviceName={deviceName} setDeviceName={setDeviceName} join={() => void joinSession("display")} error={relay.error} busy={relay.pending} /></div>;
    const displayState = currentState || stage;
    const remotePage = getPage(displayState.lesson, displayState.pageIndex);
    const localDisplay = params.get("local") === "1" && !relay.session;
    const returnToEditor = async () => {
      try { if (document.fullscreenElement) await document.exitFullscreen(); }
      finally { window.location.assign(location.pathname); }
    };
    const leavePairedDisplay = async () => {
      try { if (document.fullscreenElement) await document.exitFullscreen(); }
      finally {
        if (relay.session?.role !== "host") relay.clear();
        window.location.assign(`${location.pathname}?mode=display`);
      }
    };
    return <div className="display-shell" onClick={() => {}}>{localDisplay
      ? <button className="button display-local-exit" aria-label="Back to editor" onClick={() => void returnToEditor()}><ChevronLeft size={17} /> Back to editor</button>
      : <button className="button display-local-exit" aria-label="Leave paired display" onClick={() => void leavePairedDisplay()}><ChevronLeft size={17} /> Leave display</button>}
      <div className={`display-stage canvas ${remotePage.background}${displayState.blank ? " blank" : ""}`}>{displayState.blank ? null : <>{modelFor(remotePage, false)}{remotePage.objects.map(o => <DisplayObject key={o.id} object={o} />)}<svg className="ink-layer" viewBox="0 0 1600 900">{remotePage.ink.map(s => <path key={s.id} d={svgPath(s.points, 1600, 900)} stroke={s.color} strokeWidth={s.width * 2} fill="none" strokeLinecap="round" strokeLinejoin="round" />)}</svg></>}{displayState.spotlight && <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle 130px at ${displayState.pointer.x * 100}% ${displayState.pointer.y * 100}%, transparent 0, #132f34b8 140px)` }} />}{displayState.pointer.visible && <div style={{ position: "absolute", left: `${displayState.pointer.x * 100}%`, top: `${displayState.pointer.y * 100}%`, width: 16, height: 16, borderRadius: "50%", background: "#df735a", transform: "translate(-50%,-50%)" }} />}</div><div className="display-controls"><button className="button icon" aria-label="Previous page" onClick={() => dispatchCommand({ type: "previous" })}><ChevronLeft /></button><span className="page-counter">{displayState.pageIndex + 1} / {displayState.lesson.pages.length}</span><button className="button icon" aria-label="Next page" onClick={() => dispatchCommand({ type: "next" })}><ChevronRight /></button><TimerControl state={displayState} onCommand={() => {}} readOnly /><button className="button icon" aria-label="Fullscreen" onClick={fullscreen}><Fullscreen /></button><span className="status-pill">{relay.session ? relay.connected ? "LIVE" : "CONNECTING" : "LOCAL"}</span></div>{relay.error && <div className="toast error">{relay.error}</div>}</div>;
  }
  if (mode === "remote") {
    if (!relay.session) return <div className="remote-shell"><JoinScreen role="controller" code={joinCodeInput} setCode={setJoinCodeInput} id={joinIdInput} setId={setJoinIdInput} deviceName={deviceName} setDeviceName={setDeviceName} join={() => void joinSession("controller")} error={relay.error} busy={relay.pending} /></div>;
    const s = remoteStage || relay.snapshot?.state;
    const privatePage = s ? getPage(s.lesson, s.pageIndex) : null;
    return <div className="remote-shell"><div className="remote-header"><div className="brand"><span className="brand-mark"><Presentation size={18} /></span>BrightboardTV remote</div><span className="status-pill">{relay.connected ? "CONNECTED" : "RECONNECTING"}</span></div>
      {relay.error && <div className="phone-card notice">{relay.error} <button className="button small" onClick={() => window.location.reload()}>Reconnect</button></div>}
      {!s && <div className="empty">{joinStatus === "pending" ? "Remote request sent. The presenter must approve this device; this screen will update when approved." : "Waiting for the presenter’s room state…"}</div>}
      {s && <><div className="phone-card"><div className="row spread"><strong>{s.lesson.title}</strong><span className="page-counter">{s.pageIndex + 1} / {s.lesson.pages.length}</span></div><div className="remote-pad" style={{ marginTop: 12 }}><button className="button" onClick={() => void relay.command({ type: "previous" })}><ChevronLeft /> Previous</button><button className="button primary" onClick={() => void relay.command({ type: "next" })}><ChevronRight /> Next</button><button className={`button ${s.blank ? "active" : ""}`} onClick={() => void relay.command({ type: "blank" })}><Eye /> Blank</button><button className={`button ${s.spotlight ? "active" : ""}`} onClick={() => void relay.command({ type: "spotlight" })}><Focus /> Spotlight</button><button className="button" onClick={() => void relay.command({ type: "page", index: Math.max(0, s.pageIndex - 1) })}><ArrowUp /> Previous page</button><button className="button" onClick={() => void relay.command({ type: "page", index: Math.min(s.lesson.pages.length - 1, s.pageIndex + 1) })}><ArrowDown /> Next page</button></div></div>
      <div className="phone-card"><div className="section-title"><span>Presenter notes</span><button className="button small" onClick={() => setShowPrivateNotes(x => !x)}>{showPrivateNotes ? "Hide" : "Show"}</button></div>{showPrivateNotes && <><div className="field-label">Current page</div><p className="notice">{privatePage?.notes || "No notes for this page."}</p><div className="field-label">Up next</div><p className="notice">{s.lesson.pages[s.pageIndex + 1]?.notes || "No notes for the next page."}</p></>}</div>
      <div className="phone-card"><div className="section-title">Laser pointer</div><div className="laser-pad" onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); const r = e.currentTarget.getBoundingClientRect(); void relay.command({ type: "pointer", x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)), visible: true }); }} onPointerMove={e => { if (!e.currentTarget.hasPointerCapture(e.pointerId)) return; e.preventDefault(); if (Date.now() - lastLaserAt.current < 90) return; lastLaserAt.current = Date.now(); const r = e.currentTarget.getBoundingClientRect(); void relay.command({ type: "pointer", x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)), visible: true }); }} onPointerUp={() => void relay.command({ type: "pointer", x: .5, y: .5, visible: false })} onPointerCancel={() => void relay.command({ type: "pointer", x: .5, y: .5, visible: false })}><ScanLine size={22} /><span>Touch and drag to point on stage</span></div></div>
      <div className="phone-card"><div className="section-title">Stage timer</div><TimerControl state={s} onCommand={cmd => void relay.command(cmd)} /><StopwatchControl /></div>
          {privatePage?.model && <div className="phone-card"><div className="section-title">3D model view</div><div className="remote-model"><ModelViewer page={privatePage} onOrbit={orbit => { if (Date.now() - lastRemoteCameraAt.current < 100) return; lastRemoteCameraAt.current = Date.now(); void relay.command({ type: "camera", orbit }); }} /></div><p className="notice">Drag the model to rotate. This camera view is shared with the presentation screen.</p><button className="button" onClick={() => void relay.command({ type: "reset-view" })}><RotateCcw size={17} /> Reset model view</button></div>}
      </>}
      <div className="row spread"><button className="button small danger" onClick={() => { relay.clear(); window.location.href = "/tv/?mode=remote"; }}>Disconnect</button><span className="notice">No account required · internet relay</span></div>
    </div>;
  }

  return <div className="app">
    <header className="topbar"><a className="brand" href={location.pathname} aria-label="BrightboardTV workspace"><span className="brand-mark"><Presentation size={18} /></span>Brightboard<span style={{ color: "var(--teal)" }}>TV</span></a><div className="top-divider" />
      <input aria-label="Presentation title" className="lesson-title" value={lesson.title} onChange={e => updateLesson(l => ({ ...l, title: e.target.value }), false)} />
      <div className="top-actions"><span className="status-pill" role="status"><i />{saveStatus === "saved" ? `SAVED ON THIS DEVICE${isOnline ? "" : " · OFFLINE"}` : saveStatus === "saving" ? "SAVING…" : "NOT SAVED · EXPORT BACKUP"}</span>
        <button className="button icon hide-mobile" aria-label="Undo" title="Undo" onClick={undo} disabled={!undoStack.length}><Undo2 size={17} /></button><button className="button icon hide-mobile" aria-label="Redo" title="Redo" onClick={redo} disabled={!redoStack.length}><Redo2 size={17} /></button>
        <button className="button hide-mobile" onClick={() => setModal("library")}><BookOpen size={16} /> Library</button>
        <button className="button" onClick={() => void openShare()}><Share2 size={16} /> <span className="hide-mobile">Pair</span></button>
        <button className="button primary" onClick={() => void openLocalPresentation()}><Play size={16} /> Present</button>
        <button className="button icon mobile-tools" aria-label="More options" onClick={() => setModal("settings")}><MoreHorizontal size={20} /></button>
      </div>
    </header>
    {relay.error && <div className="notice" style={{ padding: "7px 18px", background: "#fff0e9", color: "#a54838" }}>{relay.error} <button className="button small" onClick={() => relay.clear()}>Dismiss session</button></div>}
    {lesson.pages.length > pageLimit && <div role="alert" className="notice" style={{ padding: "10px 18px", background: "#fff0e9", color: "#a54838" }}>This existing presentation has {lesson.pages.length} pages; your limit is {pageLimit} ({PAGE_LIMIT_DESCRIPTION}). All pages are kept. Remove pages or export a backup and split the lesson before presenting or adding more.</div>}
    {saveStatus === "error" && <div role="alert" className="notice" style={{ padding: "10px 18px", background: "#fff0e9", color: "#a54838" }}>This draft is not saved on this device. Keep the editor open and <button className="button small" onClick={exportLesson}>Download .bbtv backup</button></div>}
    <main className={`workspace${inspectorCollapsed ? " inspector-collapsed" : ""}`}>
      <aside className="rail"><div className="rail-heading"><span>Pages · {lesson.pages.length}/{pageLimit}</span><button className="button icon small" aria-label="Add page" disabled={lesson.pages.length >= pageLimit} title={`${pageLimit}-page limit`} onClick={addPage}><Plus size={17} /></button></div>
        <div className="page-list">{lesson.pages.map(pageThumb)}</div>
        <div className="rail-bottom"><button className="button library-button" onClick={() => setModal("library")}><BookOpen size={16} /> Saved lessons <ChevronRight size={15} style={{ marginLeft: "auto" }} /></button></div>
      </aside>
      <section className="center-column">
        <div className="toolbar" aria-label="Presentation editing tools">
          <button className="button small panel-toggle" type="button" aria-controls="presenter-inspector" aria-expanded={!inspectorCollapsed} onClick={() => setInspectorCollapsed(value => !value)}>
            <PanelRight size={16} /><span>{inspectorCollapsed ? "Show presenter controls" : "Hide presenter controls"}</span>
          </button>
          <div className="tool-group">
            {([["select", Hand, "Select"], ["move", Move, "Move"], ["pen", Sparkles, "Ink"], ["highlighter", Highlighter, "Highlight"], ["eraser", Eraser, "Erase"]] as const).map(([name, Icon, label]) => <button key={name} className={`tool-button ${tool === name ? "active" : ""}`} title={label} aria-label={label} onClick={() => activateTool(name)}><Icon size={18} /></button>)}
          </div>
          <div className="tool-group"><input type="color" aria-label="Ink and shape color" className="color-input" value={color} onChange={e => setColor(e.target.value)} /><select className="width-select" value={strokeWidth} aria-label="Ink width" onChange={e => setStrokeWidth(Number(e.target.value))}><option value={2}>Fine</option><option value={4}>Medium</option><option value={8}>Bold</option><option value={12}>Wide</option></select></div>
          <div className="tool-group">
            <button className="tool-button" title="Text" aria-label="Add text" onClick={() => addObject("text")}><span style={{ fontWeight: 800, fontSize: 17 }}>T</span></button>
            <button className={`tool-button ${tool === "rect" ? "active" : ""}`} title="Rectangle" aria-label="Rectangle" onClick={() => activateTool("rect")}><Square size={17} /></button>
            <button className={`tool-button ${tool === "ellipse" ? "active" : ""}`} title="Ellipse" aria-label="Ellipse" onClick={() => activateTool("ellipse")}><Circle size={17} /></button>
            <button className={`tool-button ${tool === "arrow" ? "active" : ""}`} title="Arrow" aria-label="Arrow" onClick={() => activateTool("arrow")}><ArrowRight size={18} /></button>
            <button className={`tool-button ${tool === "line" ? "active" : ""}`} title="Line" aria-label="Line" onClick={() => activateTool("line")}><span style={{ width: 19, height: 2, background: "currentColor" }} /></button>
          </div>
          <div className="tool-group">
            <button className="tool-button" title="Insert image" aria-label="Insert image" onClick={handleFiles}><ImagePlus size={17} /></button>
            <button className="tool-button" title="Insert PDF" aria-label="Insert PDF" onClick={() => pdfRef.current?.click()}><FileText size={17} /></button>
            <button className="tool-button" title="3D model library" aria-label="3D model library" onClick={() => setModal("model")}><Maximize2 size={17} /></button>
            <button className="tool-button" title={`Add page (${pageLimit}-page limit)`} aria-label="Add page" disabled={lesson.pages.length >= pageLimit} onClick={addPage}><FilePlus2 size={17} /></button>
          </div>
          <div className="tool-group"><button className="tool-button" title="Undo" aria-label="Undo" onClick={undo} disabled={!undoStack.length}><Undo2 size={17} /></button><button className="tool-button" title="Redo" aria-label="Redo" onClick={redo} disabled={!redoStack.length}><Redo2 size={17} /></button></div>
          <button className="tool-button" title="Clear current page" aria-label="Clear current page" onClick={clearBoard}><Eraser size={17} /></button>
          <button className="tool-button" title="Delete selected object" aria-label="Delete selected object" disabled={!selectedId} onClick={removeSelected}><Trash2 size={17} /></button>
          <button className={`tool-button ${laser ? "active" : ""}`} title="Laser pointer" aria-label="Laser pointer" onClick={() => { setLaser(x => !x); if (laser && relay.session?.role === "host") void relay.command({ type: "pointer", x: .5, y: .5, visible: false }); }}><ScanLine size={17} /></button>
          <button className="tool-button" title="More tools" aria-label="More tools" onClick={() => setModal("settings")}><Settings2 size={17} /></button>
        </div>
        {pdfProgress && <div className="empty" role="status">{pdfProgress}{powerpointAbort.current && <button className="button small" onClick={() => powerpointAbort.current?.abort()}>Cancel import</button>}</div>}
        {powerpointWarnings.length > 0 && <div className="empty" role="status" style={{ textAlign: "left" }}><strong>PowerPoint import notes</strong><ul>{powerpointWarnings.map(message => <li key={message}>{message}</li>)}</ul><button className="button small" onClick={() => setPowerpointWarnings([])}>Dismiss import notes</button></div>}
        <div className="canvas-wrap">{drawCanvas(page, true)}
          {selectedId && <div className="canvas-selection-tools"><button className="button small" onClick={() => resizeSelected(1)}><ZoomIn size={14} /> Larger</button><button className="button small" onClick={toggleLock}>{page.objects.find(o => o.id === selectedId)?.locked ? <Unlock size={14} /> : <Lock size={14} />}{page.objects.find(o => o.id === selectedId)?.locked ? "Unlock" : "Lock"}</button><button className="button small danger" onClick={removeSelected}><Trash2 size={14} /> Delete</button></div>}
        </div>
        <div className="canvas-controls">
          <button className="button icon" aria-label="Previous page" onClick={() => choosePage(Math.max(0, currentIndex - 1))}><ChevronLeft size={18} /></button>
          <span className="page-counter">{String(currentIndex + 1).padStart(2, "0")} / {String(lesson.pages.length).padStart(2, "0")}</span>
          <button className="button icon" aria-label="Next page" onClick={() => choosePage(Math.min(lesson.pages.length - 1, currentIndex + 1))}><ChevronRight size={18} /></button>
          <button className="button small hide-mobile" onClick={() => movePage(-1)} disabled={currentIndex === 0}><ArrowUp size={14} /> Reorder</button>
          <button className="button small hide-mobile" title="Move page later" onClick={() => movePage(1)} disabled={currentIndex === lesson.pages.length - 1}><ArrowDown size={14} /></button>
          <button className="button small" disabled={lesson.pages.length >= pageLimit} title={`${pageLimit}-page limit`} onClick={duplicatePage}><Copy size={14} /> <span className="hide-mobile">Duplicate</span></button>
          <button className="button icon danger" aria-label="Delete page" onClick={deletePage}><Trash2 size={16} /></button>
        </div>
      </section>
      <aside className="inspector" id="presenter-inspector" aria-label="Presenter controls" aria-hidden={inspectorCollapsed}><div className="inspector-head">Presenter controls <PanelRight size={15} /></div>
        <section className="panel-section"><div className="section-title">Page <span className="notice">{currentIndex + 1}</span></div>
          <label className="field-label" htmlFor="page-title">Page title</label><input id="page-title" className="input" value={page.title} onChange={e => renamePage(e.target.value)} />
          <label className="field-label">Board surface</label><div className="swatches">{(["light", "dark", "lined", "grid"] as Background[]).map((bg, i) => <button key={bg} className={`swatch ${page.background === bg ? "active" : ""}`} onClick={() => changeBackground(bg)}>{["Light", "Dark", "Lined", "Grid"][i]}</button>)}</div>
          <div className="row wrap" style={{ marginTop: 10 }}><button className="button small" onClick={clearBoard}><Eraser size={14} /> Clear page</button><button className="button small" onClick={() => setReveal(!reveal)}><Eye size={14} /> {reveal ? "Reveal off" : "Reveal"}</button></div>
        </section>
        <section className="panel-section"><div className="section-title">Private presenter notes <Lock size={14} color="#618779" /></div><textarea className="textarea" value={page.notes} placeholder="Talking points, reminders, questions…" onChange={e => updatePage(p => ({ ...p, notes: e.target.value }), false)} /><p className="notice">Only you and approved controller remotes receive these notes. They never appear on the display.</p></section>
        <section className="panel-section"><div className="section-title">Stage clock <Clock3 size={15} /></div><TimerControl state={stage} onCommand={dispatchCommand} open={() => setModal("timer")} /><StopwatchControl /></section>
        {page.model && <section className="panel-section"><div className="section-title">3D scene <Maximize2 size={15} /></div><p className="notice">{page.model.name} · {page.model.attribution} · {page.model.license}</p><div className="row wrap"><button className="button small" onClick={saveCurrentCamera}><Save size={14} /> Save view</button><button className="button small" onClick={resetCameraView}><RotateCcw size={14} /> Reset view</button><button className="button small danger" onClick={() => updatePage(p => ({ ...p, model: undefined }))}><Trash2 size={14} /> Remove model</button></div><p className="notice">Rotate in Select or Move mode. To add a hotspot, close dialogs and tap a point on the model surface. Ink tools pause model gestures.</p>{page.model.hotspots.map(h => <p className="notice" key={h.id}>{h.label} <button className="button small danger" onClick={() => updatePage(p => p.model ? { ...p, model: { ...p.model, hotspots: p.model.hotspots.filter(x => x.id !== h.id) } } : p)}>Remove</button></p>)}</section>}
        <section className="panel-section"><div className="section-title">Export & backup</div><div className="stack"><button className="button" onClick={() => void saveToLibrary()} disabled={librarySaveDisabled} title={librarySaveDisabledReason}><Save size={15} /> {cloudBusy ? "Saving…" : "Save to lesson library"}</button>{libraryAccessHelp}<button className="button" onClick={exportLesson}><Download size={15} /> Download .bbtv backup</button><div className="row"><button className="button small" onClick={() => void exportPNG()}><FileImage size={14} /> PNG</button><button className="button small" onClick={() => void exportPDF()}><FileText size={14} /> PDF</button></div><button className="button small" onClick={() => jsonRef.current?.click()}><Import size={14} /> Import lesson file</button></div></section>
        <section className="panel-section"><div className="section-title">Offline & install</div><p className="notice">{isOnline ? "Your draft saves locally as you work." : "Offline mode: local editing and exports are available. Pairing needs internet."} Browser data can be removed by device settings—download a backup.</p><div className="stack"><button className="button small" onClick={() => void prepareOffline()}><Download size={14} /> Prepare offline</button><button className="button small" onClick={() => void installApp()}><Plus size={14} /> Install BrightboardTV</button>{installMessage && <p className="notice">{installMessage}</p>}</div></section>
        <section className="panel-section"><button className="button small danger" onClick={clearLocal}><Trash2 size={14} /> Clear local workspace & names</button></section>
      </aside>
    </main>
    {modal === "transfer" && <ModalShell title="Presentation size & optimized copy" close={() => setModal(null)}>
      <PresentationSize lesson={lesson} relayState={relayStage} onOpenCopy={openOptimizedCopy} />
      <div className="row wrap" style={{ marginTop: 16 }}>
        <button className="button" onClick={() => downloadBlob(lessonBlob(lesson), `${safeName(lesson.title)}.bbtv`)}><Download size={15} /> Download original .bbtv</button>
        <button className="button primary" disabled={relay.session?.role !== "host" && (relay.pending || transferSizes.relay > MAX_RELAY_BYTES || oversizedRelayAsset || lesson.pages.length > pageLimit)} onClick={() => void startSharing()}><Share2 size={15} /> {relay.session?.role === "host" ? "Manage connected screens" : "Start sharing"}</button>
      </div>
      <p className="notice">Sharing sends the current presentation. To share an optimized version, preview it and choose Open optimized copy first. Downloads over 64 MB are recovery backups and cannot be reimported until reduced. Models are not compressed.</p>
      {lesson.pages.length > pageLimit && <p role="alert" className="notice">Your {pageLimit}-page limit must be met before sharing. Downloading a recovery backup remains available.</p>}
    </ModalShell>}
    <input ref={fileRef} type="file" accept="image/*" hidden onChange={importImage} /><input ref={pdfRef} type="file" accept="application/pdf,.pdf" hidden onChange={importPDF} /><input ref={jsonRef} type="file" accept=".bbtv,.json,application/json" hidden onChange={handleImportJSON} /><input ref={libraryImportRef} type="file" accept=".bbtv,.json,.pptx,.ppt,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/json,application/pdf,.pdf,image/png,image/jpeg,image/webp,image/gif" hidden onChange={importFromDevice} />
    {modal === "library" && <ModalShell title="Saved lesson library" close={() => setModal(null)}>
      <div className="row spread" style={{ marginBottom: 14 }}>
        <p className="notice">{hostedLibrary === true ? "Save deliberately to your account for cross-device access. Device drafts are not automatically uploaded." : "Device copies remain in this browser. Download backups before clearing site data."}</p>
        <button className="button primary small" onClick={() => void saveToLibrary()} disabled={librarySaveDisabled} title={librarySaveDisabledReason}><Save size={14} /> {cloudBusy ? "Saving…" : "Save current"}</button>
      </div>
      {libraryAccessHelp}
      {hostedLibrary === true && <CloudLibrary canWrite={!librarySaveDisabled} refreshKey={cloudRefresh}
        onOpen={async (selected, revision) => { if (await loadLesson(selected)) cloudRevisions.current.set(selected.id, revision); }}
        confirmDelete={(entry, run) => requestConfirmation({ title: "Delete account lesson?", confirmLabel: "Delete account lesson",
          description: `Remove “${entry.title}” from your account on all devices? Download a backup first. Device recovery copies and your open presentation are not deleted.`,
          run: async () => { await run(); cloudRevisions.current.delete(entry.id); notify("Account lesson deleted."); } })} />}
      <h3>{hostedLibrary === false ? "Device lesson library" : "Device recovery copies (not synced)"}</h3>
      <p className="notice">These copies stay on this browser, including lessons saved before account libraries were added. Opening another lesson backs up your previous work here. Shared devices may contain another teacher’s local copies; only upload lessons you own.</p>
      {library.length ? <div className="library-grid">{library.map(l => <div key={l.id} className="library-card">
        <button style={{ border: 0, background: "transparent", padding: 0, color: "inherit", textAlign: "left", width: "100%" }} onClick={() => void loadLesson(l)}>
          <strong>{l.title}</strong><span className="notice">{l.pages.length} pages · Updated {new Date(l.updatedAt).toLocaleDateString()} · .bbtv {formatBytes(lessonBlob(l).size)} · 64 MB import limit</span>
        </button>
        <div className="row" style={{ marginTop: 12 }}>
          <button className="button small" onClick={() => void loadLesson(l)}>Open</button>
          {hostedLibrary === true && <button className="button small" disabled={librarySaveDisabled} onClick={() => void saveToLibrary(l)}>Upload to account</button>}
          <button className="button small" aria-label={`Download ${l.title}`} onClick={() => downloadBlob(lessonBlob(l), `${safeName(l.title)}.bbtv`)}><Download size={14} /></button>
          <button className="button small danger" aria-label={`Delete ${l.title}`} onClick={() => removeFromLibrary(l.id)}><Trash2 size={14} /></button>
        </div>
      </div>)}</div> : <div className="empty">No device copies yet. Keep a .bbtv backup for offline use.</div>}
      <div className="device-import-panel"><div className="row">
        <button className="button" onClick={() => chooseDeviceImport("open")}><Import size={15} /> Choose file to open</button>
        <button className="button primary" onClick={() => chooseDeviceImport("merge")}><Import size={15} /> Choose file to merge</button>
        <button className="button" onClick={exportLesson}><Download size={15} /> Export current</button>
      </div>
        <p className="notice" role="status">{deviceImportMode === "merge" ? "Merge selected: .bbtv/JSON lesson pages append to your current presentation; its title, notes, models, assets and existing pages stay in place." : "Open selected: a .bbtv/JSON lesson opens as the presentation, with the current lesson backed up in device recovery copies first."}</p>
        <p className="notice">Your limit is {pageLimit} pages: {PAGE_LIMIT_DESCRIPTION}. Imports and merges cannot exceed that total. Supported files: .bbtv or JSON lessons (up to 64 MB), .pptx PowerPoint, PDFs, and PNG, JPEG, WebP, or GIF images. Individual PowerPoint files, PDFs, images and models must be 25 MB or smaller. PowerPoint supports text, images and basic shapes; use PDF for faithful appearance. Older .ppt files must first be converted to .pptx or PDF. PDF pages are added after the current page, or replace an unused blank starter. An image is placed on the current page. Oversized imports are rejected without removing existing pages.</p>
      </div>
    </ModalShell>}
    {modal === "share" && <ModalShell title="Connect presentation screens" close={() => setModal(null)}><p className="notice">Pair a phone as a remote controller or a connected TV/browser as a read-only display. This syncs this presentation only; it does not mirror other apps or audio.</p>{relay.pending && !relay.session ? <div className="empty">Creating a secure room…</div> : relay.session?.role === "host" ? <div className="split"><div className="phone-card" style={{ textAlign: "center" }}>{qr ? <img className="qr" src={qr} alt="Scan to join BrightboardTV remote" /> : <div className="empty">QR unavailable. Use the link or join code below.</div>}<p className="notice">Scan with your phone camera</p></div><div className="stack"><div className="phone-card"><div className="section-title">Room join code</div><strong style={{ font: "24px DM Mono", letterSpacing: ".15em" }}>{relay.joinCode || "••••••"}</strong><p className="notice">Share the code with trusted devices. No keys are placed in the link.</p><button className="button small" onClick={() => void copyText(relay.joinCode)}><Copy size={14} /> Copy code</button><button className="button small" onClick={() => void rotateCode()}><RotateCcw size={14} /> Rotate code</button></div><div className="phone-card"><div className="section-title">Join URL</div><button className="button small" onClick={() => void copyText(`${location.origin}${location.pathname}?mode=remote#id=${relay.session?.id}&code=${relay.joinCode}`)}><Link2 size={14} /> Copy pairing link</button><p className="notice">QR contains room ID and join code only, not your secret host key.</p></div></div></div> : <div className="empty">Could not create a relay room. {relay.error || "Check your connection and try again."}<button className="button small" onClick={() => void relay.create(asStage(lesson))}>Retry</button></div>}
      {relay.session?.role === "host" && <><div className="section-title" style={{ marginTop: 16 }}>Connected devices · approval required</div>{relay.peers.length ? relay.peers.map(peer => <div className="phone-card row spread" key={peer.id}><div><strong>{peer.name}</strong><div className="notice">{peer.role} · {peer.status}</div></div>{peer.status === "pending" ? <div className="row"><button className="button small primary" onClick={() => void relay.peerAction(peer.id, true)}><Check size={14} /> Approve</button><button className="button small danger" onClick={() => void relay.peerAction(peer.id, false)}>Deny</button></div> : <button className="button small danger" onClick={() => void relay.peerAction(peer.id, false)}>Revoke</button>}</div>) : <div className="empty">No devices yet. A controller request appears here for your approval; displays join read-only.</div>}<div className="row spread" style={{ marginTop: 15 }}><span className="notice">Room expires after 4 hours. Session exists in memory only.</span><button className="button small danger" onClick={() => { if (window.confirm("End this room for all connected devices? Your local draft remains safe.")) { void relay.end(); setModal(null); } }}>End room</button></div></>}
      <div className="phone-card"><div className="section-title">Joining another device</div><div className="split"><div><label className="field-label">Room ID</label><input className="input" value={joinIdInput} onChange={e => setJoinIdInput(e.target.value)} placeholder="Paste room ID" /><label className="field-label">Join code</label><input className="input" value={joinCodeInput} onChange={e => setJoinCodeInput(e.target.value)} placeholder="6-digit code" /></div><div><label className="field-label">Device name</label><input className="input" value={deviceName} onChange={e => setDeviceName(e.target.value)} /><button className="button small" style={{ marginTop: 10 }} onClick={() => void joinSession("controller")}>Join as controller</button><button className="button small" style={{ marginTop: 10 }} onClick={() => void joinSession("display")}>Join read-only display</button></div></div><p className="notice">A remote control request must be approved by the presenter. Read-only displays join immediately.</p></div>
      {relay.session?.role === "host" && (transferSizes.relay > MAX_RELAY_BYTES || oversizedRelayAsset || lesson.pages.length > pageLimit) && <p className="notice" role="alert">Current changes exceed a sharing limit and are not syncing. Connected screens keep the last successfully shared version. You can still revoke devices, rotate the code or end this room. <button className="button small" onClick={() => setModal("transfer")}>Review size & optimize</button></p>}
      {relay.error && <p className="notice" style={{ color: "#a54838" }}>{relay.error}</p>}
      </ModalShell>}
    {confirmationDialog}
    {modal === "timer" && <ModalShell title="Set a stage timer" close={() => setModal(null)}><label className="field-label">Duration in minutes</label><input className="input" type="number" min="1" max="240" value={Math.round(timerSeconds / 60)} onChange={e => setTimerSeconds(Math.min(14400, Math.max(60, Number(e.target.value) * 60)))} /><div className="row" style={{ marginTop: 16 }}><button className="button primary" onClick={() => { dispatchCommand({ type: "timer", seconds: timerSeconds, running: true }); setModal(null); }}>Start timer</button><button className="button" onClick={() => { dispatchCommand({ type: "timer", seconds: timerSeconds, running: false }); setModal(null); }}>Set without starting</button></div></ModalShell>}
    {modal === "names" && <ModalShell title="People & groups" close={() => setModal(null)}><p className="notice">Names stay on this device. Clear them from the local workspace controls when finished.</p><textarea className="textarea" placeholder={"Add names, one per line\nAvery\nSam"} value={names} onChange={e => setNames(e.target.value)} /><div className="row wrap" style={{ marginTop: 12 }}><label className="field-label">Group size <input className="width-select" type="number" min="1" max="20" value={groupSize} onChange={e => setGroupSize(Math.max(1, Number(e.target.value)))} /></label><button className="button primary" onClick={randomPick}>Pick names</button><button className="button" onClick={createGroups}>Make groups</button><button className="button small" onClick={namesSaved}><Save size={14} /> Save names</button></div>{picked.length > 0 && <div className="phone-card">{picked.map((name, i) => <div key={`${name}-${i}`} style={{ padding: 7, borderBottom: "1px solid var(--line)" }}>{name}</div>)}</div>}</ModalShell>}
    {modal === "model" && <ModalShell title="3D model library" close={() => setModal(null)}><p className="notice">Schematic educational visuals. Not medical models. Library assets are provided by the BrightboardTV host; uploaded models are embedded into your lesson backup.</p><div className="library-grid">{MODEL_LIBRARY.map(model => <button className="library-card" key={model.id} onClick={() => addModel(model.id)}><strong>{model.name}</strong><span className="notice">{model.description}</span><span className="notice" style={{ display: "block", marginTop: 8 }}>{model.attribution} · {model.license}</span></button>)}</div>{!MODEL_LIBRARY.length && <div className="empty">No bundled models were found in this build.</div>}<div className="row" style={{ marginTop: 14 }}><button className="button" onClick={() => document.getElementById("model-file")?.click()}><Upload size={15} /> Import .glb model</button><input id="model-file" type="file" accept=".glb,model/gltf-binary" hidden onChange={uploadModel} /></div>{page.model && <div className="phone-card"><strong>Current scene: {page.model.name}</strong><p className="notice">Close this library and tap a visible model surface to add a hotspot. A hit position and normal are required; no guessed location is saved.</p><button className="button small danger" onClick={() => updatePage(p => ({ ...p, model: undefined }))}>Remove current</button></div>}</ModalShell>}
    {modal === "settings" && <ModalShell title="Workspace tools" close={() => setModal(null)}><p className="notice">Your presentation limit: {pageLimit} pages ({PAGE_LIMIT_DESCRIPTION}).</p><p className="notice" role="status">Current .bbtv: {formatBytes(transferSizes.file)}. Local-file saves and imports have a 64 MB limit; relay sharing has a 12 MB limit. <button className="button small" onClick={() => setModal("transfer")}>Size & optimize</button></p><div className="library-grid">
      <button className="library-card" onClick={() => setModal("library")}><strong><BookOpen size={16} /> Saved lessons & import</strong><span className="notice">Open the library or import from this device.</span></button>
      <button className="library-card" onClick={clearBoard}><strong><Eraser size={16} /> Clear current page</strong><span className="notice">Remove page content with confirmation. Undo remains available.</span></button>
      <button className="library-card" onClick={exportLesson}><strong><Download size={16} /> Download .bbtv backup</strong><span className="notice">Keep a portable copy even if browser saving fails.</span></button>
      <button className="library-card" disabled={fileBusy || !supportsLocalFiles()} onClick={() => void openLocalFile()}><strong><Import size={16} /> Open local .bbtv file</strong><span className="notice">Allow access to a file on your computer in a supported browser.</span></button>
      <button className="library-card" disabled={fileBusy} onClick={() => void saveLocalFile()}><strong><Save size={16} /> {supportsLocalFiles() ? "Save directly to local file" : "Export local .bbtv file"}</strong><span className="notice">{localFileName && linkedFile.current?.lessonId === lesson.id ? `Linked file: ${localFileName}` : "Choose a file with permission, or use a download on unsupported devices."}</span></button>
      <button className="library-card" onClick={() => setModal("names")}><strong><Users size={16} /> People & groups</strong><span className="notice">Pick a name or form random groups.</span></button>
      <button className="library-card" onClick={() => setModal("timer")}><strong><Timer size={16} /> Timer</strong><span className="notice">Start a timer shared to the stage.</span></button>
      <button className="library-card" onClick={() => void exportPNG()}><strong><FileImage size={16} /> Export current PNG</strong><span className="notice">Flatten current page, including ink.</span></button>
      <button className="library-card" onClick={() => void exportPDF()}><strong><FileText size={16} /> Export PDF</strong><span className="notice">One flattened page per slide.</span></button>
      <button className="library-card" onClick={() => fullscreen()}><strong><Fullscreen size={16} /> Fullscreen canvas</strong><span className="notice">Expand the editor workspace.</span></button>
      <button className="library-card" onClick={() => dispatchCommand({ type: "spotlight" })}><strong><Focus size={16} /> Spotlight toggle</strong><span className="notice">Dim the presentation except the focus point.</span></button>
      <button className="library-card" onClick={() => dispatchCommand({ type: "blank" })}><strong><Eye size={16} /> Blank stage</strong><span className="notice">Temporarily blank the presentation display.</span></button>
      <button className="library-card" onClick={() => { setModal("help"); }}><strong><BookOpen size={16} /> Casting & help</strong><span className="notice">Practical display setup guidance.</span></button>
      <button className="library-card" onClick={clearLocal}><strong><Trash2 size={16} /> Clear local data</strong><span className="notice">Remove this device’s drafts and names.</span></button>
    </div></ModalShell>}
    {modal === "help" && <ModalShell title="Put BrightboardTV on the big screen" close={() => setModal(null)}><div className="stack"><div className="phone-card"><strong>HDMI or system display mirroring</strong><p className="notice">Connect your computer to the TV, then open Present. If your device mirrors its screen, use the operating system’s display controls.</p></div><div className="phone-card"><strong>Cast a browser tab</strong><p className="notice">When your browser and display support it, cast the presentation tab. The display can also join this room in read-only mode using the QR or join code.</p></div><p className="notice">BrightboardTV syncs its own presentation over an internet relay. It does not provide native AirPlay/Chromecast discovery or mirror arbitrary phone apps/audio. Same Wi-Fi is not required when the hosted relay is reachable.</p><div className="row wrap"><a className="button" href="/brightboardtv" target="_blank" rel="noreferrer"><BookOpen size={15} /> Public documentation</a><a className="button" href="https://github.com/kayondoabass-svg/Brightboard-TV" target="_blank" rel="noreferrer"><Link2 size={15} /> Open source repository</a></div></div></ModalShell>}
    {toast && <div className={`toast ${cameraWarning === toast ? "error" : ""}`} role="status">{toast}</div>}
  </div>;
}
function DisplayObject({ object }: { object: BoardObject }) {
  return <div className={`board-object ${object.type === "text" ? "text" : object.type === "rect" ? "shape" : object.type === "ellipse" ? "shape ellipse" : object.type}`} style={{ left: `${object.x * 100}%`, top: `${object.y * 100}%`, width: `${object.width * 100}%`, height: `${object.height * 100}%`, color: object.color, fontSize: `${(object.fontSize || 38) / 900 * 100}cqh` }}>{object.type === "image" && object.src ? <img src={object.src} alt="Presentation visual" /> : object.text}</div>;
}
function ModalShell({ title, close, children }: { title: string; close: () => void; children: ReactNode }) {
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) close(); }}><section className="modal" role="dialog" aria-modal="true" aria-label={title}><header className="modal-head"><div><h2>{title}</h2><span className="bb-eyebrow">BrightboardTV workspace</span></div><button className="modal-close" aria-label="Close" onClick={close}><X /></button></header>{children}</section></div>;
}
function TimerControl({ state, onCommand, open, readOnly = false }: { state: StageState; onCommand: (cmd: Command) => void; open?: () => void; readOnly?: boolean }) {
  const remaining = state.timer.running && state.timer.endsAt ? Math.max(0, Math.ceil((state.timer.endsAt - Date.now()) / 1000)) : state.timer.remaining;
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(id); }, []);
  void now;
  const format = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;
  return <div className="row spread"><span className="timer-digits">{format}</span>{!readOnly && <div className="row"><button className="button small" onClick={() => onCommand({ type: "timer", seconds: remaining, running: !state.timer.running })}>{state.timer.running ? <Pause size={14} /> : <Play size={14} />}{state.timer.running ? "Pause" : "Start"}</button>{open && <button className="button icon small" aria-label="Set timer" onClick={open}><Settings2 size={14} /></button>}</div>}</div>;
}
function StopwatchControl() {
  const [elapsed, setElapsed] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [, tick] = useState(0);
  useEffect(() => {
    if (startedAt === null) return;
    const id = window.setInterval(() => tick(v => v + 1), 250);
    return () => window.clearInterval(id);
  }, [startedAt]);
  const total = startedAt === null ? elapsed : elapsed + Date.now() - startedAt;
  const seconds = Math.floor(total / 1000), fraction = Math.floor(total % 1000 / 100);
  const toggle = () => startedAt === null ? setStartedAt(Date.now()) : (setElapsed(total), setStartedAt(null));
  return <div style={{ marginTop: 11, paddingTop: 10, borderTop: "1px solid var(--line)" }}><div className="row spread"><span className="notice">Local stopwatch</span><span className="timer-digits" style={{ fontSize: 19 }}>{String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}.{fraction}</span></div><div className="row" style={{ marginTop: 6 }}><button className="button small" onClick={toggle}>{startedAt === null ? <Play size={13} /> : <Pause size={13} />}{startedAt === null ? "Start" : "Pause"}</button><button className="button small" onClick={() => { setStartedAt(null); setElapsed(0); }}>Reset</button></div><p className="notice">Stopwatch runs on this device; the stage timer is the shared clock.</p></div>;
}
function JoinScreen({ role, code, setCode, id, setId, deviceName, setDeviceName, join, error, busy }: { role: "controller" | "display"; code: string; setCode: (s: string) => void; id: string; setId: (s: string) => void; deviceName: string; setDeviceName: (s: string) => void; join: () => void; error: string; busy: boolean }) {
  return <div className="phone-card" style={{ marginTop: 10 }}><div className="brand"><span className="brand-mark"><Presentation size={18} /></span>BrightboardTV</div><h2 style={{ fontFamily: "Manrope", letterSpacing: "-.04em" }}>{role === "display" ? "Join presentation display" : "Pair presenter remote"}</h2><p className="notice">Use the room link, or enter the room ID and join code shown by the presenter. The QR is intended to be scanned with your phone camera.</p><label className="field-label">Room ID</label><input className="input" value={id} onChange={e => setId(e.target.value)} autoComplete="off" placeholder="Room ID" /><label className="field-label">Join code</label><input className="input" value={code} onChange={e => setCode(e.target.value)} autoComplete="one-time-code" placeholder="Join code" /><label className="field-label">Device name</label><input className="input" value={deviceName} onChange={e => setDeviceName(e.target.value)} /><button className="button primary" style={{ width: "100%", marginTop: 14 }} disabled={busy || !id.trim() || !code.trim()} onClick={join}>{busy ? "Connecting…" : role === "display" ? "Join read-only display" : "Request remote access"}</button>{error && <p className="notice" style={{ color: "#a54838" }}>{error} <button className="button small" onClick={join}>Retry</button></p>}<p className="notice">Controller access requires presenter approval. This presentation remote does not mirror other phone apps or audio.</p></div>;
}
export default App;
