// Idle Auto Clicker – chart (smoothing + windowed view)
import { fmt, passivePerSec, clickValue, totals } from "./utils.js";

let samples = [];
let tapHistory = [];
let lastChartUpdate = 0;
let canvas;
let statsEl;

export function initChart(canvasEl, stats) {
  canvas = canvasEl;
  statsEl = stats;
}

export function registerTap() {
  tapHistory.push(Date.now());
}

export function tapsPerSec() {
  const now = Date.now();
  tapHistory = tapHistory.filter(t => now - t <= 1000);
  return tapHistory.length;
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function tickChart(state) {
  const t = Date.now();
  if (!canvas) return;
  if (t - lastChartUpdate < 50) return;
  const sampleVal = passivePerSec(state) + tapsPerSec() * clickValue(state);
  samples.push({ t, v: sampleVal });
  if (samples.length > 200) samples = samples.slice(samples.length - 200); // ~10s window at 20 fps
  lastChartUpdate = t;
  updateIncomeChart();
  updateIncomeStats(state);
}

export function updateIncomeStats(state) {
  if (!statsEl) return;
  const now = Date.now();
  tapHistory = tapHistory.filter(t => now - t <= 1000);
  // показываем только информацию о тапах, чтобы не дублировать блок с доходами
  statsEl.textContent = `Тапы: ${tapHistory.length}/с`;
}

export function updateIncomeChart() {
  if (!canvas || samples.length < 2) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const smoothed = [];
  const alpha = 0.15; // сильнее сглаживание
  samples.forEach((s, i) => {
    if (i === 0) smoothed.push(s.v);
    else smoothed.push(smoothed[i - 1] * (1 - alpha) + s.v * alpha);
  });
  const maxVal = Math.max(...smoothed);
  const minVal = 0;
  const pad = Math.max(1, maxVal * 0.1);
  const windowMs = 10_000;
  const tMax = samples[samples.length - 1].t;
  const tMin = tMax - windowMs;
  const range = Math.max(1, maxVal - minVal + pad);
  const span = w * 0.85;
  const leftPad = w * 0.075;
  const duration = windowMs;

  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  samples.forEach((s, i) => {
    const x = leftPad + ((s.t - tMin) / duration) * span;
    const y = h - ((smoothed[i] - minVal) / range) * h;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();

  const peakIdx = smoothed.reduce((best, v, i) => v > smoothed[best] ? i : best, 0);
  const peakVal = smoothed[peakIdx];
  const peakT = samples[peakIdx].t;
  const px = leftPad + ((peakT - tMin) / duration) * span;
  const py = h - ((peakVal - minVal) / range) * h;
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "14px Arial";
  ctx.fillText(`${fmt(peakVal, 0)}/с`, px + 6, Math.max(12, py - 6));

  const lastIdx = smoothed.length - 1;
  const lastVal = smoothed[lastIdx];
  const lx = leftPad + ((samples[lastIdx].t - tMin) / duration) * span;
  const ly = h - ((lastVal - minVal) / range) * h;
  const label = `${fmt(lastVal, 0)}/с`;
  const metrics = ctx.measureText(label);
  const padding = 6;
  const boxW = metrics.width + padding * 2;
  const boxH = 18 + padding;
  ctx.fillStyle = "rgba(96,165,250,0.9)";
  drawRoundedRect(ctx, lx - boxW - 4, ly - boxH / 2 - 2, boxW, boxH, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(12,16,23,0.8)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#0b1220";
  ctx.font = "14px Arial";
  ctx.fillText(label, lx - boxW - 4 + padding, ly + 5);
  ctx.fillStyle = "rgba(96,165,250,1)";
  ctx.beginPath(); ctx.arc(lx - 6, ly, 4, 0, Math.PI * 2); ctx.fill();
}
