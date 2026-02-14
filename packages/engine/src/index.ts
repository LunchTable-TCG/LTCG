// @lunchtable-tcg/engine
// Pure TypeScript trading card game engine — zero dependencies
export * from "./types/index.js";
export { defineCards, validateDeck } from "./cards.js";
export type { CardLookup, DeckValidation } from "./cards.js";
export { createEngine } from "./engine.js";
export type { Engine, EngineOptions } from "./engine.js";
