// ================= SCREEN SHARE / HOSTING =================
import { state } from './state.js';
import { dom } from './dom.js';
import { startCamera } from './camera.js';
import { isMobileDevice, isFirefox } from './utils.js';
import { enterViewerMode } from './viewer.js';
import { stopRecordingTimelapse } from './recording.js';

// Create a composite canvas stream (camera + overlay)
function createCompositeStream() {
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

export function stopHosting() {
  if (state.call) {
    state.call.close();
    state.call = null;
  }
  if (state.hostStream) {
    state.hostStream.getTracks().forEach(track => track.stop());
    state.hostStream = null;
  }
  if (state.canvasStreamInterval) {
    clearInterval(state.canvasStreamInterval);
    state.canvasStreamInterval = null;
  }
  if (state.canvasStream) {
    state.canvasStream.getTracks().forEach(track => track.stop());
    state.canvasStream = null;
  }
  if (state.resizeHandler) {
    window.removeEventListener("resize", state.resizeHandler);
    state.resizeHandler = null;
  }
  state.isHosting = false;
  dom.shareId.textContent = "";
  dom.shareId.className = "";
  dom.shareLinkContainer.classList.add("hidden");
  dom.shareLinkInput.value = "";
  
  // Re-enable host button
  if (dom.hostBtn) {
    dom.hostBtn.disabled = false;
    dom.hostBtn.classList.remove("disabled");
  }
  
  // Stop recording if active
  if (state.isRecording) {
    stopRecordingTimelapse();
  }
}

export async function host() {
  if (state.isHosting) {
    alert("Already hosting. Please stop the current session first.");
    return;
  }
  
  // Basic UI setup (synchronous, doesn't break gesture context)
  state.isHosting = true;
  dom.shareId.textContent = "Starting host...";
  dom.shareId.className = "warning";
  
  if (dom.hostBtn) {
    dom.hostBtn.disabled = true;
    dom.hostBtn.classList.add("disabled");
  }
  
  try {
    // Check if device is mobile or if getDisplayMedia is not available
    const isMobile = isMobileDevice();
    const hasDisplayMedia = navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia;
    
    // CRITICAL: For desktop with screen sharing, call getDisplayMedia() IMMEDIATELY
    // while still in user gesture context, before any async operations
    if (!isMobile && hasDisplayMedia) {
      // Desktop: Use screen sharing - call immediately in user gesture context
      const isFirefoxBrowser = isFirefox();
      
      if (isFirefoxBrowser) {
        // Firefox: Try different constraint approaches to enable window/screen/tab picker
        // Firefox requires the call to happen synchronously in user gesture context
        console.log("Firefox: Requesting screen share with minimal constraints");
        try {
          // First try with no constraints to let Firefox show its native picker
          state.hostStream = await navigator.mediaDevices.getDisplayMedia({});
          console.log("Firefox: Screen share successful with empty constraints");
        } catch (err) {
          console.log("Firefox: Empty constraints failed, trying video: true", err);
          try {
            // Second try with minimal video constraint
            state.hostStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            console.log("Firefox: Screen share successful with video: true");
          } catch (err2) {
            console.log("Firefox: video: true failed, trying video: { mediaSource }", err2);
            // Third try with explicit mediaSource
            state.hostStream = await navigator.mediaDevices.getDisplayMedia({ 
              video: { mediaSource: 'screen' } 
            });
            console.log("Firefox: Screen share successful with mediaSource");
          }
        }
      } else {
        // Chrome/others: Use full constraints
        state.hostStream = await navigator.mediaDevices.getDisplayMedia({
          video: { 
            cursor: "always",
            displaySurface: "monitor"
          },
          audio: false 
        });
      }
      
      // Validate stream was obtained
      if (!state.hostStream || !state.hostStream.getVideoTracks() || state.hostStream.getVideoTracks().length === 0) {
        throw new Error("Failed to obtain screen sharing stream");
      }
      
      // Handle when user stops sharing
      state.hostStream.getVideoTracks()[0].onended = () => {
        stopHosting();
      };
    } else {
      // Mobile or no display media: Use canvas capture instead
      // Clean up any existing peer (can do this async now)
      if (state.peer) {
        state.peer.destroy();
      }
      
      // Ensure camera is started
      if (!dom.camera.srcObject) {
        startCamera();
      }
      
      // Wait a bit for camera to be ready
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (!dom.camera.srcObject) {
        throw new Error("Camera not available. Please ensure camera permissions are granted.");
      }
      
      // Create composite stream from canvas
      state.hostStream = createCompositeStream();
      state.canvasStream = state.hostStream;
    }
    
    // Now do async setup after we have the stream
    // Clean up any existing peer (if not done already)
    if (state.peer) {
      state.peer.destroy();
    }
    
    // Ensure camera is started (for mobile/canvas mode, already done above)
    if (!dom.camera.srcObject && (isMobile || !hasDisplayMedia)) {
      startCamera();
    }
    
    // Generate 3-character shareable code first
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars
    let shareCode = '';
    for (let i = 0; i < 3; i++) {
      shareCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Use the code as PeerJS custom ID
    state.peer = new Peer(shareCode, {
      debug: 2,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      }
    });
    
    state.peer.on("error", (err) => {
      console.error("Peer error:", err);
      dom.shareId.textContent = "Error: " + err.message;
      dom.shareId.className = "error";
      dom.shareLinkContainer.classList.add("hidden");
      state.isHosting = false;
      
      // Re-enable host button on error
      if (dom.hostBtn) {
        dom.hostBtn.disabled = false;
        dom.hostBtn.classList.remove("disabled");
      }
    });
    
    state.peer.on("call", (incomingCall) => {
      if (state.hostStream) {
        incomingCall.answer(state.hostStream);
        state.call = incomingCall;
        
        state.call.on("close", () => {
          console.log("Call closed");
        });
        
        state.call.on("error", (err) => {
          console.error("Call error:", err);
        });
      } else {
        console.error("No stream available to answer call");
        incomingCall.close();
      }
    });
    
    state.peer.on("open", (id) => {
      // id will be the shareCode we set
      const code = id;
      
      // Generate shareable link with short code
      const shareLink = `${window.location.origin}${window.location.pathname}?join=${code}`;
      
      dom.shareLinkInput.value = shareLink;
      dom.shareLinkContainer.classList.remove("hidden");
      
      if (isMobile || !hasDisplayMedia) {
        dom.shareId.textContent = `Share Code: ${code} (Mobile Mode)`;
      } else {
        dom.shareId.textContent = `Share Code: ${code}`;
      }
      dom.shareId.className = "success";
      
      // Answer incoming calls with the stream we already have
      if (state.hostStream) {
        // Stream is already set up, ready to accept calls
      } else {
        console.error("No stream available when peer opened");
        stopHosting();
      }
    });
    
  } catch (err) {
    console.error("Error getting media stream:", err);
    state.isHosting = false;
    dom.shareId.textContent = "Error: Could not start sharing";
    dom.shareId.className = "error";
    dom.shareLinkContainer.classList.add("hidden");
    
    // Re-enable host button on error
    if (dom.hostBtn) {
      dom.hostBtn.disabled = false;
      dom.hostBtn.classList.remove("disabled");
    }
    
    // Improved error handling with Firefox-specific messages
    const isFirefoxBrowser = isFirefox();
    
    if (isFirefoxBrowser) {
      // Firefox-specific error handling
      if (err.message && (err.message.includes("can not be found here") || err.message.includes("The object can not be found here"))) {
        alert("Screen sharing failed. If the window list is empty, please grant Screen Recording permission in System Preferences > Security & Privacy > Privacy > Screen Recording, then restart Firefox.");
      } else if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        alert("Permission denied. Please allow screen sharing access in Firefox. You may need to check Firefox's permissions settings.");
      } else if (err.name === "AbortError" || err.name === "NotReadableError") {
        alert("Screen sharing was cancelled or failed. Please try again and select a window, screen, or tab to share.");
      } else {
        alert("Firefox screen sharing error: " + (err.message || err.name || "Unknown error") + "\n\nTip: Make sure Firefox has Screen Recording permission in your system settings.");
      }
    } else {
      // Other browsers
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        alert("Permission denied. Please allow screen sharing access.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        alert("No camera found. Please ensure your device has a camera.");
      } else if (err.name === "AbortError") {
        alert("Screen sharing was cancelled. Please try again.");
      } else {
        alert("Could not start sharing: " + (err.message || err.name || "Unknown error"));
      }
    }
  }
}

