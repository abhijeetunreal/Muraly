// ================= RECORDING =================
import { state } from './state.js';
import { dom } from './dom.js';
import { showAlert } from './alert.js';

// Create recording canvas and stream
function createRecordingStream() {
  if (state.recordingCompositeCanvas) {
    // Feature detection for captureStream
    if (typeof state.recordingCompositeCanvas.captureStream === 'function') {
      return state.recordingCompositeCanvas.captureStream(30);
    } else if (typeof state.recordingCompositeCanvas.mozCaptureStream === 'function') {
      return state.recordingCompositeCanvas.mozCaptureStream(30);
    } else {
      throw new Error("Canvas captureStream not supported in this browser");
    }
  }
  
  state.recordingCompositeCanvas = document.createElement("canvas");
  state.recordingCompositeCanvas.width = dom.overlayCanvas.width || window.innerWidth;
  state.recordingCompositeCanvas.height = dom.overlayCanvas.height || window.innerHeight;
  state.recordingCompositeCtx = state.recordingCompositeCanvas.getContext("2d");
  
  // Update canvas size if window resizes
  function updateRecordingCanvasSize() {
    state.recordingCompositeCanvas.width = dom.overlayCanvas.width || window.innerWidth;
    state.recordingCompositeCanvas.height = dom.overlayCanvas.height || window.innerHeight;
  }
  window.addEventListener("resize", updateRecordingCanvasSize);
  
  // Feature detection for captureStream
  if (typeof state.recordingCompositeCanvas.captureStream === 'function') {
    return state.recordingCompositeCanvas.captureStream(30);
  } else if (typeof state.recordingCompositeCanvas.mozCaptureStream === 'function') {
    return state.recordingCompositeCanvas.mozCaptureStream(30);
  } else {
    throw new Error("Canvas captureStream not supported in this browser");
  }
}

