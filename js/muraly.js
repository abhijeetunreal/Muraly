
// ================= APP MODE =================
let appMode = "host";
let renderActive = true;

/* ================= CAMERA ================= */

function startCamera() {
  navigator.mediaDevices.getUserMedia({ video:{ facingMode:"environment" } })
    .then(s => camera.srcObject = s);
}
// ========== FIRST SCREEN LOGIC ==========
const firstScreen = document.getElementById("firstScreen");
const joinScreen = document.getElementById("joinScreen");
const hostSelectBtn = document.getElementById("hostSelectBtn");
const joinSelectBtn = document.getElementById("joinSelectBtn");
const joinKeyInput = document.getElementById("joinKeyInput");
const joinKeyBtn = document.getElementById("joinKeyBtn");
const backToFirstBtn = document.getElementById("backToFirstBtn");

function showHostScreen() {
  firstScreen.classList.add("hidden");
  joinScreen.classList.add("hidden");
  backToFirstBtn.classList.add("hidden");
  camera.classList.remove("hidden");
  overlayCanvas.classList.remove("hidden");
  gridCanvas.classList.remove("hidden");
  panel.classList.remove("hidden");
  topBar.classList.remove("hidden");
  startCamera();
  // Try to load saved session from localStorage only when entering host mode
  tryLoadFromLocalStorage();
  // Don't auto-start hosting, let user click Host button
}

function showJoinScreen() {
  firstScreen.classList.add("hidden");
  joinScreen.classList.remove("hidden");
  backToFirstBtn.classList.remove("hidden");
  joinKeyInput.value = "";
  joinKeyInput.focus();
}

function doJoin() {
  const idOrLink = joinKeyInput.value.trim();
  if (!idOrLink) {
    joinKeyInput.focus();
    return;
  }
  joinScreen.classList.add("hidden");
  backToFirstBtn.classList.add("hidden");
  // Show host UI while waiting for stream
  camera.classList.remove("hidden");
  overlayCanvas.classList.remove("hidden");
  gridCanvas.classList.remove("hidden");
  panel.classList.remove("hidden");
  topBar.classList.remove("hidden");
  join(idOrLink);
}

hostSelectBtn.onclick = showHostScreen;
joinSelectBtn.onclick = showJoinScreen;
joinKeyBtn.onclick = doJoin;
joinKeyInput.addEventListener("keydown", e => { if (e.key === "Enter") doJoin(); });
backToFirstBtn.onclick = () => {
  joinScreen.classList.add("hidden");
  backToFirstBtn.classList.add("hidden");
  firstScreen.classList.remove("hidden");
};

// Panel buttons
document.getElementById("hostBtn").onclick = host;


// Hide all main UI at start
camera.classList.add("hidden");
overlayCanvas.classList.add("hidden");
gridCanvas.classList.add("hidden");
panel.classList.add("hidden");
topBar.classList.add("hidden");
backToFirstBtn.classList.add("hidden");

/* ================= CANVAS ================= */
const ctx = overlayCanvas.getContext("2d");
const gtx = gridCanvas.getContext("2d");

function resize() {
  overlayCanvas.width = gridCanvas.width = innerWidth;
  overlayCanvas.height = gridCanvas.height = innerHeight;
}
addEventListener("resize", resize);
resize();

/* ================= IMAGE ================= */
let img = new Image();
let sketchImg = null;
let mode = "image";

let pos = { x: innerWidth/2, y: innerHeight/2 };
let scale = 1;
let rot = 0;
let opacityVal = 0.6;

let locked = false;
let showGrid = false;

upload.onchange = e => {
  const file = e.target.files[0];
  if (!file) return;
  
  // Clear any existing image first
  if (img.src && img.src.startsWith('blob:')) {
    URL.revokeObjectURL(img.src);
  }
  
  // Load new image
  const objectURL = URL.createObjectURL(file);
  img.onload = function() {
    // Ensure image is fully loaded before making sketch
    if (img.complete && img.naturalWidth > 0) {
      makeSketch();
    }
  };
  img.onerror = function() {
    alert("Error loading image. Please try a different image file.");
    upload.value = ""; // Reset file input
  };
  img.src = objectURL;
};

function makeSketch() {
  if (!img.complete || img.naturalWidth === 0) {
    // Wait for image to be fully loaded
    img.onload = makeSketch;
    return;
  }
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const cx = c.getContext("2d");
  cx.drawImage(img,0,0);
  const d = cx.getImageData(0,0,c.width,c.height);
  for(let i=0;i<d.data.length;i+=4){
    const g=(d.data[i]+d.data[i+1]+d.data[i+2])/3;
    d.data[i]=d.data[i+1]=d.data[i+2]=g>150?255:0;
  }
  cx.putImageData(d,0,0);
  sketchImg = new Image();
  sketchImg.onload = function() {
    // Sketch image loaded, render will pick it up
  };
  sketchImg.src = c.toDataURL();
}

/* ================= UI ================= */
opacity.oninput = e => opacityVal = +e.target.value;
sketchBtn.onclick = () => mode = "sketch";
imageBtn.onclick = () => mode = "image";

lockBtn.onclick = () => {
  locked = !locked;
  lockBtn.textContent = locked ? "🔒 Locked" : "🔓 Move";
};

gridBtn.onclick = () => showGrid = !showGrid;

