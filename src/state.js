import { config } from "./config.js";
import { storageKey } from "./utils.js";

export function defaultState() {
  return {
    soft: 0,
    ownedCars: {},
    knownCars: {},
    soldCars: {},
    unlockedCars: {},
    collectionsSold: {},
    collectionsRevealed: {},
    generators: Object.fromEntries(config.generators.map(g => [g.id, 0])),
    genTimers: Object.fromEntries(config.generators.map(g => [g.id, 0])),
    genUnlocked: Object.fromEntries(config.generators.map(g => [g.id, false])),
    lastTick: Date.now(),
    carCost: config.settings.carBaseCost,
    autoCooldownUntil: 0,
    buildUntil: 0,
    buildCarId: null,
    buildSource: null,
    buildDoneCarId: null,
    previewCarId: null,
    buildAddTag: null
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? { ...defaultState(), ...JSON.parse(raw) } : defaultState();
  } catch {
    return defaultState();
  }
}

export function saveState(state) {
  localStorage.setItem(storageKey, JSON.stringify(state));
}