// Start full video recording (continuous)
function startFullVideoRecording() {
  state.recordingStream = createRecordingStream();
  
  // Check for MediaRecorder support
  if (!window.MediaRecorder) {
    showAlert("MediaRecorder API not supported in this browser.", 'error');
    return;
  }
  
  // Get available MIME types
  const options = { mimeType: 'video/webm;codecs=vp9' };
  if (!MediaRecorder.isTypeSupported(options.mimeType)) {
    options.mimeType = 'video/webm;codecs=vp8';
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options.mimeType = 'video/webm';
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/mp4';
      }
    }
  }
  
  state.mediaRecorder = new MediaRecorder(state.recordingStream, {
    ...options,
    videoBitsPerSecond: 5000000 // High quality: 5 Mbps
  });
  
  state.recordedChunks = [];
  
  state.mediaRecorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      state.recordedChunks.push(event.data);
    }
  };
  
  state.mediaRecorder.onstop = () => {
    const blob = new Blob(state.recordedChunks, { type: options.mimeType || 'video/webm' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.download = `muraly_video_${timestamp}.${options.mimeType.includes('mp4') ? 'mp4' : 'webm'}`;
    link.click();
    URL.revokeObjectURL(url);
    
    state.recordedChunks = [];
    
    dom.shareId.textContent = "Video saved!";
    dom.shareId.className = "success";
    setTimeout(() => {
      dom.shareId.textContent = "";
      dom.shareId.className = "";
    }, 3000);
  };
  
  state.mediaRecorder.onerror = (event) => {
    console.error("MediaRecorder error:", event);
    showAlert("Error recording: " + event.error, 'error');
    stopRecordingTimelapse();
  };
  
  // Start recording
  state.mediaRecorder.start(1000); // Collect data every second
  
  // Draw frames to recording canvas continuously
  function drawRecordingFrame() {
    if (!state.isRecording || !dom.camera.srcObject || dom.camera.readyState !== 4) return;
    
    try {
      // Update canvas size if needed
      if (state.recordingCompositeCanvas.width !== dom.overlayCanvas.width || 
          state.recordingCompositeCanvas.height !== dom.overlayCanvas.height) {
        state.recordingCompositeCanvas.width = dom.overlayCanvas.width || window.innerWidth;
        state.recordingCompositeCanvas.height = dom.overlayCanvas.height || window.innerHeight;
      }
      
      // Draw camera frame
      state.recordingCompositeCtx.drawImage(dom.camera, 0, 0, state.recordingCompositeCanvas.width, state.recordingCompositeCanvas.height);
      
      // Draw overlay canvas on top
      state.recordingCompositeCtx.drawImage(dom.overlayCanvas, 0, 0);
      
      // Draw grid canvas on top
      state.recordingCompositeCtx.drawImage(dom.gridCanvas, 0, 0);
    } catch (e) {
      console.warn("Error drawing recording frame:", e);
    }
  }
  
  state.recordingInterval = setInterval(drawRecordingFrame, 33); // ~30 FPS
  
  state.isRecording = true;
  if (dom.recordTimelapseBtn) {
    dom.recordTimelapseBtn.textContent = "⏹ Stop Recording";
    dom.recordTimelapseBtn.classList.add("danger");
  }
  
  dom.shareId.textContent = "Recording video...";
  dom.shareId.className = "warning";
}

// Start timelapse recording (capture frames at intervals)
function startTimelapseRecording() {
  state.timelapseFrames = [];
  
  // Create canvas for capturing frames
  if (!state.recordingCompositeCanvas) {
    state.recordingCompositeCanvas = document.createElement("canvas");
    state.recordingCompositeCanvas.width = dom.overlayCanvas.width || window.innerWidth;
    state.recordingCompositeCanvas.height = dom.overlayCanvas.height || window.innerHeight;
    state.recordingCompositeCtx = state.recordingCompositeCanvas.getContext("2d");
  }
  
  // Function to capture a frame
  function captureFrame() {
    if (!state.isRecording || !dom.camera.srcObject || dom.camera.readyState !== 4) return;
    
    try {
      // Update canvas size if needed
      if (state.recordingCompositeCanvas.width !== dom.overlayCanvas.width || 
          state.recordingCompositeCanvas.height !== dom.overlayCanvas.height) {
        state.recordingCompositeCanvas.width = dom.overlayCanvas.width || window.innerWidth;
        state.recordingCompositeCanvas.height = dom.overlayCanvas.height || window.innerHeight;
      }
      
      // Draw camera frame
      state.recordingCompositeCtx.drawImage(dom.camera, 0, 0, state.recordingCompositeCanvas.width, state.recordingCompositeCanvas.height);
      
      // Draw overlay canvas on top
      state.recordingCompositeCtx.drawImage(dom.overlayCanvas, 0, 0);
      
      // Draw grid canvas on top
      state.recordingCompositeCtx.drawImage(dom.gridCanvas, 0, 0);
      
      // Capture frame as image data
      const frameData = state.recordingCompositeCanvas.toDataURL('image/png');
      state.timelapseFrames.push(frameData);
      
      // Update status
      dom.shareId.textContent = `Recording timelapse... (${state.timelapseFrames.length} frames)`;
      dom.shareId.className = "warning";
    } catch (e) {
      console.warn("Error capturing frame:", e);
    }
  }
  
  // Capture first frame immediately
  captureFrame();
  
  // Capture frames at specified interval
  const intervalMs = state.recordingIntervalSeconds * 1000;
  state.timelapseCaptureInterval = setInterval(captureFrame, intervalMs);
  
  state.isRecording = true;
  if (dom.recordTimelapseBtn) {
    dom.recordTimelapseBtn.textContent = "⏹ Stop Recording";
    dom.recordTimelapseBtn.classList.add("danger");
  }
  
  dom.shareId.textContent = `Recording timelapse (${state.recordingIntervalSeconds}s interval)...`;
  dom.shareId.className = "warning";
}

// Compile timelapse frames into a video
function compileTimelapseVideo() {
  if (state.timelapseFrames.length === 0) return;
  
  // Create a canvas for video frames
  const videoCanvas = document.createElement("canvas");
  videoCanvas.width = state.recordingCompositeCanvas.width;
  videoCanvas.height = state.recordingCompositeCanvas.height;
  const videoCtx = videoCanvas.getContext("2d");
  
  // Create stream from canvas with feature detection
  let stream;
  if (typeof videoCanvas.captureStream === 'function') {
    stream = videoCanvas.captureStream(30); // 30 FPS output
  } else if (typeof videoCanvas.mozCaptureStream === 'function') {
    stream = videoCanvas.mozCaptureStream(30); // Firefox fallback
  } else {
    throw new Error("Canvas captureStream not supported in this browser");
  }
  
  // Check for MediaRecorder support
  if (!window.MediaRecorder) {
    showAlert("MediaRecorder API not supported in this browser.", 'error');
    return;
  }
  
  // Get available MIME types
  const options = { mimeType: 'video/webm;codecs=vp9' };
  if (!MediaRecorder.isTypeSupported(options.mimeType)) {
    options.mimeType = 'video/webm;codecs=vp8';
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options.mimeType = 'video/webm';
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/mp4';
      }
    }
  }
  
  state.mediaRecorder = new MediaRecorder(stream, {
    ...options,
    videoBitsPerSecond: 5000000 // High quality: 5 Mbps
  });
  
  state.recordedChunks = [];
  
  state.mediaRecorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      state.recordedChunks.push(event.data);
    }
  };
  
  const totalFrames = state.timelapseFrames.length;
  
  state.mediaRecorder.onstop = () => {
    const blob = new Blob(state.recordedChunks, { type: options.mimeType || 'video/webm' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.download = `muraly_timelapse_${timestamp}.${options.mimeType.includes('mp4') ? 'mp4' : 'webm'}`;
    link.click();
    URL.revokeObjectURL(url);
    
    state.recordedChunks = [];
    state.timelapseFrames = [];
    
    dom.shareId.textContent = `Timelapse video saved! (${totalFrames} frames)`;
    dom.shareId.className = "success";
    setTimeout(() => {
      dom.shareId.textContent = "";
      dom.shareId.className = "";
    }, 3000);
  };
  
  state.mediaRecorder.onerror = (event) => {
    console.error("MediaRecorder error:", event);
    showAlert("Error compiling video: " + event.error, 'error');
    state.timelapseFrames = [];
  };
  
  // Start recording
  state.mediaRecorder.start();
  
  // Draw frames to canvas at 30 FPS
  let frameIndex = 0;
  const frameDuration = 1000 / 30; // ~33ms per frame at 30 FPS
  
  function drawNextFrame() {
    if (frameIndex >= state.timelapseFrames.length) {
      state.mediaRecorder.stop();
      stream.getTracks().forEach(track => track.stop());
      return;
    }
    
    // Load and draw frame
    const img = new Image();
    img.onload = () => {
      videoCtx.drawImage(img, 0, 0, videoCanvas.width, videoCanvas.height);
      frameIndex++;
      
      // Continue to next frame
      setTimeout(drawNextFrame, frameDuration);
    };
    img.onerror = () => {
      frameIndex++;
      setTimeout(drawNextFrame, frameDuration);
    };
    img.src = state.timelapseFrames[frameIndex];
  }
  
  // Start drawing frames
  drawNextFrame();
}

// Start recording (timelapse or full video)
export function startRecordingTimelapse() {
  if (state.isRecording) {
    stopRecordingTimelapse();
    return;
  }
  
  if (!dom.camera.srcObject || dom.camera.readyState !== 4) {
    showAlert("Camera not ready. Please ensure camera is active.", 'warning');
    return;
  }
  
  if (!state.img.src) {
    showAlert("No image loaded. Please upload an image first.", 'warning');
    return;
  }
  
  // Get recording mode and interval
  state.recordingMode = dom.recordMode ? dom.recordMode.value : "timelapse";
  
  if (state.recordingMode === "timelapse") {
    state.recordingIntervalSeconds = dom.customInterval ? parseFloat(dom.customInterval.value) || 1 : 1;
    
    if (state.recordingIntervalSeconds < 0.1) {
      showAlert("Interval must be at least 0.1 seconds.", 'warning');
      return;
    }
  }
  
  try {
    if (state.recordingMode === "full") {
      // Full video recording - continuous
      startFullVideoRecording();
    } else {
      // Timelapse recording - capture frames at intervals
      startTimelapseRecording();
    }
  } catch (err) {
    console.error("Error starting recording:", err);
    showAlert("Error starting recording: " + err.message, 'error');
  }
}

// Stop recording timelapse
export function stopRecordingTimelapse() {
  if (!state.isRecording) return;
  
  state.isRecording = false;
  
  if (state.recordingMode === "full") {
    // Stop full video recording
    if (state.recordingInterval) {
      clearInterval(state.recordingInterval);
      state.recordingInterval = null;
    }
    
    if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
      state.mediaRecorder.stop();
    }
    
    if (state.recordingStream) {
      state.recordingStream.getTracks().forEach(track => track.stop());
      state.recordingStream = null;
    }
  } else {
    // Stop timelapse recording and compile frames
    if (state.timelapseCaptureInterval) {
      clearInterval(state.timelapseCaptureInterval);
      state.timelapseCaptureInterval = null;
    }
    
    if (state.timelapseFrames.length === 0) {
      dom.shareId.textContent = "No frames captured";
      dom.shareId.className = "error";
      if (dom.recordTimelapseBtn) {
        dom.recordTimelapseBtn.textContent = "🎬 Start Recording";
        dom.recordTimelapseBtn.classList.remove("danger");
      }
      return;
    }
    
    dom.shareId.textContent = `Processing ${state.timelapseFrames.length} frames...`;
    dom.shareId.className = "warning";
    
    // Compile timelapse frames into video
    compileTimelapseVideo();
  }
  
  if (dom.recordTimelapseBtn) {
    dom.recordTimelapseBtn.textContent = "🎬 Start Recording";
    dom.recordTimelapseBtn.classList.remove("danger");
  }
}

