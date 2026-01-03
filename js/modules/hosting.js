// ================= SCREEN SHARE / HOSTING =================
import { state } from './state.js';
import { dom } from './dom.js';
import { startCamera } from './camera.js';
import { isMobileDevice, isFirefox } from './utils.js';
import { enterViewerMode } from './viewer.js';
import { stopRecordingTimelapse } from './recording.js';
import { registerSession, unregisterSession } from './discovery.js';
import { showAlert, showChoiceDialog, showPinInputDialog, showNameInputDialog } from './alert.js';
import { updateParticipantsList } from './ui-controls.js';

// Helper function to safely update shareId status (handles missing element)
function updateShareIdStatus(text, className = "") {
  if (dom.shareId) {
    dom.shareId.textContent = text;
    dom.shareId.className = className;
  }
  console.log(`Status: ${text} (${className})`);
}

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

// Helper function to generate auto participant name
function generateParticipantName() {
  state.participantCounter++;
  return `Participant ${state.participantCounter}`;
}

// Helper function to add a participant
function addParticipant(call, peerId, participantName = null, dataConnection = null) {
  const friendlyName = participantName || generateParticipantName();
  const participant = {
    peerId: peerId,
    friendlyName: friendlyName,
    connectedAt: Date.now(),
    call: call,
    dataConnection: dataConnection
  };
  
  state.participants.push(participant);
  state.activeConnections.push(call);
  
  // Also set state.call for backward compatibility (use last connection)
  state.call = call;
  
  console.log(`Participant added: ${friendlyName} (${peerId})`);
  
  // Update UI
  updateParticipantsList();
  
  return participant;
}

// Helper function to remove a participant
function removeParticipant(peerId) {
  const index = state.participants.findIndex(p => p.peerId === peerId);
  if (index === -1) return;
  
  const participant = state.participants[index];
  
  // Close data connection if exists
  if (participant.dataConnection) {
    participant.dataConnection.close();
  }
  
  // Remove from arrays
  state.participants.splice(index, 1);
  state.activeConnections = state.activeConnections.filter(c => c !== participant.call);
  
  // Update state.call for backward compatibility
  if (state.activeConnections.length > 0) {
    state.call = state.activeConnections[state.activeConnections.length - 1];
  } else {
    state.call = null;
  }
  
  console.log(`Participant removed: ${participant.friendlyName} (${peerId})`);
  
  // Update UI
  updateParticipantsList();
}

// Export function to disconnect a specific participant
export function disconnectParticipant(peerId) {
  const participant = state.participants.find(p => p.peerId === peerId);
  if (!participant) {
    console.warn(`Participant not found: ${peerId}`);
    return;
  }
  
  // Close the call
  if (participant.call) {
    participant.call.close();
  }
  
  // Remove from tracking
  removeParticipant(peerId);
  
  showAlert(`Disconnected ${participant.friendlyName}`, 'info');
}

