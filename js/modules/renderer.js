// ================= RENDER =================
import { state } from './state.js';
import { dom } from './dom.js';

function drawGrid() {
  dom.gtx.clearRect(0, 0, dom.gridCanvas.width, dom.gridCanvas.height);
  if (!state.showGrid) return;
  dom.gtx.strokeStyle = "rgba(255,255,255,.15)";
  // Responsive grid spacing: smaller on mobile, larger on desktop
  const gridSpacing = Math.max(30, Math.min(60, Math.min(dom.gridCanvas.width, dom.gridCanvas.height) / 15));
  for (let i = 0; i < dom.gridCanvas.width; i += gridSpacing) {
    dom.gtx.beginPath(); 
    dom.gtx.moveTo(i, 0); 
    dom.gtx.lineTo(i, dom.gridCanvas.height); 
    dom.gtx.stroke();
  }
  for (let i = 0; i < dom.gridCanvas.height; i += gridSpacing) {
    dom.gtx.beginPath(); 
    dom.gtx.moveTo(0, i); 
    dom.gtx.lineTo(dom.gridCanvas.width, i); 
    dom.gtx.stroke();
  }
}

function render() {
  if (!state.renderActive) return;
  dom.ctx.clearRect(0, 0, dom.overlayCanvas.width, dom.overlayCanvas.height);
  const src = state.mode === "sketch" ? state.sketchImg : state.img;
  if (src && src.complete && src.naturalWidth > 0) {
    dom.ctx.save();
    dom.ctx.translate(state.pos.x, state.pos.y);
    dom.ctx.rotate(state.rot);
    dom.ctx.globalAlpha = state.opacityVal;
    dom.ctx.drawImage(
      src,
      -src.width * state.scale / 2,
      -src.height * state.scale / 2,
      src.width * state.scale,
      src.height * state.scale
    );
    dom.ctx.restore();
  }
  drawGrid();
  requestAnimationFrame(render);
}

export function startRenderer() {
  render();
}

