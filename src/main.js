import { config } from "./config.js";
import { clickValue, generatorCost, intervalFor, makeRng, milestoneMul, passivePerSec, totals } from "./utils.js";
import { defaultState, loadState, saveState } from "./state.js";
import { renderChoices, renderCollections, renderConfigView, renderUpgrades, updateClickerUI, updateCurrencies, hideModals, showRewardInline, updateGenBars, renderCarGallery } from "./render.js";
import { spawnClickFx, spawnGenFx, spawnUpgradeFx } from "./fx.js";
import { initChart, registerTap, tickChart } from "./chart.js";
import { showCollectionConfirm } from "./collectionModal.js";

let state;
let rng;
let lastUpgradeRender = 0;
let lastBuildRenderKey = null;
let lastBuildRenderAt = 0;
const buildDurationMs = 10_000;
const autoCooldownMs = 12 * 60 * 60 * 1000;

function syncLocks() {
  // используем флаг locked из конфига как единственный источник истины
  config.cars.forEach(c => {
    c.locked = !!c.locked;
  });
}

function hardReset() {
  state.ownedCars = {};
  state.soldCars = {};
  config.generators.forEach(g => { state.generators[g.id] = 0; state.genTimers[g.id] = 0; });
  state.genUnlocked = Object.fromEntries(config.generators.map(g => [g.id, false]));
  state.soft = 0;
  state.carCost = config.settings.carBaseCost;
  state.buildUntil = 0;
  state.buildCarId = null;
  state.buildSource = null;
  state.buildDoneCarId = null;
  state.buildAddTag = null;
  state.autoCooldownUntil = 0;
  ensurePreviewCar();
  saveState(state);
  renderUpgrades(state, null, onUpgrade);
  renderCollections(state, rerenderHandlers);
  renderCarGallery(state);
  renderConfigView(config);
  updateCurrencies(state);
  updateClickerUI(state);
}

function pickTwo(pool) {
  const weightSum = pool.reduce((s, c) => s + config.rarities[c.rarity].dropChance, 0);
  const pick = () => {
    let roll = rng.next() * weightSum;
    for (const c of pool) { roll -= config.rarities[c.rarity].dropChance; if (roll <= 0) return c; }
    return pool[0];
  };
  const a = pick(); let b = pick();
  if (b.id === a.id && pool.length > 1) b = pool.find(x => x.id !== a.id) || b;
  return [a, b];
}

function ensurePreviewCar() {
  if (state.previewCarId) return;
  const pool = config.cars.filter(c => !c.locked && (!state.ownedCars[c.id] || state.soldCars[c.id]));
  const pick = pool.length ? pool[Math.floor(rng.next() * pool.length)] : config.cars[Math.floor(rng.next() * config.cars.length)];
  state.previewCarId = pick.id;
}

function grantCarById(id, forcedTag=null) {
  const car = config.cars.find(c => c.id === id);
  if (!car) return;
  state.ownedCars[car.id] = true;
  state.soldCars[car.id] = false;
  const existing = state.knownCars[car.id] || [];
  const remaining = car.tags.filter(t => !existing.includes(t));
  const addTag = forcedTag ?? (remaining.length ? remaining[Math.floor(rng.next() * remaining.length)] : null);
  state.knownCars[car.id] = addTag ? [...existing, addTag] : existing;
  state.previewCarId = null;
  ensurePreviewCar();
  saveState(state);
  renderCollections(state, rerenderHandlers);
  updateClickerUI(state);
}

function startBuild(car, source) {
  state.buildCarId = car.id;
  state.buildSource = source; // 'auto' | 'manual'
  state.buildUntil = Date.now() + buildDurationMs;
  state.buildDoneCarId = null;
  state.buildAddTag = null;
  saveState(state);
}

function completeBuildIfReady() {
  if (state.buildUntil > 0 && Date.now() >= state.buildUntil && state.buildCarId) {
    const carId = state.buildCarId;
    state.buildUntil = 0;
    state.buildDoneCarId = carId;
    const car = config.cars.find(c => c.id === carId);
    if (car) {
      const existing = state.knownCars[car.id] || [];
      const remainingTags = car.tags.filter(t => !existing.includes(t));
      state.buildAddTag = remainingTags.length ? remainingTags[Math.floor(rng.next() * remainingTags.length)] : null;
    } else {
      state.buildAddTag = null;
    }
    if (state.buildSource === "auto") {
      state.autoCooldownUntil = Date.now() + autoCooldownMs;
    }
    state.buildCarId = null;
    state.buildSource = null;
    saveState(state);
  }
}

