// ================= NAVIGATION =================
import { state } from './state.js';
import { dom } from './dom.js';
import { startCamera } from './camera.js';
import { tryLoadFromLocalStorage } from './session.js';
import { join } from './hosting.js';

export function showHostScreen() {
  dom.firstScreen.classList.add("hidden");
  dom.joinScreen.classList.add("hidden");
  dom.backToFirstBtn.classList.add("hidden");
  dom.camera.classList.remove("hidden");
  dom.overlayCanvas.classList.remove("hidden");
  dom.gridCanvas.classList.remove("hidden");
  dom.panel.classList.remove("hidden");
  dom.topBar.classList.remove("hidden");
  startCamera();
  // Try to load saved session from localStorage only when entering host mode
  tryLoadFromLocalStorage();
  // Don't auto-start hosting, let user click Host button
}

export function showJoinScreen() {
  dom.firstScreen.classList.add("hidden");
  dom.joinScreen.classList.remove("hidden");
  dom.backToFirstBtn.classList.remove("hidden");
  dom.joinKeyInput.value = "";
  dom.joinKeyInput.focus();
}

export function doJoin() {
  const idOrLink = dom.joinKeyInput.value.trim();
  if (!idOrLink) {
    dom.joinKeyInput.focus();
    return;
  }
  dom.joinScreen.classList.add("hidden");
  dom.backToFirstBtn.classList.add("hidden");
  // Show host UI while waiting for stream
  dom.camera.classList.remove("hidden");
  dom.overlayCanvas.classList.remove("hidden");
  dom.gridCanvas.classList.remove("hidden");
  dom.panel.classList.remove("hidden");
  dom.topBar.classList.remove("hidden");
  join(idOrLink);
}

export function initNavigation() {
  // Hide all main UI at start
  dom.camera.classList.add("hidden");
  dom.overlayCanvas.classList.add("hidden");
  dom.gridCanvas.classList.add("hidden");
  dom.panel.classList.add("hidden");
  dom.topBar.classList.add("hidden");
  dom.backToFirstBtn.classList.add("hidden");
  
  // Event listeners
  dom.hostSelectBtn.onclick = showHostScreen;
  dom.joinSelectBtn.onclick = showJoinScreen;
  dom.joinKeyBtn.onclick = doJoin;
  dom.joinKeyInput.addEventListener("keydown", e => { 
    if (e.key === "Enter") doJoin(); 
  });
  dom.backToFirstBtn.onclick = () => {
    dom.joinScreen.classList.add("hidden");
    dom.backToFirstBtn.classList.add("hidden");
    dom.firstScreen.classList.remove("hidden");
  };
  
  // Check URL parameters for auto-join
  window.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const joinId = urlParams.get("join");
    
    if (joinId) {
      // Automatically join if join parameter is in URL
      dom.firstScreen.classList.add("hidden");
      dom.joinScreen.classList.add("hidden");
      dom.camera.classList.remove("hidden");
      dom.overlayCanvas.classList.remove("hidden");
      dom.gridCanvas.classList.remove("hidden");
      dom.panel.classList.remove("hidden");
      dom.topBar.classList.remove("hidden");
      join(joinId);
    }
    // Don't auto-load from localStorage on page load - only when user enters host mode
  });
}

