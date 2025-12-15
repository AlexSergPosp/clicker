import { config } from "./config.js";
import { fmt } from "./utils.js";

export function showCollectionConfirm(col, onConfirm, onCancel) {
  const modal = document.getElementById("collection-modal");
  const dlg = document.getElementById("collection-dialog");
  if (!modal || !dlg) return;
  const bonus = (() => {
    if (!col.bonus) return `+${fmt(config.settings.collectionBoostPerSalePct,1)}% ко всем доходам (стек)`;
    const parts = [];
    if (col.bonus.activePct) parts.push(`Клик +${fmt(col.bonus.activePct,1)}%`);
    if (col.bonus.passivePct) parts.push(`Пассив +${fmt(col.bonus.passivePct,1)}%`);
    if (col.bonus.tickPct) parts.push(`Тик ${fmt(col.bonus.tickPct,1)}%`);
    if (col.bonus.carCostPct) parts.push(`Авто ${fmt(col.bonus.carCostPct,1)}%`);
    return parts.join(", ");
  })();
  dlg.innerHTML = `
    <h2>Продать коллекцию?</h2>
    <div class="small">Вы получите постоянный бонус и начнёте заново.</div>
    <div class="card" style="margin:12px 0;">
      <div class="stack">
        <div>${col.name}</div>
        <div class="small">Бонус: ${bonus}</div>
      </div>
    </div>
    <div class="row" style="justify-content:flex-end; gap:8px;">
      <button class="primary danger" id="col-cancel">Отмена</button>
      <button class="primary" id="col-confirm">Продать</button>
    </div>
  `;
  modal.classList.remove("section-hidden");
  dlg.querySelector("#col-cancel").onclick = () => { modal.classList.add("section-hidden"); onCancel && onCancel(); };
  dlg.querySelector("#col-confirm").onclick = () => { modal.classList.add("section-hidden"); onConfirm && onConfirm(); };
}
