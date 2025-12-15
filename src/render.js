import { config } from "./config.js";
import { clamp, fmt, generatorCost, intervalFor, knownTags, milestoneMul, totals } from "./utils.js";
import { saveState } from "./state.js";
import { spawnUpgradeFx } from "./fx.js";

export function rarityBadge(r) { return `<span class="badge ${r}">${r}</span>`; }
export function renderTagsKnown(state, car) {
  const known = knownTags(state, car);
  const hidden = Math.max(0, car.tags.length - known.length);
  return [
    ...known.map(t => `<span class="tag ${car.rarity}">${t}</span>`),
    ...Array(hidden).fill('<span class="tag hidden">???</span>')
  ].join(" ");
}
export function renderTagsHidden(car) { return car.tags.map(() => '<span class="tag hidden">???</span>').join(" "); }

export function renderChoices(state, options) {
  const modal = document.getElementById("choice-modal");
  const grid = document.getElementById("choice-grid-modal"); grid.innerHTML = "";
  options.forEach(car => {
    const div = document.createElement("div"); div.className = "card";
    div.innerHTML = `<div class="car-art big">${car.file ? `<img src="Cars/${car.file}">` : config.settings.emojiFallback}</div>
      <div class="stack" style="flex:1;">
        <div class="row" style="display:flex;justify-content:space-between;align-items:center;">
          <span>${car.name}</span>
        </div>
        <div>${renderTagsKnown(state, car)}</div>
        <div class="small">Буст: +${car.boost.activePct}% / +${car.boost.passivePerSec}/с</div>
      </div>`;
    div.style.cursor = "pointer";
    div.onclick = () => { modal.classList.add("section-hidden"); state.onSelectCar(car); };
    grid.appendChild(div);
  });
  modal.classList.remove("section-hidden");
}

export function hideModals() {
  ["choice-modal","reward-modal","cooldown-modal","collection-modal","build-modal"].forEach(id => {
    const m = document.getElementById(id); if (m) m.classList.add("section-hidden");
  });
}

export function showRewardInline(state, car, addTag) {
  // used inside build modal, no separate modal
  const bonus = `Буст: +${car.boost.activePct}% / +${car.boost.passivePerSec}/с`;
  const tags = renderTagsKnown(state, car);
  return `
    <div class="card" style="margin-bottom:12px;">
      <div class="car-art big">${car.file ? `<img src="Cars/${car.file}">` : config.settings.emojiFallback}</div>
      <div class="stack" style="flex:1;">
        <div class="row" style="display:flex;justify-content:space-between;align-items:center;">
          <span>${car.name}</span>
        </div>
        <div>${tags}</div>
        <div class="small">${bonus}</div>
        ${addTag ? `<div class="small" style="color:var(--accent);">Открыт тег: ${addTag}</div>` : ""}
      </div>
    </div>`;
}

export function updateCooldownModal(state) {
  const modal = document.getElementById("cooldown-modal"); if (!modal) return;
  modal.classList.add("section-hidden");
}

export function renderUpgrades(state, ui, onUpgrade) {
  const wrap = document.getElementById("upgrades"); wrap.innerHTML = "";
  config.generators.forEach(g => {
    const unlocked = state.genUnlocked[g.id];
    const lv = state.generators[g.id] || 0;
    const baseCost = generatorCost(g, unlocked ? lv : 0);
    const cost = unlocked ? baseCost : baseCost; // open cost same as first level
    const curActive = unlocked ? g.active * lv * milestoneMul(lv) : 0;
    const curPassive = unlocked ? g.passive * lv * milestoneMul(lv) : 0;
    const curInterval = unlocked ? intervalFor(g, lv) * (totals(state).tickMult || 1) : 0;
    const nextActive = g.active * (lv + 1) * milestoneMul(lv + 1);
    const nextPassive = g.passive * (lv + 1) * milestoneMul(lv + 1);
    const nextInterval = intervalFor(g, lv + 1) * (totals(state).tickMult || 1);
    const progPct = genProgressPct(state, g.id);
    const milestonePct = (lv % config.settings.milestone) / config.settings.milestone * 100;
    const card = document.createElement("div");
    card.className = "card";
    card.setAttribute("data-gen-card", g.id);
    card.innerHTML = `<div class="stack" style="flex:1; gap:8px;">
      <div class="row" style="display:flex;justify-content:space-between;align-items:center; gap:8px;">
        <span>${g.icon || ""} ${g.name}</span>
        <div style="display:flex; align-items:center; gap:6px;">
          <div class="radial" style="--p:${unlocked ? milestonePct : 0};">${unlocked ? lv : "?"}</div>
        </div>
      </div>
      ${unlocked ? `
        <div class="small">
          🖱️ ${fmt(curActive,1)} ${nextActive>curActive?`<span style="color:var(--accent);">+${fmt(nextActive-curActive,1)}</span>`:''}<br>
          💤 ${fmt(curPassive,1)} ${nextPassive>curPassive?`<span style="color:var(--accent);">+${fmt(nextPassive-curPassive,1)}</span>`:''}<br>
          ⏱️ ${curInterval===Infinity?'-':fmt(curInterval,2)}с ${nextInterval!==curInterval?`<span style="color:var(--accent);">→ ${nextInterval===Infinity?'-':fmt(nextInterval,2)}с</span>`:''}
        </div>
      ` : `<div class="small">Статы скрыты до открытия</div>`}
      <div class="gen-progress"><div class="bar" data-gen="${g.id}" style="width:${progPct}%"></div></div>
    </div>`;
    const btn = document.createElement("button");
    btn.className = "primary";
    btn.textContent = unlocked ? `Апгрейд (${fmt(cost, 0)})` : `Открыть (${fmt(cost,0)})`;
    btn.disabled = state.soft + 1e-9 < cost;
    btn.onclick = ev => onUpgrade(ev, g, lv, cost);
    card.appendChild(btn);
    wrap.appendChild(card);
  });
}

