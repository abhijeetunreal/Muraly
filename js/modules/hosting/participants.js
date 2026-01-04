// ================= PARTICIPANT MANAGEMENT =================
import { state } from '../state.js';
import { updateParticipantsList } from '../ui-controls.js';
import { showAlert } from '../alert.js';

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

// Export internal functions for use by other hosting modules
export { generateParticipantName, addParticipant, removeParticipant };

