// ================= UI CONTROLS =================
import { state } from './state.js';
import { dom } from './dom.js';

export function initUIControls() {
  // Opacity slider
  dom.opacity.oninput = e => state.opacityVal = +e.target.value;
  
  // Mode switching
  dom.sketchBtn.onclick = () => state.mode = "sketch";
  dom.imageBtn.onclick = () => state.mode = "image";
  
  // Lock button
  dom.lockBtn.onclick = () => {
    state.locked = !state.locked;
    dom.lockBtn.textContent = state.locked ? "🔒 Locked" : "🔓 Move";
  };
  
  // Grid toggle
  dom.gridBtn.onclick = () => state.showGrid = !state.showGrid;
  
  // Fullscreen
  dom.fullscreenBtn.onclick = () => {
    // Cross-browser fullscreen API with vendor prefixes
    const doc = document;
    const docEl = doc.documentElement;
    
    const isFullscreen = 
      doc.fullscreenElement || 
      doc.webkitFullscreenElement || 
      doc.mozFullScreenElement || 
      doc.msFullscreenElement;
    
    if (isFullscreen) {
      // Exit fullscreen
      if (doc.exitFullscreen) {
        doc.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        doc.msExitFullscreen();
      }
    } else {
      // Enter fullscreen
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen();
      } else if (docEl.webkitRequestFullscreen) {
        docEl.webkitRequestFullscreen();
      } else if (docEl.mozRequestFullScreen) {
        docEl.mozRequestFullScreen();
      } else if (docEl.msRequestFullscreen) {
        docEl.msRequestFullscreen();
      }
    }
  };
  
  // Double-tap/double-click UI toggle
  dom.overlayCanvas.addEventListener("touchend", (e) => {
    const now = Date.now();
    const touch = e.changedTouches[0];
    const tapX = touch.clientX;
    const tapY = touch.clientY;
    
    // Check if this is a double-tap (within 300ms and 50px distance)
    const timeDiff = now - state.lastTap;
    const distDiff = Math.hypot(tapX - state.lastTapPos.x, tapY - state.lastTapPos.y);
    
    if (timeDiff < 300 && distDiff < 50 && e.touches.length === 0) {
      state.isDoubleTap = true;
      e.preventDefault();
      e.stopPropagation();
      
      // Prevent gesture handling for a short time after double-tap
      state.preventGestureUntil = now + 500;
      
      // Toggle UI visibility
      const wasHidden = dom.panel.classList.contains("hidden");
      dom.panel.classList.toggle("hidden");
      dom.topBar.classList.toggle("hidden");
      
      // If we just hid the UI, record the time to prevent immediate re-showing
      if (!wasHidden) {
        state.uiHiddenTime = now;
      }
      
      // Clear gesture state
      state.g = null;
      
      // Reset double-tap flag after a short delay
      setTimeout(() => {
        state.isDoubleTap = false;
      }, 100);
    } else {
      state.isDoubleTap = false;
    }
    
    state.lastTap = now;
    state.lastTapPos = { x: tapX, y: tapY };
    
    // Reset gesture state when all touches end
    if (e.touches.length === 0) {
      state.g = null;
    }
  }, { passive: false });
  
  // Double-click for desktop/mouse users
  let lastClickTime = 0;
  dom.overlayCanvas.addEventListener("dblclick", (e) => {
    const now = Date.now();
    // Prevent rapid double-clicks
    if (now - lastClickTime < 100) return;
    lastClickTime = now;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Toggle panel and topBar
    const panelHidden = dom.panel.classList.contains("hidden");
    if (panelHidden) {
      dom.panel.classList.remove("hidden");
      dom.topBar.classList.remove("hidden");
    } else {
      dom.panel.classList.add("hidden");
      dom.topBar.classList.add("hidden");
    }
    
    console.log("Panel toggled via double-click:", panelHidden ? "showing" : "hiding");
  });
  
  // Copy to clipboard
  dom.copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(dom.shareLinkInput.value);
      const originalText = dom.copyBtn.textContent;
      dom.copyBtn.textContent = "✓ Copied!";
      dom.copyBtn.classList.add("copied");
      
      setTimeout(() => {
        dom.copyBtn.textContent = originalText;
        dom.copyBtn.classList.remove("copied");
      }, 2000);
    } catch (err) {
      // Fallback for older browsers
      dom.shareLinkInput.select();
      document.execCommand("copy");
      const originalText = dom.copyBtn.textContent;
      dom.copyBtn.textContent = "✓ Copied!";
      dom.copyBtn.classList.add("copied");
      
      setTimeout(() => {
        dom.copyBtn.textContent = originalText;
        dom.copyBtn.classList.remove("copied");
      }, 2000);
    }
  });
}