function genProgressPct(state, id) {
  const g = config.generators.find(x => x.id === id);
  const lvl = state.generators[id] || 0;
  const int = intervalFor(g, lvl);
  if (!isFinite(int) || int <= 0) return 0;
  return clamp((state.genTimers[id] || 0) / int * 100, 0, 100);
}

function matchCollection(tags, state) {
  const available = config.cars
    .filter(c => state.ownedCars[c.id] && !state.soldCars[c.id])
    .map(c => ({ id: c.id, tags: knownTags(state, c) }));
  const anyKnown = available.some(c => c.tags.length);
  const slots = Array(tags.length).fill(null);
  const used = new Set();
  // жадно заполняем подходящими машинами, чтобы показать прогресс
  tags.forEach((tag, idx) => {
    const car = available.find(c => !used.has(c.id) && c.tags.includes(tag));
    if (car) {
      slots[idx] = car.id;
      used.add(car.id);
    }
  });
  const complete = slots.every(Boolean);
  return { complete, slots, anyKnown };
}

export function renderCollections(state, rerender) {
  const wrap = document.getElementById("collections"); wrap.innerHTML = "";
  config.collections.forEach(col => {
    const isAll = col.tags === "ALL";
    const match = isAll ? { complete: config.cars.every(c => state.ownedCars[c.id] && !state.soldCars[c.id]), slots: [] } : matchCollection(col.tags, state);
    const hasAll = match.complete;
    const revealed = state.collectionsRevealed[col.id];
    const unknown = !revealed && !isAll && !match.anyKnown;
    const soldCount = state.collectionsSold[col.id] || 0;
    const slots = isAll
      ? '<div class="small">Нужно все авто</div>'
      : '<div class="slot-wrap">' + col.tags.map((tag, idx) => {
          const carId = match.slots[idx];
          const car = carId ? config.cars.find(c => c.id === carId) : null;
          if (car) return `<div class="slot filled"><div class="car-art mini">${car.file ? `<img src="Cars/${car.file}">` : config.settings.emojiFallback}</div><div class="small">${car.name}</div></div>`;
          return `<div class="slot empty"><span class="tag">${tag}</span><div class="small">Нет авто с открытым тегом</div></div>`;
        }).join('') + '</div>';
    const bonusText = (() => {
      if (!col.bonus) return `Бонус при продаже: +${fmt(config.settings.collectionBoostPerSalePct,1)}% ко всем доходам (стек)`;
      const parts = [];
      if (col.bonus.activePct) parts.push(`<span class="badge">Клик +${fmt(col.bonus.activePct,1)}%</span>`);
      if (col.bonus.passivePct) parts.push(`<span class="badge">Пассив +${fmt(col.bonus.passivePct,1)}%</span>`);
      if (col.bonus.tickPct) parts.push(`<span class="badge">Тик ${fmt(col.bonus.tickPct,1)}%</span>`);
      if (col.bonus.carCostPct) parts.push(`<span class="badge">Авто ${fmt(col.bonus.carCostPct,1)}%</span>`);
      return `Бонус при продаже: ${parts.join(' ')}`;
    })();
    const div = document.createElement("div"); div.className = "card";
    div.innerHTML = `<div class="stack" style="flex:1;">
      <div class="row" style="display:flex;justify-content:space-between;align-items:center;">
        <span>${unknown ? "Неизвестная коллекция" : col.name} ${hasAll ? "✓" : ""}</span>
        <span class="small">Продано: ${soldCount}</span>
      </div>
      <div class="small">${unknown ? "Откройте теги, чтобы увидеть" : (isAll ? "Все авто" : col.tags.map(t => `<span class="tag">${t}</span>`).join(" "))}</div>
      <div class="small">Статус: ${hasAll ? "Готова к продаже" : "Соберите теги"}</div>
      <div class="small">${bonusText}</div>
      ${slots}
    </div>`;
    const btn = document.createElement("button"); btn.className = "primary";
    btn.textContent = hasAll ? "Продать коллекцию" : "Собираем...";
    btn.disabled = !hasAll;
    btn.onclick = () => {
      rerender.onSell(col);
    };
    div.appendChild(btn);
    if (!unknown) state.collectionsRevealed[col.id] = true;
    wrap.appendChild(div);
  });
  saveState(state);
}

