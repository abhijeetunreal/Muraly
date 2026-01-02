// ================= MAIN ENTRY POINT =================
// Muraly - AR Mural Maker & Wall Visualization App
// Main orchestrator that imports and initializes all modules

import { state } from './modules/state.js';
import { dom } from './modules/dom.js';
import { registerServiceWorker } from './modules/utils.js';
import { initCanvas } from './modules/canvas.js';
import { initImageUpload } from './modules/image.js';
import { initNavigation } from './modules/navigation.js';
import { initUIControls } from './modules/ui-controls.js';
import { initGestures } from './modules/gestures.js';
import { startRenderer } from './modules/renderer.js';
import { host } from './modules/hosting.js';
import { saveSession, loadSession } from './modules/session.js';
import { startRecordingTimelapse, initRecording } from './modules/recording.js';

// Initialize the application
function init() {
  // Initialize canvas
  initCanvas();
  
  // Initialize image upload
  initImageUpload();
  
  // Initialize navigation (includes URL parameter checking)
  initNavigation();
  
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
  if (closePanelBtn && panel) {
    closePanelBtn.onclick = () => {
      panel.classList.add('hidden');
    };
  }
  
  // Register service worker for PWA
  registerServiceWorker();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