export function initRecording() {
  // Event listeners for recording mode and interval
  if (dom.recordMode) {
    dom.recordMode.addEventListener("change", (e) => {
      state.recordingMode = e.target.value;
      if (dom.timelapseOptions) {
        dom.timelapseOptions.style.display = state.recordingMode === "timelapse" ? "flex" : "none";
      }
    });
    
    // Initialize visibility
    if (dom.timelapseOptions) {
      dom.timelapseOptions.style.display = state.recordingMode === "timelapse" ? "flex" : "none";
    }
  }
  
  // 1 second interval button
  if (dom.interval1sBtn) {
    dom.interval1sBtn.onclick = () => {
      if (dom.customInterval) {
        dom.customInterval.value = "1";
        state.recordingIntervalSeconds = 1;
      }
    };
  }
  
  // Custom interval input
  if (dom.customInterval) {
    dom.customInterval.addEventListener("input", (e) => {
      const value = parseFloat(e.target.value);
      if (!isNaN(value) && value >= 0.1) {
        state.recordingIntervalSeconds = value;
      }
    });
    
    dom.customInterval.addEventListener("change", (e) => {
      const value = parseFloat(e.target.value);
      if (isNaN(value) || value < 0.1) {
        e.target.value = "1";
        state.recordingIntervalSeconds = 1;
      }
    });
  }
  
  // Cleanup on page unload
  window.addEventListener("beforeunload", () => {
    if (state.isRecording) {
      stopRecordingTimelapse();
    }
  });
}