export function renderCarGallery(state) {
  const wrap = document.getElementById("car-gallery"); if (!wrap) return;
  wrap.innerHTML = "";
  config.cars.forEach(car => {
    const unlocked = state.ownedCars[car.id] && !state.soldCars[car.id];
    const div = document.createElement("div"); div.className = "card" + (unlocked ? "" : " locked");
    div.innerHTML = `<div class="car-art big">${car.file ? `<img src="Cars/${car.file}">` : config.settings.emojiFallback}</div>
      <div class="stack" style="flex:1;">
        <div class="row" style="display:flex;justify-content:space-between;align-items:center;">
          <span>${car.name}</span>
        </div>
        <div>${renderTagsKnown(state, car)}</div>
        <div class="small">Буст: +${car.boost.activePct}% / +${car.boost.passivePerSec}/с</div>
      </div>`;
    wrap.appendChild(div);
  });
}

export function renderConfigView(cfg) {
  document.getElementById("config-view").textContent = JSON.stringify(cfg, null, 2);
}

export function updateCurrencies(state) {
  document.getElementById("soft").textContent = fmt(state.soft);
}

export function updateClickerUI(state) {
  const progText = document.getElementById("session-progress-text");
  const progBar = document.getElementById("session-bar");
  const buyBtn = document.getElementById("buy-btn");
  const progIcon = document.getElementById("progress-car-icon");
  const combinedInfo = document.getElementById("combined-info");
  const buyCostLabel = document.getElementById("buy-cost-label");

  const t = totals(state);
  const pct = clamp(state.soft / config.settings.goalSoft * 100, 0, 100);
  progText.textContent = `${fmt(pct, 2)}%`;
  progBar.style.width = `${pct}%`;
  if (buyBtn) {
    const costMult = totals(state).carCostMult || 1;
    const effectiveCost = Math.round(state.carCost * costMult);
    const ready = state.soft >= effectiveCost && state.buildUntil === 0 && !state.buildDoneCarId;
    buyBtn.disabled = !ready;
    buyBtn.classList.toggle("pulse", ready);
    buyBtn.textContent = `Купить авто (${effectiveCost.toLocaleString("ru-RU")})`;
    if (buyCostLabel) buyCostLabel.textContent = `Цена покупки авто: ${effectiveCost.toLocaleString("ru-RU")}`;
  }
  // иконка / таймер на прогрессе
  if (progIcon) {
    if (state.buildUntil > 0) {
      const left = Math.max(0, state.buildUntil - Date.now());
      const secs = Math.ceil(left / 1000);
      progIcon.innerHTML = `<div class="small" style="text-align:center; font-weight:700;">${secs}s</div>`;
    } else if (state.buildDoneCarId) {
      progIcon.innerHTML = `<div class="small" style="text-align:center; font-weight:700;">Готово</div>`;
    } else if (Date.now() < state.autoCooldownUntil) {
      const left = Math.max(0, state.autoCooldownUntil - Date.now());
      const hrs = Math.floor(left / 3600000);
      const mins = Math.floor((left % 3600000) / 60000);
      progIcon.innerHTML = `<div class="small" style="text-align:center; font-weight:700;">Новое авто<br>через ${hrs}ч ${mins}м</div>`;
    } else {
      const pick = config.cars.find(c => c.id === state.previewCarId) || config.cars[0];
      progIcon.innerHTML = pick.file ? `<img src="Cars/${pick.file}">` : `<span class="fallback">${config.settings.emojiFallback}</span>`;
    }
  }

  const canEarn = true;
  const clickBtn = document.getElementById("click-btn");
  if (clickBtn) clickBtn.disabled = !canEarn;
  if (combinedInfo) {
    const colPct = (t.colMult - 1) * 100;
    combinedInfo.innerHTML = [
      `Клик: +${fmt(t.active,1)}`,
      `Пассив: ${fmt(t.passiveRate,1)}/с`,
      `Буст авто: +${fmt(t.autoActiveAdd,1)}% / +${fmt(t.autoPassiveAdd,1)}/с`,
      `Буст коллекций: +${fmt(colPct,1)}%`
    ].map(txt=>`<span>${txt}</span>`).join(" · ");
  }
}

export function updateGenBars(state) {
  document.querySelectorAll(".gen-progress .bar").forEach(bar => {
    const id = bar.dataset.gen;
    if (!id) return;
    const g = config.generators.find(x => x.id === id);
    if (!g) return;
    const lvl = state.generators[id] || 0;
    const int = intervalFor(g, lvl);
    const pct = (!isFinite(int) || int <= 0) ? 0 : clamp((state.genTimers[id] || 0) / int * 100, 0, 100);
    bar.style.width = `${pct}%`;
  });
}