fullscreenBtn.onclick = () => {
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

/* ================= DOUBLE TAP/CLICK UI ================= */
let lastTap = 0;
let lastTapPos = { x: 0, y: 0 };
let isDoubleTap = false;
let uiHiddenTime = 0;
let preventGestureUntil = 0;

overlayCanvas.addEventListener("touchend", (e) => {
  const now = Date.now();
  const touch = e.changedTouches[0];
  const tapX = touch.clientX;
  const tapY = touch.clientY;
  
  // Check if this is a double-tap (within 300ms and 50px distance)
  const timeDiff = now - lastTap;
  const distDiff = Math.hypot(tapX - lastTapPos.x, tapY - lastTapPos.y);
  
  if (timeDiff < 300 && distDiff < 50 && e.touches.length === 0) {
    isDoubleTap = true;
    e.preventDefault();
    e.stopPropagation();
    
    // Prevent gesture handling for a short time after double-tap
    preventGestureUntil = now + 500;
    
    // Toggle UI visibility
    const wasHidden = panel.classList.contains("hidden");
    panel.classList.toggle("hidden");
    topBar.classList.toggle("hidden");
    
    // If we just hid the UI, record the time to prevent immediate re-showing
    if (!wasHidden) {
      uiHiddenTime = now;
    }
    
    // Clear gesture state
    g = null;
    
    // Reset double-tap flag after a short delay
    setTimeout(() => {
      isDoubleTap = false;
    }, 100);
  } else {
    isDoubleTap = false;
  }
  
  lastTap = now;
  lastTapPos = { x: tapX, y: tapY };
  
  // Reset gesture state when all touches end
  if (e.touches.length === 0) {
    g = null;
  }
}, { passive: false });

// Double-click for desktop/mouse users
overlayCanvas.addEventListener("dblclick", (e) => {
  e.preventDefault();
  e.stopPropagation();
  panel.classList.toggle("hidden");
  topBar.classList.toggle("hidden");
});

/* ================= GESTURES ================= */
let g = null;
overlayCanvas.addEventListener("touchstart", e => {
  // Prevent gesture handling if we just had a double-tap or UI was recently hidden
  const now = Date.now();
  if (locked || isDoubleTap || now < preventGestureUntil || (now - uiHiddenTime < 300)) {
    g = null;
    return;
  }
  
  const t = [...e.touches];
  g = {
    startPos: { ...pos },
    startScale: scale,
    startRot: rot,
    c0: center(t),
    d0: t.length>1 ? dist(t) : 0,
    a0: t.length>1 ? ang(t) : 0
  };
});

overlayCanvas.addEventListener("touchmove", e => {
  // Prevent gesture handling if we just had a double-tap or UI was recently hidden
  const now = Date.now();
  if (locked || !g || isDoubleTap || now < preventGestureUntil || (now - uiHiddenTime < 300)) {
    if (isDoubleTap || now < preventGestureUntil) {
      e.preventDefault();
      e.stopPropagation();
    }
    return;
  }
  e.preventDefault();
  const t = [...e.touches];
  const c = center(t);
  pos.x = g.startPos.x + (c.x - g.c0.x);
  pos.y = g.startPos.y + (c.y - g.c0.y);
  if (t.length > 1) {
    scale = g.startScale * (dist(t) / g.d0);
    rot = g.startRot + (ang(t) - g.a0);
  }
},{ passive:false });


function dist(t){return Math.hypot(t[1].clientX-t[0].clientX,t[1].clientY-t[0].clientY);}
function ang(t){return Math.atan2(t[1].clientY-t[0].clientY,t[1].clientX-t[0].clientX);}
function center(t){let x=0,y=0;t.forEach(p=>{x+=p.clientX;y+=p.clientY});return{x:x/t.length,y:y/t.length};}

/* ================= MOUSE GESTURES ================= */
let mouseG = null;
let isMouseDown = false;

overlayCanvas.addEventListener("mousedown", e => {
  if (locked) return;
  isMouseDown = true;
  const startX = e.clientX;
  const startY = e.clientY;
  mouseG = {
    startPos: { ...pos },
    startScale: scale,
    startRot: rot,
    startX: startX,
    startY: startY,
    isRotating: e.shiftKey || e.button === 2, // Shift key or right mouse button for rotation
    lastAngle: 0
  };
  e.preventDefault();
});

overlayCanvas.addEventListener("mousemove", e => {
  if (locked || !mouseG || !isMouseDown) return;
  e.preventDefault();
  
  const dx = e.clientX - mouseG.startX;
  const dy = e.clientY - mouseG.startY;
  
  if (mouseG.isRotating) {
    // Rotation: calculate angle from center
    const centerX = mouseG.startPos.x;
    const centerY = mouseG.startPos.y;
    const angle1 = Math.atan2(mouseG.startY - centerY, mouseG.startX - centerX);
    const angle2 = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    const deltaAngle = angle2 - angle1;
    rot = mouseG.startRot + deltaAngle;
  } else {
    // Translation: move the image
    pos.x = mouseG.startPos.x + dx;
    pos.y = mouseG.startPos.y + dy;
  }
});

overlayCanvas.addEventListener("mouseup", e => {
  isMouseDown = false;
  mouseG = null;
});

overlayCanvas.addEventListener("mouseleave", () => {
  isMouseDown = false;
  mouseG = null;
});

// Mouse wheel for scaling
overlayCanvas.addEventListener("wheel", e => {
  if (locked) return;
  e.preventDefault();
  
  const delta = e.deltaY > 0 ? 0.9 : 1.1; // Zoom out or zoom in
  const newScale = scale * delta;
  
  // Limit scale range
  if (newScale >= 0.1 && newScale <= 10) {
    // Scale from mouse position
    const rect = overlayCanvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Calculate scale relative to mouse position
    const scaleChange = newScale / scale;
    pos.x = mouseX - (mouseX - pos.x) * scaleChange;
    pos.y = mouseY - (mouseY - pos.y) * scaleChange;
    
    scale = newScale;
  }
}, { passive: false });

// Prevent context menu on right click (for rotation)
overlayCanvas.addEventListener("contextmenu", e => {
  e.preventDefault();
});

/* ================= GRID ================= */
function drawGrid() {
  gtx.clearRect(0,0,gridCanvas.width,gridCanvas.height);
  if (!showGrid) return;
  gtx.strokeStyle = "rgba(255,255,255,.15)";
  // Responsive grid spacing: smaller on mobile, larger on desktop
  const gridSpacing = Math.max(30, Math.min(60, Math.min(gridCanvas.width, gridCanvas.height) / 15));
  for(let i=0;i<gridCanvas.width;i+=gridSpacing){
    gtx.beginPath(); gtx.moveTo(i,0); gtx.lineTo(i,gridCanvas.height); gtx.stroke();
  }
  for(let i=0;i<gridCanvas.height;i+=gridSpacing){
    gtx.beginPath(); gtx.moveTo(0,i); gtx.lineTo(gridCanvas.width,i); gtx.stroke();
  }
}

/* ================= RENDER ================= */
function render() {
  if (!renderActive) return;
  ctx.clearRect(0,0,overlayCanvas.width,overlayCanvas.height);
  const src = mode==="sketch" ? sketchImg : img;
  if (src && src.complete && src.naturalWidth > 0) {
    ctx.save();
    ctx.translate(pos.x,pos.y);
    ctx.rotate(rot);
    ctx.globalAlpha = opacityVal;
    ctx.drawImage(
      src,
      -src.width*scale/2,
      -src.height*scale/2,
      src.width*scale,
      src.height*scale
    );
    ctx.restore();
  }
  drawGrid();
  requestAnimationFrame(render);
}
render();

/* ================= SCREEN SHARE ================= */
let peer, call;
let hostStream = null;
let isHosting = false;
let canvasStream = null;
let canvasStreamInterval = null;
let resizeHandler = null;

// Detect if device is mobile
function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         (window.innerWidth <= 768 && 'ontouchstart' in window);
}

// Detect if browser is Firefox
function isFirefox() {
  return navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
}