export function stopHosting() {
  // Unregister from discovery service
  if (state.currentShareCode) {
    unregisterSession(state.currentShareCode);
    state.currentShareCode = null;
  }

  // Close all active connections
  state.activeConnections.forEach(call => {
    if (call) {
      call.close();
    }
  });
  
  // Close all data connections
  state.participants.forEach(participant => {
    if (participant.dataConnection) {
      participant.dataConnection.close();
    }
  });
  
  // Clear participant tracking
  state.activeConnections = [];
  state.participants = [];
  state.participantCounter = 0;
  state.call = null;
  
  // Update UI
  updateParticipantsList();
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
  state.sessionPin = null;
  state.isPrivateSession = false;
  state.hostName = null;
  updateShareIdStatus("", "");
  if (dom.shareLinkContainer) dom.shareLinkContainer.classList.add("hidden");
  if (dom.shareLinkInput) dom.shareLinkInput.value = "";
  
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
    showAlert("Already hosting. Please stop the current session first.", 'warning');
    return;
  }
  
  // Ask user for public/private choice
  const sessionType = await showChoiceDialog(
    "Create a public or private session?",
    "Public",
    "Private"
  );
  
  if (sessionType === null) {
    // User cancelled
    return;
  }
  
  // If private, get PIN
  let pin = null;
  if (sessionType === 'option2') {
    // Private selected
    pin = await showPinInputDialog(
      "Set up a PIN to protect your session (4-6 digits)",
      4,
      6
    );
    
    if (pin === null) {
      // User cancelled PIN entry
      return;
    }
    
    state.sessionPin = pin;
    state.isPrivateSession = true;
    console.log('[HOSTING] Private session selected, isPrivateSession set to:', state.isPrivateSession);
  } else {
    // Public selected
    state.sessionPin = null;
    state.isPrivateSession = false;
    console.log('[HOSTING] Public session selected, isPrivateSession set to:', state.isPrivateSession);
  }
  
  // Ask for host name
  const hostName = await showNameInputDialog(
    "Enter your name (optional):",
    "Your name",
    30
  );
  
  // Store host name
  state.hostName = hostName || null;
  
  // Basic UI setup (synchronous, doesn't break gesture context)
  state.isHosting = true;
  updateShareIdStatus("Starting host...", "warning");
  
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
    
    // Generate 18-character shareable code first
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars
    let shareCode = '';
    for (let i = 0; i < 18; i++) {
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
      updateShareIdStatus("Error: " + err.message, "error");
      if (dom.shareLinkContainer) dom.shareLinkContainer.classList.add("hidden");
      state.isHosting = false;
      
      // Re-enable host button on error
      if (dom.hostBtn) {
        dom.hostBtn.disabled = false;
        dom.hostBtn.classList.remove("disabled");
      }
    });
    
    state.peer.on("call", (incomingCall) => {
      if (!state.hostStream) {
        console.error("No stream available to answer call");
        incomingCall.close();
        return;
      }
      
      const peerId = incomingCall.peer;
      let dataConnection = null;
      let pinValidated = false;
      let participantName = null;
      let nameReceived = false;
      let pinValidationTimeout = null;
      let nameTimeout = null;
      
      // Helper function to handle participant join after validation
      function handleParticipantJoin(call, peerId, participantName, dataConnection) {
        // Answer the call
        call.answer(state.hostStream);
        
        // Add participant
        const participant = addParticipant(call, peerId, participantName, dataConnection);
        
        // Set up call event handlers
        call.on("close", () => {
          console.log("Call closed for participant:", participant.friendlyName);
          removeParticipant(peerId);
        });
        
        call.on("error", (err) => {
          console.error("Call error for participant:", participant.friendlyName, err);
          removeParticipant(peerId);
        });
        
        showAlert(`${participant.friendlyName} joined the session`, 'success', 3000);
      }
      
      // Establish data connection for PIN validation and name exchange
      dataConnection = state.peer.connect(peerId, {
        reliable: true
      });
      
      dataConnection.on('open', () => {
        console.log("Data connection opened with participant:", peerId);
        
        // If session is private, request PIN first
        if (state.isPrivateSession && state.sessionPin) {
          console.log("Private session: Requesting PIN");
          dataConnection.send(JSON.stringify({
            type: 'pin_request'
          }));
          
          // Set timeout for PIN validation (10 seconds)
          pinValidationTimeout = setTimeout(() => {
            if (!pinValidated) {
              console.log("PIN validation timeout");
              dataConnection.close();
              incomingCall.close();
              showAlert("Connection timeout: PIN not provided", 'warning');
            }
          }, 10000);
        } else {
          // Public session - request name immediately
          dataConnection.send(JSON.stringify({
            type: 'name_request'
          }));
          
          // Set timeout for name (1 minute)
          nameTimeout = setTimeout(() => {
            if (!nameReceived) {
              console.log("Name not received, using auto-generated name");
              // Proceed with auto-generated name
              handleParticipantJoin(incomingCall, peerId, null, dataConnection);
            }
          }, 60000);
        }
      });
      
      dataConnection.on('data', (data) => {
        try {
          const message = JSON.parse(data);
          
          if (message.type === 'pin_response') {
            const providedPin = message.pin;
            
            if (providedPin === state.sessionPin) {
              // PIN is correct
              pinValidated = true;
              if (pinValidationTimeout) {
                clearTimeout(pinValidationTimeout);
              }
              
              // Send validation success
              dataConnection.send(JSON.stringify({
                type: 'pin_validated',
                success: true
              }));
              
              // Now request name
              dataConnection.send(JSON.stringify({
                type: 'name_request'
              }));
              
              // Set timeout for name (1 minute)
              nameTimeout = setTimeout(() => {
                if (!nameReceived) {
                  console.log("Name not received after PIN validation, using auto-generated name");
                  handleParticipantJoin(incomingCall, peerId, null, dataConnection);
                }
              }, 60000);
            } else {
              // PIN is incorrect
              console.log("Incorrect PIN provided");
              dataConnection.send(JSON.stringify({
                type: 'pin_validated',
                success: false
              }));
              
              setTimeout(() => {
                dataConnection.close();
                incomingCall.close();
              }, 500);
              
              showAlert("Incorrect PIN. Connection rejected.", 'error');
            }
          } else if (message.type === 'name_response') {
            // Name received
            nameReceived = true;
            if (nameTimeout) {
              clearTimeout(nameTimeout);
            }
            
            participantName = message.name || null; // Can be null if user skipped
            
            // If PIN was required, validate it was successful before proceeding
            if (state.isPrivateSession && state.sessionPin) {
              if (pinValidated) {
                handleParticipantJoin(incomingCall, peerId, participantName, dataConnection);
              } else {
                console.log("Name received but PIN not validated yet");
                // Wait for PIN validation
              }
            } else {
              // Public session - proceed immediately
              handleParticipantJoin(incomingCall, peerId, participantName, dataConnection);
            }
          }
        } catch (err) {
          console.error("Error parsing data connection message:", err);
        }
      });
      
      dataConnection.on('error', (err) => {
        console.error("Data connection error:", err);
        if (pinValidationTimeout) {
          clearTimeout(pinValidationTimeout);
        }
        if (nameTimeout) {
          clearTimeout(nameTimeout);
        }
        incomingCall.close();
      });
      
      dataConnection.on('close', () => {
        console.log("Data connection closed");
        if (pinValidationTimeout) {
          clearTimeout(pinValidationTimeout);
        }
        if (nameTimeout) {
          clearTimeout(nameTimeout);
        }
      });
    });
    
    state.peer.on("open", (id) => {
      // id will be the shareCode we set
      const code = id;
      state.currentShareCode = code;
      
      // Register with discovery service
      console.log('[HOSTING] Registering session with discovery service:', {
        code: code,
        hostName: state.hostName,
        isPrivateSession: state.isPrivateSession
      });
      registerSession(code, state.hostName, state.isPrivateSession).catch(err => {
        console.warn("Failed to register session with discovery service:", err);
        // Continue anyway - discovery is optional
      });
      
      // Generate shareable link with code
      const shareLink = `${window.location.origin}/join.html?join=${code}`;
      
      if (dom.shareLinkInput) dom.shareLinkInput.value = shareLink;
      if (dom.shareLinkContainer) dom.shareLinkContainer.classList.remove("hidden");
      
      if (isMobile || !hasDisplayMedia) {
        updateShareIdStatus(`Share Code: ${code} (Mobile Mode)${state.isPrivateSession ? ' 🔒 Private' : ''}`, "success");
      } else {
        updateShareIdStatus(`Share Code: ${code}${state.isPrivateSession ? ' 🔒 Private' : ''}`, "success");
      }
      
      // Initialize participant list UI
      updateParticipantsList();
      
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
    updateShareIdStatus("Error: Could not start sharing", "error");
    if (dom.shareLinkContainer) dom.shareLinkContainer.classList.add("hidden");
    
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
        showAlert("Screen sharing failed. If the window list is empty, please grant Screen Recording permission in System Preferences > Security & Privacy > Privacy > Screen Recording, then restart Firefox.", 'error');
      } else if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        showAlert("Permission denied. Please allow screen sharing access in Firefox. You may need to check Firefox's permissions settings.", 'error');
      } else if (err.name === "AbortError" || err.name === "NotReadableError") {
        showAlert("Screen sharing was cancelled or failed. Please try again and select a window, screen, or tab to share.", 'warning');
      } else {
        showAlert("Firefox screen sharing error: " + (err.message || err.name || "Unknown error") + "\n\nTip: Make sure Firefox has Screen Recording permission in your system settings.", 'error');
      }
    } else {
      // Other browsers
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        showAlert("Permission denied. Please allow screen sharing access.", 'error');
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        showAlert("No camera found. Please ensure your device has a camera.", 'error');
      } else if (err.name === "AbortError") {
        showAlert("Screen sharing was cancelled. Please try again.", 'warning');
      } else {
        showAlert("Could not start sharing: " + (err.message || err.name || "Unknown error"), 'error');
      }
    }
  }
}

