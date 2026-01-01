// ================= VIEWER MODE =================
import { state } from './state.js';
import { dom } from './dom.js';

// Aspect ratio adjustment constants - set to 1.0 to maintain original aspect ratio
const ASPECT_WIDTH_MULTIPLIER = 1.0;   // Multiply width aspect (maintains original)
const ASPECT_HEIGHT_MULTIPLIER = 1.0; // Multiply height aspect (maintains original)

// Helper functions
function viewerDist(t) {
  return Math.hypot(t[1].clientX - t[0].clientX, t[1].clientY - t[0].clientY);
}

function viewerCenter(t) {
  let x = 0, y = 0;
  t.forEach(p => { x += p.clientX; y += p.clientY });
  return { x: x / t.length, y: y / t.length };
}

function updateViewerDimensions() {
  // Update dimensions without resetting zoom/pan
  const video = dom.remoteVideo;
  const container = dom.remoteVideoContainer;
  
  if (video.videoWidth && video.videoHeight) {
    // Use original aspect ratio to maintain what's being shared from host
    const originalAspect = video.videoWidth / video.videoHeight;
    const containerAspect = container.clientWidth / container.clientHeight;
    
    // Calculate size to fit container while maintaining original aspect ratio
    let displayWidth, displayHeight;
    
    if (originalAspect > containerAspect) {
      // Video is wider - fit to width
      displayWidth = container.clientWidth;
      displayHeight = displayWidth / originalAspect;
    } else {
      // Video is taller - fit to height
      displayHeight = container.clientHeight;
      displayWidth = displayHeight * originalAspect;
    }
    
    // Store display dimensions for transform calculations
    video._displayWidth = displayWidth;
    video._displayHeight = displayHeight;
    
    // Set dimensions maintaining original aspect ratio
    video.style.width = displayWidth + 'px';
    video.style.height = displayHeight + 'px';
    video.style.objectFit = 'contain'; // Preserve aspect ratio (no stretching/compressing)
  }
  
  updateViewerTransform();
}

function initViewerZoomPan() {
  // Reset zoom and pan only on initial setup
  state.viewerZoom = 1;
  state.viewerPanX = 0;
  state.viewerPanY = 0;
  
  // Update dimensions
  updateViewerDimensions();
}

function updateViewerTransform() {
  const video = dom.remoteVideo;
  
  // Get the actual display dimensions
  const displayWidth = video._displayWidth || video.clientWidth || video.videoWidth;
  const displayHeight = video._displayHeight || video.clientHeight || video.videoHeight;
  
  // Calculate transform: center the video, then apply pan and zoom
  // The video is positioned at 50%, 50%, so we translate by -50% to center it
  // Then add pan offset and apply zoom
  const translateX = -50 + (state.viewerPanX / displayWidth * 100);
  const translateY = -50 + (state.viewerPanY / displayHeight * 100);
  
  video.style.transform = `translate(${translateX}%, ${translateY}%) scale(${state.viewerZoom})`;
}

export function enterViewerMode(stream) {
  state.appMode = "viewer";
  state.renderActive = false;

  if (dom.camera.srcObject) {
    dom.camera.srcObject.getTracks().forEach(t => t.stop());
    dom.camera.srcObject = null;
  }

  dom.panel.classList.add("hidden");
  dom.topBar.classList.add("hidden");
  dom.overlayCanvas.classList.add("hidden");
  dom.gridCanvas.classList.add("hidden");

  dom.remoteVideo.srcObject = stream;
  dom.remoteVideo.muted = true;
  dom.remoteVideo.play();
  
  // Initialize video size and zoom/pan state when video metadata is loaded
  function handleVideoReady() {
    // Wait a bit for video dimensions to be available
    if (dom.remoteVideo.videoWidth && dom.remoteVideo.videoHeight) {
      // Force recalculation with current adjustment values
      initViewerZoomPan();
    } else {
      // Retry if dimensions not ready yet
      setTimeout(handleVideoReady, 100);
    }
  }
  
  dom.remoteVideo.onloadedmetadata = handleVideoReady;
  dom.remoteVideo.onloadeddata = handleVideoReady;
  dom.remoteVideo.onresize = handleVideoReady;
  
  // Also try to initialize if video is already loaded
  if (dom.remoteVideo.readyState >= 1) {
    setTimeout(handleVideoReady, 100);
  }
  
  // Recalculate on resize (preserve zoom/pan)
  let viewerResizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(viewerResizeTimeout);
    viewerResizeTimeout = setTimeout(() => {
      if (state.appMode === 'viewer' && dom.remoteVideo.videoWidth && dom.remoteVideo.videoHeight) {
        updateViewerDimensions();
      }
    }, 250);
  });
  
  // Periodically check and update dimensions (in case adjustments changed)
  // Use updateViewerDimensions() instead of initViewerZoomPan() to preserve zoom/pan
  if (window.viewerDimensionInterval) {
    clearInterval(window.viewerDimensionInterval);
  }
  window.viewerDimensionInterval = setInterval(() => {
    if (state.appMode === 'viewer' && dom.remoteVideo.videoWidth && dom.remoteVideo.videoHeight) {
      updateViewerDimensions();
    }
  }, 500);
  
  dom.remoteVideoContainer.classList.remove("hidden");
  
  dom.shareId.textContent = "Connected to host";
  dom.shareId.className = "success";
  
  // Initialize viewer gestures
  initViewerGestures();
}

