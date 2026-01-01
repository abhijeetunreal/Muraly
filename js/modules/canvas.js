// ================= CANVAS =================
import { dom } from './dom.js';

export function resize() {
  dom.overlayCanvas.width = dom.gridCanvas.width = window.innerWidth;
  dom.overlayCanvas.height = dom.gridCanvas.height = window.innerHeight;
}

export function initCanvas() {
  window.addEventListener("resize", resize);
  resize();
}

