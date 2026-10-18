import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE, type Command, type Peer, type RelaySnapshot, type RelayRole, type StageState } from "./types";

type Session = { id: string; key: string; role: RelayRole; joinCode?: string; expiresAt?: number };
type RelayState = { session: Session | null; snapshot: RelaySnapshot | null; error: string; pending: boolean; connected: boolean };
const CRED_KEY = "brightboard-tv-relay-session";

async function request<T>(path: string, init: RequestInit = {}, key?: string): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set("Content-Type", "application/json");
  if (key) headers.set("Authorization", `Bearer ${key}`);
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers, credentials: "include" });
  if (response.status === 202) return { status: "pending" } as T;
  if (!response.ok) {
    let detail = "";
    try { const body = await response.json(); detail = body.message || body.error || ""; } catch { /* response may be empty */ }
    throw new Error(detail || `Relay request failed (${response.status}).`);
  }
  return response.status === 204 ? undefined as T : response.json();
}
function readSession(): Session | null {
  try { const raw = sessionStorage.getItem(CRED_KEY); return raw ? JSON.parse(raw) as Session : null; } catch { return null; }
}
export function useRelay(onState?: (snapshot: RelaySnapshot) => void) {
  const [state, setState] = useState<RelayState>(() => ({ session: readSession(), snapshot: null, error: "", pending: false, connected: false }));
  const [peers, setPeers] = useState<Peer[]>([]);
  const revision = useRef(-1);
  const [joinCode, setJoinCode] = useState(() => readSession()?.joinCode || "");
  const [sessionName, setSessionName] = useState("");
  const ownRevision = useRef(-1);
  const onStateRef = useRef(onState); onStateRef.current = onState;
  const update = (patch: Partial<RelayState>) => setState(s => ({ ...s, ...patch }));
  const persist = (session: Session | null) => {
    if (session) sessionStorage.setItem(CRED_KEY, JSON.stringify(session)); else sessionStorage.removeItem(CRED_KEY);
    update({ session, snapshot: null, error: "", connected: false });
    revision.current = -1;
    ownRevision.current = -1;
  };
  const create = useCallback(async (initial: StageState) => {
    update({ pending: true, error: "" });
    try {
      const result = await request<{ id: string; hostKey: string; joinCode: string; expiresAt: number }>("/sessions", { method: "POST", body: JSON.stringify({ state: initial }) });
      const session = { id: result.id, key: result.hostKey, role: "host" as const, joinCode: result.joinCode, expiresAt: result.expiresAt };
      persist(session); setJoinCode(result.joinCode); setPeers([]); return session;
    } catch (error) { update({ error: error instanceof Error ? error.message : "Could not create a room." }); return null; }
    finally { update({ pending: false }); }
  }, []);
  const join = useCallback(async (id: string, code: string, name: string, role: "controller" | "display") => {
    update({ pending: true, error: "" });
    try {
      const result = await request<{ peerId: string; key: string; status: "pending" | "approved"; role: "controller" | "display" }>(`/sessions/${encodeURIComponent(id)}/join`, { method: "POST", body: JSON.stringify({ code, name, role }) });
      const session: Session = { id, key: result.key, role };
      persist(session); setSessionName(name); setJoinCode(code);
      return result;
    } catch (error) { update({ error: error instanceof Error ? error.message : "Could not join this room." }); return null; }
    finally { update({ pending: false }); }
  }, []);
  useEffect(() => {
    const session = state.session;
    if (!session) return;
    let active = true;
    let timer = 0;
    const controller = new AbortController();
    const poll = async () => {
      let retryDelay = 450;
      try {
        const path = `/sessions/${encodeURIComponent(session.id)}/state?after=${revision.current}`;
        const snap = await request<RelaySnapshot>(path, { signal: controller.signal }, session.key);
        if (!active) return;
        if ((snap as unknown as { status?: string }).status === "pending") {
          update({ connected: false, error: "" });
          retryDelay = 1000;
          return;
        }
        if (session.role === "host") setPeers(snap.peers || []);
        if (snap.revision !== revision.current) {
          revision.current = snap.revision; update({ snapshot: snap, connected: true, error: "" });
          if (snap.revision > ownRevision.current) onStateRef.current?.(snap);
        } else update({ connected: true, error: "" });
      } catch (error) {
        if (!active) return;
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : "Connection interrupted.";
        update({ connected: false, error: message });
        retryDelay = 1000;
        if (/401|404|revok|expired|ended/i.test(message)) persist(null);
      } finally { if (active && !controller.signal.aborted) timer = window.setTimeout(poll, retryDelay); }
    };
    void poll();
    return () => { active = false; controller.abort(); window.clearTimeout(timer); };
  }, [state.session?.id, state.session?.key]);
  const publish = useCallback(async (next: StageState) => {
    const session = state.session; if (!session || session.role !== "host") return;
    try {
      const result = await request<{ revision: number }>(`/sessions/${encodeURIComponent(session.id)}/state`, { method: "PUT", body: JSON.stringify({ state: next }) }, session.key);
      if (Number.isFinite(result?.revision)) { ownRevision.current = result.revision; revision.current = Math.max(revision.current, result.revision); }
    }
    catch (error) { update({ error: error instanceof Error ? error.message : "Could not sync presentation." }); }
  }, [state.session?.id, state.session?.key, state.session?.role]);
  const command = useCallback(async (cmd: Command) => {
    const session = state.session; if (!session || session.role === "display") return;
    try {
      const result = await request<{ revision: number }>(`/sessions/${encodeURIComponent(session.id)}/command`, { method: "POST", body: JSON.stringify(cmd) }, session.key);
      if (session.role === "host" && Number.isFinite(result?.revision)) { ownRevision.current = result.revision; revision.current = Math.max(revision.current, result.revision); }
    }
    catch (error) { update({ error: error instanceof Error ? error.message : "Command failed." }); }
  }, [state.session?.id, state.session?.key, state.session?.role]);
  const peerAction = useCallback(async (peerId: string, approved: boolean) => {
    const session = state.session; if (!session || session.role !== "host") return;
    try { await request(`/sessions/${encodeURIComponent(session.id)}/peers/${encodeURIComponent(peerId)}`, { method: "POST", body: JSON.stringify({ approved }) }, session.key); }
    catch (error) { update({ error: error instanceof Error ? error.message : "Could not update access." }); }
  }, [state.session?.id, state.session?.key, state.session?.role]);
  const rotate = useCallback(async () => {
    const session = state.session; if (!session || session.role !== "host") return null;
    try {
      const result = await request<{ joinCode: string }>(`/sessions/${encodeURIComponent(session.id)}/rotate`, { method: "POST" }, session.key);
      setJoinCode(result.joinCode);
      const updated = { ...session, joinCode: result.joinCode };
      sessionStorage.setItem(CRED_KEY, JSON.stringify(updated)); update({ session: updated });
      return result.joinCode;
    }
    catch (error) { update({ error: error instanceof Error ? error.message : "Could not rotate code." }); return null; }
  }, [state.session?.id, state.session?.key, state.session?.role]);
  const end = useCallback(async () => {
    const session = state.session;
    if (!session || session.role !== "host") return;
    try {
      await request(`/sessions/${encodeURIComponent(session.id)}`, { method: "DELETE" }, session.key);
      persist(null); setPeers([]);
    }
    catch (error) { update({ error: error instanceof Error ? error.message : "Could not end the session." }); }
  }, [state.session?.id, state.session?.key, state.session?.role]);
  return { ...state, peers, joinCode, setJoinCode, sessionName, setSessionName, create, join, publish, command, peerAction, rotate, end, clear: () => { persist(null); setPeers([]); } };
}