function initViewerGestures() {
  // Touch gesture handlers for viewer
  dom.remoteVideoContainer.addEventListener("touchstart", e => {
    const t = [...e.touches];
    state.viewerG = {
      startPanX: state.viewerPanX,
      startPanY: state.viewerPanY,
      startZoom: state.viewerZoom,
      c0: viewerCenter(t),
      d0: t.length > 1 ? viewerDist(t) : 0
    };
  });

  dom.remoteVideoContainer.addEventListener("touchmove", e => {
    if (!state.viewerG) return;
    e.preventDefault();
    const t = [...e.touches];
    const c = viewerCenter(t);
    state.viewerPanX = state.viewerG.startPanX + (c.x - state.viewerG.c0.x);
    state.viewerPanY = state.viewerG.startPanY + (c.y - state.viewerG.c0.y);
    if (t.length > 1) {
      const newDist = viewerDist(t);
      if (state.viewerG.d0 > 0) {
        const newZoom = state.viewerG.startZoom * (newDist / state.viewerG.d0);
        // Limit zoom range (0.5x to 5x)
        if (newZoom >= 0.5 && newZoom <= 5) {
          state.viewerZoom = newZoom;
        }
      }
    }
    updateViewerTransform();
  }, { passive: false });

  dom.remoteVideoContainer.addEventListener("touchend", e => {
    if (e.touches.length === 0) {
      state.viewerG = null;
    }
  });

  // Mouse wheel zoom for desktop
  dom.remoteVideoContainer.addEventListener('wheel', (e) => {
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = state.viewerZoom * delta;
    
    if (newZoom >= 0.5 && newZoom <= 5) {
      const container = dom.remoteVideoContainer;
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const containerCenterX = container.clientWidth / 2;
      const containerCenterY = container.clientHeight / 2;
      
      const zoomPointX = mouseX - containerCenterX;
      const zoomPointY = mouseY - containerCenterY;
      
      const oldZoom = state.viewerZoom;
      state.viewerZoom = newZoom;
      
      // Adjust pan to zoom towards mouse position
      const zoomRatio = state.viewerZoom / oldZoom;
      state.viewerPanX = state.viewerPanX - (zoomPointX * (zoomRatio - 1));
      state.viewerPanY = state.viewerPanY - (zoomPointY * (zoomRatio - 1));
      
      // Constrain pan
      const video = dom.remoteVideo;
      const videoRect = video.getBoundingClientRect();
      const videoWidth = videoRect.width || video.videoWidth || container.clientWidth;
      const videoHeight = videoRect.height || video.videoHeight || container.clientHeight;
      const scaledWidth = videoWidth * state.viewerZoom;
      const scaledHeight = videoHeight * state.viewerZoom;
      const maxPanX = Math.max(0, (scaledWidth - container.clientWidth) / 2);
      const maxPanY = Math.max(0, (scaledHeight - container.clientHeight) / 2);
      
      state.viewerPanX = Math.max(-maxPanX, Math.min(maxPanX, state.viewerPanX));
      state.viewerPanY = Math.max(-maxPanY, Math.min(maxPanY, state.viewerPanY));
      
      updateViewerTransform();
    }
  }, { passive: false });

  // Mouse drag for pan on desktop
  dom.remoteVideoContainer.addEventListener('mousedown', (e) => {
    state.viewerMouseDown = true;
    state.viewerMouseStart = {
      x: e.clientX,
      y: e.clientY,
      startPanX: state.viewerPanX,
      startPanY: state.viewerPanY
    };
    e.preventDefault();
  });

  dom.remoteVideoContainer.addEventListener('mousemove', (e) => {
    if (!state.viewerMouseDown) return;
    e.preventDefault();
    
    const deltaX = e.clientX - state.viewerMouseStart.x;
    const deltaY = e.clientY - state.viewerMouseStart.y;
    
    state.viewerPanX = state.viewerMouseStart.startPanX + deltaX;
    state.viewerPanY = state.viewerMouseStart.startPanY + deltaY;
    
    // Constrain pan
    const video = dom.remoteVideo;
    const container = dom.remoteVideoContainer;
    const videoRect = video.getBoundingClientRect();
    const videoWidth = videoRect.width || video.videoWidth || container.clientWidth;
    const videoHeight = videoRect.height || video.videoHeight || container.clientHeight;
    const scaledWidth = videoWidth * state.viewerZoom;
    const scaledHeight = videoHeight * state.viewerZoom;
    const maxPanX = Math.max(0, (scaledWidth - container.clientWidth) / 2);
    const maxPanY = Math.max(0, (scaledHeight - container.clientHeight) / 2);
    
    state.viewerPanX = Math.max(-maxPanX, Math.min(maxPanX, state.viewerPanX));
    state.viewerPanY = Math.max(-maxPanY, Math.min(maxPanY, state.viewerPanY));
    
    updateViewerTransform();
  });

  dom.remoteVideoContainer.addEventListener('mouseup', () => {
    state.viewerMouseDown = false;
  });

  dom.remoteVideoContainer.addEventListener('mouseleave', () => {
    state.viewerMouseDown = false;
  });
}

