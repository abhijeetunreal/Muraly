// ================= GESTURES =================
import { state } from './state.js';
import { dom } from './dom.js';

// Helper functions
function dist(t) {
  return Math.hypot(t[1].clientX - t[0].clientX, t[1].clientY - t[0].clientY);
}

function ang(t) {
  return Math.atan2(t[1].clientY - t[0].clientY, t[1].clientX - t[0].clientX);
}

function center(t) {
  let x = 0, y = 0;
  t.forEach(p => { x += p.clientX; y += p.clientY });
  return { x: x / t.length, y: y / t.length };
}

export function initGestures() {
  // Touch gestures
  dom.overlayCanvas.addEventListener("touchstart", e => {
    // Prevent gesture handling if we just had a double-tap or UI was recently hidden
    const now = Date.now();
    if (state.locked || state.isDoubleTap || now < state.preventGestureUntil || (now - state.uiHiddenTime < 300)) {
      state.g = null;
      return;
    }
    
    const t = [...e.touches];
    state.g = {
      startPos: { ...state.pos },
      startScale: state.scale,
      startRot: state.rot,
      c0: center(t),
      d0: t.length > 1 ? dist(t) : 0,
      a0: t.length > 1 ? ang(t) : 0
    };
  });

  dom.overlayCanvas.addEventListener("touchmove", e => {
    // Prevent gesture handling if we just had a double-tap or UI was recently hidden
    const now = Date.now();
    if (state.locked || !state.g || state.isDoubleTap || now < state.preventGestureUntil || (now - state.uiHiddenTime < 300)) {
      if (state.isDoubleTap || now < state.preventGestureUntil) {
        e.preventDefault();
        e.stopPropagation();
      }
      return;
    }
    e.preventDefault();
    const t = [...e.touches];
    const c = center(t);
    state.pos.x = state.g.startPos.x + (c.x - state.g.c0.x);
    state.pos.y = state.g.startPos.y + (c.y - state.g.c0.y);
    if (t.length > 1) {
      state.scale = state.g.startScale * (dist(t) / state.g.d0);
      state.rot = state.g.startRot + (ang(t) - state.g.a0);
    }
  }, { passive: false });

  // Mouse gestures
  dom.overlayCanvas.addEventListener("mousedown", e => {
    if (state.locked) return;
    state.isMouseDown = true;
    const startX = e.clientX;
    const startY = e.clientY;
    state.mouseG = {
      startPos: { ...state.pos },
      startScale: state.scale,
      startRot: state.rot,
      startX: startX,
      startY: startY,
      isRotating: e.shiftKey || e.button === 2, // Shift key or right mouse button for rotation
      lastAngle: 0
    };
    e.preventDefault();
  });

  dom.overlayCanvas.addEventListener("mousemove", e => {
    if (state.locked || !state.mouseG || !state.isMouseDown) return;
    e.preventDefault();
    
    const dx = e.clientX - state.mouseG.startX;
    const dy = e.clientY - state.mouseG.startY;
    
    if (state.mouseG.isRotating) {
      // Rotation: calculate angle from center
      const centerX = state.mouseG.startPos.x;
      const centerY = state.mouseG.startPos.y;
      const angle1 = Math.atan2(state.mouseG.startY - centerY, state.mouseG.startX - centerX);
      const angle2 = Math.atan2(e.clientY - centerY, e.clientX - centerX);
      const deltaAngle = angle2 - angle1;
      state.rot = state.mouseG.startRot + deltaAngle;
    } else {
      // Translation: move the image
      state.pos.x = state.mouseG.startPos.x + dx;
      state.pos.y = state.mouseG.startPos.y + dy;
    }
  });

  dom.overlayCanvas.addEventListener("mouseup", e => {
    state.isMouseDown = false;
    state.mouseG = null;
  });

  dom.overlayCanvas.addEventListener("mouseleave", () => {
    state.isMouseDown = false;
    state.mouseG = null;
  });

  // Mouse wheel for scaling
  dom.overlayCanvas.addEventListener("wheel", e => {
    if (state.locked) return;
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1; // Zoom out or zoom in
    const newScale = state.scale * delta;
    
    // Limit scale range
    if (newScale >= 0.1 && newScale <= 10) {
      // Scale from mouse position
      const rect = dom.overlayCanvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // Calculate scale relative to mouse position
      const scaleChange = newScale / state.scale;
      state.pos.x = mouseX - (mouseX - state.pos.x) * scaleChange;
      state.pos.y = mouseY - (mouseY - state.pos.y) * scaleChange;
      
      state.scale = newScale;
    }
  }, { passive: false });

  // Prevent context menu on right click (for rotation)
  dom.overlayCanvas.addEventListener("contextmenu", e => {
    e.preventDefault();
  });
}

