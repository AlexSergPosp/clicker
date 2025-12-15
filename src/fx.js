export function spawnFx(layer, x, y, text, color) {
  if (!layer) return;
  const fx = document.createElement("div");
  fx.className = "click-fx";
  fx.textContent = text;
  fx.style.left = `${x - 40}px`;
  fx.style.top = `${y - 40}px`;
  if (color) fx.style.color = color;
  layer.appendChild(fx);
  setTimeout(() => fx.remove(), 800);
}

export function spawnGenFx(genId, text) {
  const layer = document.getElementById("fx-global");
  if (!layer) return;
  const card = document.querySelector(`[data-gen-card="${genId}"]`);
  const r = card ? card.getBoundingClientRect() : layer.getBoundingClientRect();
  spawnFx(layer, r.left + r.width * 0.6, r.top + r.height * 0.3, text, "#fbbf24");
}

export function spawnClickFx(evt, gain) {
  const layer = document.getElementById("click-fx-layer");
  if (!layer) return;
  const rect = layer.getBoundingClientRect();
  const x = (evt.clientX - rect.left) + (Math.random() * 20 - 10);
  const y = (evt.clientY - rect.top);
  spawnFx(layer, x, y, `+${gain.toFixed(1)}`);
}

export function spawnUpgradeFx(btnEl) {
  const layer = document.getElementById("fx-global");
  if (!layer || !btnEl) return;
  const r = btnEl.getBoundingClientRect();
  spawnFx(layer, r.left + r.width / 2, r.top, "UPGRADED", "#c084fc");
}