// Create a composite canvas stream (camera + overlay)
function createCompositeStream() {
  // Create a new canvas for compositing
  // Use camera's actual video dimensions with aspect ratio adjustments
  const compositeCanvas = document.createElement("canvas");
  const cameraWidth = camera.videoWidth || camera.clientWidth || window.innerWidth;
  const cameraHeight = camera.videoHeight || camera.clientHeight || window.innerHeight;
  // Use camera's actual dimensions (adjustments applied on viewer side only)
  compositeCanvas.width = cameraWidth;
  compositeCanvas.height = cameraHeight;
  const compositeCtx = compositeCanvas.getContext("2d");
  
  // Update canvas size if window resizes or camera dimensions change
  function updateCanvasSize() {
    const newCameraWidth = camera.videoWidth || camera.clientWidth || window.innerWidth;
    const newCameraHeight = camera.videoHeight || camera.clientHeight || window.innerHeight;
    if (compositeCanvas.width !== newCameraWidth || compositeCanvas.height !== newCameraHeight) {
      compositeCanvas.width = newCameraWidth;
      compositeCanvas.height = newCameraHeight;
    }
  }
  resizeHandler = updateCanvasSize;
  window.addEventListener("resize", resizeHandler);
  
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
    if (!isHosting || !camera.srcObject || camera.readyState !== 4) return;
    
    // Update canvas size if camera dimensions changed
    updateCanvasSize();
    
    // Clear and draw camera frame at its natural dimensions
    try {
      // Ensure canvas exactly matches camera video dimensions with adjustments
      const camWidth = camera.videoWidth;
      const camHeight = camera.videoHeight;
      
      if (camWidth && camHeight) {
        // Update canvas to match camera dimensions (no adjustments - done on viewer side)
        if (compositeCanvas.width !== camWidth || compositeCanvas.height !== camHeight) {
          compositeCanvas.width = camWidth;
          compositeCanvas.height = camHeight;
        }
        // Draw camera at its natural size
        compositeCtx.drawImage(camera, 0, 0);
      } else {
        // Fallback if dimensions not available
        compositeCtx.drawImage(camera, 0, 0, compositeCanvas.width, compositeCanvas.height);
      }
      
      // Draw overlay canvas on top (scale to match camera dimensions)
      const overlayScaleX = compositeCanvas.width / overlayCanvas.width;
      const overlayScaleY = compositeCanvas.height / overlayCanvas.height;
      compositeCtx.save();
      compositeCtx.scale(overlayScaleX, overlayScaleY);
      compositeCtx.drawImage(overlayCanvas, 0, 0);
      compositeCtx.restore();
      
      // Draw grid canvas on top (scale to match camera dimensions)
      compositeCtx.save();
      compositeCtx.scale(overlayScaleX, overlayScaleY);
      compositeCtx.drawImage(gridCanvas, 0, 0);
      compositeCtx.restore();
    } catch (e) {
      // Silently handle any drawing errors
      console.warn("Error drawing composite frame:", e);
    }
  }
  
  // Wait for camera to be ready, then start capturing
  function startCapturing() {
    if (camera.readyState === 4) {
      canvasStreamInterval = setInterval(drawCompositeFrame, 33); // ~30 FPS
    } else {
      camera.addEventListener("loadedmetadata", () => {
        if (isHosting && !canvasStreamInterval) {
          canvasStreamInterval = setInterval(drawCompositeFrame, 33);
        }
      }, { once: true });
    }
  }
  
  startCapturing();
  
  return stream;
}

function stopHosting() {
  if (call) {
    call.close();
    call = null;
  }
  if (hostStream) {
    hostStream.getTracks().forEach(track => track.stop());
    hostStream = null;
  }
  if (canvasStreamInterval) {
    clearInterval(canvasStreamInterval);
    canvasStreamInterval = null;
  }
  if (canvasStream) {
    canvasStream.getTracks().forEach(track => track.stop());
    canvasStream = null;
  }
  if (resizeHandler) {
    window.removeEventListener("resize", resizeHandler);
    resizeHandler = null;
  }
  isHosting = false;
  shareId.textContent = "";
  shareId.className = "";
  document.getElementById("shareLinkContainer").classList.add("hidden");
  document.getElementById("shareLinkInput").value = "";
  
  // Re-enable host button
  const hostBtn = document.getElementById("hostBtn");
  if (hostBtn) {
    hostBtn.disabled = false;
    hostBtn.classList.remove("disabled");
  }
  
  // Stop recording if active
  if (isRecording) {
    stopRecordingTimelapse();
  }
}