export function join(idOrLink) {
  // Clean up any existing peer
  if (state.peer) {
    state.peer.destroy();
  }
  
  // Extract ID from link if it's a full URL
  let id = idOrLink.trim();
  if (id.includes('?join=')) {
    id = id.split('?join=')[1].split('&')[0];
  } else if (id.includes('join=')) {
    id = id.split('join=')[1].split('&')[0];
  }
  
  if (!id || id === "") {
    alert("Please enter a valid Share Code or Link");
    return;
  }
  
  dom.shareId.textContent = "Connecting...";
  dom.shareId.className = "warning";
  
  state.peer = new Peer({
    debug: 2,
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    }
  });
  
  state.peer.on("open", () => {
    console.log("Joining with code/ID:", id);
    
    // Use the code/ID directly (if it's 3 chars, it's a custom PeerJS ID)
    const peerIdToCall = id.trim();
    
    // PeerJS requires a stream when calling, so we create a minimal dummy stream
    // We'll use a canvas-based video stream to avoid requesting camera permissions
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, 1, 1);
    
    // Feature detection for captureStream
    let stream;
    if (typeof canvas.captureStream === 'function') {
      stream = canvas.captureStream(1); // 1 FPS is enough for a dummy stream
    } else if (typeof canvas.mozCaptureStream === 'function') {
      stream = canvas.mozCaptureStream(1); // Firefox fallback
    } else {
      // Fallback: try to create a minimal MediaStream
      stream = null;
      console.warn("Canvas captureStream not available for dummy stream");
    }
    
    // Small delay to ensure peer is fully ready
    setTimeout(() => {
      try {
        state.call = state.peer.call(peerIdToCall, stream);
        
        if (!state.call) {
          throw new Error("Could not initiate call");
        }
        
        state.call.on("stream", (remoteStream) => {
          console.log("Received remote stream");
          // Stop the dummy stream once we get the real stream
          if (stream) {
            stream.getTracks().forEach(track => track.stop());
          }
          enterViewerMode(remoteStream);
        });
        
        state.call.on("close", () => {
          console.log("Call closed");
          if (stream) {
            stream.getTracks().forEach(track => track.stop());
          }
          dom.shareId.textContent = "Connection lost";
          dom.shareId.className = "error";
          setTimeout(() => {
            alert("Connection to host lost");
            location.reload();
          }, 500);
        });
        
        state.call.on("error", (err) => {
          console.error("Call error:", err);
          if (stream) {
            stream.getTracks().forEach(track => track.stop());
          }
          dom.shareId.textContent = "Connection error";
          dom.shareId.className = "error";
          setTimeout(() => {
            alert("Connection error: " + err.message);
            location.reload();
          }, 500);
        });
      } catch (err) {
        console.error("Error initiating call:", err);
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        dom.shareId.textContent = "Connection failed";
        dom.shareId.className = "error";
        setTimeout(() => {
          alert("Could not connect to host. Please check the Share ID and try again.");
          dom.camera.classList.add("hidden");
          dom.overlayCanvas.classList.add("hidden");
          dom.gridCanvas.classList.add("hidden");
          dom.panel.classList.add("hidden");
          dom.topBar.classList.add("hidden");
          dom.joinScreen.classList.remove("hidden");
        }, 500);
      }
    }, 100);
  });
  
  state.peer.on("error", (err) => {
    console.error("Peer error:", err);
    dom.shareId.textContent = "Connection error";
    dom.shareId.className = "error";
    setTimeout(() => {
      alert("Connection error: " + err.message);
      dom.camera.classList.add("hidden");
      dom.overlayCanvas.classList.add("hidden");
      dom.gridCanvas.classList.add("hidden");
      dom.panel.classList.add("hidden");
      dom.topBar.classList.add("hidden");
      dom.joinScreen.classList.remove("hidden");
    }, 500);
  });
}

