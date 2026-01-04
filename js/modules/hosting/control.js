// ================= HOSTING CONTROL =================
import { state } from '../state.js';
import { dom } from '../dom.js';
import { showAlert } from '../alert.js';
import { stopRecordingTimelapse } from '../recording.js';
import { unregisterSession } from '../discovery.js';
import { updateParticipantsList } from '../ui-controls.js';
import { isFirefox, isDesktopOrLaptop } from '../utils.js';

// Helper function to safely update shareId status (handles missing element)
export function updateShareIdStatus(text, className = "", statusInfo = null) {
  if (dom.shareId) {
    let displayText = text;
    
    // If statusInfo is provided, format with elapsed time and remaining time
    if (statusInfo && statusInfo.elapsedStr && statusInfo.remainingStr) {
      displayText = `${statusInfo.stage || text} - Elapsed: ${statusInfo.elapsedStr} - Time remaining: ${statusInfo.remainingStr}`;
      
      // Add warning class if approaching timeout
      if (statusInfo.isWarning) {
        className = className ? `${className} timeout-warning` : 'timeout-warning';
      }
    }
    
    dom.shareId.textContent = displayText;
    dom.shareId.className = className;
  }
  console.log(`Status: ${text} (${className})`);
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
  
  // Close all pending participants
  state.pendingParticipants.forEach(pending => {
    if (pending.dataConnection) {
      // Notify participant that session ended
      try {
        pending.dataConnection.send(JSON.stringify({
          type: 'approval_denied',
          reason: 'Session ended'
        }));
      } catch (err) {
        // Connection may already be closed
      }
      pending.dataConnection.close();
    }
    if (pending.call) {
      pending.call.close();
    }
  });
  
  // Clear participant tracking
  state.activeConnections = [];
  state.participants = [];
  state.pendingParticipants = [];
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
  
  // Hide change screen button
  if (dom.changeScreenContainer) {
    dom.changeScreenContainer.classList.add("hidden");
  }
  
  // Hide stop session button
  if (dom.stopSessionContainer) {
    dom.stopSessionContainer.classList.add("hidden");
  }
}

export async function changeScreenShare() {
  // Only available when hosting is active
  if (!state.isHosting) {
    showAlert("Please start hosting first.", 'warning');
    return;
  }
  
  // Only available on desktop/laptop with screen sharing (not tablets or smartphones)
  const isDesktop = isDesktopOrLaptop();
  const hasDisplayMedia = navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia;
  
  if (!isDesktop || !hasDisplayMedia) {
    showAlert("Screen sharing change is only available on desktop and laptop devices.", 'warning');
    return;
  }
  
  // Only works if we're using screen share (not canvas capture)
  if (state.canvasStream) {
    showAlert("Cannot change screen in mobile/canvas mode.", 'warning');
    return;
  }
  
  try {
    // Get new screen share stream
    const isFirefoxBrowser = isFirefox();
    let newStream = null;
    
    if (isFirefoxBrowser) {
      // Firefox: Try different constraint approaches
      try {
        newStream = await navigator.mediaDevices.getDisplayMedia({});
      } catch (err) {
        try {
          newStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        } catch (err2) {
          newStream = await navigator.mediaDevices.getDisplayMedia({ 
            video: { mediaSource: 'screen' } 
          });
        }
      }
    } else {
      // Chrome/others: Use full constraints
      newStream = await navigator.mediaDevices.getDisplayMedia({
        video: { 
          cursor: "always",
          displaySurface: "monitor"
        },
        audio: false 
      });
    }
    
    // Validate stream was obtained
    if (!newStream || !newStream.getVideoTracks() || newStream.getVideoTracks().length === 0) {
      throw new Error("Failed to obtain new screen sharing stream");
    }
    
    const newVideoTrack = newStream.getVideoTracks()[0];
    
    // Stop old screen share track
    if (state.hostStream) {
      state.hostStream.getVideoTracks().forEach(track => {
        if (track !== newVideoTrack) {
          track.stop();
        }
      });
    }
    
    // Replace tracks in all active connections
    let successCount = 0;
    let failCount = 0;
    
    for (const call of state.activeConnections) {
      if (!call || !call.peerConnection) {
        console.warn("Call or peerConnection not available for track replacement");
        failCount++;
        continue;
      }
      
      try {
        const peerConnection = call.peerConnection;
        const senders = peerConnection.getSenders();
        
        // Find the video track sender
        const videoSender = senders.find(sender => 
          sender.track && sender.track.kind === 'video'
        );
        
        if (videoSender) {
          await videoSender.replaceTrack(newVideoTrack);
          successCount++;
          console.log("Successfully replaced video track for participant");
        } else {
          console.warn("No video sender found for this connection");
          failCount++;
        }
      } catch (err) {
        console.error("Error replacing track for connection:", err);
        failCount++;
      }
    }
    
    // Update state.hostStream
    state.hostStream = newStream;
    
    // Set up onended handler for new track
    newVideoTrack.onended = () => {
      console.log("User stopped sharing screen");
      stopHosting();
    };
    
    // Show success message
    if (successCount > 0) {
      if (failCount > 0) {
        showAlert(`Screen changed successfully for ${successCount} participant(s). ${failCount} connection(s) failed to update.`, 'warning');
      } else {
        showAlert(`Screen changed successfully for all ${successCount} participant(s).`, 'success');
      }
    } else {
      showAlert("Screen changed but no active connections to update.", 'info');
    }
    
  } catch (err) {
    // Handle user cancellation gracefully
    if (err.name === "NotAllowedError" || err.name === "AbortError") {
      // User cancelled or denied - don't show error, just return
      console.log("User cancelled screen share change");
      return;
    }
    
    // Handle other errors
    console.error("Error changing screen share:", err);
    
    const isFirefoxBrowser = isFirefox();
    if (isFirefoxBrowser) {
      if (err.message && (err.message.includes("can not be found here") || err.message.includes("The object can not be found here"))) {
        showAlert("Screen sharing failed. Please grant Screen Recording permission in System Preferences > Security & Privacy > Privacy > Screen Recording.", 'error');
      } else if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        showAlert("Permission denied. Please allow screen sharing access.", 'error');
      } else {
        showAlert("Failed to change screen: " + (err.message || err.name || "Unknown error"), 'error');
      }
    } else {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        showAlert("Permission denied. Please allow screen sharing access.", 'error');
      } else {
        showAlert("Failed to change screen: " + (err.message || err.name || "Unknown error"), 'error');
      }
    }
  }
}

