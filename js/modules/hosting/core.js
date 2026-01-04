// ================= HOSTING CORE =================
import { state } from '../state.js';
import { dom } from '../dom.js';
import { startCamera } from '../camera.js';
import { isMobileDevice, isFirefox, isDesktopOrLaptop } from '../utils.js';
import { registerSession } from '../discovery.js';
import { showAlert, showChoiceDialog, showPinInputDialog, showNameInputDialog, showApprovalDialog } from '../alert.js';
import { updateParticipantsList } from '../ui-controls.js';
import { createCompositeStream } from './stream.js';
import { updateShareIdStatus, stopHosting } from './control.js';
import { generateParticipantName, addParticipant, removeParticipant } from './participants.js';

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
      
      // Helper function to request host approval for participant
      async function requestHostApproval(call, peerId, participantName, dataConnection, pinValidated) {
        // Store pending participant
        const pendingParticipant = {
          call: call,
          peerId: peerId,
          participantName: participantName,
          dataConnection: dataConnection,
          pinValidated: pinValidated
        };
        state.pendingParticipants.push(pendingParticipant);
        
        // Send approval_pending message to participant
        dataConnection.send(JSON.stringify({
          type: 'approval_pending'
        }));
        
        // Update status
        const displayName = participantName || `Participant ${peerId.substring(0, 8)}`;
        updateShareIdStatus(`${displayName} is waiting for approval...`, "warning");
        
        // Show approval dialog
        try {
          const approved = await showApprovalDialog(participantName, peerId, pinValidated);
          
          // Remove from pending list
          const pendingIndex = state.pendingParticipants.findIndex(p => p.peerId === peerId);
          if (pendingIndex !== -1) {
            state.pendingParticipants.splice(pendingIndex, 1);
          }
          
          if (approved) {
            // Send approval message
            dataConnection.send(JSON.stringify({
              type: 'approval_approved'
            }));
            
            // Proceed with join
            handleParticipantJoin(call, peerId, participantName, dataConnection);
          } else {
            // Send denial message
            dataConnection.send(JSON.stringify({
              type: 'approval_denied'
            }));
            
            // Close connections
            setTimeout(() => {
              dataConnection.close();
              call.close();
            }, 500);
            
            showAlert(`${displayName} was denied access`, 'info', 3000);
          }
        } catch (err) {
          console.error("Error in approval dialog:", err);
          // On error, deny access
          const pendingIndex = state.pendingParticipants.findIndex(p => p.peerId === peerId);
          if (pendingIndex !== -1) {
            state.pendingParticipants.splice(pendingIndex, 1);
          }
          dataConnection.send(JSON.stringify({
            type: 'approval_denied'
          }));
          setTimeout(() => {
            dataConnection.close();
            call.close();
          }, 500);
        }
      }
      
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
              // Proceed with approval request (name will be auto-generated)
              requestHostApproval(incomingCall, peerId, null, dataConnection, false);
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
                  // Proceed with approval request (name will be auto-generated, PIN was validated)
                  requestHostApproval(incomingCall, peerId, null, dataConnection, true);
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
                // PIN validated and name received - show approval dialog
                requestHostApproval(incomingCall, peerId, participantName, dataConnection, pinValidated);
              } else {
                console.log("Name received but PIN not validated yet");
                // Wait for PIN validation
              }
            } else {
              // Public session - show approval dialog
              requestHostApproval(incomingCall, peerId, participantName, dataConnection, false);
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
        
        // Clean up pending participant if exists
        const pendingIndex = state.pendingParticipants.findIndex(p => p.peerId === peerId);
        if (pendingIndex !== -1) {
          state.pendingParticipants.splice(pendingIndex, 1);
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
        
        // Clean up pending participant if exists
        const pendingIndex = state.pendingParticipants.findIndex(p => p.peerId === peerId);
        if (pendingIndex !== -1) {
          state.pendingParticipants.splice(pendingIndex, 1);
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
      
      // Check if desktop/laptop (not tablet or smartphone)
      const isDesktop = isDesktopOrLaptop();
      
      if (isMobile || !hasDisplayMedia) {
        updateShareIdStatus(`Share Code: ${code} (Mobile Mode)${state.isPrivateSession ? ' 🔒 Private' : ''}`, "success");
      } else {
        updateShareIdStatus(`Share Code: ${code}${state.isPrivateSession ? ' 🔒 Private' : ''}`, "success");
      }
      
      // Show change screen button only for desktop/laptop screen sharing (not tablets or smartphones)
      if (isDesktop && hasDisplayMedia && dom.changeScreenContainer) {
        dom.changeScreenContainer.classList.remove("hidden");
      }
      
      // Show stop session button
      if (dom.stopSessionContainer) {
        dom.stopSessionContainer.classList.remove("hidden");
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

