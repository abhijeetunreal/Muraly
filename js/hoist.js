// ================= HOIST ENTRY POINT =================
// Muraly - AR Mural Maker & Wall Visualization App
// Host-specific entry point for AR session hosting

import { state } from './modules/state.js';
import { dom } from './modules/dom.js';
import { initCanvas } from './modules/canvas.js';
import { initImageUpload } from './modules/image.js';
import { initUIControls } from './modules/ui-controls.js';
import { initGestures } from './modules/gestures.js';
import { startRenderer } from './modules/renderer.js';
import { host } from './modules/hosting.js';
import { saveSession, loadSession, tryLoadFromLocalStorage } from './modules/session.js';
import { startRecordingTimelapse, initRecording } from './modules/recording.js';
import { startCamera } from './modules/camera.js';

// Initialize the host application
function init() {
  // Start camera immediately for host
  startCamera();
  
  // Initialize canvas
  initCanvas();
  
  // Initialize image upload
  initImageUpload();
  
  // Initialize UI controls
  initUIControls();
  
  // Initialize gestures
  initGestures();
  
  // Start renderer
  startRenderer();
  
  // Initialize recording
  initRecording();
  
  // Set up host button
  if (dom.hostBtn) {
    dom.hostBtn.onclick = host;
  }
  
  // Set up session buttons
  if (dom.saveSessionBtn) {
    dom.saveSessionBtn.onclick = saveSession;
  }
  if (dom.loadSessionBtn) {
    dom.loadSessionBtn.onclick = loadSession;
  }
  
  // Set up recording button
  if (dom.recordTimelapseBtn) {
    dom.recordTimelapseBtn.onclick = startRecordingTimelapse;
  }
  
  // Set up close panel button
  const closePanelBtn = document.getElementById('closePanelBtn');
  const panel = document.getElementById('panel');
  const topBar = document.getElementById('topBar');
  if (closePanelBtn && panel) {
    closePanelBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      panel.classList.add('hidden');
      if (topBar) {
        topBar.classList.add('hidden');
      }
      console.log("Panel closed via close button");
    };
  }
  
  // Try to load saved session from localStorage
  tryLoadFromLocalStorage();
  
  // Show double-click hint for first-time users
  const hintElement = document.getElementById('doubleClickHint');
  if (hintElement && !localStorage.getItem('doubleClickHintSeen')) {
    // Show hint after a short delay
    setTimeout(() => {
      // Dismiss hint after animation completes
      setTimeout(() => {
        hintElement.classList.add('dismissed');
        localStorage.setItem('doubleClickHintSeen', 'true');
      }, 5000);
    }, 100);
  } else if (hintElement) {
    // User has seen it before, hide immediately
    hintElement.classList.add('dismissed');
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

