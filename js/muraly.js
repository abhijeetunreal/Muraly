// ================= MAIN ENTRY POINT =================
// Muraly - AR Mural Maker & Wall Visualization App
// Main orchestrator that imports and initializes all modules

import { state } from './modules/state.js';
import { dom } from './modules/dom.js';
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
  
  // Show double-click hint for first-time users
  const hintElement = document.getElementById('doubleClickHint');
  if (hintElement && !localStorage.getItem('doubleClickHintSeen')) {
    // Check if we're in the AR view (not on first/join screen)
    const firstScreen = document.getElementById('firstScreen');
    const joinScreen = document.getElementById('joinScreen');
    
    // Only show hint if we're past the first/join screens
    setTimeout(() => {
      if (firstScreen.classList.contains('hidden') && joinScreen.classList.contains('hidden')) {
        // Dismiss hint after animation completes
        setTimeout(() => {
          hintElement.classList.add('dismissed');
          localStorage.setItem('doubleClickHintSeen', 'true');
        }, 5000);
      } else {
        // If we're still on first/join screen, hide hint
        hintElement.classList.add('dismissed');
      }
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
