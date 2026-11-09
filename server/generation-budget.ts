import { AsyncLocalStorage } from "node:async_hooks";
const deadlines = new AsyncLocalStorage<number>();
export const generationDeadline = () => deadlines.getStore() ?? Infinity;
export function assertGenerationActive() {
  if (Date.now() >= generationDeadline()) throw new Error("Generation reached its time limit. No incomplete result was saved. Please try a smaller request.");
}
export function runGeneration<T>(fn: () => Promise<T>) {
  // Finish before the existing queue's five-minute failsafe. Shared across all
  // provider calls and repairs; retries cannot start another full time budget.
  return deadlines.run(Date.now() + 240_000, fn);
}
