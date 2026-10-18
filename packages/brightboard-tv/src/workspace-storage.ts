import type { Lesson } from "./types";
import { validLesson } from "./helpers";

type Records = { workspace?: Lesson; library?: Lesson[]; names?: string };
export type WorkspaceBackend = { read(): Promise<Records>; write(values: Records): Promise<void> };
type LegacyStorage = Pick<Storage, "getItem" | "removeItem">;
const legacyKeys = { workspace: "brightboard-tv-workspace", library: "brightboard-tv-library", names: "brightboard-tv-names" };

/** Writes are serialized, so an old autosave cannot overtake a newer save/reset. */
export class WorkspaceStorage {
  private records: Records = {};
  private initialized = false;
  private pending: Promise<void> = Promise.resolve();
  constructor(private backend: WorkspaceBackend) {}
  private queue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.pending.then(() => {
      if (!this.initialized) throw new Error("Device storage is not ready. Retry storage or export a backup.");
      return operation();
    });
    this.pending = result.then(() => undefined, () => undefined);
    return result;
  }
  async initialize(legacy?: LegacyStorage) {
    const previous: Records = {};
    if (legacy) {
      const raw = legacy.getItem(legacyKeys.workspace);
      const library = legacy.getItem(legacyKeys.library);
      if (raw) previous.workspace = JSON.parse(raw);
      if (library) previous.library = JSON.parse(library);
      previous.names = legacy.getItem(legacyKeys.names) || "";
    }
    // Preserve valid legacy data in memory even if IndexedDB is unavailable.
    if (previous.workspace && validLesson(previous.workspace)) this.records.workspace = previous.workspace;
    if (Array.isArray(previous.library) && previous.library.every(validLesson)) this.records.library = previous.library;
    this.records.names = previous.names || "";
    const saved = await this.backend.read();
    const next = { ...previous, ...saved };
    if (next.workspace && !validLesson(next.workspace)) throw new Error("The saved workspace needs recovery. Its original data has not been removed.");
    if (next.library && (!Array.isArray(next.library) || !next.library.every(validLesson))) throw new Error("The saved library needs recovery. Its original data has not been removed.");
    if (typeof next.names !== "string") next.names = "";
    // Existing IndexedDB drafts can be opened read-only, even near device quota.
    // Only missing legacy records need migration; commit before removing copies.
    const migration: Records = {};
    for (const key of ["workspace", "library", "names"] as const) {
      if (saved[key] === undefined && previous[key] !== undefined) Object.assign(migration, { [key]: previous[key] });
    }
    if (Object.keys(migration).length) await this.backend.write(migration);
    this.records = next;
    this.initialized = true;
    if (legacy) for (const key of Object.values(legacyKeys)) {
      try { legacy.removeItem(key); } catch { /* committed copy is already durable */ }
    }
  }
  workspace() { return this.records.workspace; }
  library() { return this.records.library || []; }
  names() { return this.records.names || ""; }
  saveWorkspace(lesson: Lesson) {
    return this.queue(async () => {
      await this.backend.write({ workspace: lesson });
      this.records.workspace = lesson;
    });
  }
  saveLibrary(lesson: Lesson) {
    return this.queue(async () => {
      const library = [lesson, ...this.library().filter(item => item.id !== lesson.id)];
      await this.backend.write({ library });
      this.records.library = library;
      return library;
    });
  }
  deleteLibrary(id: string) {
    return this.queue(async () => {
      const library = this.library().filter(item => item.id !== id);
      await this.backend.write({ library });
      this.records.library = library;
      return library;
    });
  }
  switchWorkspace(lesson: Lesson, previous?: Lesson) {
    return this.queue(async () => {
      const library = previous ? [previous, ...this.library().filter(item => item.id !== previous.id)] : this.library();
      await this.backend.write({ workspace: lesson, library });
      this.records = { ...this.records, workspace: lesson, library };
      return library;
    });
  }
  saveNames(names: string) {
    return this.queue(async () => {
      await this.backend.write({ names });
      this.records.names = names;
    });
  }
  clear(fresh: Lesson) {
    return this.queue(async () => {
      const next = { workspace: fresh, library: [], names: "" };
      await this.backend.write(next);
      this.records = next;
    });
  }
}

function indexedDBBackend(): WorkspaceBackend {
  let connection: Promise<IDBDatabase> | undefined;
  const open = () => connection ||= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("brightboard-tv-workspace-db", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("records");
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => { db.close(); connection = undefined; };
      resolve(db);
    };
    request.onerror = () => { connection = undefined; reject(request.error || new Error("Could not open device storage.")); };
    request.onblocked = () => { connection = undefined; reject(new Error("Close other BrightboardTV tabs, then retry opening device storage.")); };
  });
  return {
    async read() {
      const db = await open();
      return new Promise<Records>((resolve, reject) => {
        const tx = db.transaction("records", "readonly"), result: Records = {};
        for (const key of ["workspace", "library", "names"] as const) {
          const req = tx.objectStore("records").get(key);
          req.onsuccess = () => { if (req.result !== undefined) Object.assign(result, { [key]: req.result }); };
        }
        tx.oncomplete = () => resolve(result);
        tx.onabort = tx.onerror = () => reject(tx.error || new Error("Could not read device storage."));
      });
    },
    async write(values) {
      const db = await open();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction("records", "readwrite");
        tx.oncomplete = () => resolve();
        tx.onabort = tx.onerror = () => reject(tx.error || new Error("Device storage could not save this lesson. Export a backup and free device space."));
        try { for (const [key, value] of Object.entries(values)) tx.objectStore("records").put(value, key); }
        catch (error) { tx.abort(); reject(error); }
      });
    },
  };
}

export const workspaceStorage = new WorkspaceStorage(indexedDBBackend());