function finishBuildModal() {
  if (state.buildDoneCarId) {
    grantCarById(state.buildDoneCarId, state.buildAddTag);
    state.buildDoneCarId = null;
    state.buildAddTag = null;
    saveState(state);
  }
  state.buildUntil = 0;
  state.buildCarId = null;
  state.buildSource = null;
  lastBuildRenderKey = null;
  const modal = document.getElementById("build-modal");
  if (modal) {
    modal.classList.add("section-hidden");
    modal.style.pointerEvents = "";
  }
}

function sellCollection(col) {
  const isAll = col.tags === "ALL";
  const carsToSell = isAll
    ? config.cars.map(c => c.id)
    : config.cars.filter(c => c.tags.some(t => col.tags.includes(t))).map(c => c.id);
  carsToSell.forEach(id => { if (state.ownedCars[id]) state.soldCars[id] = true; });
  const soldTimes = state.collectionsSold[col.id] || 0;
  state.collectionsSold[col.id] = soldTimes + 1;
  hardReset();
}

function onUpgrade(ev, g, lv, cost) {
  if (state.soft + 1e-9 < cost) return;
  state.soft -= cost;
  if (!state.genUnlocked[g.id]) {
    state.genUnlocked[g.id] = true;
    state.generators[g.id] = 1;
  } else {
    state.generators[g.id] = lv + 1;
  }
  saveState(state);
  renderUpgrades(state, null, onUpgrade);
  updateCurrencies(state);
  updateClickerUI(state);
  spawnUpgradeFx(ev.currentTarget);
}

const rerenderHandlers = {
  onSell: (col) => {
    showCollectionConfirm(col, () => sellCollection(col));
  }
};

function tryAutoReward() {
  if (state.buildUntil > 0 || state.buildDoneCarId) return;
  if (Date.now() < state.autoCooldownUntil) return;
  if (state.soft >= config.settings.goalSoft) {
    state.soft -= config.settings.goalSoft;
    ensurePreviewCar();
    const car = config.cars.find(c => c.id === state.previewCarId) || config.cars[0];
    startBuild(car, "auto");
  }
}

function bindEvents() {
  document.getElementById("click-btn").onclick = e => {
    const gain = clickValue(state);
    state.soft += gain;
    registerTap();
    spawnClickFx(e, gain);
    updateCurrencies(state);
    renderUpgrades(state, null, onUpgrade);
    updateClickerUI(state);
  };
  const buyBtn = document.getElementById("buy-btn");
  buyBtn.onclick = () => {
    if (state.buildUntil > 0 || state.buildDoneCarId) return;
    const costMult = totals(state).carCostMult || 1;
    const effectiveCost = Math.round(state.carCost * costMult);
    if (state.soft < effectiveCost) return;
    state.soft -= effectiveCost;
    state.carCost = Math.round(state.carCost * config.settings.carCostFactor);
    const choices = pickTwo(config.cars.filter(c => !c.locked));
    state.onSelectCar = (car) => startBuild(car, "manual");
    renderChoices(state, choices);
    saveState(state);
    updateClickerUI(state);
    updateCurrencies(state);
  };
  document.querySelectorAll("nav button").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll("nav button").forEach(b => b.classList.toggle("active", b === btn));
      document.querySelectorAll("main > section").forEach(sec => sec.classList.toggle("section-hidden", sec.id !== `tab-${btn.dataset.tab}`));
      renderCarGallery(state);
    };
  });
  const cheatToggle = document.getElementById("cheat-toggle");
  const cheatPanel = document.getElementById("cheat-panel");
  const setCheats = (on) => {
    cheatPanel.classList.toggle("hidden", !on);
  };
  if (cheatToggle && cheatPanel) {
    setCheats(false);
    cheatToggle.onchange = () => setCheats(cheatToggle.checked);
  }
  const cheatSoft = document.getElementById("cheat-soft");
  const cheatCar = document.getElementById("cheat-car");
  const cheatAuto = document.getElementById("cheat-auto");
  const cheatReset = document.getElementById("cheat-reset");
  if (cheatSoft) cheatSoft.onclick = () => { state.soft += 1_000_000; saveState(state); updateCurrencies(state); renderUpgrades(state, null, onUpgrade); updateClickerUI(state); };
  if (cheatCar) cheatCar.onclick = () => {
    const pool = config.cars.filter(c => !c.locked);
    const car = pool[Math.floor(Math.random() * pool.length)];
    grantCarById(car.id);
  };
  if (cheatAuto) cheatAuto.onclick = () => { state.autoCooldownUntil = 0; ensurePreviewCar(); saveState(state); updateClickerUI(state); };
  if (cheatReset) cheatReset.onclick = () => {
    state = defaultState();
    saveState(state);
    hideModals();
    renderUpgrades(state, null, onUpgrade);
    renderCollections(state, rerenderHandlers);
    renderCarGallery(state);
    renderConfigView(config);
    updateCurrencies(state);
    updateClickerUI(state);
  };
}