async function host() {
  if (isHosting) {
    alert("Already hosting. Please stop the current session first.");
    return;
  }
  
  // Clean up any existing peer
  if (peer) {
    peer.destroy();
  }
  
  // Ensure camera is started
  if (!camera.srcObject) {
    startCamera();
  }
  
  isHosting = true;
  shareId.textContent = "Starting host...";
  shareId.className = "warning";
  
  // Disable host button
  const hostBtn = document.getElementById("hostBtn");
  if (hostBtn) {
    hostBtn.disabled = true;
    hostBtn.classList.add("disabled");
  }
  
  try {
    // Check if device is mobile or if getDisplayMedia is not available
    const isMobile = isMobileDevice();
    const hasDisplayMedia = navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia;
    
    if (isMobile || !hasDisplayMedia) {
      // For mobile devices, use canvas capture instead
      // Wait a bit for camera to be ready
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (!camera.srcObject) {
        throw new Error("Camera not available. Please ensure camera permissions are granted.");
      }
      
      // Create composite stream from canvas
      hostStream = createCompositeStream();
      canvasStream = hostStream;
      
    } else {
      // Desktop: Use screen sharing
      // Firefox requires absolute minimal constraints and direct call from user gesture
      // IMPORTANT: Call getDisplayMedia() immediately while still in user gesture context
      const isFirefoxBrowser = isFirefox();
      
      if (isFirefoxBrowser) {
        // Firefox: Try different constraint approaches to enable window picker
        // Note: If "Select window or screen" is disabled, Firefox needs Screen Recording
        // permission in System Settings > Privacy & Security > Screen Recording
        console.log("Firefox: Requesting screen share with minimal constraints");
        try {
          // First try with no constraints to let Firefox show its native picker
          hostStream = await navigator.mediaDevices.getDisplayMedia({});
          console.log("Firefox: Screen share successful with empty constraints");
        } catch (err) {
          // If empty object fails, try with video: true
          console.log("Firefox: Empty constraints failed, trying video: true", err);
          hostStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          console.log("Firefox: Screen share successful with video: true");
        }
      } else {
        // Chrome/others: Use full constraints
        hostStream = await navigator.mediaDevices.getDisplayMedia({
          video: { 
            cursor: "always",
            displaySurface: "monitor"
          },
          audio: false 
        });
      }
      
      // Handle when user stops sharing
      if (hostStream && hostStream.getVideoTracks().length > 0) {
        hostStream.getVideoTracks()[0].onended = () => {
          stopHosting();
        };
      }
    }
    
    // Generate 6-character shareable code first
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars
    let shareCode = '';
    for (let i = 0; i < 6; i++) {
      shareCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Use the code as PeerJS custom ID
    peer = new Peer(shareCode, {
      debug: 2,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      }
    });
    
    peer.on("error", (err) => {
      console.error("Peer error:", err);
      shareId.textContent = "Error: " + err.message;
      shareId.className = "error";
      document.getElementById("shareLinkContainer").classList.add("hidden");
      isHosting = false;
      
      // Re-enable host button on error
      const hostBtn = document.getElementById("hostBtn");
      if (hostBtn) {
        hostBtn.disabled = false;
        hostBtn.classList.remove("disabled");
      }
    });
    
    peer.on("call", (incomingCall) => {
      if (hostStream) {
        incomingCall.answer(hostStream);
        call = incomingCall;
        
        call.on("close", () => {
          console.log("Call closed");
        });
        
        call.on("error", (err) => {
          console.error("Call error:", err);
        });
      } else {
        console.error("No stream available to answer call");
        incomingCall.close();
      }
    });
    
    peer.on("open", (id) => {
      // id will be the shareCode we set
      const code = id;
      
      // Generate shareable link with short code
      const shareLink = `${window.location.origin}${window.location.pathname}?join=${code}`;
      const shareLinkInput = document.getElementById("shareLinkInput");
      const shareLinkContainer = document.getElementById("shareLinkContainer");
      
      shareLinkInput.value = shareLink;
      shareLinkContainer.classList.remove("hidden");
      
      if (isMobile || !hasDisplayMedia) {
        shareId.textContent = `Share Code: ${code} (Mobile Mode)`;
      } else {
        shareId.textContent = `Share Code: ${code}`;
      }
      shareId.className = "success";
      
      // Answer incoming calls with the stream we already have
      if (hostStream) {
        // Stream is already set up, ready to accept calls
      } else {
        console.error("No stream available when peer opened");
        stopHosting();
      }
    });
    
  } catch (err) {
    console.error("Error getting media stream:", err);
    isHosting = false;
    shareId.textContent = "Error: Could not start sharing";
    shareId.className = "error";
    document.getElementById("shareLinkContainer").classList.add("hidden");
    
    // Re-enable host button on error
    const hostBtn = document.getElementById("hostBtn");
    if (hostBtn) {
      hostBtn.disabled = false;
      hostBtn.classList.remove("disabled");
    }
    
    // Check for Firefox-specific error message first (before checking error names)
    if (err.message && (err.message.includes("can not be found here") || err.message.includes("The object can not be found here"))) {
      // Firefox-specific error for unsupported constraints
      alert("Screen sharing failed. If the window list is empty, please grant Screen Recording permission in System Preferences > Security & Privacy > Privacy > Screen Recording, then restart Firefox.");
    } else if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
      alert("Permission denied. Please allow camera/screen sharing access.");
    } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
      alert("No camera found. Please ensure your device has a camera.");
    } else {
      alert("Could not start sharing: " + err.message);
    }
  }
}

function join(idOrLink) {
  // Clean up any existing peer
  if (peer) {
    peer.destroy();
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
  
  shareId.textContent = "Connecting...";
  shareId.className = "warning";
  
  peer = new Peer({
    debug: 2,
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    }
  });
  
  peer.on("open", () => {
    console.log("Joining with code/ID:", id);
    
    // Use the code/ID directly (if it's 6 chars, it's a custom PeerJS ID)
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
        call = peer.call(peerIdToCall, stream);
        
        if (!call) {
          throw new Error("Could not initiate call");
        }
        
        call.on("stream", (remoteStream) => {
          console.log("Received remote stream");
          // Stop the dummy stream once we get the real stream
          stream.getTracks().forEach(track => track.stop());
          enterViewerMode(remoteStream);
        });
        
        call.on("close", () => {
          console.log("Call closed");
          stream.getTracks().forEach(track => track.stop());
          shareId.textContent = "Connection lost";
          shareId.className = "error";
          setTimeout(() => {
            alert("Connection to host lost");
            location.reload();
          }, 500);
        });
        
        call.on("error", (err) => {
          console.error("Call error:", err);
          stream.getTracks().forEach(track => track.stop());
          shareId.textContent = "Connection error";
          shareId.className = "error";
          setTimeout(() => {
            alert("Connection error: " + err.message);
            location.reload();
          }, 500);
        });
      } catch (err) {
        console.error("Error initiating call:", err);
        stream.getTracks().forEach(track => track.stop());
        shareId.textContent = "Connection failed";
        shareId.className = "error";
        setTimeout(() => {
          alert("Could not connect to host. Please check the Share ID and try again.");
          camera.classList.add("hidden");
          overlayCanvas.classList.add("hidden");
          gridCanvas.classList.add("hidden");
          panel.classList.add("hidden");
          topBar.classList.add("hidden");
          joinScreen.classList.remove("hidden");
        }, 500);
      }
    }, 100);
  });
  
  peer.on("error", (err) => {
    console.error("Peer error:", err);
    shareId.textContent = "Connection error";
    shareId.className = "error";
    setTimeout(() => {
      alert("Connection error: " + err.message);
      camera.classList.add("hidden");
      overlayCanvas.classList.add("hidden");
      gridCanvas.classList.add("hidden");
      panel.classList.add("hidden");
      topBar.classList.add("hidden");
      joinScreen.classList.remove("hidden");
    }, 500);
  });
}

