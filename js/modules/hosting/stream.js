// ================= COMPOSITE STREAM CREATION =================
import { state } from '../state.js';
import { dom } from '../dom.js';

// Create a composite canvas stream (camera + overlay)
export function createCompositeStream() {
  // Create a new canvas for compositing
  // Use camera's actual video stream dimensions to maintain aspect ratio
  const compositeCanvas = document.createElement("canvas");
  // Use videoWidth/videoHeight which are the actual video stream dimensions (not affected by CSS)
  const cameraWidth = dom.camera.videoWidth || 640; // Fallback to reasonable default
  const cameraHeight = dom.camera.videoHeight || 480; // Fallback to reasonable default
  compositeCanvas.width = cameraWidth;
  compositeCanvas.height = cameraHeight;
  const compositeCtx = compositeCanvas.getContext("2d");
  
  // Update canvas size if camera video dimensions change
  function updateCanvasSize() {
    // Only use videoWidth/videoHeight - these are the actual video stream dimensions
    const newCameraWidth = dom.camera.videoWidth;
    const newCameraHeight = dom.camera.videoHeight;
    if (newCameraWidth && newCameraHeight) {
      if (compositeCanvas.width !== newCameraWidth || compositeCanvas.height !== newCameraHeight) {
        compositeCanvas.width = newCameraWidth;
        compositeCanvas.height = newCameraHeight;
      }
    }
  }
  state.resizeHandler = updateCanvasSize;
  window.addEventListener("resize", state.resizeHandler);
  
  // Capture stream from composite canvas with feature detection
  let stream;
  if (typeof compositeCanvas.captureStream === 'function') {
    stream = compositeCanvas.captureStream(30); // 30 FPS
  } else if (typeof compositeCanvas.mozCaptureStream === 'function') {
    stream = compositeCanvas.mozCaptureStream(30); // Firefox fallback
  } else {
    console.warn("Canvas captureStream not supported in this browser");
    // Fallback: create a black video stream
    const fallbackCanvas = document.createElement("canvas");
    fallbackCanvas.width = 1;
    fallbackCanvas.height = 1;
    stream = fallbackCanvas.captureStream ? fallbackCanvas.captureStream(30) : null;
    if (!stream) {
      throw new Error("Canvas stream capture not supported in this browser");
    }
  }
  
  // Function to draw composite frame
  function drawCompositeFrame() {
    if (!state.isHosting || !dom.camera.srcObject || dom.camera.readyState !== 4) return;
    
    // Update canvas size if camera dimensions changed
    updateCanvasSize();
    
    // Clear and draw camera frame at its natural dimensions
    try {
      // Ensure canvas exactly matches camera video dimensions to maintain aspect ratio
      const camWidth = dom.camera.videoWidth;
      const camHeight = dom.camera.videoHeight;
      
      if (camWidth && camHeight) {
        // Update canvas to match camera video stream dimensions (maintains aspect ratio)
        if (compositeCanvas.width !== camWidth || compositeCanvas.height !== camHeight) {
          compositeCanvas.width = camWidth;
          compositeCanvas.height = camHeight;
        }
        
        // Clear canvas first
        compositeCtx.clearRect(0, 0, compositeCanvas.width, compositeCanvas.height);
        
        // Draw camera video at its natural video stream dimensions (not element display size)
        // This ensures aspect ratio is preserved regardless of CSS object-fit
        compositeCtx.drawImage(dom.camera, 0, 0, camWidth, camHeight);
      } else {
        // Fallback if dimensions not available
        compositeCtx.clearRect(0, 0, compositeCanvas.width, compositeCanvas.height);
        compositeCtx.drawImage(dom.camera, 0, 0, compositeCanvas.width, compositeCanvas.height);
      }
      
      // Draw overlay canvas on top
      // Scale overlay to cover camera canvas (like object-fit: cover) to match what user sees
      // This maintains alignment since overlay is window-sized and camera uses object-fit: cover
      const overlayAspect = dom.overlayCanvas.width / dom.overlayCanvas.height;
      const cameraAspect = compositeCanvas.width / compositeCanvas.height;
      
      let overlayScale, overlayX, overlayY;
      
      if (overlayAspect > cameraAspect) {
        // Overlay is wider - scale to cover height (crop sides)
        overlayScale = compositeCanvas.height / dom.overlayCanvas.height;
        overlayX = (compositeCanvas.width - dom.overlayCanvas.width * overlayScale) / 2;
        overlayY = 0;
      } else {
        // Overlay is taller - scale to cover width (crop top/bottom)
        overlayScale = compositeCanvas.width / dom.overlayCanvas.width;
        overlayX = 0;
        overlayY = (compositeCanvas.height - dom.overlayCanvas.height * overlayScale) / 2;
      }
      
      // Draw overlay with uniform scale to prevent distortion
      compositeCtx.save();
      compositeCtx.translate(overlayX, overlayY);
      compositeCtx.scale(overlayScale, overlayScale);
      compositeCtx.drawImage(dom.overlayCanvas, 0, 0);
      compositeCtx.restore();
      
      // Draw grid canvas on top (use same scale and position)
      compositeCtx.save();
      compositeCtx.translate(overlayX, overlayY);
      compositeCtx.scale(overlayScale, overlayScale);
      compositeCtx.drawImage(dom.gridCanvas, 0, 0);
      compositeCtx.restore();
    } catch (e) {
      // Silently handle any drawing errors
      console.warn("Error drawing composite frame:", e);
    }
  }
  
  // Wait for camera to be ready, then start capturing
  function startCapturing() {
    if (dom.camera.readyState === 4) {
      state.canvasStreamInterval = setInterval(drawCompositeFrame, 33); // ~30 FPS
    } else {
      dom.camera.addEventListener("loadedmetadata", () => {
        if (state.isHosting && !state.canvasStreamInterval) {
          state.canvasStreamInterval = setInterval(drawCompositeFrame, 33);
        }
      }, { once: true });
    }
  }
  
  startCapturing();
  
  return stream;
}

