import { config } from "./config.js";

export const fmt = (n, d = 0) => Number(n).toFixed(d);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function makeRng(seed) {
  let s = seed >>> 0;
  return {
    next() {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    }
  };
}

export const storageKey = "idle-auto-clicker";

export function knownTags(state, car) {
  return state.knownCars[car.id] || [];
}

export function milestoneMul(level) {
  return Math.pow(config.settings.milestoneMul, Math.floor(level / config.settings.milestone));
}

export function intervalFor(g, lvl) {
  if (lvl <= 0) return Infinity;
  const mult = Math.pow(config.settings.intervalMul, Math.floor(lvl / config.settings.milestone));
  return g.interval * mult;
}

export function totalCollectionSales(state) {
  return Object.values(state.collectionsSold || {}).reduce((a, b) => a + (b || 0), 0);
}

export function totals(state) {
  let active = 1;
  let passiveRate = 0;
  let tickMult = 1;
  let carCostMult = 1;
  for (const g of config.generators) {
    const lvl = state.generators[g.id] || 0;
    if (lvl <= 0) continue;
    const mul = milestoneMul(lvl);
    const interval = intervalFor(g, lvl);
    active += g.active * lvl * mul;
    passiveRate += g.passive * lvl * mul / interval;
  }
  let autoActiveAdd = 0, autoPassiveAdd = 0;
  for (const car of config.cars) {
    if (!state.ownedCars[car.id] || state.soldCars[car.id]) continue;
    const tagFactor = 1 + 0.1 * Math.max(0, knownTags(state, car).length - 1);
    autoActiveAdd += car.boost.activePct * tagFactor;
    autoPassiveAdd += car.boost.passivePerSec * tagFactor;
  }
  active += active * (autoActiveAdd / 100);
  passiveRate += autoPassiveAdd;
  const colMult = 1 + (config.settings.collectionBoostPerSalePct / 100) * totalCollectionSales(state);
  // дополнительные бонусы коллекций
  for (const col of config.collections) {
    const sold = state.collectionsSold[col.id] || 0;
    if (!sold || !col.bonus) continue;
    const b = col.bonus;
    if (b.activePct) active *= 1 + b.activePct/100 * sold;
    if (b.passivePct) passiveRate *= 1 + b.passivePct/100 * sold;
    if (b.tickPct) tickMult *= 1 + b.tickPct/100 * sold;
    if (b.carCostPct) carCostMult *= 1 + b.carCostPct/100 * sold;
  }
  active *= colMult;
  passiveRate *= colMult;
  return { active, passiveRate, autoActiveAdd, autoPassiveAdd, colMult, tickMult, carCostMult };
}
export const clickValue = state => totals(state).active;
export const passivePerSec = state => totals(state).passiveRate;
export const generatorCost = (g, lvl) => g.baseCost * Math.pow(g.growth, lvl);
