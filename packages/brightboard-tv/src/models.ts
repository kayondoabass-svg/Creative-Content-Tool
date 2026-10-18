import type { Hotspot } from "./types";
export type ModelEntry = { id: string; name: string; description: string; src: string; attribution: string; license: string; hotspots: Hotspot[] };
const pin = (id: string, label: string, description: string, position: string): Hotspot =>
  ({ id, label, description, position, normal: "0 1 0" });
export const MODEL_LIBRARY: ModelEntry[] = [
  { id: "water-molecule", name: "Water molecule", description: "Simplified H₂O diagram, not to scale.", hotspots: [
    pin("oxygen", "Oxygen", "Water contains one oxygen atom.", "0m 0m .8m"),
    pin("hydrogen", "Hydrogen", "Two hydrogen atoms bond with oxygen.", ".79m .61m .3m")] },
  { id: "atom", name: "Atom", description: "Schematic nucleus and electrons. Electron paths are not literal orbits.", hotspots: [
    pin("nucleus", "Nucleus", "Protons and neutrons form the nucleus.", "0m .4m .5m"),
    pin("electron", "Electrons", "Electrons occupy quantum states; this illustration is not a literal orbital model.", "2m 0m 0m")] },
  { id: "plant-cell", name: "Plant cell", description: "Translucent, simplified plant-cell structures.", hotspots: [
    pin("wall", "Cell wall", "The cell wall supports and protects the cell.", "2.5m 0m 0m"),
    pin("nucleus", "Nucleus", "The nucleus contains genetic material.", "-1m .6m .5m"),
    pin("vacuole", "Central vacuole", "Stores water and helps maintain turgor pressure.", ".5m 0m .5m"),
    pin("chloroplast", "Chloroplast", "Chloroplasts carry out photosynthesis.", "-1.6m -.7m .5m")] },
  { id: "earth-layers", name: "Earth layers", description: "Concentric translucent layers; not a geographic or scale model.", hotspots: [
    pin("crust", "Crust", "Earth's thin outer solid layer.", "0m 2.1m 0m"),
    pin("mantle", "Mantle", "The mantle lies between the crust and core.", "1.3m 0m .5m"),
    pin("outer", "Outer core", "Predominantly liquid iron and nickel.", ".8m 0m .5m"),
    pin("inner", "Inner core", "The inner core is solid under immense pressure.", "0m 0m .4m")] },
  { id: "solar-system", name: "Solar system", description: "The Sun and eight planets in order. Sizes and distances are not to scale.", hotspots: [
    pin("sun", "Sun", "Our solar system's central star.", "-5m .9m 0m"),
    pin("earth", "Earth", "The third planet from the Sun.", "-1.7m .35m 0m"),
    pin("jupiter", "Jupiter", "The largest planet.", "1m .7m 0m")] },
].map(model => ({ ...model, src: `/tv-assets/models/${model.id}.glb`,
  attribution: "Original schematic by BrightboardTV contributors",
  license: "CC0-1.0. Educational schematic, not a medical or scientific measurement." }));