function renderBuildModal() {
  const modal = document.getElementById("build-modal");
  const dlg = document.getElementById("build-dialog");
  if (!modal || !dlg) return;
  if (state.buildUntil <= 0 && !state.buildDoneCarId) { modal.classList.add("section-hidden"); lastBuildRenderKey = null; lastBuildRenderAt = 0; return; }
  const carId = state.buildDoneCarId || state.buildCarId;
  const car = config.cars.find(c => c.id === carId);
  if (!car) { modal.classList.add("section-hidden"); return; }
  const now = Date.now();
  const remaining = state.buildUntil > 0 ? Math.max(0, state.buildUntil - now) : 0;
  const pct = state.buildUntil > 0 ? Math.min(100, (1 - remaining / buildDurationMs) * 100) : 100;
  const knownTags = state.knownCars[car.id] || [];
  const done = state.buildUntil <= 0;
  const addTag = done ? state.buildAddTag : null;
  const remSec = Math.ceil(remaining / 1000);
  const key = `${car.id}-${done}-${addTag || ""}-${remSec}`;
  if (state.buildUntil > 0 && now - lastBuildRenderAt < 950) { modal.classList.remove("section-hidden"); return; }
  if (key === lastBuildRenderKey) { modal.classList.remove("section-hidden"); return; }
  lastBuildRenderKey = key;
  lastBuildRenderAt = now;
  dlg.innerHTML = `
    <h2>Сборка авто</h2>
    ${showRewardInline(state, car, addTag)}
    <div class="progress" style="height:16px; margin:8px 0;"><div class="bar" style="width:${pct}%;"></div></div>
    <div class="small">${done ? "Готово" : `Осталось: ${Math.ceil(remaining/1000)} c`}</div>
    <div class="row" style="justify-content:flex-end; gap:8px; margin-top:12px;">
      ${done ? '<button class="primary" id="build-ok" style="padding:14px 18px; font-size:16px;">Забрать</button>' : ''}
    </div>
  `;
  modal.classList.remove("section-hidden");
  modal.style.pointerEvents = "auto";
  const ok = dlg.querySelector("#build-ok");
  if (ok) {
    ok.onclick = () => finishBuildModal();
  }
}

function gameTick() {
  const t = Date.now();
  const dt = (t - (state.lastTick || t)) / 1000;
  state.lastTick = t;
  for (const g of config.generators) {
    const lvl = state.generators[g.id] || 0; if (lvl <= 0) continue;
    const interval = intervalFor(g, lvl); if (!isFinite(interval) || interval <= 0) continue;
    state.genTimers[g.id] = (state.genTimers[g.id] || 0) + dt;
    let payout = 0;
    while (state.genTimers[g.id] >= interval) {
      state.genTimers[g.id] -= interval;
      payout += g.passive * lvl * milestoneMul(lvl);
    }
    if (payout > 0) { state.soft += payout; spawnGenFx(g.id, `+${payout.toFixed(1)}`); }
  }
  completeBuildIfReady();
  tryAutoReward();
  tickChart(state);
  updateGenBars(state);
  updateCurrencies(state);
  updateClickerUI(state);
  renderBuildModal();
  if (t - lastUpgradeRender > 1000) { renderUpgrades(state, null, onUpgrade); lastUpgradeRender = t; }
  requestAnimationFrame(gameTick);
}

function init() {
  state = loadState();
  if (state.carCost == null) state.carCost = config.settings.carBaseCost;
  if (state.autoCooldownUntil == null) state.autoCooldownUntil = 0;
  if (state.buildUntil == null) state.buildUntil = 0;
  if (state.buildCarId == null) state.buildCarId = null;
  if (state.buildDoneCarId == null) state.buildDoneCarId = null;
  if (state.buildAddTag == null) state.buildAddTag = null;
  if (state.buildSource == null) state.buildSource = null;
  if (state.previewCarId == null) state.previewCarId = null;
  if (!state.genUnlocked) state.genUnlocked = Object.fromEntries(config.generators.map(g => [g.id, false]));
  rng = makeRng(config.settings.rngSeed);
  syncLocks();
  ensurePreviewCar();
  hideModals();
  initChart(document.getElementById("income-chart"), document.getElementById("income-stats"));
  bindEvents();
  renderUpgrades(state, null, onUpgrade);
  renderCollections(state, rerenderHandlers);
  renderCarGallery(state);
  renderConfigView(config);
  updateCurrencies(state);
  updateClickerUI(state);
  requestAnimationFrame(gameTick);
}

init();