function enterViewerMode(stream) {
  appMode = "viewer";
  renderActive = false;

  if (camera.srcObject) {
    camera.srcObject.getTracks().forEach(t => t.stop());
    camera.srcObject = null;
  }

  panel.classList.add("hidden");
  topBar.classList.add("hidden");
  overlayCanvas.classList.add("hidden");
  gridCanvas.classList.add("hidden");

  remoteVideo.srcObject = stream;
  remoteVideo.muted = true;
  remoteVideo.play();
  
  // Initialize video size and zoom/pan state when video metadata is loaded
  function handleVideoReady() {
    // Wait a bit for video dimensions to be available
    if (remoteVideo.videoWidth && remoteVideo.videoHeight) {
      // Force recalculation with current adjustment values
      initViewerZoomPan();
    } else {
      // Retry if dimensions not ready yet
      setTimeout(handleVideoReady, 100);
    }
  }
  
  remoteVideo.onloadedmetadata = handleVideoReady;
  remoteVideo.onloadeddata = handleVideoReady;
  remoteVideo.onresize = handleVideoReady;
  
  // Also try to initialize if video is already loaded
  if (remoteVideo.readyState >= 1) {
    setTimeout(handleVideoReady, 100);
  }
  
  // Recalculate on resize (preserve zoom/pan)
  let viewerResizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(viewerResizeTimeout);
    viewerResizeTimeout = setTimeout(() => {
      if (appMode === 'viewer' && remoteVideo.videoWidth && remoteVideo.videoHeight) {
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
    if (appMode === 'viewer' && remoteVideo.videoWidth && remoteVideo.videoHeight) {
      updateViewerDimensions();
    }
  }, 500);
  
  remoteVideoContainer.classList.remove("hidden");
  
  shareId.textContent = "Connected to host";
  shareId.className = "success";
}

// ================= VIEWER ZOOM/PAN =================
const remoteVideoContainer = document.getElementById("remoteVideoContainer");
const remoteVideo = document.getElementById("remoteVideo");
let viewerZoom = 1;
let viewerPanX = 0;
let viewerPanY = 0;
let viewerG = null;

// ================= ASPECT RATIO ADJUSTMENT =================
// Adjust these values to fine-tune aspect ratio matching
// These multipliers adjust the aspect ratio calculation (not cropping)
// Values > 1.0 make it wider/taller, values < 1.0 make it narrower/shorter
// Example: 1.05 = 5% wider aspect ratio, 0.95 = 5% narrower aspect ratio
const ASPECT_WIDTH_MULTIPLIER = 1.0;   // Multiply width aspect (e.g., 0.95, 1.0, 1.05)
const ASPECT_HEIGHT_MULTIPLIER = 1.3; // Multiply height aspect (e.g., 0.95, 1.0, 1.05)

function updateViewerDimensions() {
  // Update dimensions without resetting zoom/pan
  const video = remoteVideo;
  const container = remoteVideoContainer;
  
  if (video.videoWidth && video.videoHeight) {
    // Apply aspect ratio multipliers (stretches/compresses, doesn't crop)
    const originalAspect = video.videoWidth / video.videoHeight;
    const adjustedAspect = (originalAspect * ASPECT_WIDTH_MULTIPLIER) / ASPECT_HEIGHT_MULTIPLIER;
    const containerAspect = container.clientWidth / container.clientHeight;
    
    // Calculate size to fit container while using adjusted aspect ratio
    let displayWidth, displayHeight;
    
    if (adjustedAspect > containerAspect) {
      // Video is wider - fit to width
      displayWidth = container.clientWidth;
      displayHeight = displayWidth / adjustedAspect;
    } else {
      // Video is taller - fit to height
      displayHeight = container.clientHeight;
      displayWidth = displayHeight * adjustedAspect;
    }
    
    // Store display dimensions for transform calculations
    video._displayWidth = displayWidth;
    video._displayHeight = displayHeight;
    
    // Set dimensions with adjusted aspect ratio (will stretch/compress to match)
    video.style.width = displayWidth + 'px';
    video.style.height = displayHeight + 'px';
    video.style.objectFit = 'fill'; // Fill dimensions (stretch/compress, no cropping)
  }
  
  updateViewerTransform();
}

function initViewerZoomPan() {
  // Reset zoom and pan only on initial setup
  viewerZoom = 1;
  viewerPanX = 0;
  viewerPanY = 0;
  
  // Update dimensions
  updateViewerDimensions();
}

function updateViewerTransform() {
  const video = remoteVideo;
  
  // Get the actual display dimensions
  const displayWidth = video._displayWidth || video.clientWidth || video.videoWidth;
  const displayHeight = video._displayHeight || video.clientHeight || video.videoHeight;
  
  // Calculate transform: center the video, then apply pan and zoom
  // The video is positioned at 50%, 50%, so we translate by -50% to center it
  // Then add pan offset and apply zoom
  const translateX = -50 + (viewerPanX / displayWidth * 100);
  const translateY = -50 + (viewerPanY / displayHeight * 100);
  
  video.style.transform = `translate(${translateX}%, ${translateY}%) scale(${viewerZoom})`;
}

// Helper functions (same as host session)
function viewerDist(t){return Math.hypot(t[1].clientX-t[0].clientX,t[1].clientY-t[0].clientY);}
function viewerCenter(t){let x=0,y=0;t.forEach(p=>{x+=p.clientX;y+=p.clientY});return{x:x/t.length,y:y/t.length};}

// Touch gesture handlers for viewer (exactly like host session)
remoteVideoContainer.addEventListener("touchstart", e => {
  const t = [...e.touches];
  viewerG = {
    startPanX: viewerPanX,
    startPanY: viewerPanY,
    startZoom: viewerZoom,
    c0: viewerCenter(t),
    d0: t.length>1 ? viewerDist(t) : 0
  };
});

remoteVideoContainer.addEventListener("touchmove", e => {
  if (!viewerG) return;
  e.preventDefault();
  const t = [...e.touches];
  const c = viewerCenter(t);
  viewerPanX = viewerG.startPanX + (c.x - viewerG.c0.x);
  viewerPanY = viewerG.startPanY + (c.y - viewerG.c0.y);
  if (t.length > 1) {
    const newDist = viewerDist(t);
    if (viewerG.d0 > 0) {
      const newZoom = viewerG.startZoom * (newDist / viewerG.d0);
      // Limit zoom range (0.5x to 5x)
      if (newZoom >= 0.5 && newZoom <= 5) {
        viewerZoom = newZoom;
      }
    }
  }
  updateViewerTransform();
}, { passive: false });

remoteVideoContainer.addEventListener("touchend", e => {
  if (e.touches.length === 0) {
    viewerG = null;
  }
});

// Mouse wheel zoom for desktop
remoteVideoContainer.addEventListener('wheel', (e) => {
  e.preventDefault();
  
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  const newZoom = viewerZoom * delta;
  
  if (newZoom >= 0.5 && newZoom <= 5) {
    const container = remoteVideoContainer;
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const containerCenterX = container.clientWidth / 2;
    const containerCenterY = container.clientHeight / 2;
    
    const zoomPointX = mouseX - containerCenterX;
    const zoomPointY = mouseY - containerCenterY;
    
    const oldZoom = viewerZoom;
    viewerZoom = newZoom;
    
    // Adjust pan to zoom towards mouse position
    const zoomRatio = viewerZoom / oldZoom;
    viewerPanX = viewerPanX - (zoomPointX * (zoomRatio - 1));
    viewerPanY = viewerPanY - (zoomPointY * (zoomRatio - 1));
    
    // Constrain pan
    const video = remoteVideo;
    const videoRect = video.getBoundingClientRect();
    const videoWidth = videoRect.width || video.videoWidth || container.clientWidth;
    const videoHeight = videoRect.height || video.videoHeight || container.clientHeight;
    const scaledWidth = videoWidth * viewerZoom;
    const scaledHeight = videoHeight * viewerZoom;
    const maxPanX = Math.max(0, (scaledWidth - container.clientWidth) / 2);
    const maxPanY = Math.max(0, (scaledHeight - container.clientHeight) / 2);
    
    viewerPanX = Math.max(-maxPanX, Math.min(maxPanX, viewerPanX));
    viewerPanY = Math.max(-maxPanY, Math.min(maxPanY, viewerPanY));
    
    updateViewerTransform();
  }
}, { passive: false });

// Mouse drag for pan on desktop
let viewerMouseDown = false;
let viewerMouseStart = { x: 0, y: 0 };

remoteVideoContainer.addEventListener('mousedown', (e) => {
  viewerMouseDown = true;
  viewerMouseStart = {
    x: e.clientX,
    y: e.clientY,
    startPanX: viewerPanX,
    startPanY: viewerPanY
  };
  e.preventDefault();
});

remoteVideoContainer.addEventListener('mousemove', (e) => {
  if (!viewerMouseDown) return;
  e.preventDefault();
  
  const deltaX = e.clientX - viewerMouseStart.x;
  const deltaY = e.clientY - viewerMouseStart.y;
  
  viewerPanX = viewerMouseStart.startPanX + deltaX;
  viewerPanY = viewerMouseStart.startPanY + deltaY;
  
  // Constrain pan
  const video = remoteVideo;
  const container = remoteVideoContainer;
  const videoRect = video.getBoundingClientRect();
  const videoWidth = videoRect.width || video.videoWidth || container.clientWidth;
  const videoHeight = videoRect.height || video.videoHeight || container.clientHeight;
  const scaledWidth = videoWidth * viewerZoom;
  const scaledHeight = videoHeight * viewerZoom;
  const maxPanX = Math.max(0, (scaledWidth - container.clientWidth) / 2);
  const maxPanY = Math.max(0, (scaledHeight - container.clientHeight) / 2);
  
  viewerPanX = Math.max(-maxPanX, Math.min(maxPanX, viewerPanX));
  viewerPanY = Math.max(-maxPanY, Math.min(maxPanY, viewerPanY));
  
  updateViewerTransform();
});

remoteVideoContainer.addEventListener('mouseup', () => {
  viewerMouseDown = false;
});

remoteVideoContainer.addEventListener('mouseleave', () => {
  viewerMouseDown = false;
});



// ================= COPY TO CLIPBOARD =================
const copyBtn = document.getElementById("copyBtn");
const shareLinkInput = document.getElementById("shareLinkInput");

copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(shareLinkInput.value);
    const originalText = copyBtn.textContent;
    copyBtn.textContent = "✓ Copied!";
    copyBtn.classList.add("copied");
    
    setTimeout(() => {
      copyBtn.textContent = originalText;
      copyBtn.classList.remove("copied");
    }, 2000);
  } catch (err) {
    // Fallback for older browsers
    shareLinkInput.select();
    document.execCommand("copy");
    const originalText = copyBtn.textContent;
    copyBtn.textContent = "✓ Copied!";
    copyBtn.classList.add("copied");
    
    setTimeout(() => {
      copyBtn.textContent = originalText;
      copyBtn.classList.remove("copied");
    }, 2000);
  }
});

