export type Background = "light" | "dark" | "lined" | "grid";
export type Point = { x: number; y: number };
export type Ink = { id: string; points: Point[]; color: string; width: number; highlighter?: boolean };
export type BoardObject = {
  id: string; type: "text" | "image" | "rect" | "ellipse" | "line" | "arrow";
  x: number; y: number; width: number; height: number; color: string;
  text?: string; src?: string; locked?: boolean; fontSize?: number;
};
export type Hotspot = { id: string; label: string; description: string; position: string; normal: string };
export type Page = {
  id: string; title: string; background: Background; notes: string;
  ink: Ink[]; objects: BoardObject[];
  model?: { src: string; name: string; attribution: string; license: string; hotspots: Hotspot[]; cameraOrbit?: string };
};
export type Lesson = { format: "brightboard-tv"; version: 1; id: string; title: string; pages: Page[]; updatedAt: string };
export type StageState = {
  lesson: Lesson; pageIndex: number; blank: boolean;
  pointer: { x: number; y: number; visible: boolean };
  timer: { endsAt: number | null; remaining: number; running: boolean };
  spotlight: boolean;
};
export type Command =
  | { type: "next" | "previous" | "blank" | "spotlight" | "reset-view" }
  | { type: "page"; index: number }
  | { type: "pointer"; x: number; y: number; visible: boolean }
  | { type: "timer"; seconds: number; running: boolean }
  | { type: "camera"; orbit: string };
export type RelayRole = "host" | "controller" | "display";
export type Peer = { id: string; name: string; role: "controller" | "display"; status: "pending" | "approved"; connectedAt: number };
export type RelaySnapshot = { revision: number; state: StageState; peers?: Peer[]; expiresAt: number };
export const API_BASE = "/api/tv";
export function blankPage(title = "Untitled page"): Page {
  return { id: crypto.randomUUID(), title, background: "light", notes: "", ink: [], objects: [] };
}
export function newLesson(): Lesson {
  return { format: "brightboard-tv", version: 1, id: crypto.randomUUID(), title: "My interactive presentation", pages: [blankPage("Welcome")], updatedAt: new Date().toISOString() };
}
export function initialState(lesson = newLesson()): StageState {
  return { lesson, pageIndex: 0, blank: false, spotlight: false, pointer: { x: .5, y: .5, visible: false }, timer: { endsAt: null, remaining: 300, running: false } };
}