export async function join(idOrLink, isPrivate = null) {
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
    showAlert("Please enter a valid Share Code or Link", 'warning');
    return;
  }
  
  // If session is private, prompt for PIN (required)
  // For public sessions (isPrivate === false or null), skip PIN prompt entirely
  let pin = null;
  if (isPrivate === true) {
    // Known private session - PIN is required
    pin = await showPinInputDialog(
      "This is a private session. Enter the PIN to connect:",
      4,
      6
    );
    
    if (pin === null || pin === "") {
      // User cancelled or didn't enter PIN - cannot join private session
      showAlert("PIN is required to join this private session.", 'warning');
      return;
    }
  }
  // If isPrivate is false or null, skip PIN prompt - this is a public session
  
  // Store PIN temporarily for validation
  const joinPin = pin;
  
  // Prompt for participant name (optional)
  const participantName = await showNameInputDialog(
    "Enter your name (optional):",
    "Your name",
    30
  );
  // participantName can be null if user skipped/cancelled
  
  updateShareIdStatus("Connecting...", "warning");
  
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
    
    // Use the code/ID directly (should be 18 chars, it's a custom PeerJS ID)
    const peerIdToCall = id.trim();
    
    // Set up data connection listener for PIN validation
    state.peer.on("connection", (dataConnection) => {
      console.log("Data connection received from host");
      
      dataConnection.on('open', () => {
        console.log("Data connection opened with host");
        
        // Listen for PIN request
        dataConnection.on('data', (data) => {
          try {
            const message = JSON.parse(data);
            
            if (message.type === 'pin_request') {
              // Host is requesting PIN - this session is private
              if (joinPin) {
                // Send PIN
                dataConnection.send(JSON.stringify({
                  type: 'pin_response',
                  pin: joinPin
                }));
                console.log("PIN sent to host");
              } else {
                // No PIN available - prompt user for PIN now (session is confirmed private)
                console.log("No PIN available, prompting user for PIN");
                showPinInputDialog(
                  "This session is private. Enter the PIN to connect:",
                  4,
                  6
                ).then(promptedPin => {
                  if (promptedPin && promptedPin !== "") {
                    // Send PIN to host
                    dataConnection.send(JSON.stringify({
                      type: 'pin_response',
                      pin: promptedPin
                    }));
                    console.log("PIN sent to host after prompt");
                  } else {
                    // User cancelled or didn't enter PIN
                    console.log("User cancelled PIN entry");
                    dataConnection.send(JSON.stringify({
                      type: 'pin_response',
                      pin: ''
                    }));
                    
                    // Show error message
                    updateShareIdStatus("PIN required", "error");
                    setTimeout(() => {
                      showAlert("PIN is required to join this private session.", 'error');
                      if (state.call) {
                        state.call.close();
                      }
                      if (dom.camera) dom.camera.classList.add("hidden");
                      if (dom.overlayCanvas) dom.overlayCanvas.classList.add("hidden");
                      if (dom.gridCanvas) dom.gridCanvas.classList.add("hidden");
                      dom.panel.classList.add("hidden");
                      dom.topBar.classList.add("hidden");
                      dom.joinScreen.classList.remove("hidden");
                    }, 500);
                  }
                }).catch(err => {
                  console.error("Error getting PIN:", err);
                  dataConnection.send(JSON.stringify({
                    type: 'pin_response',
                    pin: ''
                  }));
                });
              }
            } else if (message.type === 'pin_validated') {
              if (message.success) {
                console.log("PIN validated by host");
                // PIN validated, wait for name request
              } else {
                console.log("PIN rejected by host");
                updateShareIdStatus("Incorrect PIN", "error");
                setTimeout(() => {
                  showAlert("Incorrect PIN. Connection rejected.", 'error');
                  if (state.call) {
                    state.call.close();
                  }
                  if (dom.camera) dom.camera.classList.add("hidden");
                  if (dom.overlayCanvas) dom.overlayCanvas.classList.add("hidden");
                  if (dom.gridCanvas) dom.gridCanvas.classList.add("hidden");
                  if (dom.panel) dom.panel.classList.add("hidden");
                  if (dom.topBar) dom.topBar.classList.add("hidden");
                  if (dom.joinScreen) dom.joinScreen.classList.remove("hidden");
                }, 500);
              }
            } else if (message.type === 'name_request') {
              // Host is requesting name - send it
              dataConnection.send(JSON.stringify({
                type: 'name_response',
                name: participantName || null
              }));
              console.log("Name sent to host:", participantName || "null (using auto-generated)");
            }
          } catch (err) {
            console.error("Error parsing data connection message:", err);
          }
        });
      });
      
      dataConnection.on('error', (err) => {
        console.error("Data connection error:", err);
      });
      
      dataConnection.on('close', () => {
        console.log("Data connection closed");
      });
    });
    
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
          updateShareIdStatus("Connection lost", "error");
          setTimeout(() => {
            showAlert("Connection to host lost", 'error');
            location.reload();
          }, 500);
        });
        
        state.call.on("error", (err) => {
          console.error("Call error:", err);
          if (stream) {
            stream.getTracks().forEach(track => track.stop());
          }
          updateShareIdStatus("Connection error", "error");
          setTimeout(() => {
            showAlert("Connection error: " + err.message, 'error');
            location.reload();
          }, 500);
        });
      } catch (err) {
        console.error("Error initiating call:", err);
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        updateShareIdStatus("Connection failed", "error");
        setTimeout(() => {
          showAlert("Could not connect to host. Please check the Share ID and try again.", 'error');
          if (dom.camera) dom.camera.classList.add("hidden");
          if (dom.overlayCanvas) dom.overlayCanvas.classList.add("hidden");
          if (dom.gridCanvas) dom.gridCanvas.classList.add("hidden");
          if (dom.panel) dom.panel.classList.add("hidden");
          if (dom.topBar) dom.topBar.classList.add("hidden");
          if (dom.joinScreen) dom.joinScreen.classList.remove("hidden");
        }, 500);
      }
    }, 100);
  });
  
  state.peer.on("error", (err) => {
    console.error("Peer error:", err);
    updateShareIdStatus("Connection error", "error");
    setTimeout(() => {
      showAlert("Connection error: " + err.message, 'error');
      if (dom.camera) dom.camera.classList.add("hidden");
      if (dom.overlayCanvas) dom.overlayCanvas.classList.add("hidden");
      if (dom.gridCanvas) dom.gridCanvas.classList.add("hidden");
      if (dom.panel) dom.panel.classList.add("hidden");
      if (dom.topBar) dom.topBar.classList.add("hidden");
      if (dom.joinScreen) dom.joinScreen.classList.remove("hidden");
    }, 500);
  });
}

