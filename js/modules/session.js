// ================= SESSION SAVE/LOAD =================
import { state } from './state.js';
import { dom } from './dom.js';
import { makeSketch } from './image.js';

// Save current session state
export function saveSession() {
  if (!state.img.src) {
    alert("No image loaded to save.");
    return;
  }
  
  const sessionData = {
    imageData: state.img.src,
    sketchImageData: state.sketchImg ? state.sketchImg.src : null,
    position: { x: state.pos.x, y: state.pos.y },
    scale: state.scale,
    rotation: state.rot,
    opacity: state.opacityVal,
    mode: state.mode,
    locked: state.locked,
    showGrid: state.showGrid,
    timestamp: new Date().toISOString()
  };
  
  // Save to localStorage
  try {
    localStorage.setItem('muraly_session', JSON.stringify(sessionData));
    
    // Also create downloadable file
    const dataStr = JSON.stringify(sessionData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `muraly_session_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    dom.shareId.textContent = "Session saved successfully!";
    dom.shareId.className = "success";
    setTimeout(() => {
      dom.shareId.textContent = "";
      dom.shareId.className = "";
    }, 3000);
  } catch (err) {
    console.error("Error saving session:", err);
    alert("Error saving session: " + err.message);
  }
}

// Load saved session
export function loadSession() {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'application/json';
  fileInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const sessionData = JSON.parse(event.target.result);
        
        // Load image
        if (sessionData.imageData) {
          state.img.src = sessionData.imageData;
          state.img.onload = () => {
            if (sessionData.sketchImageData) {
              state.sketchImg = new Image();
              state.sketchImg.src = sessionData.sketchImageData;
            } else {
              makeSketch();
            }
            
            // Restore state
            state.pos.x = sessionData.position.x;
            state.pos.y = sessionData.position.y;
            state.scale = sessionData.scale || 1;
            state.rot = sessionData.rotation || 0;
            state.opacityVal = sessionData.opacity || 0.6;
            state.mode = sessionData.mode || "image";
            state.locked = sessionData.locked || false;
            state.showGrid = sessionData.showGrid || false;
            
            // Update UI
            dom.opacity.value = state.opacityVal;
            dom.lockBtn.textContent = state.locked ? "🔒 Locked" : "🔓 Move";
            
            dom.shareId.textContent = "Session loaded successfully!";
            dom.shareId.className = "success";
            setTimeout(() => {
              dom.shareId.textContent = "";
              dom.shareId.className = "";
            }, 3000);
          };
        }
      } catch (err) {
        console.error("Error loading session:", err);
        alert("Error loading session: " + err.message);
      }
    };
    reader.readAsText(file);
  };
  fileInput.click();
}

// Try to load from localStorage on page load
export function tryLoadFromLocalStorage() {
  try {
    const saved = localStorage.getItem('muraly_session');
    if (saved) {
      const sessionData = JSON.parse(saved);
      if (sessionData.imageData) {
        state.img.src = sessionData.imageData;
        state.img.onload = () => {
          if (sessionData.sketchImageData) {
            state.sketchImg = new Image();
            state.sketchImg.src = sessionData.sketchImageData;
          } else {
            makeSketch();
          }
          
          state.pos.x = sessionData.position.x;
          state.pos.y = sessionData.position.y;
          state.scale = sessionData.scale || 1;
          state.rot = sessionData.rotation || 0;
          state.opacityVal = sessionData.opacity || 0.6;
          state.mode = sessionData.mode || "image";
          state.locked = sessionData.locked || false;
          state.showGrid = sessionData.showGrid || false;
          
          dom.opacity.value = state.opacityVal;
          dom.lockBtn.textContent = state.locked ? "🔒 Locked" : "🔓 Move";
        };
      }
    }
  } catch (err) {
    console.warn("Could not load from localStorage:", err);
  }
}

