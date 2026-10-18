import { Router, type Response, type Request } from "express";
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { StageState, Command, RelayRole, Peer } from "../src/types";

const n = z.number().finite();
const unit = n.min(0).max(1);
const point = z.object({ x: unit, y: unit });
const asset = z.string().max(8 * 1024 * 1024).refine(v =>
  /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=\s]+$/.test(v) ||
  /^https:\/\/[^\s<>"']+$/.test(v), "Use a raster image or HTTPS image");
const hotspot = z.object({
  id: z.string().max(80), label: z.string().max(120), description: z.string().max(2000),
  position: z.string().max(120), normal: z.string().max(120),
});
export const lessonSchema = z.object({
  format: z.literal("brightboard-tv"), version: z.literal(1),
  id: z.string().max(100), title: z.string().min(1).max(200), updatedAt: z.string().max(50),
  pages: z.array(z.object({
    id: z.string().max(100), title: z.string().max(200),
    background: z.enum(["light", "dark", "lined", "grid"]), notes: z.string().max(20000),
    ink: z.array(z.object({
      id: z.string().max(100), points: z.array(point).max(10000),
      color: z.string().regex(/^#[a-fA-F0-9]{3,8}$/), width: n.min(.1).max(100), highlighter: z.boolean().optional(),
    })).max(2000),
    objects: z.array(z.object({
      id: z.string().max(100), type: z.enum(["text", "image", "rect", "ellipse", "line", "arrow"]),
      x: n.min(-1).max(2), y: n.min(-1).max(2), width: n.min(0).max(3), height: n.min(0).max(3),
      color: z.string().regex(/^#[a-fA-F0-9]{3,8}$/),
      text: z.string().max(20000).optional(), src: asset.optional(), locked: z.boolean().optional(),
      fontSize: n.min(1).max(400).optional(),
    })).max(1000),
    model: z.object({
      src: z.string().max(8 * 1024 * 1024).refine(v =>
        /^\/tv-assets\/models\/[a-z0-9-]+\.glb$/.test(v) ||
        /^data:model\/gltf-binary;base64,[A-Za-z0-9+/=\s]+$/.test(v), "Use a supplied or uploaded GLB"),
      name: z.string().max(200), attribution: z.string().max(1000), license: z.string().max(1000),
      hotspots: z.array(hotspot).max(100), cameraOrbit: z.string().max(120).optional(),
    }).optional(),
  })).min(1).max(60),
});
export const stateSchema = z.object({
  lesson: lessonSchema, pageIndex: n.int().min(0).max(59), blank: z.boolean(), spotlight: z.boolean(),
  pointer: z.object({ x: unit, y: unit, visible: z.boolean() }),
  timer: z.object({ endsAt: n.min(0).max(9e15).nullable(), remaining: n.min(0).max(86400), running: z.boolean() }),
}).refine(s => s.pageIndex < s.lesson.pages.length, "Page does not exist");
export const commandSchema = z.discriminatedUnion("type", [
  ...(["next", "previous", "blank", "spotlight", "reset-view"] as const).map(type => z.object({ type: z.literal(type) })),
  z.object({ type: z.literal("page"), index: n.int().min(0).max(59) }),
  z.object({ type: z.literal("pointer"), x: unit, y: unit, visible: z.boolean() }),
  z.object({ type: z.literal("timer"), seconds: n.min(0).max(86400), running: z.boolean() }),
  z.object({ type: z.literal("camera"), orbit: z.string().min(1).max(120) }),
] as any);
type Member = Peer & { digest: string };
type Waiter = { res: Response; key: string; timeout: ReturnType<typeof setTimeout> };
type Room = {
  id: string; host: string; joinCode: string; expiresAt: number; revision: number;
  state: StageState; peers: Map<string, Member>; waiters: Set<Waiter>; bytes: number;
};
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const secret = () => randomBytes(32).toString("hex");
const equal = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** No database, account service, telemetry or provider credentials are needed. */
export function createTvRelay(options: { now?: () => number; ttl?: number; maxRooms?: number } = {}) {
  const now = options.now || Date.now;
  const ttl = options.ttl || 4 * 60 * 60 * 1000;
  const rooms = new Map<string, Room>();
  const limits = new Map<string, { count: number; until: number }>();
  const router = Router();
  function roomBytes() { return Array.from(rooms.values()).reduce((sum, r) => sum + r.bytes, 0); }
  function limited(key: string, max: number) {
    const prior = limits.get(key);
    if (!prior || prior.until <= now()) { limits.set(key, { count: 1, until: now() + 60000 }); return false; }
    return ++prior.count > max;
  }
  function role(room: Room, key: string): { role: RelayRole; pending?: boolean } | null {
    if (!/^[a-f0-9]{64}$/.test(key)) return null;
    const hash = digest(key);
    if (equal(room.host, hash)) return { role: "host" };
    const peer = Array.from(room.peers.values()).find(p => equal(p.digest, hash));
    return peer ? { role: peer.role, pending: peer.status === "pending" } : null;
  }
  function snapshot(room: Room, who: RelayRole) {
    const state = who === "display" ? {
      ...room.state, lesson: { ...room.state.lesson, pages: room.state.lesson.pages.map(p => ({ ...p, notes: "" })) },
    } : room.state;
    return {
      revision: room.revision, state, expiresAt: room.expiresAt,
      ...(who === "host" ? { peers: Array.from(room.peers.values()).map(({ digest: _, ...peer }) => peer) } : {}),
    };
  }
  function answer(room: Room, waiter: Waiter) {
    clearTimeout(waiter.timeout); room.waiters.delete(waiter);
    if (waiter.res.destroyed || waiter.res.writableEnded) return;
    const who = role(room, waiter.key);
    if (!who) waiter.res.status(401).json({ error: "This device has been disconnected." });
    else if (who.pending) waiter.res.status(202).json({ status: "pending" });
    else waiter.res.json(snapshot(room, who.role));
  }
  function changed(room: Room) {
    room.revision++;
    for (const waiter of Array.from(room.waiters)) answer(room, waiter);
  }
  function remove(room: Room) {
    rooms.delete(room.id);
    for (const waiter of Array.from(room.waiters)) {
      clearTimeout(waiter.timeout);
      if (!waiter.res.destroyed) waiter.res.status(404).json({ error: "Presentation session ended or expired." });
    }
    room.waiters.clear();
  }
  const cleanup = setInterval(() => {
    for (const room of Array.from(rooms.values())) if (room.expiresAt <= now()) remove(room);
    for (const [key, value] of Array.from(limits.entries())) if (value.until <= now()) limits.delete(key);
  }, 15000);
  cleanup.unref();
  router.use((req, res, next) => {
    res.set({ "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" });
    const origin = req.get("origin");
    if (origin) {
      try { if (new URL(origin).host !== req.get("host")) return res.status(403).json({ error: "Cross-site pairing requests are not permitted." }); }
      catch { return res.status(403).json({ error: "Invalid request origin." }); }
    }
    if (limited(`all:${req.ip}`, 1400)) return res.status(429).json({ error: "Too many pairing requests. Wait one minute." });
    next();
  });
  const wrap = (fn: (req: Request, res: Response) => unknown) => (req: Request, res: Response) => {
    try { return fn(req, res); }
    catch (error) {
      return res.status(error instanceof z.ZodError ? 400 : 500).json({
        error: error instanceof z.ZodError ? "Invalid presentation data or command." : "Presentation request failed.",
      });
    }
  };
  function access(req: Request, res: Response, write = false, hostOnly = false) {
    const room = rooms.get(String(req.params.id));
    if (!room || room.expiresAt <= now()) {
      if (room) remove(room);
      res.status(404).json({ error: "Presentation session ended or expired." }); return null;
    }
    const key = (req.get("authorization") || "").replace(/^Bearer /, "");
    const who = role(room, key);
    if (!who) { res.status(401).json({ error: "Invalid or revoked presentation connection." }); return null; }
    if (who.pending) { res.status(202).json({ status: "pending" }); return null; }
    if ((write && who.role === "display") || (hostOnly && who.role !== "host")) {
      res.status(403).json({ error: "This device cannot perform that action." }); return null;
    }
    return { room, who, key };
  }
  function parseState(body: any) {
    if (Buffer.byteLength(JSON.stringify(body) || "") > 12 * 1024 * 1024) return null;
    return stateSchema.parse(body) as StageState;
  }
  router.get("/health", (_req, res) => res.json({ ok: true, transport: "https-long-poll", offlinePairing: false }));
  router.post("/sessions", wrap((req, res) => {
    if (limited(`create:${req.ip}`, 10)) return res.status(429).json({ error: "Wait one minute before creating another session." });
    if (rooms.size >= (options.maxRooms || 30) || roomBytes() > 64 * 1024 * 1024)
      return res.status(503).json({ error: "Presentation service is at capacity. Try again later." });
    const state = parseState(req.body?.state);
    if (!state) return res.status(413).json({ error: "Presentation is too large to share (12 MB limit). Export it or reduce image sizes." });
    const id = randomBytes(16).toString("hex"), hostKey = secret();
    const room: Room = {
      id, host: digest(hostKey), joinCode: String(randomInt(100000, 1000000)), expiresAt: now() + ttl,
      revision: 0, state, peers: new Map(), waiters: new Set(), bytes: Buffer.byteLength(JSON.stringify(state)),
    };
    rooms.set(id, room);
    res.status(201).json({ id, hostKey, joinCode: room.joinCode, expiresAt: room.expiresAt });
  }));
  router.post("/sessions/:id/join", wrap((req, res) => {
    if (limited(`join:${req.ip}`, 20)) return res.status(429).json({ error: "Too many pairing attempts. Wait one minute." });
    const room = rooms.get(String(req.params.id));
    if (!room || room.expiresAt <= now()) return res.status(404).json({ error: "Presentation session ended or expired." });
    const input = z.object({ code: z.string().regex(/^\d{6}$/), name: z.string().trim().min(1).max(60), role: z.enum(["controller", "display"]) }).parse(req.body);
    if (!equal(input.code, room.joinCode)) return res.status(403).json({ error: "Pairing code is incorrect or has changed." });
    if (room.peers.size >= 15) return res.status(409).json({ error: "Device limit reached. Disconnect a device first." });
    const peerId = randomBytes(12).toString("hex"), key = secret();
    const status = input.role === "display" ? "approved" : "pending";
    room.peers.set(peerId, { id: peerId, name: input.name, role: input.role, status, connectedAt: now(), digest: digest(key) });
    changed(room);
    return res.status(201).json({ peerId, key, status, role: input.role });
  }));
  router.get("/sessions/:id/state", wrap((req, res) => {
    const a = access(req, res); if (!a) return;
    const after = Number(req.query.after);
    if (!Number.isFinite(after) || after < a.room.revision) return res.json(snapshot(a.room, a.who.role));
    if (Array.from(a.room.waiters).filter(w => w.key === a.key).length >= 2)
      return res.status(429).json({ error: "Too many simultaneous connections for this device." });
    const waiter: Waiter = { res, key: a.key, timeout: setTimeout(() => answer(a.room, waiter), 20000) };
    a.room.waiters.add(waiter);
    res.on("close", () => { clearTimeout(waiter.timeout); a.room.waiters.delete(waiter); });
  }));
  router.put("/sessions/:id/state", wrap((req, res) => {
    const a = access(req, res, true); if (!a) return;
    const state = parseState(req.body?.state);
    if (!state) return res.status(413).json({ error: "Presentation is too large to share (12 MB limit)." });
    const bytes = Buffer.byteLength(JSON.stringify(state));
    if (roomBytes() - a.room.bytes + bytes > 80 * 1024 * 1024) return res.status(503).json({ error: "Sharing storage is full. Reduce presentation size." });
    a.room.state = state; a.room.bytes = bytes; changed(a.room);
    return res.json({ revision: a.room.revision });
  }));
  router.post("/sessions/:id/command", wrap((req, res) => {
    const a = access(req, res, true); if (!a) return;
    const cmd = commandSchema.parse(req.body) as Command, s = a.room.state;
    if (cmd.type === "next") s.pageIndex = Math.min(s.lesson.pages.length - 1, s.pageIndex + 1);
    if (cmd.type === "previous") s.pageIndex = Math.max(0, s.pageIndex - 1);
    if (cmd.type === "page") {
      if (cmd.index >= s.lesson.pages.length) return res.status(400).json({ error: "Page does not exist." });
      s.pageIndex = cmd.index;
    }
    if (cmd.type === "blank") s.blank = !s.blank;
    if (cmd.type === "spotlight") s.spotlight = !s.spotlight;
    if (cmd.type === "pointer") s.pointer = { x: cmd.x, y: cmd.y, visible: cmd.visible };
    if (cmd.type === "timer") s.timer = { remaining: cmd.seconds, running: cmd.running, endsAt: cmd.running ? now() + cmd.seconds * 1000 : null };
    const model = s.lesson.pages[s.pageIndex].model;
    if (cmd.type === "camera" && model) model.cameraOrbit = cmd.orbit;
    if (cmd.type === "reset-view" && model) delete model.cameraOrbit;
    changed(a.room); return res.json({ revision: a.room.revision });
  }));
  router.post("/sessions/:id/peers/:peerId", wrap((req, res) => {
    const a = access(req, res, true, true); if (!a) return;
    const peer = a.room.peers.get(String(req.params.peerId));
    if (!peer) return res.status(404).json({ error: "Device not found." });
    const { approved } = z.object({ approved: z.boolean() }).parse(req.body);
    if (approved) peer.status = "approved"; else a.room.peers.delete(peer.id);
    changed(a.room); return res.json({ ok: true });
  }));
  router.post("/sessions/:id/rotate", wrap((req, res) => {
    const a = access(req, res, true, true); if (!a) return;
    a.room.joinCode = String(randomInt(100000, 1000000));
    for (const peer of Array.from(a.room.peers.values())) if (peer.status === "pending") a.room.peers.delete(peer.id);
    changed(a.room); return res.json({ joinCode: a.room.joinCode });
  }));
  router.delete("/sessions/:id", wrap((req, res) => {
    const a = access(req, res, true, true); if (!a) return;
    remove(a.room); return res.json({ ok: true });
  }));
  return { router, close() { clearInterval(cleanup); for (const room of Array.from(rooms.values())) remove(room); } };
}
