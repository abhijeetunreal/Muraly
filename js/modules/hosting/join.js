// ================= JOIN CORE =================
import { state } from '../state.js';
import { dom } from '../dom.js';
import { showAlert, showPinInputDialog, showNameInputDialog } from '../alert.js';
import { enterViewerMode } from '../viewer.js';
import { updateShareIdStatus } from './control.js';
import { createStatusTracker, destroyStatusTracker } from '../connection-status.js';
import { SESSION_TIMEOUT } from '../discovery.js';

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
  
  // Initialize connection status tracker
  const statusTracker = createStatusTracker(SESSION_TIMEOUT);
  statusTracker.setStage("Initializing peer connection...");
  
  // Set up status update callback
  statusTracker.setStatusUpdateCallback((statusInfo) => {
    updateShareIdStatus(statusInfo.stage, "warning", statusInfo);
  });
  
  // Set up timeout callback
  statusTracker.setTimeoutCallback(() => {
    console.log("Connection timeout after 5 minutes");
    statusTracker.stop();
    updateShareIdStatus("Connection timed out", "error");
    setTimeout(() => {
      showAlert("Connection timed out after 5 minutes. Please check your network and try again.", 'error');
      if (state.call) {
        state.call.close();
      }
      if (dom.camera) dom.camera.classList.add("hidden");
      if (dom.overlayCanvas) dom.overlayCanvas.classList.add("hidden");
      if (dom.gridCanvas) dom.gridCanvas.classList.add("hidden");
      if (dom.panel) dom.panel.classList.add("hidden");
      if (dom.topBar) dom.topBar.classList.add("hidden");
      if (dom.joinScreen) dom.joinScreen.classList.remove("hidden");
      destroyStatusTracker();
    }, 500);
  });
  
  // Set up warning callback
  statusTracker.setWarningCallback((remainingSeconds) => {
    if (remainingSeconds === 30) {
      showAlert(`Connection timeout warning: ${remainingSeconds} seconds remaining`, 'warning', 5000);
    } else if (remainingSeconds === 10) {
      showAlert(`Connection timeout warning: ${remainingSeconds} seconds remaining`, 'error', 5000);
    }
  });
  
  // Start tracking
  statusTracker.start();
  updateShareIdStatus("Initializing peer connection...", "warning");
  
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
    statusTracker.setStage("Connecting to host...");
    
    // Use the code/ID directly (should be 18 chars, it's a custom PeerJS ID)
    const peerIdToCall = id.trim();
    
    // Set up data connection listener for PIN validation
    state.peer.on("connection", (dataConnection) => {
      console.log("Data connection received from host");
      statusTracker.setStage("Establishing data connection...");
      
      dataConnection.on('open', () => {
        console.log("Data connection opened with host");
        statusTracker.setStage("Data connection established");
        
        // Listen for PIN request
        dataConnection.on('data', (data) => {
          try {
            const message = JSON.parse(data);
            
            if (message.type === 'pin_request') {
              // Host is requesting PIN - this session is private
              statusTracker.setStage("Validating PIN...");
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
                    statusTracker.stop();
                    destroyStatusTracker();
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
                statusTracker.setStage("PIN validated, waiting for name request...");
                // PIN validated, wait for name request
              } else {
                console.log("PIN rejected by host");
                statusTracker.stop();
                destroyStatusTracker();
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
              statusTracker.setStage("Sending name to host...");
              dataConnection.send(JSON.stringify({
                type: 'name_response',
                name: participantName || null
              }));
              console.log("Name sent to host:", participantName || "null (using auto-generated)");
            } else if (message.type === 'approval_pending') {
              // Host is reviewing join request
              console.log("Waiting for host approval...");
              statusTracker.setStage("Waiting for host approval...");
            } else if (message.type === 'approval_approved') {
              // Host approved the join request
              console.log("Host approved join request");
              statusTracker.setStage("Approved! Receiving stream...");
              // Continue normal flow - wait for stream
            } else if (message.type === 'approval_denied') {
              // Host denied the join request
              console.log("Host denied join request");
              statusTracker.stop();
              destroyStatusTracker();
              const reason = message.reason || "Host denied your request to join";
              updateShareIdStatus("Access denied", "error");
              setTimeout(() => {
                showAlert(reason === 'Session ended' ? "The session has ended." : "Host denied your request to join the session.", 'error');
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
        statusTracker.setStage("Initiating call...");
        state.call = state.peer.call(peerIdToCall, stream);
        
        if (!state.call) {
          throw new Error("Could not initiate call");
        }
        
        statusTracker.setStage("Receiving stream...");
        
        state.call.on("stream", (remoteStream) => {
          console.log("Received remote stream");
          // Stop the dummy stream once we get the real stream
          if (stream) {
            stream.getTracks().forEach(track => track.stop());
          }
          // Connection successful - stop tracker
          statusTracker.stop();
          statusTracker.setStage("Connected!");
          updateShareIdStatus("Connected!", "success");
          destroyStatusTracker();
          enterViewerMode(remoteStream);
        });
        
        state.call.on("close", () => {
          console.log("Call closed");
          statusTracker.stop();
          destroyStatusTracker();
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
          statusTracker.stop();
          destroyStatusTracker();
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
        statusTracker.stop();
        destroyStatusTracker();
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
    statusTracker.stop();
    destroyStatusTracker();
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

