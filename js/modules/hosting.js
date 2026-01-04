// ================= SCREEN SHARE / HOSTING =================
// Main entry point - re-exports all hosting functions for backward compatibility

// Re-export from hosting/core.js
export { host } from './hosting/core.js';

// Re-export from hosting/join.js
export { join } from './hosting/join.js';

// Re-export from hosting/control.js
export { stopHosting, changeScreenShare, updateShareIdStatus } from './hosting/control.js';

// Re-export from hosting/participants.js
export { disconnectParticipant } from './hosting/participants.js';