// ================= SESSION SAVE/LOAD =================
let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;
let recordingStream = null;
let recordingCompositeCanvas = null;
let recordingCompositeCtx = null;
let recordingInterval = null;
let recordingMode = "timelapse"; // "timelapse" or "full"
let recordingIntervalSeconds = 1; // Interval in seconds for timelapse
let timelapseFrames = []; // Store frames for timelapse
let timelapseCaptureInterval = null;

// Save current session state
function saveSession() {
  if (!img.src) {
    alert("No image loaded to save.");
    return;
  }
  
  const sessionData = {
    imageData: img.src,
    sketchImageData: sketchImg ? sketchImg.src : null,
    position: { x: pos.x, y: pos.y },
    scale: scale,
    rotation: rot,
    opacity: opacityVal,
    mode: mode,
    locked: locked,
    showGrid: showGrid,
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
    
    shareId.textContent = "Session saved successfully!";
    shareId.className = "success";
    setTimeout(() => {
      shareId.textContent = "";
      shareId.className = "";
    }, 3000);
  } catch (err) {
    console.error("Error saving session:", err);
    alert("Error saving session: " + err.message);
  }
}

// Load saved session
function loadSession() {
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
          img.src = sessionData.imageData;
          img.onload = () => {
            if (sessionData.sketchImageData) {
              sketchImg = new Image();
              sketchImg.src = sessionData.sketchImageData;
            } else {
              makeSketch();
            }
            
            // Restore state
            pos.x = sessionData.position.x;
            pos.y = sessionData.position.y;
            scale = sessionData.scale || 1;
            rot = sessionData.rotation || 0;
            opacityVal = sessionData.opacity || 0.6;
            mode = sessionData.mode || "image";
            locked = sessionData.locked || false;
            showGrid = sessionData.showGrid || false;
            
            // Update UI
            opacity.value = opacityVal;
            lockBtn.textContent = locked ? "🔒 Locked" : "🔓 Move";
            
            shareId.textContent = "Session loaded successfully!";
            shareId.className = "success";
            setTimeout(() => {
              shareId.textContent = "";
              shareId.className = "";
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
function tryLoadFromLocalStorage() {
  try {
    const saved = localStorage.getItem('muraly_session');
    if (saved) {
      const sessionData = JSON.parse(saved);
      if (sessionData.imageData) {
        img.src = sessionData.imageData;
        img.onload = () => {
          if (sessionData.sketchImageData) {
            sketchImg = new Image();
            sketchImg.src = sessionData.sketchImageData;
          } else {
            makeSketch();
          }
          
          pos.x = sessionData.position.x;
          pos.y = sessionData.position.y;
          scale = sessionData.scale || 1;
          rot = sessionData.rotation || 0;
          opacityVal = sessionData.opacity || 0.6;
          mode = sessionData.mode || "image";
          locked = sessionData.locked || false;
          showGrid = sessionData.showGrid || false;
          
          opacity.value = opacityVal;
          lockBtn.textContent = locked ? "🔒 Locked" : "🔓 Move";
        };
      }
    }
  } catch (err) {
    console.warn("Could not load from localStorage:", err);
  }
}

// Create recording canvas and stream
function createRecordingStream() {
  if (recordingCompositeCanvas) {
    // Feature detection for captureStream
    if (typeof recordingCompositeCanvas.captureStream === 'function') {
      return recordingCompositeCanvas.captureStream(30);
    } else if (typeof recordingCompositeCanvas.mozCaptureStream === 'function') {
      return recordingCompositeCanvas.mozCaptureStream(30);
    } else {
      throw new Error("Canvas captureStream not supported in this browser");
    }
  }
  
  recordingCompositeCanvas = document.createElement("canvas");
  recordingCompositeCanvas.width = overlayCanvas.width || window.innerWidth;
  recordingCompositeCanvas.height = overlayCanvas.height || window.innerHeight;
  recordingCompositeCtx = recordingCompositeCanvas.getContext("2d");
  
  // Update canvas size if window resizes
  function updateRecordingCanvasSize() {
    recordingCompositeCanvas.width = overlayCanvas.width || window.innerWidth;
    recordingCompositeCanvas.height = overlayCanvas.height || window.innerHeight;
  }
  window.addEventListener("resize", updateRecordingCanvasSize);
  
  // Feature detection for captureStream
  if (typeof recordingCompositeCanvas.captureStream === 'function') {
    return recordingCompositeCanvas.captureStream(30);
  } else if (typeof recordingCompositeCanvas.mozCaptureStream === 'function') {
    return recordingCompositeCanvas.mozCaptureStream(30);
  } else {
    throw new Error("Canvas captureStream not supported in this browser");
  }
}

// Start recording (timelapse or full video)
function startRecordingTimelapse() {
  if (isRecording) {
    stopRecordingTimelapse();
    return;
  }
  
  if (!camera.srcObject || camera.readyState !== 4) {
    alert("Camera not ready. Please ensure camera is active.");
    return;
  }
  
  if (!img.src) {
    alert("No image loaded. Please upload an image first.");
    return;
  }
  
  // Get recording mode and interval
  const recordModeSelect = document.getElementById("recordMode");
  recordingMode = recordModeSelect ? recordModeSelect.value : "timelapse";
  
  if (recordingMode === "timelapse") {
    const customIntervalInput = document.getElementById("customInterval");
    recordingIntervalSeconds = customIntervalInput ? parseFloat(customIntervalInput.value) || 1 : 1;
    
    if (recordingIntervalSeconds < 0.1) {
      alert("Interval must be at least 0.1 seconds.");
      return;
    }
  }
  
  try {
    if (recordingMode === "full") {
      // Full video recording - continuous
      startFullVideoRecording();
    } else {
      // Timelapse recording - capture frames at intervals
      startTimelapseRecording();
    }
  } catch (err) {
    console.error("Error starting recording:", err);
    alert("Error starting recording: " + err.message);
  }
}

// Start full video recording (continuous)
function startFullVideoRecording() {
  recordingStream = createRecordingStream();
  
  // Check for MediaRecorder support
  if (!window.MediaRecorder) {
    alert("MediaRecorder API not supported in this browser.");
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
  
  mediaRecorder = new MediaRecorder(recordingStream, {
    ...options,
    videoBitsPerSecond: 5000000 // High quality: 5 Mbps
  });
  
  recordedChunks = [];
  
  mediaRecorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };
  
  mediaRecorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: options.mimeType || 'video/webm' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.download = `muraly_video_${timestamp}.${options.mimeType.includes('mp4') ? 'mp4' : 'webm'}`;
    link.click();
    URL.revokeObjectURL(url);
    
    recordedChunks = [];
    
    shareId.textContent = "Video saved!";
    shareId.className = "success";
    setTimeout(() => {
      shareId.textContent = "";
      shareId.className = "";
    }, 3000);
  };
  
  mediaRecorder.onerror = (event) => {
    console.error("MediaRecorder error:", event);
    alert("Error recording: " + event.error);
    stopRecordingTimelapse();
  };
  
  // Start recording
  mediaRecorder.start(1000); // Collect data every second
  
  // Draw frames to recording canvas continuously
  function drawRecordingFrame() {
    if (!isRecording || !camera.srcObject || camera.readyState !== 4) return;
    
    try {
      // Update canvas size if needed
      if (recordingCompositeCanvas.width !== overlayCanvas.width || 
          recordingCompositeCanvas.height !== overlayCanvas.height) {
        recordingCompositeCanvas.width = overlayCanvas.width || window.innerWidth;
        recordingCompositeCanvas.height = overlayCanvas.height || window.innerHeight;
      }
      
      // Draw camera frame
      recordingCompositeCtx.drawImage(camera, 0, 0, recordingCompositeCanvas.width, recordingCompositeCanvas.height);
      
      // Draw overlay canvas on top
      recordingCompositeCtx.drawImage(overlayCanvas, 0, 0);
      
      // Draw grid canvas on top
      recordingCompositeCtx.drawImage(gridCanvas, 0, 0);
    } catch (e) {
      console.warn("Error drawing recording frame:", e);
    }
  }
  
  recordingInterval = setInterval(drawRecordingFrame, 33); // ~30 FPS
  
  isRecording = true;
  const recordBtn = document.getElementById("recordTimelapseBtn");
  if (recordBtn) {
    recordBtn.textContent = "⏹ Stop Recording";
    recordBtn.classList.add("danger");
  }
  
  shareId.textContent = "Recording video...";
  shareId.className = "warning";
}

// Start timelapse recording (capture frames at intervals)
function startTimelapseRecording() {
  timelapseFrames = [];
  
  // Create canvas for capturing frames
  if (!recordingCompositeCanvas) {
    recordingCompositeCanvas = document.createElement("canvas");
    recordingCompositeCanvas.width = overlayCanvas.width || window.innerWidth;
    recordingCompositeCanvas.height = overlayCanvas.height || window.innerHeight;
    recordingCompositeCtx = recordingCompositeCanvas.getContext("2d");
  }
  
  // Function to capture a frame
  function captureFrame() {
    if (!isRecording || !camera.srcObject || camera.readyState !== 4) return;
    
    try {
      // Update canvas size if needed
      if (recordingCompositeCanvas.width !== overlayCanvas.width || 
          recordingCompositeCanvas.height !== overlayCanvas.height) {
        recordingCompositeCanvas.width = overlayCanvas.width || window.innerWidth;
        recordingCompositeCanvas.height = overlayCanvas.height || window.innerHeight;
      }
      
      // Draw camera frame
      recordingCompositeCtx.drawImage(camera, 0, 0, recordingCompositeCanvas.width, recordingCompositeCanvas.height);
      
      // Draw overlay canvas on top
      recordingCompositeCtx.drawImage(overlayCanvas, 0, 0);
      
      // Draw grid canvas on top
      recordingCompositeCtx.drawImage(gridCanvas, 0, 0);
      
      // Capture frame as image data
      const frameData = recordingCompositeCanvas.toDataURL('image/png');
      timelapseFrames.push(frameData);
      
      // Update status
      shareId.textContent = `Recording timelapse... (${timelapseFrames.length} frames)`;
      shareId.className = "warning";
    } catch (e) {
      console.warn("Error capturing frame:", e);
    }
  }
  
  // Capture first frame immediately
  captureFrame();
  
  // Capture frames at specified interval
  const intervalMs = recordingIntervalSeconds * 1000;
  timelapseCaptureInterval = setInterval(captureFrame, intervalMs);
  
  isRecording = true;
  const recordBtn = document.getElementById("recordTimelapseBtn");
  if (recordBtn) {
    recordBtn.textContent = "⏹ Stop Recording";
    recordBtn.classList.add("danger");
  }
  
  shareId.textContent = `Recording timelapse (${recordingIntervalSeconds}s interval)...`;
  shareId.className = "warning";
}

// Stop recording timelapse
function stopRecordingTimelapse() {
  if (!isRecording) return;
  
  isRecording = false;
  
  if (recordingMode === "full") {
    // Stop full video recording
    if (recordingInterval) {
      clearInterval(recordingInterval);
      recordingInterval = null;
    }
    
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    
    if (recordingStream) {
      recordingStream.getTracks().forEach(track => track.stop());
      recordingStream = null;
    }
  } else {
    // Stop timelapse recording and compile frames
    if (timelapseCaptureInterval) {
      clearInterval(timelapseCaptureInterval);
      timelapseCaptureInterval = null;
    }
    
    if (timelapseFrames.length === 0) {
      shareId.textContent = "No frames captured";
      shareId.className = "error";
      const recordBtn = document.getElementById("recordTimelapseBtn");
      if (recordBtn) {
        recordBtn.textContent = "🎬 Start Recording";
        recordBtn.classList.remove("danger");
      }
      return;
    }
    
    shareId.textContent = `Processing ${timelapseFrames.length} frames...`;
    shareId.className = "warning";
    
    // Compile timelapse frames into video
    compileTimelapseVideo();
  }
  
  const recordBtn = document.getElementById("recordTimelapseBtn");
  if (recordBtn) {
    recordBtn.textContent = "🎬 Start Recording";
    recordBtn.classList.remove("danger");
  }
}

// Compile timelapse frames into a video
function compileTimelapseVideo() {
  if (timelapseFrames.length === 0) return;
  
  // Create a canvas for video frames
  const videoCanvas = document.createElement("canvas");
  videoCanvas.width = recordingCompositeCanvas.width;
  videoCanvas.height = recordingCompositeCanvas.height;
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
    alert("MediaRecorder API not supported in this browser.");
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
  
  mediaRecorder = new MediaRecorder(stream, {
    ...options,
    videoBitsPerSecond: 5000000 // High quality: 5 Mbps
  });
  
  recordedChunks = [];
  
  mediaRecorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };
  
  const totalFrames = timelapseFrames.length;
  
  mediaRecorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: options.mimeType || 'video/webm' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.download = `muraly_timelapse_${timestamp}.${options.mimeType.includes('mp4') ? 'mp4' : 'webm'}`;
    link.click();
    URL.revokeObjectURL(url);
    
    recordedChunks = [];
    timelapseFrames = [];
    
    shareId.textContent = `Timelapse video saved! (${totalFrames} frames)`;
    shareId.className = "success";
    setTimeout(() => {
      shareId.textContent = "";
      shareId.className = "";
    }, 3000);
  };
  
  mediaRecorder.onerror = (event) => {
    console.error("MediaRecorder error:", event);
    alert("Error compiling video: " + event.error);
    timelapseFrames = [];
  };
  
  // Start recording
  mediaRecorder.start();
  
  // Draw frames to canvas at 30 FPS
  let frameIndex = 0;
  const frameDuration = 1000 / 30; // ~33ms per frame at 30 FPS
  
  function drawNextFrame() {
    if (frameIndex >= timelapseFrames.length) {
      mediaRecorder.stop();
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
    img.src = timelapseFrames[frameIndex];
  }
  
  // Start drawing frames
  drawNextFrame();
}

// Event listeners for save/load/record buttons
document.getElementById("saveSessionBtn").onclick = saveSession;
document.getElementById("loadSessionBtn").onclick = loadSession;
document.getElementById("recordTimelapseBtn").onclick = startRecordingTimelapse;

// Event listeners for recording mode and interval
const recordModeSelect = document.getElementById("recordMode");
const timelapseOptions = document.getElementById("timelapseOptions");
const interval1sBtn = document.getElementById("interval1sBtn");
const customIntervalInput = document.getElementById("customInterval");

// Show/hide timelapse options based on mode
if (recordModeSelect) {
  recordModeSelect.addEventListener("change", (e) => {
    recordingMode = e.target.value;
    if (timelapseOptions) {
      timelapseOptions.style.display = recordingMode === "timelapse" ? "flex" : "none";
    }
  });
  
  // Initialize visibility
  if (timelapseOptions) {
    timelapseOptions.style.display = recordingMode === "timelapse" ? "flex" : "none";
  }
}

// 1 second interval button
if (interval1sBtn) {
  interval1sBtn.onclick = () => {
    if (customIntervalInput) {
      customIntervalInput.value = "1";
      recordingIntervalSeconds = 1;
    }
  };
}

// Custom interval input
if (customIntervalInput) {
  customIntervalInput.addEventListener("input", (e) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0.1) {
      recordingIntervalSeconds = value;
    }
  });
  
  customIntervalInput.addEventListener("change", (e) => {
    const value = parseFloat(e.target.value);
    if (isNaN(value) || value < 0.1) {
      e.target.value = "1";
      recordingIntervalSeconds = 1;
    }
  });
}

// Cleanup on page unload
window.addEventListener("beforeunload", () => {
  if (isRecording) {
    stopRecordingTimelapse();
  }
});

// ================= CHECK URL PARAMETERS =================
window.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const joinId = urlParams.get("join");
  
  if (joinId) {
    // Automatically join if join parameter is in URL
    firstScreen.classList.add("hidden");
    joinScreen.classList.add("hidden");
    camera.classList.remove("hidden");
    overlayCanvas.classList.remove("hidden");
    gridCanvas.classList.remove("hidden");
    panel.classList.remove("hidden");
    topBar.classList.remove("hidden");
    join(joinId);
  }
  // Don't auto-load from localStorage on page load - only when user enters host mode
});

// Clean up code mappings when page unloads
window.addEventListener("beforeunload", () => {
  codeToPeerIdMap = {};
  peerIdToCodeMap = {};
});

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registered:', registration);
      })
      .catch((error) => {
        console.log('Service Worker registration failed:', error);
      });
  });
}
